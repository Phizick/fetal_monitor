#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Тестовый скрипт для отладки Telegram бота
"""

import asyncio
import logging
from telegram_bot import telegram_bot, notification_system

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_bot():
    """Тестирует работу бота"""
    print("🧪 Тестирование Telegram бота...")
    
    # Тестовый chat_id (замените на реальный)
    test_chat_id = "123456789"  # Замените на реальный chat_id
    
    print(f"🔍 Тестовый chat_id: {test_chat_id}")
    
    # Добавляем врача
    print("👨‍⚕️ Добавляем врача...")
    telegram_bot.add_doctor(test_chat_id)
    print(f"✅ Врач добавлен. chat_ids: {telegram_bot.chat_ids}")
    
    # Включаем режим слушания
    print("👂 Включаем режим слушания...")
    telegram_bot.start_listening(test_chat_id)
    print(f"✅ Режим слушания включен. listening_mode: {telegram_bot.listening_mode}")
    
    # Проверяем статус
    is_listening = telegram_bot.is_listening(test_chat_id)
    print(f"🔍 Врач в режиме слушания: {is_listening}")
    
    # Тестируем отправку сообщения
    print("📤 Тестируем отправку сообщения...")
    success = await telegram_bot.send_message(test_chat_id, "🤖 Тестовое сообщение от бота!")
    if success:
        print("✅ Тестовое сообщение отправлено успешно")
    else:
        print("❌ Ошибка отправки тестового сообщения")
    
    # Тестируем send_to_listening_doctors
    print("📤 Тестируем send_to_listening_doctors...")
    count = await telegram_bot.send_to_listening_doctors("🔔 Тестовое уведомление для слушающих врачей!")
    print(f"📊 Отправлено сообщений: {count}")
    
    # Тестируем систему уведомлений
    print("🚀 Тестируем систему уведомлений...")
    await notification_system.start()
    
    # Тестируем уведомление о начале мониторинга
    print("🩺 Тестируем уведомление о начале мониторинга...")
    await notification_system.start_monitoring_notification("test_patient", "Тестовая Пациентка")
    
    print("✅ Тестирование завершено!")

if __name__ == "__main__":
    asyncio.run(test_bot())