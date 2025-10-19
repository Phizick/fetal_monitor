#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Простой тест бота без реального chat_id
"""

import asyncio
import logging
from telegram_bot import telegram_bot, notification_system

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_bot_simple():
    """Простое тестирование бота"""
    print("🧪 Простое тестирование Telegram бота...")
    
    # Тестовый chat_id
    test_chat_id = "123456789"
    
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
    
    # Тестируем send_to_listening_doctors (без реальной отправки)
    print("📤 Тестируем send_to_listening_doctors...")
    count = await telegram_bot.send_to_listening_doctors("🔔 Тестовое уведомление для слушающих врачей!")
    print(f"📊 Отправлено сообщений: {count}")
    
    print("✅ Простое тестирование завершено!")

if __name__ == "__main__":
    asyncio.run(test_bot_simple())