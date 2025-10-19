#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для проверки эндпоинта остановки мониторинга
"""

import asyncio
import httpx
import json

async def test_stop_monitoring():
    """Тестирует полный цикл: создание -> запуск -> остановка мониторинга"""
    
    # 1. Создаем пациентку
    print("=== 1. Создание пациентки ===")
    create_url = "http://localhost:8081/patients"
    create_data = {
        "full_name": "Тестовая Пациентка для Остановки",
        "medications": ["гинипрал"]
    }
    
    patient_id = None
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(create_url, json=create_data, timeout=30.0)
            
            if response.status_code == 200:
                patient = response.json()
                patient_id = patient["id"]
                print(f"Пациентка создана: {patient_id}")
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
                print(f"Мониторинг запущен: {session_id}")
            else:
                print(f"Ошибка запуска мониторинга: {response.status_code}")
                print(f"Ответ: {response.text}")
                return
    except Exception as e:
        print(f"Ошибка: {e}")
        return
    
    # 3. Ждем немного
    print("\n=== 3. Ожидание 3 секунды ===")
    await asyncio.sleep(3)
    
    # 4. Останавливаем мониторинг
    print("\n=== 4. Остановка мониторинга ===")
    stop_url = f"http://localhost:8081/monitoring/stop/{patient_id}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(stop_url, timeout=30.0)
            
            if response.status_code == 200:
                result = response.json()
                print(f"Мониторинг остановлен: {result['sessionId']}")
                print(f"Время остановки: {result['stopTime']}")
                print("УСПЕХ! Эндпоинт остановки работает корректно")
            else:
                print(f"Ошибка остановки мониторинга: {response.status_code}")
                print(f"Ответ: {response.text}")
    except Exception as e:
        print(f"Ошибка: {e}")
    
    print("\n=== Тест завершен ===")

async def test_stop_without_start():
    """Тестирует остановку мониторинга без предварительного запуска"""
    print("\n=== Тест остановки без запуска ===")
    
    # Создаем пациентку
    create_data = {
        "full_name": "Пациентка без мониторинга",
        "medications": []
    }
    
    try:
        async with httpx.AsyncClient() as client:
            # Создаем пациентку
            response = await client.post("http://localhost:8081/patients", json=create_data, timeout=30.0)
            if response.status_code == 200:
                patient = response.json()
                patient_id = patient["id"]
                print(f"Пациентка создана: {patient_id}")
                
                # Пытаемся остановить мониторинг
                stop_response = await client.post(f"http://localhost:8081/monitoring/stop/{patient_id}", timeout=30.0)
                
                if stop_response.status_code == 400:
                    print("ОК: Получена ожидаемая ошибка 400 (мониторинг не запущен)")
                else:
                    print(f"Неожиданный ответ: {stop_response.status_code}")
                    print(f"Ответ: {stop_response.text}")
            else:
                print(f"Ошибка создания пациентки: {response.status_code}")
    except Exception as e:
        print(f"Ошибка: {e}")

if __name__ == "__main__":
    print("Запуск тестов остановки мониторинга...")
    asyncio.run(test_stop_monitoring())
    asyncio.run(test_stop_without_start())
