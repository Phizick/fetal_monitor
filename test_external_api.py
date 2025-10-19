#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для проверки внешнего API мониторинга
"""

import asyncio
import httpx
import json

async def test_external_api():
    """Тестирует внешний API мониторинга"""
    url = "http://176.109.106.126:4000/patients"
    data = {
        "name": "Анна Петрова",
        "birthday": "1990-05-15",
        "address": "г. Москва, ул. Ленина, д. 10, кв. 5",
        "phone": "+7 (999) 123-45-67",
        "roomNumber": "205",
        "pregnancyStartDate": "2024-01-15",
        "fetusCount": 1,
        "doctorId": 1,
        "authToken": "monitor_secret_key_123"
    }
    
    try:
        print(f"Тестируем внешний API: {url}")
        print(f"Данные запроса:")
        print(json.dumps(data, ensure_ascii=False, indent=2))
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=data, timeout=30.0)
            
            print(f"\nСтатус ответа: {response.status_code}")
            print(f"Заголовки ответа: {dict(response.headers)}")
            print(f"Ответ:")
            print(json.dumps(response.json(), ensure_ascii=False, indent=2))
            
            if response.status_code == 200:
                result = response.json()
                monitoring_token = result.get("monitoringToken")
                if monitoring_token:
                    print(f"\n✅ Успешно! Токен мониторинга: {monitoring_token}")
                else:
                    print(f"\n⚠️ Ответ получен, но токен мониторинга отсутствует")
            else:
                print(f"\n❌ Ошибка: HTTP {response.status_code}")
                
    except httpx.ConnectError as e:
        print(f"❌ Ошибка подключения: {e}")
        print("Возможные причины:")
        print("1. Сервер недоступен")
        print("2. Неправильный URL")
        print("3. Проблемы с сетью")
    except httpx.TimeoutException as e:
        print(f"❌ Таймаут: {e}")
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_external_api())
