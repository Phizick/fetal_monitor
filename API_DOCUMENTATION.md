# 🔌 API ДОКУМЕНТАЦИЯ СИСТЕМЫ МОНИТОРИНГА КТГ

## 📋 Общая информация

### Базовый URL:
```
http://localhost:8081
```

### Формат данных:
- **Content-Type**: `application/json`
- **Кодировка**: UTF-8
- **Формат даты**: ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)

### Аутентификация:
- **Тип**: Bearer Token
- **Header**: `Authorization: Bearer <token>`
- **Получение токена**: POST `/auth/login`

## 🏥 Управление пациентами

### Создание пациента
```http
POST /patients
Content-Type: application/json

{
  "full_name": "Иванова Анна Петровна",
  "medications": ["Магнезия", "Но-шпа"],
  "birth_date": "1990-05-15",
  "medical_record": "MR-12345"
}
```

**Ответ:**
```json
{
  "id": "68dbfb7a16c912587db7e1c8",
  "full_name": "Иванова Анна Петровна",
  "medications": ["Магнезия", "Но-шпа"],
  "birth_date": "1990-05-15",
  "medical_record": "MR-12345",
  "monitoring_token": "abc123def456",
  "session_id": "sess_789",
  "is_monitoring": false,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Получение списка пациентов
```http
GET /patients
```

**Ответ:**
```json
[
  {
    "id": "68dbfb7a16c912587db7e1c8",
    "full_name": "Иванова Анна Петровна",
    "medications": ["Магнезия", "Но-шпа"],
    "is_monitoring": true
  },
  {
    "id": "68dbfb7a16c912587db7e1c9",
    "full_name": "Петрова Мария Ивановна",
    "medications": ["Но-шпа"],
    "is_monitoring": false
  }
]
```

### Получение данных пациента
```http
GET /patients/{patient_id}
```

**Ответ:**
```json
{
  "id": "68dbfb7a16c912587db7e1c8",
  "full_name": "Иванова Анна Петровна",
  "medications": ["Магнезия", "Но-шпа"],
  "birth_date": "1990-05-15",
  "medical_record": "MR-12345",
  "monitoring_token": "abc123def456",
  "session_id": "sess_789",
  "is_monitoring": true,
  "created_at": "2024-01-15T10:30:00Z",
  "last_updated": "2024-01-15T12:45:00Z"
}
```

### Обновление данных пациента
```http
PUT /patients/{patient_id}
Content-Type: application/json

{
  "full_name": "Иванова Анна Петровна (обновлено)",
  "medications": ["Магнезия", "Но-шпа", "Папаверин"]
}
```

### Удаление пациента
```http
DELETE /patients/{patient_id}
```

**Ответ:**
```json
{
  "message": "Пациент успешно удален",
  "patient_id": "68dbfb7a16c912587db7e1c8"
}
```

## 📊 Мониторинг

### Запуск мониторинга
```http
POST /monitoring/start/{patient_id}
```

**Ответ:**
```json
{
  "message": "Мониторинг запущен",
  "patient_id": "68dbfb7a16c912587db7e1c8",
  "monitoring_token": "abc123def456",
  "session_id": "sess_789",
  "started_at": "2024-01-15T10:30:00Z"
}
```

### Остановка мониторинга
```http
POST /monitoring/stop/{patient_id}
```

**Ответ:**
```json
{
  "message": "Мониторинг остановлен",
  "patient_id": "68dbfb7a16c912587db7e1c8",
  "stopped_at": "2024-01-15T12:30:00Z"
}
```

### Статус мониторинга
```http
GET /monitoring/status/{patient_id}
```

**Ответ:**
```json
{
  "patient_id": "68dbfb7a16c912587db7e1c8",
  "is_monitoring": true,
  "started_at": "2024-01-15T10:30:00Z",
  "duration_minutes": 120,
  "data_points": 7200
}
```

## 📡 Потоки данных (SSE)

### Общий поток данных
```http
GET /stream/sse
Accept: text/event-stream
Cache-Control: no-cache
```

**Формат данных:**
```
data: {"timestamp": "2024-01-15T10:30:00Z", "patient_id": "001", "fhr_bpm": 140, "uc_mmHg": 25.5}

data: {"timestamp": "2024-01-15T10:30:01Z", "patient_id": "001", "fhr_bpm": 142, "uc_mmHg": 26.1}
```

### Поток данных конкретного пациента
```http
GET /stream/patient/{patient_id}
Accept: text/event-stream
Cache-Control: no-cache
```

**Формат данных:**
```
data: {
  "timestamp": "2024-01-15T10:30:00Z",
  "t_ms": 1000,
  "fhr_bpm": 140,
  "uc_mmHg": 25.5,
  "baseline_bpm": 140,
  "variability_bpm": 8.5,
  "accel": false,
  "decel": false,
  "pathology": false,
  "pathology_desc": "",
  "pathologies": [],
  "medications": ["Магнезия"],
  "ml": {
    "prediction": "Normal",
    "confidence": 0.95,
    "probabilities": {
      "Normal": 0.95,
      "Suspect": 0.04,
      "Pathological": 0.01
    },
    "forecasts": {
      "10min": {
        "fetal_bradycardia": 0.0,
        "fetal_tachycardia": 0.05,
        "low_variability": 0.1,
        "uterine_tachysystole": 0.02,
        "any_pathology": 0.15
      },
      "30min": {
        "fetal_bradycardia": 0.0,
        "fetal_tachycardia": 0.08,
        "low_variability": 0.12,
        "uterine_tachysystole": 0.05,
        "any_pathology": 0.18
      },
      "60min": {
        "fetal_bradycardia": 0.01,
        "fetal_tachycardia": 0.1,
        "low_variability": 0.15,
        "uterine_tachysystole": 0.08,
        "any_pathology": 0.22
      }
    }
  }
}
```

## 🧪 Симуляция данных

### Получение симулированных данных
```http
GET /sim/patient/{patient_id}
```

**Ответ:**
```json
{
  "patient_id": "68dbfb7a16c912587db7e1c8",
  "timestamp": "2024-01-15T10:30:00Z",
  "fhr_bpm": 140,
  "uc_mmHg": 25.5,
  "baseline_bpm": 140,
  "variability_bpm": 8.5,
  "accel": false,
  "decel": false,
  "pathology": false,
  "pathology_desc": "",
  "pathologies": []
}
```

## 🔍 Системная информация

### Проверка здоровья системы
```http
GET /health
```

**Ответ:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "api": "running",
    "database": "connected",
    "ml_engine": "ready",
    "telegram_bot": "active"
  },
  "uptime_seconds": 3600,
  "memory_usage_mb": 512,
  "cpu_usage_percent": 15.5
}
```

### Получение метрик
```http
GET /metrics
```

**Ответ:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "patients_total": 25,
  "patients_monitoring": 3,
  "data_points_total": 150000,
  "data_points_last_hour": 10800,
  "ml_predictions_total": 150000,
  "ml_predictions_last_hour": 10800,
  "average_prediction_time_ms": 5.2,
  "error_rate_percent": 0.1
}
```

## 🔌 Интеграция с МИС

### Экспорт в HL7 v2.5
```http
POST /export/hl7/{patient_id}
Content-Type: application/json

{
  "config_name": "default",
  "observation_window_sec": 300
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "HL7 сообщение отправлено",
  "hl7_message": "MSH|^~\\&|CTG_MONITOR|FetalUnit|MIS|Hospital|20240115103000||ORU^R01|MSG20240115103000|P|2.5|||||UTF-8\rPID|1||12345^^^HOSP^MR||Иванова^Анна\rOBR|1|12345^CTG|12345^CTG|CTG^Cardiotocography||||||||R\rOBX|1|NM|8867-4^FHR^LN|1|140|bpm||||F\rOBX|2|NM|11367-0^UC^LN|1|25.5|mm[Hg]||||F\rOBX|3|CE|PATH^Pathology^L|1|N^NO^L||||F\r",
  "sent_at": "2024-01-15T10:30:00Z"
}
```

### Экспорт в FHIR R4
```http
POST /export/fhir/{patient_id}
Content-Type: application/json

{
  "config_name": "default",
  "include_observations": true,
  "include_diagnostic_report": true
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "FHIR Bundle создан и отправлен",
  "bundle_id": "ctg_export_12345_1705312200",
  "fhir_server_response": {
    "status_code": 201,
    "location": "Bundle/ctg_export_12345_1705312200"
  },
  "sent_at": "2024-01-15T10:30:00Z"
}
```

### Статус интеграции
```http
GET /integration/status
```

**Ответ:**
```json
{
  "hl7": {
    "enabled": true,
    "last_export": "2024-01-15T10:30:00Z",
    "success_rate": 99.5,
    "total_exports": 1250,
    "failed_exports": 6
  },
  "fhir": {
    "enabled": true,
    "last_export": "2024-01-15T10:30:00Z",
    "success_rate": 98.8,
    "total_exports": 1200,
    "failed_exports": 14
  },
  "dicom": {
    "enabled": false,
    "last_export": null,
    "success_rate": 0,
    "total_exports": 0,
    "failed_exports": 0
  }
}
```

### Конфигурация интеграции
```http
GET /integration/config
```

**Ответ:**
```json
{
  "hl7": {
    "version": "2.5",
    "mllp_host": "localhost",
    "mllp_port": 2575,
    "tls_enabled": false,
    "sending_app": "CTG_MONITOR",
    "sending_facility": "FetalUnit",
    "receiving_app": "MIS",
    "receiving_facility": "Hospital"
  },
  "fhir": {
    "version": "R4",
    "base_url": "http://localhost:8080/fhir",
    "auth_type": "bearer",
    "timeout_seconds": 30
  }
}
```

### Обновление конфигурации
```http
PUT /integration/config
Content-Type: application/json

{
  "hl7": {
    "mllp_host": "192.168.1.100",
    "mllp_port": 2575,
    "tls_enabled": true
  },
  "fhir": {
    "base_url": "https://fhir.hospital.local/fhir",
    "auth": {
      "type": "bearer",
      "token": "new_token_here"
    }
  }
}
```

## 📚 Документация API

### Swagger UI
```http
GET /docs
```

### OpenAPI спецификация
```http
GET /openapi.json
```

## 🚨 Коды ошибок

### HTTP статус коды:
- **200 OK**: Успешный запрос
- **201 Created**: Ресурс создан
- **400 Bad Request**: Неверный запрос
- **401 Unauthorized**: Не авторизован
- **403 Forbidden**: Доступ запрещен
- **404 Not Found**: Ресурс не найден
- **422 Unprocessable Entity**: Ошибка валидации
- **500 Internal Server Error**: Внутренняя ошибка сервера
- **503 Service Unavailable**: Сервис недоступен

### Формат ошибок:
```json
{
  "error": "ValidationError",
  "message": "Неверные данные пациента",
  "details": {
    "field": "full_name",
    "reason": "Поле обязательно для заполнения"
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "request_id": "req_123456"
}
```

## 🔐 Аутентификация

### Получение токена
```http
POST /auth/login
Content-Type: application/json

{
  "username": "doctor",
  "password": "secure_password"
}
```

**Ответ:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "user_123",
    "username": "doctor",
    "role": "physician",
    "permissions": ["read", "write", "monitor"]
  }
}
```

### Обновление токена
```http
POST /auth/refresh
Authorization: Bearer <token>
```

### Выход из системы
```http
POST /auth/logout
Authorization: Bearer <token>
```

## 📊 Примеры использования

### Python (requests):
```python
import requests
import json

# Создание пациента
response = requests.post(
    "http://localhost:8081/patients",
    json={
        "full_name": "Иванова Анна Петровна",
        "medications": ["Магнезия", "Но-шпа"]
    }
)
patient = response.json()

# Запуск мониторинга
requests.post(f"http://localhost:8081/monitoring/start/{patient['id']}")

# Получение потока данных
response = requests.get(
    f"http://localhost:8081/stream/patient/{patient['id']}",
    stream=True
)
for line in response.iter_lines():
    if line:
        data = json.loads(line.decode('utf-8'))
        print(f"FHR: {data['fhr_bpm']}, UC: {data['uc_mmHg']}")
```

### JavaScript (fetch):
```javascript
// Создание пациента
const createPatient = async () => {
  const response = await fetch('http://localhost:8081/patients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      full_name: 'Иванова Анна Петровна',
      medications: ['Магнезия', 'Но-шпа']
    })
  });
  return await response.json();
};

// Получение потока данных
const streamData = (patientId) => {
  const eventSource = new EventSource(`http://localhost:8081/stream/patient/${patientId}`);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('FHR:', data.fhr_bpm, 'UC:', data.uc_mmHg);
  };
};
```

### cURL:
```bash
# Создание пациента
curl -X POST "http://localhost:8081/patients" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Иванова Анна Петровна",
    "medications": ["Магнезия", "Но-шпа"]
  }'

# Запуск мониторинга
curl -X POST "http://localhost:8081/monitoring/start/001"

# Получение потока данных
curl -N "http://localhost:8081/stream/patient/001"
```

---

**Версия API**: 1.0  
**Дата обновления**: 2024-01-15  
**Автор**: Команда разработки системы мониторинга КТГ
