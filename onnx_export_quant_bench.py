#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Экспорт sklearn-пайплайна в ONNX, int8-квантизация и бенчмарк инференса.

Использование:
  python onnx_export_quant_bench.py \
    --pkl best_fetal_model.pkl \
    --features best_fetal_model_features.pkl \
    --output best_fetal_model.onnx \
    --csv f_health.csv \
    --runs 200

Результат:
  - ONNX-модель: <output>
  - INT8-модель: <stem>.int8.onnx (динамическая квантизация)
  - Печать латентности и пикового потребления памяти (по процессу)
"""

import argparse
import os
import time
import pickle
import tracemalloc
from typing import List, Tuple

import numpy as np
import pandas as pd
import joblib

from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

import onnx
import onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType


def load_sklearn_pipeline(pkl_path: str):
    """
    Загружает sklearn-пайплайн из .pkl.
    """
    with open(pkl_path, "rb") as f:
        model = pickle.load(f)
    return model


def load_feature_names(features_pkl_path: str) -> List[str]:
    """
    Загружает список имен признаков, сохраненный joblib.dump.
    """
    return joblib.load(features_pkl_path)


def export_to_onnx(model, num_features: int, output_path: str) -> str:
    """
    Конвертирует sklearn-пайплайн в ONNX и сохраняет.
    """
    initial_types = [("input", FloatTensorType([None, num_features]))]
    onnx_model = convert_sklearn(model, initial_types=initial_types)
    with open(output_path, "wb") as f:
        f.write(onnx_model.SerializeToString())
    return output_path


def dynamic_quantize(onnx_model_path: str) -> str:
    """
    Выполняет динамическую int8-квантизацию весов.
    """
    stem, ext = os.path.splitext(onnx_model_path)
    int8_path = f"{stem}.int8.onnx"
    quantize_dynamic(onnx_model_path, int8_path, weight_type=QuantType.QInt8)
    return int8_path


def make_inputs_from_csv(csv_path: str, feature_names: List[str], batch_size: int = 1) -> np.ndarray:
    """
    Формирует входной numpy-массив из CSV по именам признаков.
    Если batch_size > 1, берет первые batch_size строк.
    """
    df = pd.read_csv(csv_path)
    df = df[feature_names]
    if batch_size > len(df):
        batch_size = len(df)
    arr = df.head(batch_size).astype(np.float32).to_numpy()
    return arr


def benchmark_onnx(model_path: str, input_name: str, inputs: np.ndarray, runs: int = 200) -> Tuple[float, float]:
    """
    Бенчмарк латентности (мс) и примерной пиковой памяти (МБ) с onnxruntime.
    Возвращает (mean_ms, p95_ms).
    """
    session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])  # универсально

    # Тёплый прогон
    for _ in range(5):
        session.run(None, {input_name: inputs})

    latencies = []
    tracemalloc.start()
    for _ in range(runs):
        t0 = time.perf_counter()
        session.run(None, {input_name: inputs})
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0)
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    latencies.sort()
    mean_ms = float(np.mean(latencies))
    p95_ms = float(latencies[int(0.95 * len(latencies)) - 1]) if runs >= 20 else float(np.max(latencies))
    peak_mb = peak / (1024.0 * 1024.0)

    print(f"  mean latency: {mean_ms:.2f} ms | p95: {p95_ms:.2f} ms | peak mem (process alloc approx): {peak_mb:.1f} MB")
    return mean_ms, p95_ms


def infer_input_name(model_path: str) -> str:
    """
    Возвращает имя первого входа у ONNX-модели.
    """
    session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"]) 
    return session.get_inputs()[0].name


def main():
    parser = argparse.ArgumentParser(description="Export sklearn -> ONNX, quantize, benchmark")
    parser.add_argument("--pkl", required=True, help="Путь к sklearn .pkl (pipeline)")
    parser.add_argument("--features", required=True, help="Путь к joblib .pkl с именами признаков")
    parser.add_argument("--output", default="model.onnx", help="Путь для сохранения ONNX")
    parser.add_argument("--csv", default="f_health.csv", help="CSV для формирования входов/калибрации")
    parser.add_argument("--batch", type=int, default=1, help="Размер батча для бенчмарка")
    parser.add_argument("--runs", type=int, default=200, help="Количество прогонов для бенчмарка")
    args = parser.parse_args()

    print("[1/4] Загрузка sklearn-пайплайна и признаков...")
    model = load_sklearn_pipeline(args.pkl)
    feature_names = load_feature_names(args.features)
    num_features = len(feature_names)
    print(f"  Признаков: {num_features}")

    print("[2/4] Экспорт в ONNX...")
    onnx_path = export_to_onnx(model, num_features, args.output)
    print(f"  Сохранено: {onnx_path}")

    print("[3/4] Динамическая int8-квантизация...")
    int8_path = dynamic_quantize(onnx_path)
    print(f"  Сохранено: {int8_path}")

    print("[4/4] Бенчмарк инференса (CPUExecutionProvider)...")
    inputs = make_inputs_from_csv(args.csv, feature_names, batch_size=args.batch)

    # Обычная ONNX
    input_name = infer_input_name(onnx_path)
    print("ONNX fp32:")
    benchmark_onnx(onnx_path, input_name, inputs, runs=args.runs)

    # INT8 ONNX
    input_name_q = infer_input_name(int8_path)
    print("ONNX int8 (dynamic):")
    benchmark_onnx(int8_path, input_name_q, inputs, runs=args.runs)

    print("\nГотово. Для ARM64/x86_64 с NPU можно далее конвертировать в RKNN/OpenVINO при необходимости.")


if __name__ == "__main__":
    main()


