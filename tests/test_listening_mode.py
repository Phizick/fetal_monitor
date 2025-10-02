#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для проверки режима слушания Telegram бота
"""

import asyncio
import httpx
import json

async def test_listening_mode():
    """Тестирует режим слушания бота"""
    
    print("=== Тест режима слушания Telegram бота ===")
    
    # Тестовый chat_id (замените на реальный)
    test_chat_id = "123456789"
    
    # 1. Добавляем врача
    print("\n1. Добавление врача...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8081/telegram/doctors",
                params={"chat_id": test_chat_id},
                timeout=30.0
            )
            
            if response.status_code == 200:
                print(f"[OK] Врач добавлен: {response.json()}")
            else:
                print(f"[ERROR] Ошибка добавления врача: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 2. Проверяем статус слушания (должен быть False)
    print("\n2. Проверка статуса слушания...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"http://localhost:8081/telegram/listening/status?chat_id={test_chat_id}",
                timeout=30.0
            )
            
            if response.status_code == 200:
                status = response.json()
                print(f"[OK] Статус слушания: {status}")
            else:
                print(f"[ERROR] Ошибка проверки статуса: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 3. Включаем режим слушания
    print("\n3. Включение режима слушания...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"http://localhost:8081/telegram/listening/start?chat_id={test_chat_id}",
                timeout=30.0
            )
            
            if response.status_code == 200:
                print(f"[OK] Режим слушания включен: {response.json()}")
            else:
                print(f"[ERROR] Ошибка включения режима: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 4. Проверяем статус слушания (должен быть True)
    print("\n4. Проверка статуса слушания после включения...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"http://localhost:8081/telegram/listening/status?chat_id={test_chat_id}",
                timeout=30.0
            )
            
            if response.status_code == 200:
                status = response.json()
                print(f"[OK] Статус слушания: {status}")
            else:
                print(f"[ERROR] Ошибка проверки статуса: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 5. Создаем пациентку и запускаем мониторинг (должно отправить уведомление)
    print("\n5. Создание пациентки и запуск мониторинга...")
    create_data = {
        "full_name": "Тестовая Пациентка для Режима Слушания",
        "medications": ["гинипрал"]
    }
    
    patient_id = None
    try:
        async with httpx.AsyncClient() as client:
            # Создаем пациентку
            response = await client.post("http://localhost:8081/patients", json=create_data, timeout=30.0)
            
            if response.status_code == 200:
                patient = response.json()
                patient_id = patient["id"]
                print(f"[OK] Пациентка создана: {patient_id}")
                
                # Запускаем мониторинг (должно отправить уведомление врачу в режиме слушания)
                response = await client.post(
                    f"http://localhost:8081/monitoring/start/{patient_id}",
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    print(f"[OK] Мониторинг запущен: {response.json()}")
                    print("   -> Врач должен получить уведомление в Telegram!")
                else:
                    print(f"[ERROR] Ошибка запуска мониторинга: {response.status_code}")
            else:
                print(f"[ERROR] Ошибка создания пациентки: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 6. Выключаем режим слушания
    print("\n6. Выключение режима слушания...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"http://localhost:8081/telegram/listening/stop?chat_id={test_chat_id}",
                timeout=30.0
            )
            
            if response.status_code == 200:
                print(f"[OK] Режим слушания выключен: {response.json()}")
            else:
                print(f"[ERROR] Ошибка выключения режима: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 7. Проверяем статус слушания (должен быть False)
    print("\n7. Проверка статуса слушания после выключения...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"http://localhost:8081/telegram/listening/status?chat_id={test_chat_id}",
                timeout=30.0
            )
            
            if response.status_code == 200:
                status = response.json()
                print(f"[OK] Статус слушания: {status}")
            else:
                print(f"[ERROR] Ошибка проверки статуса: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    print("\n=== Тест завершен ===")
    print("Проверьте, получил ли врач уведомление в Telegram!")

if __name__ == "__main__":
    print("Запуск теста режима слушания...")
    print("ВАЖНО: Замените test_chat_id на реальный Chat ID врача!")
    asyncio.run(test_listening_mode())
