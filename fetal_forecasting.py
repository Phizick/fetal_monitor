#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Обучение моделей краткосрочного прогноза (10/30/60 минут) на основе симулятора КТГ/UC.
Генерирует временные ряды, вычисляет агрегированные окна признаков и маркирует наличие патологии
на горизонте прогноза. Сохраняет модели в файлы forecast_model_{horizon}.pkl.
"""

import asyncio
import time
from collections import deque
from typing import Dict, List, Tuple

import numpy as np
import joblib
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import StratifiedKFold, cross_val_score

# Импортируем симулятор из realtime_api
from realtime_api import CTGSimulator
import os
import pandas as pd


def compute_window_features(buffer: deque) -> Dict[str, float]:
    """Вычисляет агрегаты по окну последних данных.
    Ожидает элементы вида dict с ключами: fhr_bpm, uc_mmHg, accel, decel, variability_bpm.
    """
    if not buffer:
        return {
            "fhr_mean": np.nan,
            "fhr_std": np.nan,
            "uc_mean": np.nan,
            "uc_std": np.nan,
            "accel_rate": 0.0,
            "decel_rate": 0.0,
            "variability_mean": np.nan,
        }
    def _to_float(v):
        try:
            return float(v)
        except Exception:
            return np.nan
    fhr_vals = np.array([_to_float(x.get("fhr_bpm")) for x in buffer], dtype=float)
    uc_vals = np.array([_to_float(x.get("uc_mmHg")) for x in buffer], dtype=float)
    accel_vals = np.array([1 if bool(x.get("accel", False)) else 0 for x in buffer], dtype=float)
    decel_vals = np.array([1 if bool(x.get("decel", False)) else 0 for x in buffer], dtype=float)
    var_vals = np.array([_to_float(x.get("variability_bpm", np.nan)) for x in buffer], dtype=float)
    n = max(1, len(buffer))
    # Если в датасете нет отдельного variability_bpm, используем std(FHR) как прокси
    var_mean = np.nanmean(var_vals) if len(var_vals) > 0 else np.nanstd(fhr_vals)
    if not np.isfinite(var_mean) or np.isnan(var_mean):
        var_mean = np.nanstd(fhr_vals) if len(fhr_vals) > 0 else 0.0
    
    return {
        "fhr_mean": float(np.nanmean(fhr_vals)) if fhr_vals.size else 0.0,
        "fhr_std": float(np.nanstd(fhr_vals)) if fhr_vals.size else 0.0,
        "uc_mean": float(np.nanmean(uc_vals)) if uc_vals.size else 0.0,
        "uc_std": float(np.nanstd(uc_vals)) if uc_vals.size else 0.0,
        "accel_rate": float(np.nansum(accel_vals) / n) if n else 0.0,
        "decel_rate": float(np.nansum(decel_vals) / n) if n else 0.0,
        "variability_mean": float(var_mean)
    }


async def generate_series(duration_minutes: int = 60, hz: int = 10) -> List[Dict]:
    """Быстро генерирует временной ряд, имитируя шаги симулятора без ожиданий.
    Использует внутренние методы симулятора с искусственным временем t_ms.
    """
    sim = CTGSimulator()
    series: List[Dict] = []
    dt_ms = int(1000 / hz)
    total_steps = duration_minutes * 60 * hz
    t_ms = 0
    for _ in range(total_steps):
        # Принудительно продвигаем состояние симулятора на t_ms
        sim._maybe_trigger_events(t_ms)
        fhr, accel, decel = sim._fhr_value(t_ms)
        uc = sim._uc_value(t_ms)
        # Обновляем внутренние истории как это делает stream
        sim._fhr_hist.append((t_ms, fhr))
        sim._uc_hist.append((t_ms, uc))
        while sim._fhr_hist and t_ms - sim._fhr_hist[0][0] > sim._history_window_sec * 1000:
            sim._fhr_hist.popleft()
        while sim._uc_hist and t_ms - sim._uc_hist[0][0] > sim._history_window_sec * 1000:
            sim._uc_hist.popleft()
        # Логика патологий (та же, что в stream)
        recent_fhr = [v for (_, v) in sim._fhr_hist]
        fhr_std = float(np.std(recent_fhr)) if recent_fhr else 0.0
        pathologies: List[str] = []
        if t_ms < 3_000:
            fhr = min(fhr, 95)
            pathologies.append("брадикардия плода (тест)")
        elif t_ms < 6_000:
            fhr = max(fhr, 170)
            pathologies.append("тахикардия плода (тест)")
        elif t_ms < 8_000:
            pathologies.append("сниженная вариабельность (тест)")
        elif t_ms < 10_000:
            pathologies.append("тахисистолия матки (тест)")
        if fhr < 110:
            pathologies.append("брадикардия плода")
        if fhr > 160:
            pathologies.append("тахикардия плода")
        if fhr_std < 3.0 and len(recent_fhr) >= 50:
            pathologies.append("сниженная вариабельность")
        hypoxia = len(pathologies) > 0
        series.append({
            "t_ms": t_ms,
            "fhr_bpm": fhr,
            "uc_mmHg": float(uc),
            "accel": bool(accel),
            "decel": bool(decel),
            "variability_bpm": float(sim.variability_bpm),
            "pathology": hypoxia,
            "pathologies": pathologies,
        })
        t_ms += dt_ms
    return series


def _load_record_pair(bpm_path: str, uterus_path: str) -> List[Dict]:
    """Загружает одну запись из пары CSV (bpm и uterus) и возвращает список сэмплов."""
    bpm_df = pd.read_csv(bpm_path)
    uc_df = pd.read_csv(uterus_path)
    # Ожидаются колонки time_sec,value
    df = pd.merge_asof(
        bpm_df.sort_values("time_sec"),
        uc_df.sort_values("time_sec"),
        on="time_sec",
        suffixes=("_bpm", "_uc"),
        direction="nearest",
        tolerance=0.2,
    )
    df = df.dropna(subset=["value_bpm", "value_uc"])  # оставим только совпавшие точки
    series: List[Dict] = []
    for _, row in df.iterrows():
        series.append({
            "t_ms": int(row["time_sec"] * 1000.0),
            "fhr_bpm": float(row["value_bpm"]),
            "uc_mmHg": float(row["value_uc"]),
            "accel": False,
            "decel": False,
            "variability_bpm": np.nan,
            "pathology": None,
            "pathologies": [],
        })
    return series


def _load_labels_from_xlsx(base_dir: str) -> Dict[str, Dict[str, int]]:
    """Пытается прочитать regular.xlsx и hypoxia.xlsx для извлечения диагнозов по записи.
    Возвращает словарь: record_id -> {label_name: 0/1, ...}
    Поддерживаются имена колонок: record_id, fetal_bradycardia, fetal_tachycardia, low_variability, uterine_tachysystole, any_pathology.
    Если колонок нет — метки отсутствуют.
    """
    labels: Dict[str, Dict[str, int]] = {}
    for name in ("regular.xlsx", "hypoxia.xlsx"):
        path = os.path.join(base_dir, name)
        if not os.path.isfile(path):
            continue
        try:
            df = pd.read_excel(path)
            cols = {c.strip().lower(): c for c in df.columns}
            rec_col = cols.get("record_id") or cols.get("id") or None
            if not rec_col:
                continue
            for _, row in df.iterrows():
                rid = str(row[rec_col])
                if not rid or rid == "nan":
                    continue
                item = {}
                for key in [
                    "fetal_bradycardia",
                    "fetal_tachycardia",
                    "low_variability",
                    "uterine_tachysystole",
                    "any_pathology",
                ]:
                    colname = cols.get(key)
                    if colname in df.columns:
                        try:
                            item[key] = int(row[colname])
                        except Exception:
                            try:
                                item[key] = 1 if str(row[colname]).strip().lower() in ("1", "true", "yes", "y") else 0
                            except Exception:
                                pass
                if item:
                    labels[rid] = item
        except Exception:
            continue
    return labels


def generate_series_from_dataset(base_dir: str, max_records_per_class: int = 50) -> List[Dict]:
    """Формирует объединённый временной ряд из реального датасета (regular/hypoxia).
    Для каждой записи объединяет bpm и uterus CSV.
    """
    collected: List[Dict] = []
    label_map = _load_labels_from_xlsx(base_dir)
    for label_dir in ["regular", "hypoxia"]:
        root = os.path.join(base_dir, label_dir)
        if not os.path.isdir(root):
            continue
        count = 0
        for dirpath, _, filenames in os.walk(root):
            if os.path.basename(dirpath) == "bpm":
                for fn in filenames:
                    if not fn.endswith("_1.csv"):
                        continue
                    bpm_path = os.path.join(dirpath, fn)
                    uterus_path = bpm_path.replace(os.sep + "bpm" + os.sep, os.sep + "uterus" + os.sep).replace("_1.csv", "_2.csv")
                    if not os.path.isfile(uterus_path):
                        continue
                    try:
                        series = _load_record_pair(bpm_path, uterus_path)
                        # добавим в конец маркер класса записи
                        # record_id из имени файла: берем базовую часть до подчеркивания (_1.csv)
                        base = os.path.splitext(os.path.basename(bpm_path))[0]
                        record_id = base.replace("_1", "")
                        extra_labels = label_map.get(record_id, {})
                        for s in series:
                            s["record_class"] = label_dir
                            s["record_id"] = record_id
                            # если есть метки в xlsx, прикрепим
                            for k, v in extra_labels.items():
                                s[k] = int(v)
                        collected.extend(series)
                        count += 1
                        if count >= max_records_per_class:
                            break
                    except Exception:
                        continue
            if count >= max_records_per_class:
                break
    # Отсортируем по времени, но т.к. записи независимы, сбросим t_ms последовательным счётчиком
    # чтобы build_dataset шёл монотонно
    for i, s in enumerate(collected):
        s["t_ms"] = i * 100
    return collected


def build_dataset_from_series(series: List[Dict], window_sec: int, horizon_min: int, hz: int = 10) -> Tuple[np.ndarray, Dict[str, np.ndarray], List[str]]:
    """Строит датасет признаков и словарь меток по диагнозам из временного ряда.
    Признаки: агрегаты по окну window_sec.
    Метки: словарь бинарных векторов по диагнозам на горизонте horizon_min.
    Диагнозы: брадикардия, тахикардия, сниженная вариабельность, тахисистолия, а также общий флаг патологии.
    """
    window_len = window_sec * hz
    horizon_steps = horizon_min * 60 * hz
    buf: deque = deque(maxlen=window_len)
    X: List[List[float]] = []
    y_dict: Dict[str, List[int]] = {
        "fetal_bradycardia": [],
        "fetal_tachycardia": [],
        "low_variability": [],
        "uterine_tachysystole": [],
        "any_pathology": [],
    }

    future_eval_sec = 60
    future_eval_len = future_eval_sec * hz
    for i, s in enumerate(series):
        buf.append(s)
        if len(buf) < window_len:
            continue
        j = i + horizon_steps
        if j >= len(series):
            break
        # Оцениваем состояние в окне 60с перед будущей точкой
        start_k = max(window_len, j - future_eval_len + 1)
        fut_win = series[start_k: j + 1]
        fhr_vals = np.array([x["fhr_bpm"] for x in fut_win]) if fut_win else np.array([])
        uc_vals = np.array([x["uc_mmHg"] for x in fut_win]) if fut_win else np.array([])
        fhr_std_fut = float(np.std(fhr_vals)) if fhr_vals.size else 0.0
        fhr_mean_fut = float(np.mean(fhr_vals)) if fhr_vals.size else 0.0
        uc_mean_fut = float(np.mean(uc_vals)) if uc_vals.size else 0.0
        uc_max_fut = float(np.max(uc_vals)) if uc_vals.size else 0.0
        # Простые суррогатные критерии диагнозов
        has_brady = fhr_mean_fut < 110.0
        has_tachy = fhr_mean_fut > 160.0
        has_lowvar = (fhr_std_fut < 3.0)
        has_tachys = (uc_mean_fut > 55.0) or (uc_max_fut > 60.0)
        has_any = bool(has_brady or has_tachy or has_lowvar or has_tachys)
        feats = compute_window_features(buf)
        X.append([feats[k] for k in [
            "fhr_mean", "fhr_std", "uc_mean", "uc_std", "accel_rate", "decel_rate", "variability_mean"
        ]])
        y_dict["fetal_bradycardia"].append(1 if has_brady else 0)
        y_dict["fetal_tachycardia"].append(1 if has_tachy else 0)
        y_dict["low_variability"].append(1 if has_lowvar else 0)
        y_dict["uterine_tachysystole"].append(1 if has_tachys else 0)
        y_dict["any_pathology"].append(1 if has_any else 0)

    feature_names = [
        "fhr_mean", "fhr_std", "uc_mean", "uc_std", "accel_rate", "decel_rate", "variability_mean"
    ]
    y_out = {k: np.array(v, dtype=int) for k, v in y_dict.items()}
    return np.array(X, dtype=float), y_out, feature_names


def train_forecast_model(X: np.ndarray, y: np.ndarray) -> Pipeline:
    """Обучает бинарный классификатор вероятности конкретного диагноза на горизонте."""
    pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
        ("clf", GradientBoostingClassifier(n_estimators=300, random_state=42)),
    ])
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    # Если вектор меток константный, пропускаем CV
    if len(np.unique(y)) > 1:
        scores = cross_val_score(pipeline, X, y, cv=cv, scoring="roc_auc")
        print(f"CV AUC (mean±std): {scores.mean():.4f} ± {scores.std():.4f}")
    else:
        print("Пропуск CV: нет вариативности классов")
    pipeline.fit(X, y)
    return pipeline


async def main():
    print("Генерация временного ряда из симулятора...")
    series = await generate_series(duration_minutes=120, hz=10)

    # Конфигурации окон/горизонтов
    window_sec = 300  # 5 минут контекста
    horizons = [10, 30, 60]

    # Генерируем ряд из датасета (если доступен)
    dataset_dir = os.path.join(os.path.dirname(__file__), 'dataset')
    try:
        ds_series = generate_series_from_dataset(dataset_dir, max_records_per_class=100)
        if len(ds_series) > 0:
            series = ds_series
            print(f"Загружено из датасета: {len(series)} точек")
    except Exception as e:
        print(f"Не удалось загрузить датасет, используем симуляцию: {e}")

    for h in horizons:
        print(f"\nПодготовка датасета для горизонта {h} мин...")
        X, y_dict, feat_names = build_dataset_from_series(series, window_sec=window_sec, horizon_min=h, hz=10)
        print(f"X: {X.shape}, метки: {[k for k in y_dict.keys()]}")
        pipelines: Dict[str, Pipeline] = {}
        for label, y in y_dict.items():
            pos_rate = float(y.mean()) if len(y) else 0.0
            print(f"  Обучение {label}: pos_rate={pos_rate:.3f}")
            pipelines[label] = train_forecast_model(X, y)
        joblib.dump({
            "pipelines": pipelines,
            "labels": list(y_dict.keys()),
            "feature_names": feat_names,
            "window_sec": window_sec,
            "horizon_min": h,
        }, f"forecast_model_{h}.pkl")
        print(f"Сохранено: forecast_model_{h}.pkl (мульти-диагноз)")


if __name__ == "__main__":
    asyncio.run(main())


