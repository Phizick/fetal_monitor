#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для проверки работы препаратов в стриме
"""

import asyncio
import httpx
import json
import time

async def test_medications_in_stream():
    """Тестирует, как препараты влияют на стрим данных"""
    
    # 1. Создаем пациентку с препаратами
    print("=== 1. Создание пациентки с препаратами ===")
    create_url = "http://localhost:8081/patients"
    create_data = {
        "full_name": "Тестовая Пациентка с Препаратами",
        "medications": ["гинипрал", "магнезия"]
    }
    
    patient_id = None
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(create_url, json=create_data, timeout=30.0)
            
            if response.status_code == 200:
                patient = response.json()
                patient_id = patient["id"]
                print(f"Пациентка создана: {patient_id}")
                print(f"Препараты: {patient.get('medications', [])}")
            else:
                print(f"Ошибка создания пациентки: {response.status_code}")
                return
    except Exception as e:
        print(f"Ошибка: {e}")
        return
    
    # 2. Получаем несколько сэмплов из стрима
    print("\n=== 2. Получение данных из стрима ===")
    stream_url = f"http://localhost:8081/stream/patient/{patient_id}"
    
    try:
        async with httpx.AsyncClient() as client:
            # Получаем несколько сэмплов
            samples = []
            async with client.stream('GET', stream_url) as response:
                if response.status_code == 200:
                    count = 0
                    async for line in response.aiter_lines():
                        if line.startswith('data: '):
                            data = json.loads(line[6:])  # убираем 'data: '
                            samples.append(data)
                            count += 1
                            print(f"Сэмпл {count}: FHR={data['fhr_bpm']}, UC={data['uc_mmHg']}, Препараты={data.get('medications', [])}")
                            
                            if count >= 5:  # получаем 5 сэмплов
                                break
                else:
                    print(f"Ошибка получения стрима: {response.status_code}")
                    return
    except Exception as e:
        print(f"Ошибка получения стрима: {e}")
        return
    
    # 3. Анализируем данные
    print("\n=== 3. Анализ данных ===")
    if samples:
        print(f"Получено {len(samples)} сэмплов")
        
        # Проверяем, есть ли препараты в данных
        medications_found = set()
        for sample in samples:
            medications_found.update(sample.get('medications', []))
        
        print(f"Препараты в стриме: {list(medications_found)}")
        
        if medications_found:
            print("[OK] Препараты успешно передаются в стрим!")
        else:
            print("[ERROR] Препараты НЕ передаются в стрим")
        
        # Анализируем влияние препаратов на данные
        fhr_values = [s['fhr_bpm'] for s in samples]
        uc_values = [s['uc_mmHg'] for s in samples]
        
        print(f"FHR диапазон: {min(fhr_values)}-{max(fhr_values)} bpm")
        print(f"UC диапазон: {min(uc_values):.1f}-{max(uc_values):.1f} mmHg")
        
        # Проверяем влияние магнезии (должна снижать UC)
        if 'magnesium' in medications_found:
            print("[OK] Магнезия применена - должна снижать тонус матки")
        
        # Проверяем влияние гинипрала (должен снижать схватки)
        if 'ginipral' in medications_found:
            print("[OK] Гинипрал применен - должен снижать схватки")
    
    print("\n=== Тест завершен ===")

async def test_medication_update():
    """Тестирует обновление препаратов для существующей пациентки"""
    
    # 1. Создаем пациентку без препаратов
    print("\n=== Тест обновления препаратов ===")
    create_data = {
        "full_name": "Пациентка для Обновления",
        "medications": []
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post("http://localhost:8081/patients", json=create_data, timeout=30.0)
            
            if response.status_code == 200:
                patient = response.json()
                patient_id = patient["id"]
                print(f"Пациентка создана: {patient_id}")
                
                # 2. Обновляем препараты
                print("Обновляем препараты...")
                update_data = {
                    "medications": ["окситоцин"]
                }
                
                update_response = await client.put(
                    f"http://localhost:8081/sim/medications/{patient_id}",
                    json=update_data,
                    timeout=30.0
                )
                
                if update_response.status_code == 200:
                    result = update_response.json()
                    print(f"Препараты обновлены: {result['medications']}")
                    print("[OK] Обновление препаратов работает!")
                else:
                    print(f"Ошибка обновления: {update_response.status_code}")
            else:
                print(f"Ошибка создания: {response.status_code}")
    except Exception as e:
        print(f"Ошибка: {e}")

if __name__ == "__main__":
    print("Запуск тестов препаратов...")
    asyncio.run(test_medications_in_stream())
    asyncio.run(test_medication_update())
