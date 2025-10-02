#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для проверки работы Telegram бота
"""

import asyncio
import httpx
import json

async def test_telegram_integration():
    """Тестирует интеграцию с Telegram ботом"""
    
    print("=== Тест интеграции Telegram бота ===")
    
    # 1. Добавляем тестового врача
    print("\n1. Добавление врача в систему...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8081/telegram/doctors",
                params={"chat_id": "123456789"},  # Замените на реальный chat_id
                timeout=30.0
            )
            
            if response.status_code == 200:
                print(f"[OK] Врач добавлен: {response.json()}")
            else:
                print(f"[ERROR] Ошибка добавления врача: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 2. Создаем пациентку
    print("\n2. Создание пациентки...")
    create_data = {
        "full_name": "Тестовая Пациентка для Telegram",
        "medications": ["гинипрал"]
    }
    
    patient_id = None
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post("http://localhost:8081/patients", json=create_data, timeout=30.0)
            
            if response.status_code == 200:
                patient = response.json()
                patient_id = patient["id"]
                print(f"[OK] Пациентка создана: {patient_id}")
            else:
                print(f"[ERROR] Ошибка создания: {response.status_code}")
                return
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
        return
    
    # 3. Назначаем препараты (должно отправить уведомление)
    print("\n3. Назначение препаратов...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"http://localhost:8081/sim/medications/{patient_id}",
                json={"medications": ["магнезия", "окситоцин"]},
                timeout=30.0
            )
            
            if response.status_code == 200:
                print(f"[OK] Препараты назначены: {response.json()}")
            else:
                print(f"[ERROR] Ошибка назначения препаратов: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 4. Запускаем мониторинг (должно отправить уведомление)
    print("\n4. Запуск мониторинга...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"http://localhost:8081/monitoring/start/{patient_id}",
                timeout=30.0
            )
            
            if response.status_code == 200:
                print(f"[OK] Мониторинг запущен: {response.json()}")
            else:
                print(f"[ERROR] Ошибка запуска мониторинга: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 5. Ждем немного для получения уведомлений о состоянии
    print("\n5. Ожидание уведомлений о состоянии (30 секунд)...")
    await asyncio.sleep(30)
    
    # 6. Останавливаем мониторинг (должно отправить уведомление)
    print("\n6. Остановка мониторинга...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"http://localhost:8081/monitoring/stop/{patient_id}",
                timeout=30.0
            )
            
            if response.status_code == 200:
                print(f"[OK] Мониторинг остановлен: {response.json()}")
            else:
                print(f"[ERROR] Ошибка остановки мониторинга: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    print("\n=== Тест завершен ===")
    print("Проверьте Telegram бота на наличие уведомлений!")

async def test_direct_bot():
    """Тестирует бота напрямую"""
    print("\n=== Прямой тест Telegram бота ===")
    
    from telegram_bot import telegram_bot, notification_system
    
    # Добавляем тестового врача
    test_chat_id = "123456789"  # Замените на реальный chat_id
    telegram_bot.add_doctor(test_chat_id)
    
    # Тестируем отправку сообщения
    success = await telegram_bot.send_message(test_chat_id, "🤖 Тестовое сообщение от бота!")
    if success:
        print("[OK] Тестовое сообщение отправлено")
    else:
        print("[ERROR] Ошибка отправки сообщения")
    
    # Тестируем уведомления
    await notification_system.start_monitoring_notification("test_patient", "Тестовая Пациентка")
    await notification_system.medication_notification("test_patient", "Тестовая Пациентка", ["гинипрал", "магнезия"])
    await notification_system.stop_monitoring_notification("test_patient", "Тестовая Пациентка")

if __name__ == "__main__":
    print("Запуск тестов Telegram бота...")
    print("ВАЖНО: Замените chat_id на реальный ID чата врача!")
    
    # Сначала тестируем бота напрямую
    asyncio.run(test_direct_bot())
    
    # Затем тестируем интеграцию с API
    asyncio.run(test_telegram_integration())
