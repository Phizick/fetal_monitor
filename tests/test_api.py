#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для проверки API создания пациенток
"""

import asyncio
import httpx
import json

async def test_create_patient():
    """Тестирует создание пациентки через API"""
    url = "http://localhost:8081/patients"
    data = {
        "full_name": "Анна Петрова",
        "medications": ["гинипрал"]
    }
    
    try:
        async with httpx.AsyncClient() as client:
            print(f"Отправляем запрос на {url}")
            print(f"Данные: {json.dumps(data, ensure_ascii=False, indent=2)}")
            
            response = await client.post(url, json=data, timeout=30.0)
            
            print(f"Статус ответа: {response.status_code}")
            print(f"Ответ: {json.dumps(response.json(), ensure_ascii=False, indent=2)}")
            
            if response.status_code == 200:
                result = response.json()
                if result.get("monitoring_token"):
                    print("Успешно! Токен мониторинга получен")
                else:
                    print("Пациентка создана, но токен мониторинга не получен")
            else:
                print("Ошибка при создании пациентки")
                
    except Exception as e:
            print(f"Ошибка: {e}")

if __name__ == "__main__":
    asyncio.run(test_create_patient())
