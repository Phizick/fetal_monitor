#!/usr/bin/env python3
"""
Быстрый тест обучения моделей прогнозирования на небольшом датасете
для отладки и проверки корректности алгоритма
"""

import os
import joblib
import numpy as np
import pandas as pd
from collections import deque
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
import warnings
warnings.filterwarnings('ignore')

def compute_window_features(buffer):
    """Вычисляет признаки для окна данных"""
    if not buffer:
        return {
            "fhr_mean": 0.0, "fhr_std": 0.0, "uc_mean": 0.0, "uc_std": 0.0,
            "accel_rate": 0.0, "decel_rate": 0.0, "variability_mean": 0.0
        }
    
    fhr_vals = np.array([x["fhr_bpm"] for x in buffer])
    uc_vals = np.array([x["uc_mmHg"] for x in buffer])
    accel_vals = np.array([1 if x["accel"] else 0 for x in buffer])
    decel_vals = np.array([1 if x["decel"] else 0 for x in buffer])
    var_vals = np.array([x.get("variability_bpm", np.nan) for x in buffer])
    n = max(1, len(buffer))
    
    # Надежное вычисление variability_mean
    var_mean = np.nanmean(var_vals) if len(var_vals) > 0 and not np.all(np.isnan(var_vals)) else np.nanstd(fhr_vals)
    if not np.isfinite(var_mean) or np.isnan(var_mean):
        var_mean = np.nanstd(fhr_vals) if len(fhr_vals) > 0 else 0.0
    
    return {
        "fhr_mean": float(np.nanmean(fhr_vals)),
        "fhr_std": float(np.nanstd(fhr_vals)),
        "uc_mean": float(np.nanmean(uc_vals)),
        "uc_std": float(np.nanstd(uc_vals)),
        "accel_rate": float(np.nansum(accel_vals) / n),
        "decel_rate": float(np.nansum(decel_vals) / n),
        "variability_mean": float(var_mean)
    }

def generate_test_data(n_samples=1000):
    """Генерирует тестовые данные для быстрой проверки"""
    print(f"Генерируем {n_samples} тестовых образцов...")
    
    data = []
    for i in range(n_samples):
        # Генерируем случайные данные
        fhr = np.random.normal(140, 15)
        uc = np.random.normal(30, 10)
        accel = np.random.random() > 0.8
        decel = np.random.random() > 0.9
        variability = np.random.normal(6, 2)
        
        # Создаем буфер из 5-10 точек
        buffer_size = np.random.randint(5, 11)
        buffer = []
        for j in range(buffer_size):
            buffer.append({
                "fhr_bpm": fhr + np.random.normal(0, 5),
                "uc_mmHg": uc + np.random.normal(0, 3),
                "accel": np.random.random() > 0.8,
                "decel": np.random.random() > 0.9,
                "variability_bpm": variability + np.random.normal(0, 1)
            })
        
        # Вычисляем признаки
        features = compute_window_features(buffer)
        
        # Создаем метки (случайные для теста)
        labels = {
            "fetal_bradycardia": np.random.random() > 0.9,
            "fetal_tachycardia": np.random.random() > 0.95,
            "low_variability": np.random.random() > 0.85,
            "uterine_tachysystole": np.random.random() > 0.92,
            "any_pathology": np.random.random() > 0.8
        }
        
        data.append({
            **features,
            **labels
        })
    
    return data

def train_quick_models():
    """Быстрое обучение моделей на тестовых данных"""
    print("=== БЫСТРЫЙ ТЕСТ ОБУЧЕНИЯ МОДЕЛЕЙ ===")
    
    # Генерируем тестовые данные
    data = generate_test_data(1000)
    df = pd.DataFrame(data)
    
    print(f"Создан датасет: {df.shape}")
    print("Колонки:", list(df.columns))
    
    # Признаки
    feature_cols = ["fhr_mean", "fhr_std", "uc_mean", "uc_std", "accel_rate", "decel_rate", "variability_mean"]
    X = df[feature_cols].values
    
    print(f"Признаки: {feature_cols}")
    print(f"X shape: {X.shape}")
    print(f"NaN в X: {np.isnan(X).sum()}")
    
    # Обучаем модели для каждого горизонта
    horizons = [10, 30, 60]
    labels = ["fetal_bradycardia", "fetal_tachycardia", "low_variability", "uterine_tachysystole", "any_pathology"]
    
    for horizon in horizons:
        print(f"\n--- Обучение модели для {horizon} минут ---")
        
        pipelines = {}
        
        for label in labels:
            print(f"  Обучаем {label}...")
            y = df[label].astype(int)
            
            # Проверяем баланс классов
            print(f"    Классы: {y.value_counts().to_dict()}")
            
            # Создаем пайплайн
            pipeline = Pipeline([
                ('imputer', SimpleImputer(strategy='median')),
                ('scaler', StandardScaler()),
                ('classifier', GradientBoostingClassifier(
                    n_estimators=10,  # Мало для быстрого обучения
                    random_state=42
                ))
            ])
            
            # Обучаем
            try:
                pipeline.fit(X, y)
                
                # Тестируем
                X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
                pipeline.fit(X_train, y_train)
                y_pred = pipeline.predict(X_test)
                y_proba = pipeline.predict_proba(X_test)[:, 1]
                
                # Метрики
                auc = roc_auc_score(y_test, y_proba) if len(np.unique(y_test)) > 1 else 0.0
                print(f"    AUC: {auc:.3f}")
                
                pipelines[label] = pipeline
                
            except Exception as e:
                print(f"    ОШИБКА: {e}")
                continue
        
        # Сохраняем модель
        model_pack = {
            "pipelines": pipelines,
            "labels": labels,
            "feature_names": feature_cols,
            "window_sec": 300,
            "horizon_min": horizon
        }
        
        filename = f"quick_forecast_model_{horizon}.pkl"
        joblib.dump(model_pack, filename)
        print(f"  Сохранено: {filename}")
        print(f"  Обучено моделей: {len(pipelines)}")
    
    print("\n=== ТЕСТ ЗАВЕРШЕН ===")
    print("Файлы моделей:")
    for horizon in horizons:
        filename = f"quick_forecast_model_{horizon}.pkl"
        if os.path.exists(filename):
            print(f"  OK {filename}")
        else:
            print(f"  FAIL {filename}")

if __name__ == "__main__":
    train_quick_models()
