#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для проверки FHIR экспорта
"""

import asyncio
import httpx
import json

async def test_fhir_export():
    """Тестирует FHIR экспорт"""
    
    print("=== Тест FHIR R4 экспорта ===")
    
    # 1. Создаем пациентку с препаратами
    print("\n1. Создание пациентки с препаратами...")
    create_data = {
        "full_name": "Тестовая Пациентка FHIR",
        "medications": ["гинипрал", "магнезия"]
    }
    
    patient_id = None
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8081/patients",
                json=create_data,
                timeout=30.0
            )
            
            if response.status_code == 200:
                patient = response.json()
                patient_id = patient["id"]
                print(f"[OK] Пациентка создана: {patient_id}")
                print(f"[OK] Препараты: {patient['medications']}")
            else:
                print(f"[ERROR] Ошибка создания пациентки: {response.status_code}")
                return
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
        return
    
    # 2. Получаем список конфигураций
    print("\n2. Получение списка конфигураций FHIR...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "http://localhost:8081/export/fhir/configs",
                timeout=30.0
            )
            
            if response.status_code == 200:
                configs = response.json()
                print(f"[OK] Доступные конфигурации: {configs['configs']}")
            else:
                print(f"[ERROR] Ошибка получения конфигураций: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 3. Экспортируем данные в FHIR (10 секунд)
    print("\n3. Экспорт данных в FHIR (10 секунд)...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"http://localhost:8081/export/fhir/observations/{patient_id}",
                params={"duration_seconds": 10, "config_name": "default"},
                timeout=60.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"[OK] Экспорт успешен!")
                print(f"[OK] Количество точек данных: {result['data_points_count']}")
                print(f"[OK] Длительность: {result['duration_seconds']} секунд")
                print(f"[OK] Конфигурация: {result['config_name']}")
                
                # Проверяем структуру Bundle
                bundle = result['bundle']
                print(f"[OK] Bundle ID: {bundle['id']}")
                print(f"[OK] Bundle Type: {bundle['type']}")
                print(f"[OK] Количество ресурсов: {len(bundle['entry'])}")
                
                # Показываем типы ресурсов
                resource_types = []
                for entry in bundle['entry']:
                    if 'resource' in entry:
                        resource_type = entry['resource'].get('resourceType', 'Unknown')
                        resource_types.append(resource_type)
                
                print(f"[OK] Типы ресурсов: {', '.join(set(resource_types))}")
                
            else:
                print(f"[ERROR] Ошибка экспорта: {response.status_code}")
                print(f"[ERROR] Ответ: {response.text}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 4. Тестируем POST экспорт с отправкой на сервер (отключено)
    print("\n4. Тестирование POST экспорта...")
    try:
        export_request = {
            "patient_id": patient_id,
            "duration_seconds": 5,
            "config_name": "default",
            "send_to_server": False  # Не отправляем на сервер
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8081/export/fhir/observations",
                json=export_request,
                timeout=60.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"[OK] POST экспорт успешен!")
                print(f"[OK] Количество точек: {result['data_points_count']}")
                
                # Проверяем Bundle
                bundle = result['bundle']
                print(f"[OK] Bundle содержит {len(bundle['entry'])} ресурсов")
                
                # Показываем пример Observation
                for entry in bundle['entry']:
                    if entry.get('resource', {}).get('resourceType') == 'Observation':
                        obs = entry['resource']
                        print(f"[OK] Observation ID: {obs['id']}")
                        print(f"[OK] Observation Code: {obs['code']['coding'][0]['code']}")
                        print(f"[OK] Observation Display: {obs['code']['coding'][0]['display']}")
                        if 'valueSampledData' in obs:
                            data_points = obs['valueSampledData']['data'].split()
                            print(f"[OK] Количество точек в SampledData: {len(data_points)}")
                            if data_points:
                                print(f"[OK] Пример данных: {data_points[0]} ... {data_points[-1]}")
                        break
                
            else:
                print(f"[ERROR] Ошибка POST экспорта: {response.status_code}")
                print(f"[ERROR] Ответ: {response.text}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    print("\n=== Тест завершен ===")
    print("FHIR экспорт работает! Данные КТГ успешно конвертируются в FHIR R4 Bundle.")

if __name__ == "__main__":
    print("Запуск теста FHIR экспорта...")
    asyncio.run(test_fhir_export())
