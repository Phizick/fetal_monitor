#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Telegram бот для уведомлений врачей о состоянии пациенток
"""

import asyncio
import httpx
import json
from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging
import os

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TelegramBot:
    """Класс для работы с Telegram ботом"""
    
    def __init__(self, bot_token: str):
        self.bot_token = bot_token
        self.base_url = f"https://api.telegram.org/bot{bot_token}"
        self.chat_ids: List[str] = []  # Список ID чатов врачей
        self.listening_mode: Dict[str, bool] = {}  # Режим слушания для каждого врача
        self._polling_task: Optional[asyncio.Task] = None
        self._update_offset: Optional[int] = None
        
    async def send_message(self, chat_id: str, text: str) -> bool:
        """Отправляет сообщение в Telegram"""
        try:
            url = f"{self.base_url}/sendMessage"
            data = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML"
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, json=data, timeout=10.0)
                
                if response.status_code == 200:
                    logger.info(f"Сообщение отправлено в чат {chat_id}: {text}")
                    return True
                else:
                    logger.error(f"Ошибка отправки сообщения: {response.status_code} - {response.text}")
                    return False
                    
        except Exception as e:
            logger.error(f"Ошибка отправки сообщения: {e}")
            return False
    
    async def send_to_all_doctors(self, text: str) -> int:
        """Отправляет сообщение всем врачам"""
        if not self.chat_ids:
            logger.warning("Нет зарегистрированных врачей")
            return 0
            
        success_count = 0
        for chat_id in self.chat_ids:
            if await self.send_message(chat_id, text):
                success_count += 1
                
        return success_count
    
    def add_doctor(self, chat_id: str):
        """Добавляет врача в список получателей уведомлений"""
        if chat_id not in self.chat_ids:
            self.chat_ids.append(chat_id)
            logger.info(f"Добавлен врач с chat_id: {chat_id}")
    
    def remove_doctor(self, chat_id: str):
        """Удаляет врача из списка получателей уведомлений"""
        if chat_id in self.chat_ids:
            self.chat_ids.remove(chat_id)
            logger.info(f"Удален врач с chat_id: {chat_id}")
    
    def start_listening(self, chat_id: str):
        """Включает режим слушания для врача"""
        self.listening_mode[chat_id] = True
        logger.info(f"Включен режим слушания для врача {chat_id}")
    
    def stop_listening(self, chat_id: str):
        """Выключает режим слушания для врача"""
        self.listening_mode[chat_id] = False
        logger.info(f"Выключен режим слушания для врача {chat_id}")
    
    def is_listening(self, chat_id: str) -> bool:
        """Проверяет, находится ли врач в режиме слушания"""
        return self.listening_mode.get(chat_id, False)
    
    async def send_to_listening_doctors(self, text: str) -> int:
        """Отправляет сообщение только врачам в режиме слушания"""
        if not self.chat_ids:
            logger.warning("Нет зарегистрированных врачей")
            return 0
            
        success_count = 0
        for chat_id in self.chat_ids:
            if self.is_listening(chat_id):
                if await self.send_message(chat_id, text):
                    success_count += 1
                    
        return success_count

    async def _fetch_updates(self, timeout: int = 30) -> List[Dict]:
        """Получает обновления из Telegram (long polling)."""
        params = {"timeout": timeout}
        if self._update_offset is not None:
            params["offset"] = self._update_offset
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{self.base_url}/getUpdates", params=params, timeout=timeout+5)
                resp.raise_for_status()
                data = resp.json()
                if not data.get("ok", False):
                    logger.warning(f"getUpdates вернул ok=false: {data}")
                    return []
                return data.get("result", [])
        except Exception as e:
            logger.error(f"Ошибка getUpdates: {e}")
            return []

    async def _handle_update(self, upd: Dict):
        """Обрабатывает одно обновление Telegram."""
        try:
            update_id = upd.get("update_id")
            if update_id is not None:
                self._update_offset = update_id + 1

            message = upd.get("message") or upd.get("edited_message") or {}
            if not message:
                return
            chat = message.get("chat", {})
            chat_id = str(chat.get("id")) if chat.get("id") is not None else None
            text = (message.get("text") or "").strip().lower()
            if not chat_id:
                return

            # Поддерживаем команды /start, /stop, а также русские кнопки "старт"/"стоп"
            if text in ("/start", "старт", "start"):
                self.add_doctor(chat_id)
                self.start_listening(chat_id)
                await self.send_message(chat_id, "Бот слушает. Вы будете получать уведомления о мониторинге пациенток.")
                logger.info(f"Врач {chat_id} активировал режим слушания через /start")
            elif text in ("/stop", "стоп", "stop"):
                self.stop_listening(chat_id)
                await self.send_message(chat_id, "Режим слушания выключен. Уведомления больше не будут приходить.")
                logger.info(f"Врач {chat_id} выключил режим слушания через /stop")
            else:
                # Небольшая справка
                if text.startswith("/help"):
                    await self.send_message(chat_id, "Команды:\n/start — включить уведомления\n/stop — выключить уведомления")
        except Exception as e:
            logger.error(f"Ошибка обработки обновления: {e}")

    async def start_polling(self):
        """Запускает фоновый long-polling Telegram бота."""
        if self._polling_task and not self._polling_task.done():
            return

        async def _runner():
            logger.info("Старт long-polling Telegram бота...")
            while True:
                try:
                    updates = await self._fetch_updates(timeout=30)
                    for upd in updates:
                        await self._handle_update(upd)
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Ошибка в цикле long-polling: {e}")
                    await asyncio.sleep(2)
            logger.info("Остановлен long-polling Telegram бота")

        self._polling_task = asyncio.create_task(_runner())

    async def stop_polling(self):
        """Останавливает фоновый long-polling."""
        if self._polling_task and not self._polling_task.done():
            self._polling_task.cancel()
            try:
                await self._polling_task
            except asyncio.CancelledError:
                pass
            self._polling_task = None

class PatientNotificationSystem:
    """Система уведомлений о состоянии пациенток"""
    
    def __init__(self, bot: TelegramBot):
        self.bot = bot
        self.patient_status: Dict[str, Dict] = {}  # Состояние каждой пациентки
        self.monitoring_tasks: Dict[str, asyncio.Task] = {}  # Задачи мониторинга
        # Базовый URL стрима (жестко задан по запросу)
        self.stream_base_url: str = "http://176.108.250.117:8081"
        # Счетчики для назначения палат/родзалов по очереди
        self._room_sequence: int = 0
        self._palata_idx: int = 1
        self._rodzal_idx: int = 1
        self._max_idx: int = 6
        
    def _assign_room(self, patient_id: str) -> str:
        """Назначает по очереди: первой пациентке — Палата, второй — Родзал, далее по кругу. Номера 1..6."""
        # Увеличиваем последовательность назначения
        self._room_sequence += 1
        # Нечетная — Палата, четная — Родзал
        if self._room_sequence % 2 == 1:
            label = "Палата"
            idx = self._palata_idx
            # круговая нумерация 1..6
            self._palata_idx = 1 if self._palata_idx >= self._max_idx else self._palata_idx + 1
        else:
            label = "Родзал"
            idx = self._rodzal_idx
            self._rodzal_idx = 1 if self._rodzal_idx >= self._max_idx else self._rodzal_idx + 1
        return f"{label} {idx}"

    def _display_id(self, patient_id: str) -> int:
        """Возвращает короткий читаемый ID пациента в диапазоне 10..20 (только для отображения)."""
        try:
            return 10 + (abs(hash(patient_id)) % 11)  # 10..20 включительно
        except Exception:
            return 10

    async def start_monitoring_notification(self, patient_id: str, patient_name: str):
        """Уведомление о начале мониторинга"""
        room = self._assign_room(patient_id)
        disp_id = self._display_id(patient_id)
        text = (
            f"🩺 <b>Пациент {patient_name}</b> (ID: {disp_id}, {room}) взят под наблюдение"
        )
        await self.bot.send_to_listening_doctors(text)
        
        # Инициализируем состояние пациентки
        self.patient_status[patient_id] = {
            "name": patient_name,
            "last_status_check": datetime.now(timezone.utc),
            "last_pathology_check": datetime.now(timezone.utc),
            "is_monitoring": True,
            # Флаг текущего патологического состояния для одноразовых уведомлений
            "in_pathology": False,
            # Последнее описание патологии (для справки/диагностики)
            "last_pathology_desc": "",
            # Время последнего уведомления о стабильном состоянии (для троттлинга)
            "last_stable_notify_at": None,
            # Номер палаты/родзала
            "room": room,
        }
        
        # Запускаем задачу мониторинга
        task = asyncio.create_task(self._monitor_patient(patient_id))
        self.monitoring_tasks[patient_id] = task
        
    async def stop_monitoring_notification(self, patient_id: str, patient_name: str):
        """Уведомление об остановке мониторинга"""
        room = self.patient_status.get(patient_id, {}).get("room") or self._assign_room(patient_id)
        disp_id = self._display_id(patient_id)
        text = f"🛑 <b>Пациент {patient_name}</b> (ID: {disp_id}, {room}) снят с наблюдения"
        await self.bot.send_to_listening_doctors(text)
        
        # Останавливаем задачу мониторинга
        if patient_id in self.monitoring_tasks:
            self.monitoring_tasks[patient_id].cancel()
            del self.monitoring_tasks[patient_id]
            
        # Обновляем состояние
        if patient_id in self.patient_status:
            self.patient_status[patient_id]["is_monitoring"] = False
    
    async def medication_notification(self, patient_id: str, patient_name: str, medications: List[str]):
        """Уведомление о назначении препаратов"""
        if not medications:
            return
            
        meds_text = ", ".join(medications)
        room = self.patient_status.get(patient_id, {}).get("room") or self._assign_room(patient_id)
        disp_id = self._display_id(patient_id)
        text = f"💊 <b>Пациент {patient_name}</b> (ID: {disp_id}, {room}) назначен {meds_text}"
        await self.bot.send_to_listening_doctors(text)
    
    async def _monitor_patient(self, patient_id: str):
        """Мониторинг состояния пациентки"""
        while True:
            try:
                # Проверяем каждые 10 секунд для быстрого реагирования
                await asyncio.sleep(10)
                
                if patient_id not in self.patient_status:
                    break
                    
                if not self.patient_status[patient_id]["is_monitoring"]:
                    break
                
                # Получаем последние данные из стрима
                status = await self._check_patient_status(patient_id)
                if status:
                    await self._process_patient_status(patient_id, status)
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Ошибка мониторинга пациентки {patient_id}: {e}")
                await asyncio.sleep(60)  # Ждем минуту перед повтором
    
    async def _check_patient_status(self, patient_id: str) -> Optional[Dict]:
        """Проверяет состояние пациентки через API"""
        try:
            # Получаем один сэмпл из стрима
            url = f"{self.stream_base_url}/stream/patient/{patient_id}"
            
            async with httpx.AsyncClient() as client:
                async with client.stream('GET', url) as response:
                    if response.status_code == 200:
                        async for line in response.aiter_lines():
                            if line.startswith('data: '):
                                data = json.loads(line[6:])
                                return data
                            break  # Получаем только один сэмпл
                            
        except Exception as e:
            logger.error(f"Ошибка получения данных пациентки {patient_id}: {e}")
            
        return None
    
    async def _process_patient_status(self, patient_id: str, data: Dict):
        """Обрабатывает состояние пациентки и отправляет уведомления"""
        patient_name = self.patient_status[patient_id]["name"]
        has_pathology = data.get("pathology", False)
        pathologies = data.get("pathologies", [])
        prev_in_pathology = self.patient_status[patient_id].get("in_pathology", False)
        
        # Переход в патологию: уведомляем один раз
        if has_pathology and pathologies and not prev_in_pathology:
            pathology_desc = data.get("pathology_desc") or (pathologies[0] if pathologies else "неизвестная патология")
            room = self.patient_status.get(patient_id, {}).get("room") or self._assign_room(patient_id)
            disp_id = self._display_id(patient_id)
            text = (
                f"⚠️ <b>Пациент {patient_name}</b> (ID: {disp_id}, {room}) обнаружено патологическое состояние."
                f"\nПатология: {pathology_desc}"
            )
            await self.bot.send_to_listening_doctors(text)
            self.patient_status[patient_id]["in_pathology"] = True
            self.patient_status[patient_id]["last_pathology_desc"] = pathology_desc
            self.patient_status[patient_id]["last_pathology_check"] = datetime.now(timezone.utc)
            # Сбрасываем таймер стабильности, чтобы после восстановления уведомление пришло корректно
            self.patient_status[patient_id]["last_stable_notify_at"] = None
        # Остаёмся в патологии: не спамим
        elif has_pathology and pathologies and prev_in_pathology:
            # Ничего не отправляем, только обновляем таймштампы
            self.patient_status[patient_id]["last_pathology_check"] = datetime.now(timezone.utc)
        # Восстановление из патологии: уведомляем один раз
        elif (not has_pathology or not pathologies) and prev_in_pathology:
            room = self.patient_status.get(patient_id, {}).get("room") or self._assign_room(patient_id)
            disp_id = self._display_id(patient_id)
            recovery_text = f"🟢 <b>Пациент {patient_name}</b> (ID: {disp_id}, {room}) состояние улучшилось, патология не выявляется"
            await self.bot.send_to_listening_doctors(recovery_text)
            self.patient_status[patient_id]["in_pathology"] = False
            self.patient_status[patient_id]["last_pathology_desc"] = ""
            # Отметим момент восстановления, чтобы не отправить сразу следом стабильность
            self.patient_status[patient_id]["last_stable_notify_at"] = datetime.now(timezone.utc)
        else:
            # Нормальное состояние и раньше было нормально — отправляем с троттлингом (раз в 2 минуты)
            last_stable = self.patient_status[patient_id].get("last_stable_notify_at")
            now = datetime.now(timezone.utc)
            should_notify = (
                last_stable is None or (now - last_stable).total_seconds() >= 120
            )
            if (not has_pathology or not pathologies) and not prev_in_pathology and should_notify:
                room = self.patient_status.get(patient_id, {}).get("room") or self._assign_room(patient_id)
                disp_id = self._display_id(patient_id)
                text = f"✅ <b>Пациент {patient_name}</b> (ID: {disp_id}, {room}) состояние стабильное"
                await self.bot.send_to_listening_doctors(text)
                self.patient_status[patient_id]["last_stable_notify_at"] = now
            
        # Обновляем время последней проверки
        self.patient_status[patient_id]["last_status_check"] = datetime.now(timezone.utc)

# Глобальный экземпляр бота
BOT_TOKEN = "8231116636:AAEzm1aDfPAo1yXY4Zmv6pjekIqnokk3afs"
telegram_bot = TelegramBot(BOT_TOKEN)
notification_system = PatientNotificationSystem(telegram_bot)

# Функции для интеграции с основным API
async def notify_monitoring_start(patient_id: str, patient_name: str):
    """Уведомление о начале мониторинга"""
    await notification_system.start_monitoring_notification(patient_id, patient_name)

async def notify_monitoring_stop(patient_id: str, patient_name: str):
    """Уведомление об остановке мониторинга"""
    await notification_system.stop_monitoring_notification(patient_id, patient_name)

async def notify_medication_change(patient_id: str, patient_name: str, medications: List[str]):
    """Уведомление об изменении препаратов"""
    await notification_system.medication_notification(patient_id, patient_name, medications)

async def add_doctor(chat_id: str):
    """Добавляет врача в систему уведомлений"""
    telegram_bot.add_doctor(chat_id)

async def remove_doctor(chat_id: str):
    """Удаляет врача из системы уведомлений"""
    telegram_bot.remove_doctor(chat_id)

async def start_listening(chat_id: str):
    """Включает режим слушания для врача"""
    telegram_bot.start_listening(chat_id)

async def stop_listening(chat_id: str):
    """Выключает режим слушания для врача"""
    telegram_bot.stop_listening(chat_id)

async def is_listening(chat_id: str) -> bool:
    """Проверяет, находится ли врач в режиме слушания"""
    return telegram_bot.is_listening(chat_id)

# Тестовая функция
async def test_bot():
    """Тестирует работу бота"""
    print("Тестирование Telegram бота...")
    
    # Добавляем тестового врача (замените на реальный chat_id)
    test_chat_id = "123456789"  # Замените на реальный chat_id
    telegram_bot.add_doctor(test_chat_id)
    
    # Тестируем отправку сообщения
    success = await telegram_bot.send_message(test_chat_id, "🤖 Бот запущен и готов к работе!")
    if success:
        print("[OK] Тестовое сообщение отправлено успешно")
    else:
        print("[ERROR] Ошибка отправки тестового сообщения")

if __name__ == "__main__":
    asyncio.run(test_bot())
