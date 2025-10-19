#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для отладки стрима
"""

import asyncio
import httpx
import json

async def test_stream_debug():
    """Тестирует стрим с отладкой"""
    
    # 1. Создаем пациентку с препаратами
    print("=== 1. Создание пациентки с препаратами ===")
    create_data = {
        "full_name": "Отладочная Пациентка",
        "medications": ["гинипрал", "магнезия"]
    }
    
    patient_id = None
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post("http://localhost:8081/patients", json=create_data, timeout=30.0)
            
            if response.status_code == 200:
                patient = response.json()
                patient_id = patient["id"]
                print(f"Пациентка создана: {patient_id}")
                print(f"Препараты: {patient.get('medications', [])}")
            else:
                print(f"Ошибка создания: {response.status_code}")
                return
    except Exception as e:
        print(f"Ошибка: {e}")
        return
    
    # 2. Получаем один сэмпл из стрима
    print("\n=== 2. Получение сэмпла из стрима ===")
    stream_url = f"http://localhost:8081/stream/patient/{patient_id}"
    
    try:
        async with httpx.AsyncClient() as client:
            async with client.stream('GET', stream_url) as response:
                if response.status_code == 200:
                    count = 0
                    async for line in response.aiter_lines():
                        if line.startswith('data: '):
                            data = json.loads(line[6:])
                            print(f"Сэмпл {count + 1}: FHR={data['fhr_bpm']}, UC={data['uc_mmHg']}, Препараты={data.get('medications', [])}")
                            count += 1
                            if count >= 1:  # получаем только 1 сэмпл
                                break
                else:
                    print(f"Ошибка стрима: {response.status_code}")
    except Exception as e:
        print(f"Ошибка стрима: {e}")

if __name__ == "__main__":
    print("Запуск отладки стрима...")
    asyncio.run(test_stream_debug())
