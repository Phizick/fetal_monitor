#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API эмуляции данных КТГ и сократительной активности матки в реальном времени.
Предоставляет:
- /stream/ndjson — непрерывный поток NDJSON (application/x-ndjson)
- /stream/sse — серверные события (text/event-stream)
- /sample — единичный сэмпл для теста в Swagger
- /health — проверка сервера

Моделируются:
- FHR (ЧСС плода) с базальной частотой, вариабельностью, акселерациями/деселерациями
- UC (схватки) как гладкая псевдосинусоида с эпизодическими пиками
"""

import asyncio
import math
import random
import time
from datetime import datetime, timezone
from typing import AsyncIterator, Dict, Optional, List, Any
from collections import deque

import numpy as np
import httpx
from fastapi import FastAPI
from fastapi.responses import StreamingResponse, JSONResponse, HTMLResponse
from fastapi import HTTPException, Path, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from bson import ObjectId
import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from telegram_bot import notify_monitoring_start, notify_monitoring_stop, notify_medication_change, add_doctor, remove_doctor, start_listening, stop_listening, is_listening
from realtime_predictor import RealtimeFetalPredictor, DataEmulator
import json as _json
import numpy as _np
from fhir_export import fhir_exporter, fhir_config
from hl7_builder import build_oru_r01, send_mllp, get_config as get_hl7_config
import joblib


class CTGSample(BaseModel):
    """Один момент времени КТГ/схватки."""
    timestamp: str = Field(..., description="ISO8601 UTC время серверной генерации")
    t_ms: int = Field(..., description="Время симуляции в миллисекундах с запуска")
    fhr_bpm: int = Field(..., ge=50, le=210, description="ЧСС плода, уд/мин")
    uc_mmHg: float = Field(..., ge=0, le=100, description="Тонус матки, мм рт. ст.")
    baseline_bpm: int = Field(..., ge=80, le=170, description="Базальная ЧСС")
    variability_bpm: float = Field(..., ge=0, le=30, description="Краткосрочная вариабельность")
    accel: bool = Field(..., description="Событие акселерации")
    decel: bool = Field(..., description="Событие децелерации")
    pathology: bool = Field(..., description="Признак патологии (детектировано правило)")
    pathology_desc: str = Field(..., description="Краткое описание основной патологии или пусто")
    pathologies: List[str] = Field(default_factory=list, description="Список активных патологий на текущем кадре")
    medications: List[str] = Field(default_factory=list, description="Активные препараты, влияющие на сигнал")


class PatientCreate(BaseModel):
    """Запрос на создание пациентки."""
    full_name: str = Field(..., min_length=2, description="ФИО пациентки")
    medications: Optional[List[str]] = Field(default=None, description="Список препаратов (опционально)")


class PatientOut(BaseModel):
    """Ответ с данными пациентки."""
    id: str = Field(..., description="ID пациентки (Mongo ObjectId)")
    full_name: str
    medications: List[str] = Field(default_factory=list)
    monitoring_token: Optional[str] = Field(default=None, description="Токен для мониторинга")
    session_id: Optional[str] = Field(default=None, description="ID активной сессии мониторинга")
    is_monitoring: bool = Field(default=False, description="Статус мониторинга")


class RecordIn(BaseModel):
    """Оцифрованные данные КТГ/матки для сохранения."""
    timestamp: str = Field(..., description="ISO8601 время измерения")
    t_ms: int
    fhr_bpm: int
    uc_mmHg: float


class RecordsIn(BaseModel):
    """Пакет записей."""
    records: List[RecordIn]


class SimulatorMedications(BaseModel):
    """Установка препаратов, влияющих на симулятор."""
    medications: List[str] = Field(default_factory=list, description="Список: ginipral|magnesium|oxytocin")


class MonitoringStartRequest(BaseModel):
    """Запрос на старт мониторинга."""
    monitorId: str = Field(..., description="ID монитора")
    monitoringToken: str = Field(..., description="Токен мониторинга")
    link: str = Field(..., description="Ссылка на поток данных")
    authToken: str = Field(..., description="Токен авторизации")


class MonitoringStartResponse(BaseModel):
    """Ответ на старт мониторинга."""
    sessionId: str = Field(..., description="ID сессии")
    status: str = Field(..., description="Статус")
    startTime: str = Field(..., description="Время начала")


class FHIRExportRequest(BaseModel):
    """Запрос на экспорт в FHIR."""
    patient_id: str = Field(..., description="ID пациента")
    duration_seconds: Optional[int] = Field(default=60, description="Длительность данных в секундах")
    config_name: Optional[str] = Field(default="default", description="Имя конфигурации экспорта")
    send_to_server: Optional[bool] = Field(default=False, description="Отправить на FHIR сервер")


class CTGSimulator:
    """Простой стохастический симулятор FHR и UC в реальном времени."""

    def __init__(
        self,
        baseline_bpm: int = 140,
        variability_bpm: float = 6.0,
        accel_prob_per_sec: float = 0.015,
        decel_prob_per_sec: float = 0.012,
        uc_base: float = 10.0,
        uc_peak: float = 60.0,
        uc_period_sec: float = 120.0,
        seed: Optional[int] = None,
    ) -> None:
        self.random = random.Random(seed)
        self.np_random = np.random.default_rng(seed)
        self.start_monotonic = time.monotonic()
        self.baseline_bpm = baseline_bpm
        self.variability_bpm = variability_bpm
        self.accel_prob_per_sec = accel_prob_per_sec
        self.decel_prob_per_sec = decel_prob_per_sec
        self.uc_base = uc_base
        self.uc_peak = uc_peak
        self.uc_period_sec = uc_period_sec

        # Состояние событий
        self._accel_until_ms: int = 0
        self._decel_until_ms: int = 0
        # Плавность ЧСС (экспоненциальное сглаживание)
        self._fhr_current: float = float(baseline_bpm)
        self.fhr_smooth_alpha: float = 0.15  # 0..1 (меньше — плавнее)
        # История для правил
        self._history_window_sec: int = 60
        self._fhr_hist: deque = deque()  # (t_ms, fhr)
        self._uc_hist: deque = deque()   # (t_ms, uc)
        # Пики UC для тахисистолии
        self._last_uc: float = uc_base
        self._last_peak_ms: int = -10_000
        self._uc_peaks_ms: deque = deque()  # times of peaks (ms)
        # Активные препараты
        self.active_medications: List[str] = []  # 'ginipral', 'magnesium', 'oxytocin'

    def _now_ms(self) -> int:
        return int((time.monotonic() - self.start_monotonic) * 1000)

    def _maybe_trigger_events(self, t_ms: int) -> None:
        # Вероятности в секунду → пересчет на тик
        # Будем эмитить ~10 Гц (каждые 100мс), вероятность на тик p = 1 - (1-rate)^dt
        # Здесь используем фиксированный dt=0.1с
        dt_sec = 0.1
        if self.random.random() < 1 - (1 - self.accel_prob_per_sec) ** dt_sec:
            # акселерация 15-30 секунд, +10..+25 bpm
            self._accel_until_ms = t_ms + self.random.randint(15000, 30000)
        if self.random.random() < 1 - (1 - self.decel_prob_per_sec) ** dt_sec:
            # децелерация 10-25 секунд, -10..-30 bpm
            self._decel_until_ms = t_ms + self.random.randint(10000, 25000)

    def _uc_value(self, t_ms: int) -> float:
        # Плавная волна схваток: базовый тонус + синусоида + редкие пики
        t = t_ms / 1000.0
        phase = 2 * math.pi * (t % self.uc_period_sec) / self.uc_period_sec
        wave = (math.sin(phase) + 1) / 2  # 0..1
        value = self.uc_base + wave * (self.uc_peak - self.uc_base)
        # небольшой белый шум
        value += self.np_random.normal(0.0, 1.0)
        # Эффекты препаратов на UC
        if 'ginipral' in self.active_medications:
            # Токолитик: снижает амплитуду и частоту схваток
            value *= 0.7
        if 'magnesium' in self.active_medications:
            # Снижает тонус и амплитуду
            value = max(0.0, value - 8.0)
        if 'oxytocin' in self.active_medications:
            # Усиливает схватки
            value = min(100.0, value * 1.25 + 5.0)
        return max(0.0, min(100.0, value))

    def _fhr_value(self, t_ms: int) -> (int, bool, bool):
        # Базальная ЧСС + вариабельность (белый шум + лёгкий дрейф)
        drift = 2.0 * math.sin(t_ms / 30000.0)  # медленный дрейф ±2 bpm
        noise = float(self.np_random.normal(0.0, self.variability_bpm))
        raw = self.baseline_bpm + drift + noise
        # Форсируем эпизод патологии в первые 10 секунд
        if t_ms < 10_000:
            raw -= 25.0  # опускаем ЧСС ниже порога, чтобы триггернуть гипоксию
        # Эффекты препаратов на FHR
        if 'ginipral' in self.active_medications:
            # Возможна умеренная тахикардия
            raw += 3.0
        if 'magnesium' in self.active_medications:
            # Лёгкая брадикардия/снижение вариабельности
            raw -= 2.0
            self.variability_bpm = max(2.0, self.variability_bpm * 0.85)
        if 'oxytocin' in self.active_medications:
            # Незначительное влияние на FHR напрямую, оставим без изменения
            pass

        accel = t_ms < self._accel_until_ms
        decel = t_ms < self._decel_until_ms
        if accel:
            raw += self.random.uniform(10.0, 25.0)
        if decel:
            raw -= self.random.uniform(10.0, 30.0)
        # Экспоненциальное сглаживание (EMA)
        a = self.fhr_smooth_alpha
        self._fhr_current = (1 - a) * self._fhr_current + a * raw
        fhr = int(round(max(50, min(210, self._fhr_current))))
        return fhr, accel, decel

    async def stream(self, interval_ms: int = 100) -> AsyncIterator[Dict]:
        """Асинхронный генератор кадров КТГ/UC."""
        while True:
            t_ms = self._now_ms()
            self._maybe_trigger_events(t_ms)
            fhr, accel, decel = self._fhr_value(t_ms)
            uc = self._uc_value(t_ms)
            # Обновляем историю
            self._fhr_hist.append((t_ms, fhr))
            self._uc_hist.append((t_ms, uc))
            while self._fhr_hist and t_ms - self._fhr_hist[0][0] > self._history_window_sec * 1000:
                self._fhr_hist.popleft()
            while self._uc_hist and t_ms - self._uc_hist[0][0] > self._history_window_sec * 1000:
                self._uc_hist.popleft()

            # Тахисистолия: детект пика при переходе через 55 вверх, не чаще одного каждые 45с
            if self._last_uc <= 55.0 and uc > 55.0 and (t_ms - self._last_peak_ms) >= 45_000:
                self._last_peak_ms = t_ms
                self._uc_peaks_ms.append(t_ms)
            self._last_uc = uc
            # чистим пики старше 10 мин
            while self._uc_peaks_ms and t_ms - self._uc_peaks_ms[0] > 600_000:
                self._uc_peaks_ms.popleft()

            # Тестовая постановка патологий в первые 10с (разные окна)
            if t_ms < 3_000:
                # Брадикардия
                fhr = min(fhr, 95)
            elif t_ms < 6_000:
                # Тахикардия
                fhr = max(fhr, 170)
            elif t_ms < 8_000:
                # Низкая вариабельность (держим около базиса)
                self._fhr_current = float(self.baseline_bpm)
                fhr = int(self.baseline_bpm)
            elif t_ms < 10_000:
                # Имитация частых схваток: делаем быстрые всплески UC
                uc = 60.0 + 10.0 * math.sin(t_ms / 150.0)
                # Добавим пики чаще для теста
                self._uc_peaks_ms.append(t_ms)

            # Метрики вариабельности (std за окно)
            recent_fhr = [v for (_, v) in self._fhr_hist]
            fhr_std = float(np.std(recent_fhr)) if recent_fhr else 0.0

            # Правила
            pathologies: List[str] = []
            # Тестовые ярлыки по окнам 0-10с
            if t_ms < 3_000:
                pathologies.append("брадикардия плода (тест)")
            elif t_ms < 6_000:
                pathologies.append("тахикардия плода (тест)")
            elif t_ms < 8_000:
                pathologies.append("сниженная вариабельность (тест)")
            elif t_ms < 10_000:
                pathologies.append("тахисистолия матки (тест)")
            if fhr < 110:
                pathologies.append("брадикардия плода")
            if fhr > 160:
                pathologies.append("тахикардия плода")
            if fhr_std < 3.0 and len(recent_fhr) >= 50:
                pathologies.append("сниженная вариабельность")
            if len(self._uc_peaks_ms) > 5:
                pathologies.append("тахисистолия матки")

            hypoxia = len(pathologies) > 0
            primary_desc = pathologies[0] if pathologies else ""
            sample = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "t_ms": t_ms,
                "fhr_bpm": fhr,
                "uc_mmHg": round(uc, 2),
                "baseline_bpm": self.baseline_bpm,
                "variability_bpm": round(self.variability_bpm, 2),
                "accel": accel,
                "decel": decel,
                "pathology": hypoxia,
                "pathology_desc": primary_desc,
                "pathologies": pathologies,
                "medications": self.active_medications,
            }
            yield sample
            await asyncio.sleep(max(0.0, interval_ms / 1000.0))

    def sample(self) -> Dict:
        t_ms = self._now_ms()
        self._maybe_trigger_events(t_ms)
        fhr, accel, decel = self._fhr_value(t_ms)
        uc = self._uc_value(t_ms)
        # Первые 10с гарантированно сигнализируем
        # Оценка текущих правил (без истории для sample)
        pathologies: List[str] = []
        if t_ms < 10_000:
            pathologies.append("гипоксия плода (тест)")
        if fhr < 110:
            pathologies.append("брадикардия плода")
        if fhr > 160:
            pathologies.append("тахикардия плода")
        hypoxia = len(pathologies) > 0
        primary_desc = pathologies[0] if pathologies else ""
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "t_ms": t_ms,
            "fhr_bpm": fhr,
            "uc_mmHg": round(uc, 2),
            "baseline_bpm": self.baseline_bpm,
            "variability_bpm": round(self.variability_bpm, 2),
            "accel": accel,
            "decel": decel,
            "pathology": hypoxia,
            "pathology_desc": primary_desc,
            "pathologies": pathologies,
            "medications": self.active_medications,
        }


app = FastAPI(
    title="Realtime CTG/UC Simulator",
    version="0.2.0",
    description=(
        "API для эмуляции КТГ (FHR) и сократительной активности матки (UC).\n\n"
        "Основные эндпоинты:\n"
        "- GET /health — проверка сервера.\n"
        "- GET /sample — один JSON-сэмпл, удобно тестировать в Swagger.\n"
        "- GET /stream/ndjson — непрерывный поток NDJSON (application/x-ndjson).\n"
        "- GET /stream/sse — поток Server-Sent Events (text/event-stream).\n"
        "- GET /viewer — встроенный просмотрщик графиков (Plotly + SSE).\n\n"
        "Управление пациентками:\n"
        "- GET /patients — получить всех пациенток.\n"
        "- POST /patients — создать новую пациентку.\n"
        "- GET /patients/{id} — получить пациентку по ID.\n"
        "- PUT /sim/medications/{id} — установить препараты для пациентки.\n\n"
        "Как подключаться на фронте:\n"
        "- NDJSON: читать построчно, каждую строку парсить как JSON для актуализации графиков.\n"
        "- SSE: использовать EventSource и обрабатывать e.data как JSON-строку.\n"
        "Обе схемы подходят для живой отрисовки КТГ/UC."
    ),
)
# Глобальный симулятор для общих потоков
sim = CTGSimulator()
# Глобальные объекты для ML-предсказаний на потоке (эмуляция из CSV)
ml_predictor = RealtimeFetalPredictor()
ml_emulator = DataEmulator()
patient_med_cache: Dict[str, List[str]] = {}


def _ml_features_from_stream_item(item: Dict, feature_names: list) -> Dict[str, float]:
    """Преобразует кадр симулятора в фичи под имена из best_fetal_model_features.pkl.
    Заполняет известные соответствия, остальные — NaN (импутер в пайплайне заполнит)."""
    mapping = {
        "baseline value": item.get("baseline_bpm"),
        "accelerations": 1.0 if item.get("accel") else 0.0,
        "uterine_contractions": item.get("uc_mmHg"),
        "mean_value_of_short_term_variability": item.get("variability_bpm"),
    }
    out = {}
    for name in (feature_names or []):
        out[name] = mapping.get(name, _np.nan)
    # Добавим исходные поля для прогностического буфера (используются в compute_window_features)
    out["fhr_bpm"] = item.get("fhr_bpm")
    out["uc_mmHg"] = item.get("uc_mmHg")
    out["accel"] = bool(item.get("accel"))
    out["decel"] = bool(item.get("decel"))
    out["variability_bpm"] = item.get("variability_bpm")
    return out

# Словарь симуляторов для каждого пациента
patient_simulators: Dict[str, CTGSimulator] = {}


async def get_patient_simulator(patient_id: str, medications: List[str] = None) -> CTGSimulator:
    """Получает или создает симулятор для конкретного пациента."""
    # Лёгкий лог, без шума
    # print(f"[DEBUG] get_patient_simulator пациент {patient_id}")
    if patient_id not in patient_simulators:
        # Создаем новый симулятор с уникальным seed для каждого пациента
        seed = hash(patient_id) % 2**32
        patient_simulators[patient_id] = CTGSimulator(seed=seed)
        # print(f"[DEBUG] Создан новый симулятор для пациента {patient_id} с seed {seed}")
    
    simulator = patient_simulators[patient_id]
    
    # Если препараты не переданы, загружаем их из БД
    if medications is None:
        # сперва из кэша
        cached = patient_med_cache.get(patient_id)
        if cached is not None:
            medications = cached
        elif mongo_db is not None:
            try:
                patient_doc = await mongo_db["patients"].find_one({"_id": ObjectId(patient_id)})
                meds = []
                if patient_doc and patient_doc.get("medications"):
                    meds = patient_doc["medications"]
                patient_med_cache[patient_id] = meds
                medications = meds
            except Exception:
                pass
    
    # Применяем препараты если они есть
    if medications:
        # Маппинг русских названий → внутренние ключи симулятора
        name_map = {
            "гинипрал": "ginipral",
            "гексапреналин": "ginipral",
            "сернокислая магнезия": "magnesium",
            "магнезия": "magnesium",
            "окситоцин": "oxytocin",
        }
        normalized = []
        for m in medications:
            key = name_map.get(m.lower(), m.lower())
            if key in {"ginipral", "magnesium", "oxytocin"}:
                normalized.append(key)
        simulator.active_medications = normalized
        # print(f"[DEBUG] Применены препараты для пациента {patient_id}: {normalized}")
    
    return simulator

# CORS для SSE и API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # в проде лучше указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mongo
mongo_client: Optional[AsyncIOMotorClient] = None
mongo_db: Optional[AsyncIOMotorDatabase] = None

# Внешний API мониторинга
MONITORING_API_BASE = "http://176.109.106.126:4000"
AUTH_TOKEN = "monitor_secret_key_123"

# Персональные роуты для пациентов (заранее созданные)
PATIENT_STREAMS = {
    "stream_001": "http://77.246.158.103:8081/stream/patient/001",
    "stream_002": "http://77.246.158.103:8081/stream/patient/002", 
    "stream_003": "http://77.246.158.103:8081/stream/patient/003",
    "stream_004": "http://77.246.158.103:8081/stream/patient/004",
    "stream_005": "http://77.246.158.103:8081/stream/patient/005",
    "stream_006": "http://77.246.158.103:8081/stream/patient/006"
}


async def register_patient_for_monitoring(patient_name: str) -> Optional[str]:
    """Регистрирует пациента во внешнем сервисе и возвращает monitoring_token."""
    try:
        request_data = {
            "name": patient_name,
            "birthday": "1990-05-15",
            "address": "г. Москва, ул. Ленина, д. 10, кв. 5",
            "phone": "+7 (999) 123-45-67",
            "roomNumber": "205",
            "pregnancyStartDate": "2024-01-15",
            "fetusCount": 1,
            "doctorId": 1,
            # authToken оставляем для обратной совместимости, если сервер 2 его ждёт в теле
            "authToken": AUTH_TOKEN
        }
        print(f"[DEBUG] Регистрация пациента во внешнем API: {patient_name}")
        # Нетребовательный вызов: несколько попыток и увеличенный таймаут чтения.
        response = None
        for attempt in range(3):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{MONITORING_API_BASE}/patients",
                        json=request_data,
                        headers={"Authorization": f"Bearer {AUTH_TOKEN}"},
                        timeout=httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0),
                    )
                break
            except httpx.ReadTimeout:
                if attempt == 2:
                    raise
                # Небольшая задержка перед повтором
                try:
                    import asyncio as _aio
                    await _aio.sleep(0.5 * (attempt + 1))
                except Exception:
                    pass
        
        if response is None:
            print("[DEBUG] Нет ответа от внешнего API")
            return None
            
        print(f"[DEBUG] Регистрация: HTTP {response.status_code}")
        print(f"[DEBUG] URL: {MONITORING_API_BASE}/patients")
        print(f"[DEBUG] Payload: {request_data}")
        # Всегда логируем ответ вне зависимости от кода
        try:
            print(f"[DEBUG] Ответ регистрации: status={response.status_code}")
            try:
                print(f"[DEBUG] Ответ headers: {dict(response.headers)}")
            except Exception:
                pass
            print(f"[DEBUG] Ответ регистрации (raw): {response.text}")
        except Exception:
            pass

        # Пытаемся достать токен из заголовков сразу
        try:
            header_token = (
                response.headers.get("X-Monitoring-Token")
                or response.headers.get("X-Auth-Token")
                or response.headers.get("Authorization")
            )
            if header_token:
                if isinstance(header_token, str) and header_token.lower().startswith("bearer "):
                    header_token = header_token.split(" ", 1)[1]
                print(f"[DEBUG] Токен из заголовка: {header_token}")
                return header_token
        except Exception:
            pass

        if response.status_code in [200, 201]:
            # Сырая строка для диагностики (если JSON невалидный/неожиданный)
            try:
                # уже залогировано выше
                pass
            except Exception:
                pass
            # Безопасный парсинг JSON
            try:
                result = response.json()
            except Exception:
                result = {}
            # Лог JSON для понимания структуры
            try:
                print(f"[DEBUG] Ответ регистрации (json): {result}")
            except Exception:
                pass
            # Рекурсивный поиск токена по возможным ключам
            def _find_token(obj):
                try:
                    if isinstance(obj, dict):
                        for k, v in obj.items():
                            if k in ("monitoringToken", "monitoring_token", "token") and isinstance(v, str) and v:
                                return v
                            found = _find_token(v)
                            if found:
                                return found
                    elif isinstance(obj, list):
                        for item in obj:
                            found = _find_token(item)
                            if found:
                                return found
                except Exception:
                    return None
                return None
            monitoring_token = _find_token(result)
            print(f"[DEBUG] Получен monitoring_token: {monitoring_token}")
            return monitoring_token
        else:
            print(f"Ошибка регистрации пациента: HTTP {response.status_code}, {response.text}")
            try:
                print(f"[DEBUG] Тело ошибки: {response.text}")
            except Exception:
                pass
    except Exception as e:
        print(f"Ошибка регистрации пациента: {e}")
        import traceback
        traceback.print_exc()
    return None


async def start_monitoring_session(patient_id: str, monitoring_token: str) -> Optional[dict]:
    """Запускает сессию мониторинга для пациента."""
    try:
        # Используем универсальный эндпоинт для потоков данных
        stream_route = f"/stream/patient/{patient_id}"
        
        request_data = {
            "monitorId": f"monitor_{patient_id}",
            "monitoringToken": monitoring_token,
            "link": f"http://77.246.158.103:8081{stream_route}",
            "authToken": AUTH_TOKEN
        }
        
        print(f"[DEBUG] Запуск мониторинга для пациента: {patient_id}")
        print(f"[DEBUG] Stream Route: {stream_route}")
        print(f"[DEBUG] URL: {MONITORING_API_BASE}/monitoring/start")
        print(f"[DEBUG] Payload: {request_data}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{MONITORING_API_BASE}/monitoring/start",
                json=request_data,
                timeout=10.0
            )
            
            print(f"[DEBUG] Статус ответа: {response.status_code}")
            print(f"[DEBUG] Ответ: {response.text}")
            
            if response.status_code in [200, 201]:
                result = response.json()
                print(f"[DEBUG] Сессия мониторинга запущена: {result}")
                return result
            else:
                print(f"Ошибка запуска мониторинга: HTTP {response.status_code}, {response.text}")
    except Exception as e:
        print(f"Ошибка запуска мониторинга: {e}")
        import traceback
        traceback.print_exc()
    return None


async def stop_monitoring_session(session_id: str) -> bool:
    """Останавливает сессию мониторинга."""
    try:
        print(f"[DEBUG] Остановка мониторинга для сессии: {session_id}")
        print(f"[DEBUG] URL: {MONITORING_API_BASE}/monitoring/session/{session_id}/stop")
        
        # Формируем запрос с authToken в теле
        request_data = {
            "authToken": AUTH_TOKEN
        }
        
        print(f"[DEBUG] Данные запроса: {request_data}")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{MONITORING_API_BASE}/monitoring/session/{session_id}/stop",
                json=request_data,
                timeout=10.0
            )
            
            print(f"[DEBUG] Статус ответа: {response.status_code}")
            print(f"[DEBUG] Ответ: {response.text}")
            
            success = response.status_code in [200, 201]
            if success:
                print(f"[DEBUG] Сессия мониторинга остановлена успешно")
            else:
                print(f"Ошибка остановки мониторинга: HTTP {response.status_code}, {response.text}")
            
            return success
    except Exception as e:
        print(f"Ошибка остановки мониторинга: {e}")
        import traceback
        traceback.print_exc()
    return False


@app.on_event("startup")
async def on_startup():
    global mongo_client, mongo_db
    if os.getenv("DISABLE_MONGO", "0") == "1":
        print("[DEBUG] MongoDB disabled via DISABLE_MONGO=1. Skipping DB init and indexes.")
        mongo_client = None
        mongo_db = None
    else:
        mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
        try:
            mongo_client = AsyncIOMotorClient(mongo_uri)
            mongo_db = mongo_client.get_database(os.getenv("MONGO_DB", "fetal"))
            # индексы
            await mongo_db["patients"].create_index("full_name")
            await mongo_db["records"].create_index([("patient_id", 1), ("t_ms", 1)])
        except Exception as e:
            print(f"[DEBUG] Mongo init error: {e}. Continuing without Mongo.")
            mongo_client = None
            mongo_db = None
    # Telegram long-polling временно отключён
    pass


@app.on_event("shutdown")
async def on_shutdown():
    global mongo_client
    if mongo_client:
        mongo_client.close()
    # Telegram long-polling временно отключён
    pass


@app.get(
    "/health",
    summary="Проверка сервера",
    description="Возвращает статус работы сервиса. Используется для health checks.",
)
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/patients",
    response_model=PatientOut,
    summary="Создать пациентку",
    description=(
        "Создает запись пациентки в БД (MongoDB). Поля: full_name, medications (опционально)."
    ),
)
async def create_patient(payload: PatientCreate) -> PatientOut:
    if mongo_db is None:
        raise HTTPException(status_code=500, detail="MongoDB is not configured")
    # нормализуем и сохраняем в БД
    provided_meds = [m.strip() for m in (payload.medications or []) if m and m.strip()]
    doc = {
        "full_name": payload.full_name.strip(),
        "medications": provided_meds,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    print(f"[DEBUG] Создание пациентки: full_name={doc['full_name']}, meds={doc['medications']}")
    res = await mongo_db["patients"].insert_one(doc)
    patient_id = str(res.inserted_id)
    print(f"[DEBUG] Вставлена запись пациента в Mongo: _id={patient_id}")

    # Регистрируем пациента во внешнем сервисе → сохраняем monitoring_token
    print(f"[DEBUG] Регистрируем пациента во внешнем сервисе...")
    monitoring_token = await register_patient_for_monitoring(doc["full_name"])
    if monitoring_token:
        await mongo_db["patients"].update_one(
            {"_id": res.inserted_id},
            {"$set": {"monitoring_token": monitoring_token}}
        )
        print(f"[DEBUG] Сохранён monitoring_token в Mongo")
    else:
        print(f"[DEBUG] monitoring_token не получен (None)")

    # Применяем препараты к индивидуальному симулятору пациента
    await get_patient_simulator(patient_id, provided_meds)

    # Старт мониторинга выполняется отдельным роутом /monitoring/start/{patient_id}
    session_data = None

    return PatientOut(
        id=patient_id,
        full_name=doc["full_name"],
        medications=doc["medications"],
        monitoring_token=monitoring_token,
        session_id=(session_data or {}).get("sessionId"),
        is_monitoring=bool(session_data and session_data.get("sessionId"))
    )


@app.get(
    "/patients",
    response_model=List[PatientOut],
    summary="Получить всех пациенток",
    description="Возвращает список всех пациенток из базы данных.",
)
async def get_all_patients() -> List[PatientOut]:
    if mongo_db is None:
        raise HTTPException(status_code=500, detail="MongoDB is not configured")
    
    patients = []
    async for doc in mongo_db["patients"].find():
        patients.append(PatientOut(
            id=str(doc["_id"]), 
            full_name=doc.get("full_name", ""), 
            medications=doc.get("medications", []),
            monitoring_token=doc.get("monitoring_token"),
            session_id=doc.get("session_id"),
            is_monitoring=doc.get("is_monitoring", False)
        ))
    
    return patients


@app.get(
    "/patients/{patient_id}",
    response_model=PatientOut,
    summary="Получить пациентку по ID",
    description="Возвращает данные пациентки по ObjectId.",
)
async def get_patient(patient_id: str = Path(..., description="Mongo ObjectId")) -> PatientOut:
    if mongo_db is None:
        raise HTTPException(status_code=500, detail="MongoDB is not configured")
    try:
        oid = ObjectId(patient_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid patient_id")
    doc = await mongo_db["patients"].find_one({" _id": oid})
    if not doc:
        # Fallback in case of accidental space in key above
        doc = await mongo_db["patients"].find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    return PatientOut(id=str(doc["_id"]), full_name=doc.get("full_name", ""), medications=doc.get("medications", []))


@app.post(
    "/patients/{patient_id}/record",
    summary="Добавить одну запись КТГ/матки",
    description="Сохраняет один кадр измерений для пациентки (timestamp, t_ms, fhr_bpm, uc_mmHg).",
)
async def add_record(patient_id: str, payload: RecordIn):
    if mongo_db is None:
        raise HTTPException(status_code=500, detail="MongoDB is not configured")
    try:
        oid = ObjectId(patient_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid patient_id")
    rec = payload.model_dump()
    rec["patient_id"] = oid
    ins = await mongo_db["records"].insert_one(rec)
    return {"inserted_id": str(ins.inserted_id)}


@app.post(
    "/patients/{patient_id}/records",
    summary="Добавить пакет записей КТГ/матки",
    description="Сохраняет список измерений в одном запросе.",
)
async def add_records(patient_id: str, payload: RecordsIn):
    if mongo_db is None:
        raise HTTPException(status_code=500, detail="MongoDB is not configured")
    try:
        oid = ObjectId(patient_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid patient_id")
    docs = []
    for r in payload.records:
        doc = r.model_dump()
        doc["patient_id"] = oid
        docs.append(doc)
    if not docs:
        return {"inserted_ids": []}
    res = await mongo_db["records"].insert_many(docs)
    return {"inserted_ids": [str(x) for x in res.inserted_ids]}


@app.get(
    "/sample",
    response_model=CTGSample,
    summary="Единичный сэмпл КТГ/UC (JSON)",
    description=(
        "Возвращает один момент времени с полями: timestamp, t_ms, fhr_bpm, uc_mmHg, "
        "baseline_bpm, variability_bpm, accel, decel. Удобно для проверки схемы данных."
    ),
)
def get_sample() -> CTGSample:
    return CTGSample(**sim.sample())


@app.get(
    "/stream/ndjson",
    summary="Непрерывный поток NDJSON",
    description=(
        "Стрим реального времени в формате NDJSON (application/x-ndjson). "
        "Каждая строка — отдельный JSON-объект того же формата, что /sample.\n\n"
        "Пример чтения (curl):\n"
        "curl -N http://127.0.0.1:8000/stream/ndjson\n\n"
        "Пример в браузере (Fetch + ReadableStream): см. описание в README."
    ),
)
async def stream_ndjson():
    async def generator():
        async for item in sim.stream():
            yield (str(CTGSample(**item).model_dump_json()) + "\n").encode("utf-8")
    return StreamingResponse(generator(), media_type="application/x-ndjson")


@app.get(
    "/stream/sse",
    summary="Server-Sent Events (SSE) поток",
    description=(
        "Поток серверных событий (text/event-stream). Поле data каждой SSE-сообщения содержит "
        "JSON-строку с теми же полями, что и /sample.\n\n"
        "Пример подключения в браузере:\n"
        "const es = new EventSource('http://127.0.0.1:8000/stream/sse');\n"
        "es.onmessage = (e) => console.log(JSON.parse(e.data));"
    ),
)
async def stream_sse():
    async def generator():
        async for item in sim.stream():
            data = CTGSample(**item).model_dump_json()
            yield f"data: {data}\n\n"
    return StreamingResponse(generator(), media_type="text/event-stream")


@app.get(
    "/stream/ml",
    summary="SSE-поток с ML-предсказаниями (на основе CSV-эмулятора)",
    description=(
        "Эмулирует поток данных из CSV и добавляет предсказания модели. "
        "Удобно для проверки работы ML на потоке независимо от симулятора КТГ."
    ),
)
async def stream_ml_sse():
    async def generator():
        import asyncio as _asyncio
        import json as _json
        while True:
            sample = ml_emulator.generate_sample()
            pred = ml_predictor.predict_realtime(sample)
            # Преобразуем в JSON-дружественные типы (numpy -> float)
            probs = pred.get("probabilities") or {}
            probs_clean = {k: float(v) for k, v in probs.items()}
            out = {
                "patient_id": pred.get("patient_id"),
                "timestamp": pred.get("timestamp"),
                "prediction": pred.get("prediction"),
                "confidence": float(pred.get("confidence") or 0.0),
                "probabilities": probs_clean,
                "forecasts": pred.get("forecasts", {}),
            }
            yield f"data: {_json.dumps(out, ensure_ascii=False)}\n\n"
            await _asyncio.sleep(0.2)
    return StreamingResponse(generator(), media_type="text/event-stream")


@app.get(
    "/ml/diagnostics",
    summary="Диагностика ML-инференса",
    description="Показывает провайдер инференса (onnx/sklearn), вход ONNX-модели и загруженные forecast-модели",
)
def ml_diagnostics():
    try:
        info = ml_predictor.get_diagnostics()
    except Exception as e:
        info = {"error": str(e)}
    return info


@app.post(
    "/monitoring/start/{patient_id}",
    summary="Запустить мониторинг пациента",
    description="Запускает сессию мониторинга для указанного пациента"
)
async def start_monitoring(patient_id: str = Path(..., description="ID пациента")):
    try:
        print(f"[DEBUG] Запрос на запуск мониторинга для пациента: {patient_id}")
        
        if mongo_db is None:
            raise HTTPException(status_code=500, detail="MongoDB is not configured")
        
        # Получаем данные пациента
        patient_doc = await mongo_db["patients"].find_one({"_id": ObjectId(patient_id)})
        if not patient_doc:
            raise HTTPException(status_code=404, detail="Пациент не найден")
        
        if patient_doc.get("is_monitoring", False):
            raise HTTPException(status_code=400, detail="Мониторинг уже запущен")
        
        monitoring_token = patient_doc.get("monitoring_token")
        if not monitoring_token:
            raise HTTPException(status_code=400, detail="Токен мониторинга не найден")
        
        # Запускаем сессию мониторинга
        session_data = await start_monitoring_session(patient_id, monitoring_token)
        if not session_data:
            raise HTTPException(status_code=500, detail="Ошибка запуска мониторинга")
        
        # Обновляем статус пациента
        await mongo_db["patients"].update_one(
            {"_id": ObjectId(patient_id)},
            {
                "$set": {
                    "session_id": session_data["sessionId"],
                    "is_monitoring": True,
                    "monitoring_started_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        print(f"[DEBUG] Мониторинг успешно запущен для пациента: {patient_id}")
        
        # Отправляем уведомление в Telegram
        try:
            await notify_monitoring_start(patient_id, patient_doc["full_name"])
        except Exception as e:
            print(f"[DEBUG] Ошибка отправки уведомления: {e}")
        
        return {
            "status": "started",
            "sessionId": session_data["sessionId"],
            "startTime": session_data["startTime"]
        }
    except HTTPException:
        # Перебрасываем HTTP исключения как есть
        raise
    except Exception as e:
        print(f"[DEBUG] Неожиданная ошибка в start_monitoring: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")


@app.post(
    "/monitoring/stop/{patient_id}",
    summary="Остановить мониторинг пациента",
    description="Останавливает сессию мониторинга для указанного пациента"
)
async def stop_monitoring(patient_id: str = Path(..., description="ID пациента")):
    if mongo_db is None:
        raise HTTPException(status_code=500, detail="MongoDB is not configured")
    
    print(f"[DEBUG] Запрос на остановку мониторинга для пациента: {patient_id}")
    
    # Получаем данные пациента
    patient_doc = await mongo_db["patients"].find_one({"_id": ObjectId(patient_id)})
    if not patient_doc:
        print(f"[DEBUG] Пациент не найден: {patient_id}")
        raise HTTPException(status_code=404, detail="Пациент не найден")
    
    if not patient_doc.get("is_monitoring", False):
        print(f"[DEBUG] Мониторинг не запущен для пациента: {patient_id}")
        raise HTTPException(status_code=400, detail="Мониторинг не запущен")
    
    session_id = patient_doc.get("session_id")
    if not session_id:
        print(f"[DEBUG] ID сессии не найден для пациента: {patient_id}")
        raise HTTPException(status_code=400, detail="ID сессии не найден")
    
    print(f"[DEBUG] Найден session_id: {session_id}")
    
    # Останавливаем сессию мониторинга
    success = await stop_monitoring_session(session_id)
    if not success:
        print(f"[DEBUG] Ошибка остановки мониторинга для сессии: {session_id}")
        raise HTTPException(status_code=500, detail="Ошибка остановки мониторинга")
    
    # Обновляем статус пациента
    await mongo_db["patients"].update_one(
        {"_id": ObjectId(patient_id)},
        {
            "$set": {
                "is_monitoring": False,
                "monitoring_stopped_at": datetime.now(timezone.utc).isoformat()
            },
            "$unset": {"session_id": ""}
        }
    )
    
    print(f"[DEBUG] Мониторинг успешно остановлен для пациента: {patient_id}")
    
    # Отправляем уведомление в Telegram
    try:
        await notify_monitoring_stop(patient_id, patient_doc["full_name"])
    except Exception as e:
        print(f"[DEBUG] Ошибка отправки уведомления: {e}")
    
    return {
        "status": "stopped",
        "sessionId": session_id,
        "stopTime": datetime.now(timezone.utc).isoformat()
    }


# Персональные роуты для пациентов
@app.get(
    "/stream/patient/001",
    summary="Поток данных для пациента 001",
    description="Server-Sent Events поток для конкретного пациента (с ML)"
)
async def stream_patient_001():
    async def generator():
        simulator = await get_patient_simulator("001")
        import time as _time
        last_ml_t = 0.0
        last_ml = {"prediction": None, "confidence": 0.0, "probabilities": {}, "forecasts": {}}
        async for item in simulator.stream():
            # Троттлинг ML до 2 Гц
            now = _time.monotonic()
            if now - last_ml_t >= 0.5:
                try:
                    feats = _ml_features_from_stream_item(item, getattr(ml_predictor, "feature_names", []) or [])
                    feats["patient_id"] = "001"
                    ml = ml_predictor.predict_realtime(feats)
                    last_ml = {
                        "prediction": ml.get("prediction"),
                        "confidence": float(ml.get("confidence") or 0.0),
                        "probabilities": {k: float(v) for k, v in (ml.get("probabilities") or {}).items()},
                        "forecasts": ml.get("forecasts", {}),
                    }
                except Exception as _e:
                    last_ml = {"error": str(_e)}
                last_ml_t = now
            payload = {**item, "ml": last_ml}
            yield f"data: {_json.dumps(payload, ensure_ascii=False)}\n\n"
    return StreamingResponse(generator(), media_type="text/event-stream")


@app.get(
    "/stream/patient/002",
    summary="Поток данных для пациента 002",
    description="Server-Sent Events поток для конкретного пациента (с ML)"
)
async def stream_patient_002():
    async def generator():
        simulator = await get_patient_simulator("002")
        import time as _time
        last_ml_t = 0.0
        last_ml = {"prediction": None, "confidence": 0.0, "probabilities": {}, "forecasts": {}}
        async for item in simulator.stream():
            now = _time.monotonic()
            if now - last_ml_t >= 0.5:
                try:
                    feats = _ml_features_from_stream_item(item, getattr(ml_predictor, "feature_names", []) or [])
                    feats["patient_id"] = "002"
                    ml = ml_predictor.predict_realtime(feats)
                    last_ml = {
                        "prediction": ml.get("prediction"),
                        "confidence": float(ml.get("confidence") or 0.0),
                        "probabilities": {k: float(v) for k, v in (ml.get("probabilities") or {}).items()},
                        "forecasts": ml.get("forecasts", {}),
                    }
                except Exception as _e:
                    last_ml = {"error": str(_e)}
                last_ml_t = now
            payload = {**item, "ml": last_ml}
            yield f"data: {_json.dumps(payload, ensure_ascii=False)}\n\n"
    return StreamingResponse(generator(), media_type="text/event-stream")


@app.get(
    "/stream/patient/003",
    summary="Поток временно отключен",
    description="Оставлены потоки 001-002"
)
async def stream_patient_003():
    return JSONResponse({"message": "stream disabled"}, status_code=503)


@app.get(
    "/stream/patient/004",
    summary="Поток временно отключен",
    description="Оставлены потоки 001-002"
)
async def stream_patient_004():
    return JSONResponse({"message": "stream disabled"}, status_code=503)


@app.get(
    "/stream/patient/005",
    summary="Поток временно отключен",
    description="Оставлены потоки 001-002"
)
async def stream_patient_005():
    return JSONResponse({"message": "stream disabled"}, status_code=503)


@app.get(
    "/stream/patient/006",
    summary="Поток временно отключен",
    description="Оставлены потоки 001-002"
)
async def stream_patient_006():
    return JSONResponse({"message": "stream disabled"}, status_code=503)


@app.get(
    "/stream/patient/{patient_id}",
    summary="Универсальный поток данных для пациента",
    description="Server-Sent Events поток для любого пациента по ID"
)
async def stream_patient_universal(patient_id: str = Path(..., description="ID пациента")):
    async def generator():
        # Получаем симулятор для конкретного пациента
        simulator = await get_patient_simulator(patient_id)
        async for item in simulator.stream():
            # ML предсказание на лету
            try:
                feats = _ml_features_from_stream_item(item, getattr(ml_predictor, "feature_names", []) or [])
                feats["patient_id"] = patient_id
                ml = ml_predictor.predict_realtime(feats)
                ml_out = {
                    "prediction": ml.get("prediction"),
                    "confidence": float(ml.get("confidence") or 0.0),
                    "probabilities": {k: float(v) for k, v in (ml.get("probabilities") or {}).items()},
                    "forecasts": ml.get("forecasts", {}),
                }
            except Exception as _e:
                ml_out = {"error": str(_e)}

            payload = {**item, "ml": ml_out}
            yield f"data: {_json.dumps(payload, ensure_ascii=False)}\n\n"
    return StreamingResponse(generator(), media_type="text/event-stream")


@app.put(
    "/sim/medications/{patient_id}",
    summary="Установить препараты для конкретной пациентки",
    description="Устанавливает активные препараты для конкретной пациентки и обновляет их в БД.",
)
async def set_patient_medications(
    patient_id: str = Path(..., description="Mongo ObjectId пациентки"),
    payload: SimulatorMedications = None
):
    if mongo_db is None:
        raise HTTPException(status_code=500, detail="MongoDB is not configured")
    
    try:
        oid = ObjectId(patient_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid patient_id")
    
    # Проверяем существование пациентки
    patient_doc = await mongo_db["patients"].find_one({"_id": oid})
    if not patient_doc:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Обновляем препараты в БД
    medications = [m.strip() for m in (payload.medications or []) if m and m.strip()]
    await mongo_db["patients"].update_one(
        {"_id": oid},
        {"$set": {"medications": medications, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Также обновляем препараты в симуляторе для текущей сессии
    await get_patient_simulator(patient_id, medications)
    
    # Отправляем уведомление в Telegram
    try:
        await notify_medication_change(patient_id, patient_doc["full_name"], medications)
    except Exception as e:
        print(f"[DEBUG] Ошибка отправки уведомления: {e}")
    
    return {
        "message": "Medications updated for patient", 
        "patient_id": patient_id,
        "medications": medications
    }


@app.post(
    "/sim/medications",
    summary="Установить препараты для симулятора (legacy)",
    description="Устанавливает активные препараты для симулятора. Принимает список названий препаратов. DEPRECATED: используйте PUT /sim/medications/{patient_id}",
    deprecated=True
)
async def set_medications_legacy(payload: SimulatorMedications):
    sim.active_medications = [m.strip() for m in payload.medications if m and m.strip()]
    return {"message": "Medications updated (legacy)", "active_medications": sim.active_medications}


def create_app() -> FastAPI:
    """Для совместимости с ASGI сервером."""
    return app


@app.get(
    "/viewer",
    response_class=HTMLResponse,
    summary="Встроенный вьювер (Plotly + SSE)",
    description=(
        "HTML-страница с двумя графиками (FHR и UC), подписанными на /stream/sse. "
        "Показывает скользящее окно последних ~15 секунд."
    ),
)
def viewer_page():
    # Простая страница, рисующая два графика с использованием SSE
    return """
<!DOCTYPE html>
<html lang=\"ru\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>CTG/UC Viewer</title>
  <script src=\"https://cdn.plot.ly/plotly-2.35.2.min.js\"></script>
  <style>
    body { font-family: sans-serif; margin: 0; padding: 12px; background: #0b1220; color: #e6edf3; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; }
    .card { background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 12px; flex: 1 1 600px; }
    #status { margin-bottom: 10px; }
  </style>
</head>
<body>
  <h2>Realtime CTG/UC Viewer</h2>
  <div id=\"status\">Подключение к потоку...</div>
  <div style=\"margin:8px 0;\">
    <label style=\"margin-right:8px;\">Препараты:</label>
    <button id=\"btn-ginipral\">Гинипрал</button>
    <button id=\"btn-magnesium\">Сернокислая магнезия</button>
    <button id=\"btn-oxytocin\">Окситоцин</button>
    <button id=\"btn-clear\">Очистить</button>
    <span id=\"meds\" style=\"margin-left:10px;color:#9ca3af;\"></span>
  </div>
  <div id=\"alert\" style=\"margin:8px 0;padding:10px;border-radius:6px;background:#064e3b;color:#d1fae5;display:inline-block;\">Нет патологии</div>
  <div id=\"cards\" class=\"row\" style=\"margin-bottom:12px; gap:8px;\"></div>
  <div class=\"row\">
    <div class=\"card\">
      <h3>FHR (bpm)</h3>
      <div id=\"fhr\" style=\"height:360px;\"></div>
    </div>
    <div class=\"card\">
      <h3>Uterine Contractions (mmHg)</h3>
      <div id=\"uc\" style=\"height:360px;\"></div>
    </div>
  </div>
  <script>
    const fhrDiv = document.getElementById('fhr');
    const ucDiv = document.getElementById('uc');
    const statusEl = document.getElementById('status');
    const alertEl = document.getElementById('alert');
    const cardsEl = document.getElementById('cards');
    const medsEl = document.getElementById('meds');

    const fhrTrace = { x: [], y: [], mode: 'lines', line: { color: '#4ade80', width: 2, shape: 'spline', smoothing: 1.2 }, name: 'FHR' };
    const ucTrace = { x: [], y: [], mode: 'lines', line: { color: '#60a5fa', width: 2, shape: 'spline', smoothing: 1.0 }, name: 'UC' };

    const WINDOW_SEC = 15; // окно 10-20 сек, по умолчанию 15
    const TICK_SEC = 5;    // шаг меток по оси X
    const HZ = 10;         // ожидаемая частота кадров
    const MAX_POINTS = Math.round(WINDOW_SEC * HZ) + 10; // небольшой запас

    Plotly.newPlot(fhrDiv, [fhrTrace], {
      margin: { t: 10 },
      xaxis: { title: 't (s)', dtick: TICK_SEC },
      yaxis: { title: 'bpm', range: [60, 200] },
      paper_bgcolor: '#111827', plot_bgcolor: '#0b1220', font: { color: '#e6edf3' }
    });
    Plotly.newPlot(ucDiv, [ucTrace], {
      margin: { t: 10 },
      xaxis: { title: 't (s)', dtick: TICK_SEC },
      yaxis: { title: 'mmHg', range: [0, 100] },
      paper_bgcolor: '#111827', plot_bgcolor: '#0b1220', font: { color: '#e6edf3' }
    });

    const es = new EventSource('/stream/sse');
    let t0 = null;
    let points = 0;

    es.onopen = () => { statusEl.textContent = 'Подключено'; };
    es.onerror = () => { statusEl.textContent = 'Потеря соединения...'; };
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (t0 === null) t0 = d.t_ms;
        const tsec = (d.t_ms - t0) / 1000.0;

        // Плавное добавление точки без перерисовки всего массива
        Plotly.extendTraces(
          fhrDiv,
          { x: [[tsec]], y: [[d.fhr_bpm]] },
          [0],
          MAX_POINTS
        );
        Plotly.extendTraces(
          ucDiv,
          { x: [[tsec]], y: [[d.uc_mmHg]] },
          [0],
          MAX_POINTS
        );

        // Индикация патологии
        if (d.pathology) {
          alertEl.style.background = '#7f1d1d';
          alertEl.style.color = '#fecaca';
          alertEl.textContent = d.pathology_desc || 'Есть патология';
        } else {
          alertEl.style.background = '#064e3b';
          alertEl.style.color = '#d1fae5';
          alertEl.textContent = 'Нет патологии';
        }

        // Карточки активных патологий
        cardsEl.innerHTML = '';
        (d.pathologies || []).forEach(name => {
          const div = document.createElement('div');
          div.className = 'card';
          div.style.padding = '8px';
          div.style.minWidth = '220px';
          div.style.border = '1px solid #7f1d1d';
          div.style.background = '#111827';
          div.innerHTML = `<b style=\"color:#fca5a5\">${name}</b>`;
          cardsEl.appendChild(div);
        });

        // Отображаем активные препараты
        medsEl.textContent = `Активно: ${(d.medications||[]).join(', ') || 'нет'}`;

        points++;
        if (points % 10 === 0) {
          // редкий relayout для поддержания окна
          const xMin = Math.max(0, tsec - WINDOW_SEC);
          const xMax = xMin + WINDOW_SEC;
          Plotly.relayout(fhrDiv, { 'xaxis.range': [xMin, xMax], 'xaxis.dtick': TICK_SEC });
          Plotly.relayout(ucDiv,  { 'xaxis.range': [xMin, xMax], 'xaxis.dtick': TICK_SEC });
        }
      } catch (_) { /* noop */ }
    };
  </script>
  <script>
    // Кнопки препаратов
    const map = {
      'btn-ginipral': 'ginipral',
      'btn-magnesium': 'magnesium',
      'btn-oxytocin': 'oxytocin',
    };
    const active = new Set();
    async function postMeds() {
      try {
        await fetch('/sim/medications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ medications: Array.from(active) }) });
      } catch (_) {}
    }
    for (const id in map) {
      const el = document.getElementById(id);
      el.onclick = async () => {
        const key = map[id];
        if (active.has(key)) { active.delete(key); el.style.filter=''; }
        else { active.add(key); el.style.filter='brightness(1.4)'; }
        await postMeds();
      };
    }
    document.getElementById('btn-clear').onclick = async () => {
      active.clear();
      for (const id in map) document.getElementById(id).style.filter='';
      await postMeds();
    };
  </script>
</body>
</html>
    """

# Эндпоинты для управления Telegram ботом
@app.post(
    "/telegram/doctors",
    summary="Добавить врача в систему уведомлений",
    description="Добавляет врача в список получателей уведомлений Telegram бота"
)
async def add_doctor_endpoint(chat_id: str = Path(..., description="Chat ID врача в Telegram")):
    try:
        await add_doctor(chat_id)
        return {"message": f"Врач с chat_id {chat_id} добавлен в систему уведомлений"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка добавления врача: {str(e)}")


@app.delete(
    "/telegram/doctors/{chat_id}",
    summary="Удалить врача из системы уведомлений",
    description="Удаляет врача из списка получателей уведомлений Telegram бота"
)
async def remove_doctor_endpoint(chat_id: str = Path(..., description="Chat ID врача в Telegram")):
    try:
        await remove_doctor(chat_id)
        return {"message": f"Врач с chat_id {chat_id} удален из системы уведомлений"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка удаления врача: {str(e)}")


@app.post(
    "/telegram/listening/start",
    summary="Включить режим слушания",
    description="Включает режим слушания для врача - бот будет отправлять уведомления. Автоматически добавляет врача в систему если его нет."
)
async def start_listening_endpoint(chat_id: str = Query(..., description="Chat ID врача в Telegram")):
    try:
        # Сначала добавляем врача в систему (если его нет)
        await add_doctor(chat_id)
        # Затем включаем режим слушания
        await start_listening(chat_id)
        return {"message": f"Врач {chat_id} добавлен в систему и режим слушания включен"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка включения режима слушания: {str(e)}")


@app.post(
    "/telegram/listening/stop",
    summary="Выключить режим слушания",
    description="Выключает режим слушания для врача - бот перестанет отправлять уведомления"
)
async def stop_listening_endpoint(chat_id: str = Query(..., description="Chat ID врача в Telegram")):
    try:
        await stop_listening(chat_id)
        return {"message": f"Режим слушания выключен для врача {chat_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка выключения режима слушания: {str(e)}")


@app.get(
    "/telegram/listening/status",
    summary="Статус режима слушания",
    description="Проверяет, находится ли врач в режиме слушания"
)
async def listening_status_endpoint(chat_id: str = Query(..., description="Chat ID врача в Telegram")):
    try:
        status = await is_listening(chat_id)
        return {"chat_id": chat_id, "listening": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка проверки статуса: {str(e)}")


@app.get(
    "/telegram/listening/active",
    summary="Список активных врачей",
    description="Возвращает список всех врачей в режиме слушания"
)
async def active_doctors_endpoint():
    try:
        from telegram_bot import telegram_bot
        active_doctors = []
        for chat_id in telegram_bot.chat_ids:
            if telegram_bot.is_listening(chat_id):
                active_doctors.append(chat_id)
        return {"active_doctors": active_doctors, "count": len(active_doctors)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения списка врачей: {str(e)}")


# FHIR Export эндпоинты
@app.get(
    "/export/fhir/configs",
    summary="Список конфигураций FHIR экспорта",
    description="Возвращает список доступных конфигураций для экспорта в FHIR"
)
async def get_fhir_configs():
    """Получает список доступных конфигураций FHIR экспорта"""
    try:
        configs = fhir_config.list_configs()
        return {"configs": configs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения конфигураций: {str(e)}")


@app.post(
    "/export/fhir/observations",
    summary="Экспорт данных КТГ в FHIR R4",
    description="Экспортирует данные КТГ пациента в формате FHIR R4 Bundle"
)
async def export_fhir_observations(request: FHIRExportRequest):
    """Экспортирует данные КТГ в FHIR R4"""
    try:
        if mongo_db is None:
            raise HTTPException(status_code=500, detail="MongoDB is not configured")
        
        # Получаем данные пациента
        patient_doc = await mongo_db["patients"].find_one({"_id": ObjectId(request.patient_id)})
        if not patient_doc:
            raise HTTPException(status_code=404, detail="Пациент не найден")
        
        patient_data = {
            "id": str(patient_doc["_id"]),
            "full_name": patient_doc.get("full_name", ""),
            "medications": patient_doc.get("medications", [])
        }
        
        # Получаем симулятор пациента
        simulator = await get_patient_simulator(request.patient_id)
        
        # Генерируем данные за указанный период
        data_points = []
        duration_ms = request.duration_seconds * 1000
        start_time = time.monotonic()
        
        async for item in simulator.stream():
            data_points.append(item)
            if (time.monotonic() - start_time) * 1000 >= duration_ms:
                break
        
        # Создаем FHIR Bundle
        bundle = fhir_exporter.create_bundle(
            patient_data, 
            data_points, 
            request.config_name
        )
        
        result = {
            "bundle": bundle.dict(),
            "patient_id": request.patient_id,
            "data_points_count": len(data_points),
            "duration_seconds": request.duration_seconds,
            "config_name": request.config_name
        }
        
        # Отправляем на FHIR сервер если запрошено
        if request.send_to_server:
            export_result = await fhir_exporter.export_to_fhir_server(
                bundle, 
                request.config_name
            )
            result["server_export"] = export_result
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Ошибка FHIR экспорта: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ошибка экспорта: {str(e)}")


@app.get(
    "/export/fhir/observations/{patient_id}",
    summary="Быстрый экспорт данных КТГ в FHIR",
    description="Экспортирует последние 60 секунд данных КТГ пациента в FHIR R4"
)
async def quick_export_fhir_observations(
    patient_id: str = Path(..., description="ID пациента"),
    duration_seconds: int = Query(default=60, description="Длительность данных в секундах"),
    config_name: str = Query(default="default", description="Имя конфигурации")
):
    """Быстрый экспорт данных КТГ в FHIR"""
    request = FHIRExportRequest(
        patient_id=patient_id,
        duration_seconds=duration_seconds,
        config_name=config_name,
        send_to_server=False
    )
    return await export_fhir_observations(request)


# Вспомогательный предпросмотр payload для запуска мониторинга (без отправки наружу)
@app.get(
    "/monitoring/start/payload/{patient_id}",
    summary="Предпросмотр payload для /monitoring/start",
    description="Возвращает JSON, который будет отправлен на внешний мониторинговый сервер"
)
async def preview_start_payload(patient_id: str = Path(...)):
    # Получаем токен из БД
    if mongo_db is None:
        raise HTTPException(status_code=500, detail="MongoDB is not configured")
    patient_doc = await mongo_db["patients"].find_one({"_id": ObjectId(patient_id)})
    if not patient_doc:
        raise HTTPException(status_code=404, detail="Пациент не найден")
    token = patient_doc.get("monitoring_token")
    if not token:
        raise HTTPException(status_code=400, detail="У пациента отсутствует monitoring_token")

    stream_route = f"/stream/patient/{patient_id}"
    payload = {
        "monitorId": f"monitor_{patient_id}",
        "monitoringToken": token,
        "link": f"http://176.108.250.117:8081{stream_route}",
        "authToken": AUTH_TOKEN
    }
    return {
        "preview": payload,
        "external_endpoint": f"{MONITORING_API_BASE}/monitoring/start"
    }


# HL7 v2 ORU^R01 Export
class HL7ExportRequest(BaseModel):
    patient_id: str
    duration_seconds: Optional[int] = 60
    config_name: Optional[str] = "default"
    send: Optional[bool] = False


@app.get(
    "/export/hl7/preview",
    summary="Предпросмотр HL7 v2 ORU^R01",
    description="Генерирует HL7 сообщение для пациента за заданный период (без отправки)"
)
async def preview_hl7(
    patient_id: str = Query(...),
    duration_seconds: int = Query(60),
    config_name: str = Query("default")
):
    if mongo_db is None:
        raise HTTPException(status_code=500, detail="MongoDB is not configured")
    patient_doc = await mongo_db["patients"].find_one({"_id": ObjectId(patient_id)})
    if not patient_doc:
        raise HTTPException(status_code=404, detail="Пациент не найден")

    simulator = await get_patient_simulator(patient_id)
    data_points = []
    duration_ms = duration_seconds * 1000
    start_time = time.monotonic()
    async for item in simulator.stream():
        data_points.append(item)
        if (time.monotonic() - start_time) * 1000 >= duration_ms:
            break

    cfg = get_hl7_config(config_name)
    patient_data = {"id": str(patient_doc["_id"]), "full_name": patient_doc.get("full_name", "")}
    message = build_oru_r01(patient_data, data_points, cfg, duration_seconds)
    return {"hl7": message}


@app.post(
    "/export/hl7/send",
    summary="Отправка HL7 v2 ORU^R01 по MLLP",
    description="Генерирует и отправляет HL7 сообщение по MLLP"
)
async def send_hl7(req: HL7ExportRequest):
    if mongo_db is None:
        raise HTTPException(status_code=500, detail="MongoDB is not configured")
    patient_doc = await mongo_db["patients"].find_one({"_id": ObjectId(req.patient_id)})
    if not patient_doc:
        raise HTTPException(status_code=404, detail="Пациент не найден")

    simulator = await get_patient_simulator(req.patient_id)
    data_points = []
    duration_ms = (req.duration_seconds or 60) * 1000
    start_time = time.monotonic()
    async for item in simulator.stream():
        data_points.append(item)
        if (time.monotonic() - start_time) * 1000 >= duration_ms:
            break

    cfg = get_hl7_config(req.config_name or "default")
    patient_data = {"id": str(patient_doc["_id"]), "full_name": patient_doc.get("full_name", "")}
    message = build_oru_r01(patient_data, data_points, cfg, req.duration_seconds or 60)
    host = cfg["hl7v2"]["mllp"]["host"]
    port = cfg["hl7v2"]["mllp"]["port"]

    success = False
    ack = ""
    try:
        success, ack = send_mllp(message, host, port)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка MLLP: {e}")

    return {"sent": success, "ack": ack, "host": host, "port": port}


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    try:
        port = int(os.getenv("PORT", "8081"))
    except Exception:
        port = 8081
    uvicorn.run(
        "realtime_api:app",
        host=host,
        port=port,
        reload=False,
    )


