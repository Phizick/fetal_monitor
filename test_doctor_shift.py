#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для демонстрации работы врача на смене
"""

import asyncio
import httpx
import json

async def test_doctor_shift():
    """Тестирует сценарий работы врача на смене"""
    
    print("=== Сценарий: Врач заступает на смену ===")
    
    # Chat ID врача (замените на реальный)
    doctor_chat_id = "123456789"
    
    # 1. Врач заступает на смену и нажимает "старт" в боте
    print("\n1. Врач нажимает 'старт' в боте...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8081/telegram/listening/start",
                params={"chat_id": doctor_chat_id},
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"[OK] {result['message']}")
            else:
                print(f"[ERROR] Ошибка: {response.status_code} - {response.text}")
                return
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
        return
    
    # 2. Проверяем, что врач активен
    print("\n2. Проверяем активных врачей...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "http://localhost:8081/telegram/listening/active",
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"[OK] Активных врачей: {result['count']}")
                print(f"[OK] Список: {result['active_doctors']}")
            else:
                print(f"[ERROR] Ошибка: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 3. Врач идет к пациенткам и начинает мониторинг
    print("\n3. Врач начинает мониторинг пациенток...")
    
    # Создаем несколько пациенток
    patients_data = [
        {"full_name": "Анна Иванова", "medications": ["гинипрал"]},
        {"full_name": "Мария Петрова", "medications": ["магнезия"]},
        {"full_name": "Елена Сидорова", "medications": []}
    ]
    
    patient_ids = []
    
    for i, patient_data in enumerate(patients_data, 1):
        print(f"\n3.{i} Создание пациентки {patient_data['full_name']}...")
        try:
            async with httpx.AsyncClient() as client:
                # Создаем пациентку
                response = await client.post(
                    "http://localhost:8081/patients",
                    json=patient_data,
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    patient = response.json()
                    patient_id = patient["id"]
                    patient_ids.append(patient_id)
                    print(f"[OK] Пациентка создана: {patient_id}")
                    
                    # Запускаем мониторинг (должно отправить уведомление врачу)
                    print(f"   Запуск мониторинга...")
                    response = await client.post(
                        f"http://localhost:8081/monitoring/start/{patient_id}",
                        timeout=30.0
                    )
                    
                    if response.status_code == 200:
                        print(f"[OK] Мониторинг запущен!")
                        print(f"   -> Врач должен получить уведомление: 'Пациент {patient_data['full_name']} взят под наблюдение'")
                    else:
                        print(f"[ERROR] Ошибка запуска мониторинга: {response.status_code}")
                        print(f"   Ответ: {response.text}")
                else:
                    print(f"[ERROR] Ошибка создания пациентки: {response.status_code}")
        except Exception as e:
            print(f"[ERROR] Ошибка: {e}")
    
    # 4. Проверяем статус врача
    print(f"\n4. Проверяем статус врача {doctor_chat_id}...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "http://localhost:8081/telegram/listening/status",
                params={"chat_id": doctor_chat_id},
                timeout=30.0
            )
            
            if response.status_code == 200:
                status = response.json()
                print(f"[OK] Статус врача: {status}")
            else:
                print(f"[ERROR] Ошибка проверки статуса: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 5. Врач заканчивает смену
    print(f"\n5. Врач заканчивает смену...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8081/telegram/listening/stop",
                params={"chat_id": doctor_chat_id},
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"[OK] {result['message']}")
            else:
                print(f"[ERROR] Ошибка: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 6. Проверяем, что врач больше не активен
    print(f"\n6. Проверяем, что врач больше не активен...")
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "http://localhost:8081/telegram/listening/active",
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"[OK] Активных врачей: {result['count']}")
                if result['count'] == 0:
                    print("[OK] Врач успешно завершил смену!")
                else:
                    print(f"[WARNING] Остались активные врачи: {result['active_doctors']}")
            else:
                print(f"[ERROR] Ошибка: {response.status_code}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    print("\n=== Сценарий завершен ===")
    print("Проверьте, получил ли врач уведомления в Telegram!")

if __name__ == "__main__":
    print("Запуск теста сценария работы врача на смене...")
    print("ВАЖНО: Замените doctor_chat_id на реальный Chat ID врача!")
    asyncio.run(test_doctor_shift())
