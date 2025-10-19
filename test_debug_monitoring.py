#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для отладки проблем с мониторингом
"""

import asyncio
import httpx
import json

async def test_monitoring_debug():
    """Тестирует мониторинг с детальным логированием"""
    
    # 1. Создаем пациентку
    print("=== 1. Создание пациентки ===")
    create_url = "http://localhost:8081/patients"
    create_data = {
        "full_name": "Оксана Оксанина",
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
                print(f"Токен мониторинга: {patient.get('monitoring_token', 'НЕТ')}")
            else:
                print(f"Ошибка создания пациентки: {response.status_code}")
                print(f"Ответ: {response.text}")
                return
    except Exception as e:
        print(f"Ошибка: {e}")
        return
    
    # 2. Запускаем мониторинг
    print("\n=== 2. Запуск мониторинга ===")
    start_url = f"http://localhost:8081/monitoring/start/{patient_id}"
    
    try:
        async with httpx.AsyncClient() as client:
            print(f"Отправляем запрос на: {start_url}")
            response = await client.post(start_url, timeout=30.0)
            
            print(f"Статус ответа: {response.status_code}")
            print(f"Ответ: {response.text}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"Мониторинг запущен успешно!")
                print(f"Session ID: {result.get('sessionId')}")
                print(f"Start Time: {result.get('startTime')}")
            else:
                print(f"Ошибка запуска мониторинга: {response.status_code}")
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Запуск отладочного теста мониторинга...")
    asyncio.run(test_monitoring_debug())
