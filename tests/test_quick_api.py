#!/usr/bin/env python3
"""
Тест API с быстрыми моделями прогнозирования
"""

import requests
import json
import time

def test_stream_with_forecasts():
    """Тестирует поток с прогнозами"""
    print("=== ТЕСТ ПОТОКА С ПРОГНОЗАМИ ===")
    
    url = "http://176.108.250.117:8081/stream/patient/001"
    
    try:
        print(f"Подключаемся к {url}...")
        response = requests.get(url, stream=True, timeout=10)
        
        if response.status_code != 200:
            print(f"Ошибка HTTP: {response.status_code}")
            return
        
        print("Поток подключен, читаем данные...")
        
        count = 0
        for line in response.iter_lines():
            if line:
                try:
                    # Декодируем строку
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        json_str = line_str[6:]  # Убираем 'data: '
                        data = json.loads(json_str)
                        
                        count += 1
                        print(f"\n--- Образец {count} ---")
                        print(f"Время: {data.get('timestamp', 'N/A')}")
                        print(f"FHR: {data.get('fhr_bpm', 'N/A')}")
                        print(f"UC: {data.get('uc_mmHg', 'N/A')}")
                        print(f"Патология: {data.get('pathology', 'N/A')}")
                        
                        # Проверяем поля прогнозирования
                        forecast_fields = [k for k in data.keys() if k.startswith('forecast_')]
                        if forecast_fields:
                            print(f"Поля прогнозирования ({len(forecast_fields)}):")
                            for field in sorted(forecast_fields):
                                value = data[field]
                                if value is not None and value != []:
                                    print(f"  {field}: {value}")
                        else:
                            print("Поля прогнозирования: НЕТ")
                        
                        # Останавливаемся после 5 образцов
                        if count >= 5:
                            break
                            
                except Exception as e:
                    print(f"Ошибка парсинга: {e}")
                    continue
        
        print(f"\n=== ТЕСТ ЗАВЕРШЕН ({count} образцов) ===")
        
    except requests.exceptions.RequestException as e:
        print(f"Ошибка подключения: {e}")
    except KeyboardInterrupt:
        print("\nТест прерван пользователем")

if __name__ == "__main__":
    test_stream_with_forecasts()
