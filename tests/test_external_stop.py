#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для проверки внешнего API остановки мониторинга
"""

import asyncio
import httpx
import json

async def test_external_stop_api():
    """Тестирует внешний API остановки мониторинга напрямую"""
    
    # Сначала создаем сессию мониторинга
    print("=== 1. Создание сессии мониторинга ===")
    
    # Создаем пациентку
    create_url = "http://176.109.106.126:4000/patients"
    create_data = {
        "name": "Тестовая Пациентка",
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
        async with httpx.AsyncClient() as client:
            # Создаем пациентку
            response = await client.post(create_url, json=create_data, timeout=30.0)
            if response.status_code == 201:
                patient = response.json()
                monitoring_token = patient["monitoringToken"]
                print(f"Пациентка создана, токен: {monitoring_token}")
                
                # Запускаем мониторинг
                start_url = "http://176.109.106.126:4000/monitoring/start"
                start_data = {
                    "monitorId": "monitor_test_001",
                    "monitoringToken": monitoring_token,
                    "link": "http://176.109.106.126:8081/stream/patient/test_001",
                    "authToken": "monitor_secret_key_123"
                }
                
                start_response = await client.post(start_url, json=start_data, timeout=30.0)
                if start_response.status_code == 201:
                    session = start_response.json()
                    session_id = session["sessionId"]
                    print(f"Сессия создана: {session_id}")
                    
                    # Теперь тестируем остановку
                    print("\n=== 2. Тестирование остановки мониторинга ===")
                    
                    # Вариант 1: authToken в теле
                    print("Вариант 1: authToken в теле запроса")
                    stop_data = {
                        "authToken": "monitor_secret_key_123"
                    }
                    
                    stop_response = await client.post(
                        f"http://176.109.106.126:4000/monitoring/session/{session_id}/stop",
                        json=stop_data,
                        timeout=30.0
                    )
                    
                    print(f"Статус: {stop_response.status_code}")
                    print(f"Ответ: {stop_response.text}")
                    
                    if stop_response.status_code == 200:
                        print("УСПЕХ! Остановка работает с authToken в теле")
                    else:
                        print("Ошибка с authToken в теле, пробуем другие варианты...")
                        
                        # Вариант 2: authToken в заголовке
                        print("\nВариант 2: authToken в заголовке Authorization")
                        headers = {
                            "Authorization": f"Bearer monitor_secret_key_123"
                        }
                        
                        stop_response2 = await client.post(
                            f"http://176.109.106.126:4000/monitoring/session/{session_id}/stop",
                            headers=headers,
                            timeout=30.0
                        )
                        
                        print(f"Статус: {stop_response2.status_code}")
                        print(f"Ответ: {stop_response2.text}")
                        
                        if stop_response2.status_code == 200:
                            print("УСПЕХ! Остановка работает с authToken в заголовке")
                        else:
                            # Вариант 3: authToken в заголовке X-Auth-Token
                            print("\nВариант 3: authToken в заголовке X-Auth-Token")
                            headers3 = {
                                "X-Auth-Token": "monitor_secret_key_123"
                            }
                            
                            stop_response3 = await client.post(
                                f"http://176.109.106.126:4000/monitoring/session/{session_id}/stop",
                                headers=headers3,
                                timeout=30.0
                            )
                            
                            print(f"Статус: {stop_response3.status_code}")
                            print(f"Ответ: {stop_response3.text}")
                            
                            if stop_response3.status_code == 200:
                                print("УСПЕХ! Остановка работает с X-Auth-Token")
                            else:
                                print("Все варианты не сработали")
                else:
                    print(f"Ошибка создания сессии: {start_response.status_code}")
                    print(f"Ответ: {start_response.text}")
            else:
                print(f"Ошибка создания пациентки: {response.status_code}")
                print(f"Ответ: {response.text}")
                
    except Exception as e:
        print(f"Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_external_stop_api())
