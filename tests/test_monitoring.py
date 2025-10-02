#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для проверки эндпоинтов мониторинга
"""

import asyncio
import httpx
import json

async def test_monitoring_flow():
    """Тестирует полный цикл мониторинга"""
    
    # 1. Создаем пациентку
    print("=== 1. Создание пациентки ===")
    create_url = "http://localhost:8081/patients"
    create_data = {
        "full_name": "Тестовая Пациентка",
        "medications": ["гинипрал"]
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(create_url, json=create_data, timeout=30.0)
            
            if response.status_code == 200:
                patient = response.json()
                patient_id = patient["id"]
                monitoring_token = patient["monitoring_token"]
                print(f"Пациентка создана: {patient_id}")
                print(f"Токен мониторинга: {monitoring_token}")
            else:
                print(f"Ошибка создания пациентки: {response.status_code}")
                return
    except Exception as e:
        print(f"Ошибка: {e}")
        return
    
    # 2. Запускаем мониторинг
    print("\n=== 2. Запуск мониторинга ===")
    start_url = f"http://localhost:8081/monitoring/start/{patient_id}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(start_url, timeout=30.0)
            
            if response.status_code == 200:
                result = response.json()
                session_id = result["sessionId"]
                print(f"[OK] Мониторинг запущен: {session_id}")
                print(f"[OK] Время начала: {result['startTime']}")
            else:
                print(f"[ERROR] Ошибка запуска мониторинга: {response.status_code}")
                print(f"Ответ: {response.text}")
                return
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
        return
    
    # 3. Ждем немного
    print("\n=== 3. Ожидание 5 секунд ===")
    await asyncio.sleep(5)
    
    # 4. Останавливаем мониторинг
    print("\n=== 4. Остановка мониторинга ===")
    stop_url = f"http://localhost:8081/monitoring/stop/{patient_id}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(stop_url, timeout=30.0)
            
            if response.status_code == 200:
                result = response.json()
                print(f"[OK] Мониторинг остановлен: {result['sessionId']}")
                print(f"[OK] Время остановки: {result['stopTime']}")
            else:
                print(f"[ERROR] Ошибка остановки мониторинга: {response.status_code}")
                print(f"Ответ: {response.text}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    print("\n=== Тест завершен ===")

async def test_multiple_patients():
    """Тестирует создание нескольких пациенток и их симуляторов"""
    print("\n=== Тест множественных пациенток ===")
    
    patient_ids = []
    
    # Создаем 3 пациентки
    for i in range(3):
        create_data = {
            "full_name": f"Пациентка {i+1}",
            "medications": ["гинипрал"] if i % 2 == 0 else ["магнезия"]
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post("http://localhost:8081/patients", json=create_data, timeout=30.0)
                
                if response.status_code == 200:
                    patient = response.json()
                    patient_id = patient["id"]
                    patient_ids.append(patient_id)
                    print(f"[OK] Пациентка {i+1} создана: {patient_id}")
                else:
                    print(f"[ERROR] Ошибка создания пациентки {i+1}: {response.status_code}")
        except Exception as e:
            print(f"[ERROR] Ошибка: {e}")
    
    print(f"Создано {len(patient_ids)} пациенток")
    print("Теперь каждая пациентка будет иметь свой уникальный симулятор с разными данными")

if __name__ == "__main__":
    print("Запуск тестов мониторинга...")
    asyncio.run(test_monitoring_flow())
    asyncio.run(test_multiple_patients())
