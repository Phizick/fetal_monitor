#!/usr/bin/env python3
"""
Скрипт запуска Telegram бота
"""

import asyncio
import logging
import sys
import os

# Добавляем текущую директорию в путь
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from telegram_bot import telegram_bot, notification_system

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def run_bot():
    """Основная функция запуска бота"""
    try:
        print("✅ Telegram бот запущен и готов к работе!")
        logger.info("Запуск Telegram бота...")
        
        # Запускаем polling для получения сообщений
        print("🔄 Запуск polling...")
        await telegram_bot.start_polling()
        logger.info("Polling запущен")
        
        # Ждем немного, чтобы polling успел запуститься
        await asyncio.sleep(2)
        
        # Проверяем, что polling запустился
        if telegram_bot._polling_task and not telegram_bot._polling_task.done():
            print("✅ Polling успешно запущен!")
            logger.info("Polling задача активна")
        else:
            print("❌ Polling не запустился!")
            logger.error("Polling задача не активна")
        
        # Запускаем систему уведомлений
        print("🚀 Запуск системы уведомлений...")
        await notification_system.start()
        logger.info("Система уведомлений запущена")
        
        print("✅ Система уведомлений запущена!")
        
        # Основной цикл
        while True:
            await asyncio.sleep(60)
            
    except Exception as e:
        logger.error(f"Ошибка в боте: {e}")
        print(f"❌ Ошибка в боте: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_bot())
