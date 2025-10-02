#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Упрощенный тест для демонстрации работы врача на смене
(без внешнего API)
"""

import asyncio
import httpx
import json

async def test_simple_doctor():
    """Упрощенный тест сценария работы врача на смене"""
    
    print("=== Упрощенный тест: Врач заступает на смену ===")
    
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
                print(f"[ERROR] Ошибка: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[ERROR] Ошибка: {e}")
    
    # 3. Проверяем статус конкретного врача
    print(f"\n3. Проверяем статус врача {doctor_chat_id}...")
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
    
    # 4. Врач заканчивает смену
    print(f"\n4. Врач заканчивает смену...")
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
    
    # 5. Проверяем, что врач больше не активен
    print(f"\n5. Проверяем, что врач больше не активен...")
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
    
    print("\n=== Тест завершен ===")
    print("Теперь врач может:")
    print("1. Нажать 'старт' в боте - автоматически добавится в систему")
    print("2. Начать мониторинг пациенток - получит уведомления")
    print("3. Нажать 'стоп' в боте - перестанет получать уведомления")

if __name__ == "__main__":
    print("Запуск упрощенного теста...")
    print("ВАЖНО: Замените doctor_chat_id на реальный Chat ID врача!")
    asyncio.run(test_simple_doctor())
