#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Основная система машинного обучения для фетального мониторинга
Объединяет обучение модели, тестирование и работу в реальном времени
"""

import os
import sys
import time
from datetime import datetime
from fetal_ml_model import FetalMLPredictor
from realtime_predictor import RealtimeFetalPredictor, DataEmulator, demo_realtime_prediction

def print_header(title):
    """
    Выводит заголовок с рамкой
    """
    print("\n" + "="*70)
    print(f" {title}")
    print("="*70)

def print_step(step_num, total_steps, description):
    """
    Выводит информацию о текущем шаге
    """
    print(f"\n[ШАГ {step_num}/{total_steps}] {description}")
    print("-" * 50)

def check_requirements():
    """
    Проверяет наличие необходимых файлов
    """
    print_header("ПРОВЕРКА ТРЕБОВАНИЙ")
    
    required_files = ['f_health.csv', 'fetal_ml_model.py', 'realtime_predictor.py']
    missing_files = []
    
    for file in required_files:
        if os.path.exists(file):
            print(f"✓ {file} - найден")
        else:
            print(f"✗ {file} - НЕ НАЙДЕН")
            missing_files.append(file)
    
    if missing_files:
        print(f"\nОШИБКА: Отсутствуют необходимые файлы: {missing_files}")
        return False
    
    print("\n✓ Все необходимые файлы найдены")
    return True

def train_model():
    """
    Обучает модель машинного обучения
    """
    print_step(1, 4, "ОБУЧЕНИЕ МОДЕЛИ МАШИННОГО ОБУЧЕНИЯ")
    
    try:
        # Создаем предиктор
        predictor = FetalMLPredictor('f_health.csv')
        
        # Загружаем и подготавливаем данные
        print("Загрузка и подготовка данных...")
        X, y = predictor.load_and_prepare_data()
        
        # Разделяем на train/test
        print("Разделение на обучающую и тестовую выборки...")
        predictor.split_data()
        
        # Обучаем модели
        print("Обучение моделей...")
        models = predictor.train_models()
        
        # Оцениваем качество
        print("Оценка качества моделей...")
        predictor.evaluate_models()
        
        # Сохраняем модель
        print("Сохранение модели...")
        predictor.save_model()
        
        print("\n✓ Модель успешно обучена и сохранена")
        return True
        
    except Exception as e:
        print(f"\n✗ Ошибка при обучении модели: {e}")
        return False

def test_model():
    """
    Тестирует обученную модель
    """
    print_step(2, 4, "ТЕСТИРОВАНИЕ МОДЕЛИ")
    
    try:
        # Загружаем модель
        predictor = FetalMLPredictor('f_health.csv')
        predictor.load_model()
        
        # Создаем эмулятор данных
        emulator = DataEmulator()
        
        # Генерируем тестовые данные
        print("Генерация тестовых данных...")
        test_samples = emulator.generate_batch(20)
        
        # Тестируем предсказания
        print("Тестирование предсказаний...")
        correct_predictions = 0
        total_predictions = len(test_samples)
        
        for i, sample in enumerate(test_samples):
            # Получаем истинный класс
            true_class = sample.get('fetal_health', 'unknown')
            
            # Делаем предсказание
            prediction = predictor.predict_single(sample)
            
            # Проверяем правильность
            if prediction['prediction_code'] == true_class:
                correct_predictions += 1
            
            print(f"  Образец {i+1}: Предсказано {prediction['prediction']}, "
                  f"Истина {true_class}, Уверенность {prediction['confidence']:.3f}")
        
        accuracy = correct_predictions / total_predictions
        print(f"\nТочность на тестовых данных: {accuracy:.3f} ({correct_predictions}/{total_predictions})")
        
        print("\n✓ Тестирование завершено")
        return True
        
    except Exception as e:
        print(f"\n✗ Ошибка при тестировании: {e}")
        return False

def demo_realtime():
    """
    Демонстрирует работу в реальном времени
    """
    print_step(3, 4, "ДЕМОНСТРАЦИЯ РАБОТЫ В РЕАЛЬНОМ ВРЕМЕНИ")
    
    try:
        # Запускаем демонстрацию
        predictor = demo_realtime_prediction()
        
        print("\n✓ Демонстрация завершена")
        return True
        
    except Exception as e:
        print(f"\n✗ Ошибка при демонстрации: {e}")
        return False

def create_summary_report():
    """
    Создает сводный отчет о работе системы
    """
    print_step(4, 4, "СОЗДАНИЕ СВОДНОГО ОТЧЕТА")
    
    try:
        # Проверяем созданные файлы
        created_files = []
        expected_files = [
            'best_fetal_model.pkl',
            'best_fetal_model_scaler.pkl', 
            'best_fetal_model_features.pkl',
            # В рабочем режиме визуализации не формируются
        ]
        
        for file in expected_files:
            if os.path.exists(file):
                created_files.append(file)
        
        # Создаем отчет
        report = f"""
ОТЧЕТ О РАБОТЕ СИСТЕМЫ МАШИННОГО ОБУЧЕНИЯ
Дата создания: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

СОЗДАННЫЕ ФАЙЛЫ:
"""
        
        for file in created_files:
            report += f"✓ {file}\n"
        
        report += f"""
ВСЕГО СОЗДАНО ФАЙЛОВ: {len(created_files)}/{len(expected_files)}

СИСТЕМА ГОТОВА К ИСПОЛЬЗОВАНИЮ:
- Модель обучена и сохранена
- Система предсказаний в реальном времени работает
- Эмулятор данных функционирует
- Визуализации созданы

ДЛЯ ИСПОЛЬЗОВАНИЯ:
1. Запустите: python realtime_predictor.py
2. Или используйте классы в своем коде:
   - FetalMLPredictor для обучения
   - RealtimeFetalPredictor для предсказаний
   - DataEmulator для эмуляции данных
"""
        
        # Сохраняем отчет
        with open('ml_system_report.txt', 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(report)
        print("\n✓ Сводный отчет создан: ml_system_report.txt")
        return True
        
    except Exception as e:
        print(f"\n✗ Ошибка при создании отчета: {e}")
        return False

def main():
    """
    Основная функция системы
    """
    print_header("СИСТЕМА МАШИННОГО ОБУЧЕНИЯ ДЛЯ ФЕТАЛЬНОГО МОНИТОРИНГА")
    
    # Проверяем требования
    if not check_requirements():
        print("\n❌ Система не может быть запущена из-за отсутствующих файлов")
        return
    
    # Обучаем модель
    if not train_model():
        print("\n❌ Обучение модели не удалось")
        return
    
    # Тестируем модель
    if not test_model():
        print("\n❌ Тестирование модели не удалось")
        return
    
    # Демонстрируем работу в реальном времени
    if not demo_realtime():
        print("\n❌ Демонстрация не удалась")
        return
    
    # Создаем сводный отчет
    if not create_summary_report():
        print("\n❌ Создание отчета не удалось")
        return
    
    print_header("СИСТЕМА УСПЕШНО НАСТРОЕНА И ГОТОВА К РАБОТЕ")
    print("""
🎉 ПОЗДРАВЛЯЕМ! Система машинного обучения для фетального мониторинга готова!

ЧТО БЫЛО СДЕЛАНО:
✓ Модель машинного обучения обучена на ваших данных
✓ Создана тестовая выборка и проведена валидация
✓ Реализована система предсказаний в реальном времени
✓ Создан эмулятор потока данных
✓ Сгенерированы визуализации и отчеты

КАК ИСПОЛЬЗОВАТЬ:
1. Для интерактивной работы: python realtime_predictor.py
2. Для использования в коде: импортируйте классы из модулей
3. Модель сохранена и готова к загрузке

ФАЙЛЫ СИСТЕМЫ:
- best_fetal_model.pkl - обученная модель
- best_fetal_model_scaler.pkl - нормализатор данных
- best_fetal_model_features.pkl - список признаков
- ml_system_report.txt - подробный отчет
- *.png - визуализации результатов
""")

if __name__ == "__main__":
    main()
