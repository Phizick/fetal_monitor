#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Система предсказаний в реальном времени для фетального мониторинга
Эмулирует поток данных и предоставляет API для предсказаний
"""

import pandas as pd
import numpy as np
import os
from collections import deque
import time
import json
from datetime import datetime
from fetal_ml_model import FetalMLPredictor
import joblib
import warnings
warnings.filterwarnings('ignore')
try:
    import onnxruntime as ort  # опционально, если хотим использовать ONNX Runtime
except Exception:
    ort = None

class RealtimeFetalPredictor:
    """
    Класс для предсказаний в реальном времени
    """
    
    def __init__(self, model_name='best_fetal_model'):
        """
        Инициализация предиктора реального времени
        Args:
            model_name (str): имя сохраненной модели
        """
        self.model_name = model_name
        # Загружаем признаки для выравнивания порядка входов
        try:
            self.feature_names = joblib.load(f"{model_name}_features.pkl")
        except Exception:
            self.feature_names = None
        # Предрасчёт медиан по признакам из обучающего CSV (для заполнения NaN, если модель без имьютера)
        self.feature_medians = {}
        try:
            if self.feature_names:
                df_src = pd.read_csv('f_health.csv')
                for col in self.feature_names:
                    if col in df_src.columns:
                        try:
                            self.feature_medians[col] = float(pd.to_numeric(df_src[col], errors='coerce').median())
                        except Exception:
                            pass
        except Exception:
            pass

        # ONNX Runtime с тюнингом потоков (если есть модель .onnx)
        self.ort_session = None
        self.ort_input_name = None
        if ort is not None:
            onnx_path = f"{model_name}.int8.onnx"
            if not os.path.exists(onnx_path):
                # fallback на fp32, если нет int8
                alt = f"{model_name}.onnx"
                onnx_path = alt if os.path.exists(alt) else None
            if onnx_path:
                try:
                    so = ort.SessionOptions()
                    # 4 vCPU: 2 потока intra-op, 1 inter-op
                    so.intra_op_num_threads = 2
                    so.inter_op_num_threads = 1
                    self.ort_session = ort.InferenceSession(
                        onnx_path,
                        sess_options=so,
                        providers=["CPUExecutionProvider"],
                    )
                    self.ort_input_name = self.ort_session.get_inputs()[0].name
                except Exception:
                    self.ort_session = None
                    self.ort_input_name = None

        # Fallback: sklearn-пайплайн из .pkl
        self.predictor = None
        if self.ort_session is None:
            self.predictor = FetalMLPredictor('f_health.csv')
            self.predictor.load_model(model_name)
            if self.feature_names is None:
                self.feature_names = self.predictor.feature_names
        self.prediction_history = []
        self.alerts = []
        # Буфер последних точек для прогноза
        self.buffer = []
        self.buffer_max_seconds = 300  # 5 минут контекста, подстроим после загрузки форекаст-модели
        # Загрузка моделей прогноза (если есть)
        self.forecast_models = {}
        for h in (10, 30, 60):
            try:
                fm = joblib.load(f"forecast_model_{h}.pkl")
                self.forecast_models[h] = fm
                # Подстроим окно буфера от модели
                self.buffer_max_seconds = max(self.buffer_max_seconds, fm.get("window_sec", 300))
                print(f"✅ Модель прогноза {h}мин загружена")
            except FileNotFoundError:
                print(f"⚠️  Модель прогноза {h}мин не найдена - прогнозы отключены")
            except Exception as e:
                print(f"⚠️  Ошибка загрузки модели прогноза {h}мин: {e}")

    def get_diagnostics(self):
        """
        Возвращает информацию о загрузке моделей и провайдере инференса.
        """
        def _stat(path: str):
            try:
                st = os.stat(path)
                return {"exists": True, "size": st.st_size, "mtime": st.st_mtime}
            except Exception:
                return {"exists": False}

        model_pkl = f"{self.model_name}.pkl"
        features_pkl = f"{self.model_name}_features.pkl"
        onnx_fp32 = f"{self.model_name}.onnx"
        onnx_int8 = f"{self.model_name}.int8.onnx"

        active_source = {
            "type": "onnxruntime" if self.ort_session is not None else "sklearn_pkl",
            "path": onnx_int8 if self.ort_session is not None and os.path.exists(onnx_int8) else (
                onnx_fp32 if self.ort_session is not None else model_pkl
            ),
        }

        return {
            "inference_provider": "onnxruntime" if self.ort_session is not None else "sklearn",
            "onnx_input_name": self.ort_input_name,
            "feature_count": len(self.feature_names) if self.feature_names else None,
            "forecast_models_loaded": sorted(list(self.forecast_models.keys())) if self.forecast_models else [],
            "active_model_source": active_source,
            "files": {
                "classifier_pkl": _stat(model_pkl),
                "features_pkl": _stat(features_pkl),
                "onnx_fp32": _stat(onnx_fp32),
                "onnx_int8": _stat(onnx_int8),
                "forecast_10": _stat("forecast_model_10.pkl"),
                "forecast_30": _stat("forecast_model_30.pkl"),
                "forecast_60": _stat("forecast_model_60.pkl"),
            },
        }
        
    def predict_realtime(self, patient_data):
        """
        Предсказывает состояние плода в реальном времени
        Args:
            patient_data (dict): данные пациента
        Returns:
            dict: результат предсказания с рекомендациями
        """
        # Обновляем буфер для прогноза (если есть модели)
        self._update_buffer(patient_data)

        # Предсказываем текущее состояние
        if self.ort_session is not None and self.feature_names is not None:
            # Формируем X в нужном порядке признаков
            X = np.array([[float(patient_data.get(col, np.nan)) for col in self.feature_names]], dtype=np.float32)
            try:
                outputs = self.ort_session.run(None, {self.ort_input_name: X})
                # выбираем выход вероятностей (последняя размерность > 1)
                probs = None
                for out in outputs:
                    if isinstance(out, np.ndarray) and out.ndim >= 2 and out.shape[-1] >= 2:
                        probs = out
                        break
                if probs is None:
                    # если первый выход — логиты/класс, пробуем второй
                    probs = outputs[-1]
                prob_vec = probs[0].astype(float)
                # классы 1,2,3: Normal, Suspect, Pathological
                idx = int(np.argmax(prob_vec))
                class_names = {0: 'Normal', 1: 'Suspect', 2: 'Pathological'}
                code_map = {0: 1, 1: 2, 2: 3}
                prediction = {
                    'prediction': class_names.get(idx, 'Normal'),
                    'prediction_code': code_map.get(idx, 1),
                    'probabilities': {
                        'Normal': float(prob_vec[0]) if len(prob_vec) > 0 else 0.0,
                        'Suspect': float(prob_vec[1]) if len(prob_vec) > 1 else 0.0,
                        'Pathological': float(prob_vec[2]) if len(prob_vec) > 2 else 0.0,
                    },
                    'confidence': float(np.max(prob_vec)) if prob_vec.size else 0.0,
                }
            except Exception:
                # В случае ошибки — запасной путь через sklearn
                prediction = self.predictor.predict_single(patient_data) if self.predictor else {
                    'prediction': 'Normal', 'prediction_code': 1,
                    'probabilities': {'Normal': 1.0, 'Suspect': 0.0, 'Pathological': 0.0},
                    'confidence': 1.0,
                }
        else:
            # Заполняем пропуски медианами, если есть
            if isinstance(patient_data, dict) and self.feature_names:
                filled = {}
                for col in self.feature_names:
                    val = patient_data.get(col, np.nan)
                    if val is None or (isinstance(val, float) and np.isnan(val)):
                        if col in self.feature_medians:
                            val = self.feature_medians[col]
                    filled[col] = val
                patient_data = {**patient_data, **filled}
            prediction = self.predictor.predict_single(patient_data)
        
        # Добавляем временную метку
        prediction['timestamp'] = datetime.now().isoformat()
        prediction['patient_id'] = patient_data.get('patient_id', 'unknown')
        
        # Генерируем рекомендации
        recommendations = self._generate_recommendations(prediction)
        prediction['recommendations'] = recommendations
        
        # Проверяем на критические состояния
        if self._is_critical(prediction):
            alert = self._create_alert(prediction)
            self.alerts.append(alert)
            prediction['alert'] = alert
        
        # Прогнозы на горизонты
        prediction['forecasts'] = self._forecast_from_buffer()

        # Сохраняем в историю
        self.prediction_history.append(prediction)
        
        return prediction
    
    def _generate_recommendations(self, prediction):
        """
        Генерирует рекомендации на основе предсказания
        """
        pred_class = prediction['prediction']
        confidence = prediction['confidence']
        
        recommendations = []
        
        if pred_class == 'Normal':
            if confidence > 0.8:
                recommendations.append("Состояние плода в норме. Продолжить плановое наблюдение.")
            else:
                recommendations.append("Состояние плода в норме, но требуется дополнительный мониторинг.")
                
        elif pred_class == 'Suspect':
            recommendations.append("Обнаружены подозрительные признаки. Усилить мониторинг.")
            recommendations.append("Провести дополнительные исследования: УЗИ, допплерометрия.")
            recommendations.append("Рассмотреть возможность госпитализации.")
            
        elif pred_class == 'Pathological':
            recommendations.append("КРИТИЧЕСКОЕ СОСТОЯНИЕ! Немедленная госпитализация.")
            recommendations.append("Экстренное обследование и консилиум специалистов.")
            recommendations.append("Рассмотреть экстренное родоразрешение.")
        
        # Добавляем рекомендации по уверенности
        if confidence < 0.6:
            recommendations.append("Низкая уверенность в предсказании. Требуется повторное обследование.")
        
        return recommendations
    
    def _is_critical(self, prediction):
        """
        Проверяет, является ли состояние критическим
        """
        return (prediction['prediction'] == 'Pathological' or 
                (prediction['prediction'] == 'Suspect' and prediction['confidence'] > 0.8))

    def _update_buffer(self, patient_data):
        """Добавляет точку в буфер с ограничением по времени/размеру."""
        now_ts = time.time()
        entry = {
            "ts": now_ts,
            **{k: v for k, v in patient_data.items() if k != 'patient_id'}
        }
        self.buffer.append(entry)
        # Ограничиваем по времени
        min_ts = now_ts - self.buffer_max_seconds
        self.buffer = [x for x in self.buffer if x["ts"] >= min_ts]

    def _forecast_from_buffer(self):
        """Строит прогнозы по всем доступным горизонтом на основе буфера."""
        if not self.forecast_models or not self.buffer:
            return {}
        # Преобразуем буфер в фичи как в обучении
        # Нам нужны: fhr_bpm, uc_mmHg, accel, decel, variability_bpm
        # Здесь ожидается, что вход patient_data содержит эти поля (для интеграции с монитором)
        from fetal_forecasting import compute_window_features
        # Вытаскиваем только нужные ключи
        series_like = []
        for x in self.buffer:
            series_like.append({
                "fhr_bpm": x.get("fhr_bpm"),
                "uc_mmHg": x.get("uc_mmHg"),
                "accel": bool(x.get("accel", False)),
                "decel": bool(x.get("decel", False)),
                "variability_bpm": x.get("variability_bpm"),
            })
        feats = compute_window_features(deque(series_like, maxlen=len(series_like)))
        X = np.array([[
            feats.get("fhr_mean"), feats.get("fhr_std"), feats.get("uc_mean"), feats.get("uc_std"),
            feats.get("accel_rate"), feats.get("decel_rate"), feats.get("variability_mean")
        ]])
        forecasts: dict = {}
        for h, pack in self.forecast_models.items():
            try:
                # Новый формат: { pipelines: {label: Pipeline}, labels: [...], feature_names: [...], window_sec: int }
                if isinstance(pack, dict) and "pipelines" in pack:
                    label_names = pack.get("labels") or list(pack["pipelines"].keys())
                    horizon_key = f"{h}min"
                    forecasts[horizon_key] = {}
                    for label in label_names:
                        pipe = pack["pipelines"].get(label)
                        if pipe is None:
                            continue
                        try:
                            proba_vec = pipe.predict_proba(X)
                            p1 = float(proba_vec[0, 1]) if proba_vec.shape[1] > 1 else float(proba_vec[0, 0])
                            forecasts[horizon_key][label] = p1
                        except Exception:
                            continue
                # Старый формат совместимости: single 'pipeline'
                elif hasattr(pack, "predict_proba") or (isinstance(pack, dict) and pack.get("pipeline") is not None):
                    pipeline = pack if hasattr(pack, "predict_proba") else pack.get("pipeline")
                    proba_vec = pipeline.predict_proba(X)
                    p1 = float(proba_vec[0, 1]) if proba_vec.shape[1] > 1 else float(proba_vec[0, 0])
                    forecasts[f"{h}min_pathology_prob"] = p1
            except Exception:
                continue
        return forecasts
    
    def _create_alert(self, prediction):
        """
        Создает предупреждение для критических состояний
        """
        alert = {
            'timestamp': prediction['timestamp'],
            'patient_id': prediction['patient_id'],
            'severity': 'CRITICAL' if prediction['prediction'] == 'Pathological' else 'WARNING',
            'message': f"Критическое состояние: {prediction['prediction']}",
            'confidence': prediction['confidence'],
            'recommendations': prediction['recommendations']
        }
        return alert
    
    def get_prediction_history(self, patient_id=None, limit=100):
        """
        Возвращает историю предсказаний
        """
        if patient_id:
            history = [p for p in self.prediction_history if p['patient_id'] == patient_id]
        else:
            history = self.prediction_history
        
        return history[-limit:] if limit else history
    
    def get_alerts(self, severity=None):
        """
        Возвращает список предупреждений
        """
        if severity:
            return [a for a in self.alerts if a['severity'] == severity]
        return self.alerts
    
    def clear_alerts(self):
        """
        Очищает список предупреждений
        """
        self.alerts = []
    
    def get_statistics(self):
        """
        Возвращает статистику по предсказаниям
        """
        if not self.prediction_history:
            return {"message": "Нет данных для статистики"}
        
        # Подсчитываем распределение предсказаний
        predictions = [p['prediction'] for p in self.prediction_history]
        pred_counts = pd.Series(predictions).value_counts().to_dict()
        
        # Средняя уверенность
        avg_confidence = np.mean([p['confidence'] for p in self.prediction_history])
        
        # Количество предупреждений
        alert_counts = pd.Series([a['severity'] for a in self.alerts]).value_counts().to_dict()
        
        stats = {
            'total_predictions': len(self.prediction_history),
            'prediction_distribution': pred_counts,
            'average_confidence': avg_confidence,
            'total_alerts': len(self.alerts),
            'alert_distribution': alert_counts,
            'last_prediction': self.prediction_history[-1]['timestamp'] if self.prediction_history else None
        }
        
        return stats


class DataEmulator:
    """
    Класс для эмуляции потока данных в реальном времени
    """
    
    def __init__(self, csv_file='f_health.csv'):
        """
        Инициализация эмулятора данных
        Args:
            csv_file (str): путь к CSV файлу с данными
        """
        try:
            self.data = pd.read_csv(csv_file)
            self.current_index = 0
            self.feature_names = [col for col in self.data.columns if col != 'fetal_health']
            print(f"✅ Данные загружены из {csv_file}: {len(self.data)} записей")
        except FileNotFoundError:
            print(f"⚠️  Файл {csv_file} не найден, создаем заглушку...")
            self._create_dummy_data()
        except Exception as e:
            print(f"❌ Ошибка загрузки {csv_file}: {e}, создаем заглушку...")
            self._create_dummy_data()
    
    def _create_dummy_data(self):
        """
        Создает заглушку данных для работы без CSV файла
        """
        import numpy as np
        
        # Создаем фиктивные данные
        n_samples = 1000
        self.data = pd.DataFrame({
            'fhr_bpm': np.random.normal(130, 15, n_samples),  # FHR плода ~130
            'uc_mmHg': np.random.normal(30, 10, n_samples),
            'baseline_bpm': np.random.normal(130, 15, n_samples),  # Базовый FHR плода
            'variability_bpm': np.random.normal(10, 5, n_samples),
            'accel': np.random.choice([0, 1], n_samples, p=[0.8, 0.2]),
            'decel': np.random.choice([0, 1], n_samples, p=[0.9, 0.1]),
            'fetal_health': np.random.choice([0, 1, 2], n_samples, p=[0.7, 0.2, 0.1])
        })
        self.current_index = 0
        self.feature_names = [col for col in self.data.columns if col != 'fetal_health']
        print("⚠️  Используются фиктивные данные - ML функции ограничены")
        
    def generate_sample(self, patient_id=None):
        """
        Генерирует один образец данных
        Args:
            patient_id (str): ID пациента
        Returns:
            dict: данные пациента
        """
        # Берем следующий образец из данных
        if self.current_index >= len(self.data):
            self.current_index = 0  # Начинаем заново
        
        sample = self.data.iloc[self.current_index].copy()
        self.current_index += 1
        
        # Преобразуем в словарь
        patient_data = {
            'patient_id': patient_id or f"patient_{self.current_index}",
            **{col: sample[col] for col in self.feature_names}
        }
        
        return patient_data
    
    def generate_batch(self, n_samples, patient_ids=None):
        """
        Генерирует пакет образцов
        Args:
            n_samples (int): количество образцов
            patient_ids (list): список ID пациентов
        Returns:
            list: список данных пациентов
        """
        samples = []
        for i in range(n_samples):
            patient_id = patient_ids[i] if patient_ids and i < len(patient_ids) else None
            sample = self.generate_sample(patient_id)
            samples.append(sample)
        
        return samples
    
    def add_noise(self, sample, noise_level=0.05):
        """
        Добавляет шум к данным для эмуляции вариаций
        Args:
            sample (dict): данные пациента
            noise_level (float): уровень шума (0-1)
        Returns:
            dict: данные с шумом
        """
        noisy_sample = sample.copy()
        
        for key, value in sample.items():
            if key != 'patient_id' and isinstance(value, (int, float)):
                # Добавляем гауссов шум
                noise = np.random.normal(0, noise_level * abs(value))
                noisy_sample[key] = value + noise
        
        return noisy_sample


def demo_realtime_prediction():
    """
    Демонстрация работы системы предсказаний в реальном времени
    """
    print("ДЕМОНСТРАЦИЯ СИСТЕМЫ ПРЕДСКАЗАНИЙ В РЕАЛЬНОМ ВРЕМЕНИ")
    print("="*60)
    
    # Создаем предиктор
    predictor = RealtimeFetalPredictor()
    
    # Создаем эмулятор данных
    emulator = DataEmulator()
    
    print("Генерация тестовых данных и предсказаний...")
    print("-" * 40)
    
    # Генерируем несколько образцов
    for i in range(10):
        # Генерируем данные пациента
        patient_data = emulator.generate_sample(f"patient_{i+1}")
        
        # Добавляем шум для реалистичности
        patient_data = emulator.add_noise(patient_data, noise_level=0.02)
        
        # Делаем предсказание
        prediction = predictor.predict_realtime(patient_data)
        
        # Выводим результат
        print(f"\nПациент {prediction['patient_id']}:")
        print(f"  Предсказание: {prediction['prediction']}")
        print(f"  Уверенность: {prediction['confidence']:.3f}")
        print(f"  Вероятности: {prediction['probabilities']}")
        
        if 'alert' in prediction:
            print(f"  ⚠️  ПРЕДУПРЕЖДЕНИЕ: {prediction['alert']['message']}")
        
        print(f"  Рекомендации:")
        for rec in prediction['recommendations']:
            print(f"    - {rec}")
        
        # Небольшая пауза для эмуляции реального времени
        time.sleep(0.5)
    
    # Выводим статистику
    print("\n" + "="*60)
    print("СТАТИСТИКА ПРЕДСКАЗАНИЙ")
    print("="*60)
    
    stats = predictor.get_statistics()
    print(f"Всего предсказаний: {stats['total_predictions']}")
    print(f"Распределение предсказаний: {stats['prediction_distribution']}")
    print(f"Средняя уверенность: {stats['average_confidence']:.3f}")
    print(f"Всего предупреждений: {stats['total_alerts']}")
    
    if stats['alert_distribution']:
        print(f"Распределение предупреждений: {stats['alert_distribution']}")
    
    # Выводим предупреждения
    alerts = predictor.get_alerts()
    if alerts:
        print(f"\nАКТИВНЫЕ ПРЕДУПРЕЖДЕНИЯ:")
        for alert in alerts:
            print(f"  {alert['timestamp']}: {alert['message']} (уверенность: {alert['confidence']:.3f})")
    
    return predictor


def interactive_demo():
    """
    Интерактивная демонстрация системы
    """
    print("ИНТЕРАКТИВНАЯ ДЕМОНСТРАЦИЯ СИСТЕМЫ ПРЕДСКАЗАНИЙ")
    print("="*60)
    
    # Создаем предиктор
    predictor = RealtimeFetalPredictor()
    emulator = DataEmulator()
    
    while True:
        print("\nВыберите действие:")
        print("1. Сгенерировать случайного пациента")
        print("2. Показать статистику")
        print("3. Показать предупреждения")
        print("4. Очистить предупреждения")
        print("5. Выход")
        
        choice = input("\nВведите номер действия (1-5): ").strip()
        
        if choice == '1':
            # Генерируем случайного пациента
            patient_data = emulator.generate_sample()
            patient_data = emulator.add_noise(patient_data, noise_level=0.02)
            
            prediction = predictor.predict_realtime(patient_data)
            
            print(f"\nРезультат предсказания:")
            print(f"  Пациент: {prediction['patient_id']}")
            print(f"  Предсказание: {prediction['prediction']}")
            print(f"  Уверенность: {prediction['confidence']:.3f}")
            print(f"  Рекомендации:")
            for rec in prediction['recommendations']:
                print(f"    - {rec}")
            
            if 'alert' in prediction:
                print(f"  ⚠️  ПРЕДУПРЕЖДЕНИЕ: {prediction['alert']['message']}")
        
        elif choice == '2':
            stats = predictor.get_statistics()
            print(f"\nСтатистика:")
            print(f"  Всего предсказаний: {stats['total_predictions']}")
            print(f"  Распределение: {stats['prediction_distribution']}")
            print(f"  Средняя уверенность: {stats['average_confidence']:.3f}")
        
        elif choice == '3':
            alerts = predictor.get_alerts()
            if alerts:
                print(f"\nАктивные предупреждения ({len(alerts)}):")
                for alert in alerts:
                    print(f"  {alert['timestamp']}: {alert['message']}")
            else:
                print("\nНет активных предупреждений")
        
        elif choice == '4':
            predictor.clear_alerts()
            print("\nПредупреждения очищены")
        
        elif choice == '5':
            print("\nВыход из программы")
            break
        
        else:
            print("\nНеверный выбор. Попробуйте снова.")


if __name__ == "__main__":
    # Запускаем демонстрацию
    demo_realtime_prediction()
    
    # Запускаем интерактивную демонстрацию
    print("\n" + "="*60)
    interactive_demo()
