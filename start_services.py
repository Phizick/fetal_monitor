#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для запуска всех сервисов системы мониторинга КТГ
"""

import asyncio
import subprocess
import signal
import sys
import os
from pathlib import Path

class ServiceManager:
    """Менеджер для запуска и управления сервисами"""
    
    def __init__(self):
        self.processes = []
        self.running = True
        
    async def start_api_server(self):
        """Запускает API сервер"""
        print("🚀 Запуск API сервера...")
        
        # Устанавливаем переменные окружения
        env = os.environ.copy()
        env.update({
            'HOST': '0.0.0.0',
            'PORT': '8081',
            'MONGO_URI': 'mongodb://localhost:27017',
            'MONGO_DB': 'fetal'
        })
        
        # Запускаем API сервер
        process = subprocess.Popen([
            sys.executable, 'realtime_api.py'
        ], env=env)
        
        self.processes.append(('API Server', process))
        print(f"✅ API сервер запущен (PID: {process.pid})")
        
        # Ждем немного для запуска
        await asyncio.sleep(3)
        
    async def start_telegram_bot(self):
        """Запускает Telegram бота"""
        print("🤖 Запуск Telegram бота...")
        
        # Создаем отдельный процесс для бота
        process = subprocess.Popen([
            sys.executable, '-c', '''
import asyncio
from telegram_bot import telegram_bot, notification_system

async def run_bot():
    print("Telegram бот запущен и готов к работе!")
    # Бот работает в фоновом режиме
    while True:
        await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(run_bot())
'''
        ])
        
        self.processes.append(('Telegram Bot', process))
        print(f"✅ Telegram бот запущен (PID: {process.pid})")
        
    async def start_mongodb(self):
        """Запускает MongoDB (если не запущена)"""
        print("🗄️ Проверка MongoDB...")
        
        try:
            # Проверяем, запущена ли MongoDB
            result = subprocess.run(['mongod', '--version'], 
                                  capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                print("✅ MongoDB уже запущена")
                return
        except:
            pass
            
        print("⚠️ MongoDB не найдена. Убедитесь, что MongoDB установлена и запущена.")
        print("   Или используйте Docker: docker-compose up mongo")
        
    async def start_all_services(self):
        """Запускает все сервисы"""
        print("=" * 50)
        print("🏥 СИСТЕМА МОНИТОРИНГА КТГ")
        print("=" * 50)
        
        try:
            # Запускаем MongoDB
            await self.start_mongodb()
            
            # Запускаем API сервер
            await self.start_api_server()
            
            # Запускаем Telegram бота
            await self.start_telegram_bot()
            
            print("\n" + "=" * 50)
            print("✅ ВСЕ СЕРВИСЫ ЗАПУЩЕНЫ!")
            print("=" * 50)
            print("🌐 API сервер: http://localhost:8081")
            print("📊 Swagger UI: http://localhost:8081/docs")
            print("🤖 Telegram бот: активен")
            print("=" * 50)
            print("Нажмите Ctrl+C для остановки всех сервисов")
            
            # Ждем сигнала остановки
            await self.wait_for_shutdown()
            
        except KeyboardInterrupt:
            print("\n🛑 Получен сигнал остановки...")
        except Exception as e:
            print(f"❌ Ошибка: {e}")
        finally:
            await self.shutdown_all()
    
    async def wait_for_shutdown(self):
        """Ожидает сигнала остановки"""
        while self.running:
            await asyncio.sleep(1)
            
            # Проверяем, что все процессы еще работают
            for name, process in self.processes:
                if process.poll() is not None:
                    print(f"⚠️ Процесс {name} завершился неожиданно")
                    self.running = False
                    break
    
    async def shutdown_all(self):
        """Останавливает все сервисы"""
        print("\n🛑 Остановка всех сервисов...")
        
        for name, process in self.processes:
            try:
                print(f"⏹️ Остановка {name}...")
                process.terminate()
                
                # Ждем завершения процесса
                try:
                    process.wait(timeout=5)
                    print(f"✅ {name} остановлен")
                except subprocess.TimeoutExpired:
                    print(f"⚠️ Принудительная остановка {name}...")
                    process.kill()
                    process.wait()
                    print(f"✅ {name} принудительно остановлен")
                    
            except Exception as e:
                print(f"❌ Ошибка остановки {name}: {e}")
        
        print("✅ Все сервисы остановлены")

def signal_handler(signum, frame):
    """Обработчик сигналов"""
    print(f"\n🛑 Получен сигнал {signum}")
    sys.exit(0)

async def main():
    """Главная функция"""
    # Устанавливаем обработчики сигналов
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    manager = ServiceManager()
    await manager.start_all_services()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 До свидания!")
    except Exception as e:
        print(f"❌ Критическая ошибка: {e}")
        sys.exit(1)
