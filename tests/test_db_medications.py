#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для проверки препаратов в БД
"""

import asyncio
import httpx
import json

async def test_db_medications():
    """Тестирует, как препараты сохраняются в БД"""
    
    # 1. Создаем пациентку с препаратами
    print("=== 1. Создание пациентки с препаратами ===")
    create_url = "http://localhost:8081/patients"
    create_data = {
        "full_name": "Тестовая Пациентка БД",
        "medications": ["гинипрал", "магнезия"]
    }
    
    patient_id = None
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(create_url, json=create_data, timeout=30.0)
            
            if response.status_code == 200:
                patient = response.json()
                patient_id = patient["id"]
                print(f"Пациентка создана: {patient_id}")
                print(f"Препараты в ответе: {patient.get('medications', [])}")
            else:
                print(f"Ошибка создания пациентки: {response.status_code}")
                return
    except Exception as e:
        print(f"Ошибка: {e}")
        return
    
    # 2. Получаем пациентку из БД
    print("\n=== 2. Получение пациентки из БД ===")
    get_url = f"http://localhost:8081/patients/{patient_id}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(get_url, timeout=30.0)
            
            if response.status_code == 200:
                patient = response.json()
                print(f"Пациентка из БД: {patient}")
                print(f"Препараты в БД: {patient.get('medications', [])}")
            else:
                print(f"Ошибка получения пациентки: {response.status_code}")
    except Exception as e:
        print(f"Ошибка: {e}")

if __name__ == "__main__":
    print("Запуск теста БД...")
    asyncio.run(test_db_medications())
