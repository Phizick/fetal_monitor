# 🔌 ИНТЕГРАЦИЯ С МЕДИЦИНСКИМИ ИНФОРМАЦИОННЫМИ СИСТЕМАМИ (МИС)

## 📋 Обзор интеграции

Система мониторинга КТГ поддерживает интеграцию с различными медицинскими информационными системами через стандартные протоколы обмена данными. Это обеспечивает бесшовную передачу данных мониторинга в существующие клинические системы.

## 🏥 Поддерживаемые протоколы

### 1. HL7 v2.5 (Health Level 7)

#### Описание:
- **Стандарт**: HL7 v2.5
- **Тип сообщения**: ORU^R01 (Observation Result)
- **Транспорт**: MLLP (Minimal Lower Layer Protocol)
- **Кодировка**: UTF-8
- **Назначение**: Передача результатов наблюдений в МИС

#### Структура сообщения:
```
MSH - Message Header
PID - Patient Identification
OBR - Observation Request
OBX - Observation Result
```

#### Пример HL7 сообщения:
```
MSH|^~\&|CTG_MONITOR|FetalUnit|MIS|Hospital|20240115103000||ORU^R01|MSG20240115103000|P|2.5|||||UTF-8
PID|1||12345^^^HOSP^MR||Иванова^Анна
OBR|1|12345^CTG|12345^CTG|CTG^Cardiotocography||||||||R
OBX|1|NM|8867-4^FHR^LN|1|140|bpm||||F
OBX|2|NM|11367-0^UC^LN|1|25.5|mm[Hg]||||F
OBX|3|CE|PATH^Pathology^L|1|N^NO^L||||F
```

#### Коды LOINC:
- **8867-4**: Fetal Heart Rate (FHR)
- **11367-0**: Uterine Contractions (UC)

### 2. FHIR R4 (Fast Healthcare Interoperability Resources)

#### Описание:
- **Стандарт**: FHIR R4
- **Формат**: JSON
- **Транспорт**: HTTP/HTTPS
- **Аутентификация**: Bearer Token, OAuth2
- **Назначение**: Современный стандарт обмена медицинскими данными

#### Ресурсы FHIR:
- **Patient**: Данные пациента
- **Device**: Устройство мониторинга
- **Observation**: Результаты наблюдений
- **DiagnosticReport**: Диагностический отчет

#### Пример FHIR Bundle:
```json
{
  "resourceType": "Bundle",
  "type": "collection",
  "id": "ctg_export_12345_1705312200",
  "timestamp": "2024-01-15T10:30:00Z",
  "entry": [
    {
      "resource": {
        "resourceType": "Patient",
        "id": "12345",
        "name": [{"family": "Иванова", "given": ["Анна"]}],
        "identifier": [{
          "value": "12345",
          "system": "http://hospital.local/patients"
        }]
      },
      "fullUrl": "Patient/12345"
    },
    {
      "resource": {
        "resourceType": "Device",
        "id": "ctg_device_12345",
        "type": {
          "coding": [{
            "code": "CTG_MONITOR",
            "display": "Cardiotocography Monitor",
            "system": "http://hospital.local/device-types"
          }]
        },
        "manufacturer": "Fetal Monitoring System"
      },
      "fullUrl": "Device/ctg_device_12345"
    },
    {
      "resource": {
        "resourceType": "Observation",
        "id": "fhr_12345_1705312200",
        "status": "final",
        "category": [{
          "coding": [{
            "code": "vital-signs",
            "display": "Vital Signs",
            "system": "http://terminology.hl7.org/CodeSystem/observation-category"
          }]
        }],
        "code": {
          "coding": [{
            "code": "8867-4",
            "display": "Fetal Heart Rate",
            "system": "http://loinc.org"
          }]
        },
        "subject": {"reference": "Patient/12345"},
        "device": {"reference": "Device/ctg_device_12345"},
        "valueSampledData": {
          "origin": {"value": 0, "unit": "s"},
          "period": 0.1,
          "dimensions": 1,
          "factor": 1.0,
          "data": "0.0,140 0.1,142 0.2,138 0.3,141 0.4,139"
        }
      },
      "fullUrl": "Observation/fhr_12345_1705312200"
    }
  ]
}
```

### 3. DICOM 3.0 (Digital Imaging and Communications in Medicine)

#### Описание:
- **Стандарт**: DICOM 3.0
- **Формат**: Binary
- **Транспорт**: TCP/IP
- **Назначение**: Сохранение КТГ трассировок как медицинских изображений

#### DICOM объекты:
- **SOP Class**: Secondary Capture Image Storage
- **Modality**: CTG (Cardiotocography)
- **Study**: Сессия мониторинга
- **Series**: Трассировка FHR/UC

## ⚙️ Конфигурация интеграции

### HL7 конфигурация:
```json
{
  "export_configs": {
    "default": {
      "hl7v2": {
        "version": "2.5",
        "mllp": {
          "host": "localhost",
          "port": 2575,
          "tls": false,
          "timeout": 10.0
        },
        "msh": {
          "sending_app": "CTG_MONITOR",
          "sending_facility": "FetalUnit",
          "receiving_app": "MIS",
          "receiving_facility": "Hospital",
          "message_type": "ORU^R01",
          "processing_id": "P",
          "version_id": "2.5"
        },
        "codes": {
          "fhr_loinc": "8867-4",
          "uc_loinc": "11367-0"
        }
      }
    },
    "hospital_prod": {
      "hl7v2": {
        "version": "2.5",
        "mllp": {
          "host": "192.168.1.100",
          "port": 2575,
          "tls": true,
          "timeout": 30.0
        },
        "msh": {
          "sending_app": "CTG_MONITOR",
          "sending_facility": "MaternityWard",
          "receiving_app": "HIS",
          "receiving_facility": "CityHospital",
          "message_type": "ORU^R01",
          "processing_id": "P",
          "version_id": "2.5"
        }
      }
    }
  }
}
```

### FHIR конфигурация:
```json
{
  "export_configs": {
    "default": {
      "fhir": {
        "version": "R4",
        "base_url": "http://localhost:8080/fhir",
        "auth": {
          "type": "none"
        },
        "timeout": 30.0,
        "mapping": {
          "fhr_loinc": "8867-4",
          "uc_loinc": "11367-0",
          "device_type": "CTG_MONITOR",
          "device_manufacturer": "Fetal Monitoring System"
        }
      }
    },
    "hospital_prod": {
      "fhir": {
        "version": "R4",
        "base_url": "https://fhir.hospital.local/fhir",
        "auth": {
          "type": "bearer",
          "token": "your_production_token_here"
        },
        "timeout": 60.0,
        "mapping": {
          "fhr_loinc": "8867-4",
          "uc_loinc": "11367-0",
          "device_type": "CTG_MONITOR",
          "device_manufacturer": "Fetal Monitoring System"
        }
      }
    }
  }
}
```

## 🔌 API для интеграции

### Экспорт в HL7:
```http
POST /export/hl7/{patient_id}
Content-Type: application/json

{
  "config_name": "default",
  "observation_window_sec": 300,
  "include_pathology": true
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "HL7 сообщение отправлено",
  "hl7_message": "MSH|^~\\&|CTG_MONITOR|FetalUnit|MIS|Hospital|20240115103000||ORU^R01|MSG20240115103000|P|2.5|||||UTF-8\rPID|1||12345^^^HOSP^MR||Иванова^Анна\rOBR|1|12345^CTG|12345^CTG|CTG^Cardiotocography||||||||R\rOBX|1|NM|8867-4^FHR^LN|1|140|bpm||||F\rOBX|2|NM|11367-0^UC^LN|1|25.5|mm[Hg]||||F\rOBX|3|CE|PATH^Pathology^L|1|N^NO^L||||F\r",
  "sent_at": "2024-01-15T10:30:00Z",
  "mllp_response": "MSA|AA|MSG20240115103000|Message accepted"
}
```

### Экспорт в FHIR:
```http
POST /export/fhir/{patient_id}
Content-Type: application/json

{
  "config_name": "default",
  "include_observations": true,
  "include_diagnostic_report": true,
  "observation_window_sec": 300
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
    "location": "Bundle/ctg_export_12345_1705312200",
    "etag": "W/\"1\"",
    "last_modified": "2024-01-15T10:30:00Z"
  },
  "sent_at": "2024-01-15T10:30:00Z"
}
```

### Статус интеграции:
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
    "failed_exports": 6,
    "average_response_time_ms": 45.2
  },
  "fhir": {
    "enabled": true,
    "last_export": "2024-01-15T10:30:00Z",
    "success_rate": 98.8,
    "total_exports": 1200,
    "failed_exports": 14,
    "average_response_time_ms": 120.5
  },
  "dicom": {
    "enabled": false,
    "last_export": null,
    "success_rate": 0,
    "total_exports": 0,
    "failed_exports": 0,
    "average_response_time_ms": 0
  }
}
```

### Конфигурация интеграции:
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
    "receiving_facility": "Hospital",
    "timeout_seconds": 10
  },
  "fhir": {
    "version": "R4",
    "base_url": "http://localhost:8080/fhir",
    "auth_type": "none",
    "timeout_seconds": 30
  },
  "dicom": {
    "enabled": false,
    "ae_title": "CTG_MONITOR",
    "port": 104,
    "timeout_seconds": 30
  }
}
```

### Обновление конфигурации:
```http
PUT /integration/config
Content-Type: application/json

{
  "hl7": {
    "mllp_host": "192.168.1.100",
    "mllp_port": 2575,
    "tls_enabled": true,
    "timeout_seconds": 30
  },
  "fhir": {
    "base_url": "https://fhir.hospital.local/fhir",
    "auth": {
      "type": "bearer",
      "token": "new_token_here"
    },
    "timeout_seconds": 60
  }
}
```

## 🔧 Настройка интеграции

### 1. Настройка HL7:

#### Установка MLLP сервера:
```bash
# Установка HAPI FHIR MLLP сервера
docker run -d --name hl7-server -p 2575:2575 \
  -e HAPI_FHIR_VERSION=R4 \
  -e HAPI_FHIR_SERVER_ADDRESS=0.0.0.0 \
  -e HAPI_FHIR_SERVER_PORT=8080 \
  hapiproject/hapi:latest
```

#### Тестирование HL7:
```bash
# Отправка тестового HL7 сообщения
curl -X POST "http://localhost:8081/export/hl7/001" \
  -H "Content-Type: application/json" \
  -d '{"config_name": "default", "observation_window_sec": 60}'
```

### 2. Настройка FHIR:

#### Установка FHIR сервера:
```bash
# Установка HAPI FHIR сервера
docker run -d --name fhir-server -p 8080:8080 \
  -e HAPI_FHIR_VERSION=R4 \
  -e HAPI_FHIR_SERVER_ADDRESS=0.0.0.0 \
  -e HAPI_FHIR_SERVER_PORT=8080 \
  hapiproject/hapi:latest
```

#### Тестирование FHIR:
```bash
# Отправка тестового FHIR Bundle
curl -X POST "http://localhost:8081/export/fhir/001" \
  -H "Content-Type: application/json" \
  -d '{"config_name": "default", "include_observations": true}'
```

### 3. Настройка DICOM:

#### Установка DICOM сервера:
```bash
# Установка Orthanc DICOM сервера
docker run -d --name orthanc -p 8042:8042 -p 4242:4242 \
  -v orthanc-db:/var/lib/orthanc/db \
  jodogne/orthanc-plugins
```

## 📊 Мониторинг интеграции

### Логи интеграции:
```bash
# Просмотр логов HL7
docker logs hl7-server

# Просмотр логов FHIR
docker logs fhir-server

# Просмотр логов DICOM
docker logs orthanc
```

### Метрики производительности:
- **Время отклика**: Среднее время ответа от МИС
- **Успешность**: Процент успешных экспортов
- **Пропускная способность**: Количество экспортов в минуту
- **Ошибки**: Детализация ошибок интеграции

### Алерты:
- **Недоступность МИС**: Уведомление при недоступности системы
- **Высокий процент ошибок**: Алерт при превышении порога ошибок
- **Медленный отклик**: Уведомление при превышении времени отклика

## 🔒 Безопасность интеграции

### Аутентификация:
- **HL7**: IP-адреса, сертификаты TLS
- **FHIR**: Bearer Token, OAuth2, Basic Auth
- **DICOM**: Application Entity (AE) Title

### Шифрование:
- **TLS 1.2+**: Для всех HTTP/HTTPS соединений
- **MLLP over TLS**: Для HL7 сообщений
- **DICOM TLS**: Для DICOM соединений

### Аудит:
- **Логирование**: Все операции экспорта
- **Мониторинг**: Отслеживание попыток доступа
- **Алерты**: Уведомления о подозрительной активности

## 🚀 Развертывание в продакшене

### 1. Подготовка инфраструктуры:
```bash
# Создание сети для интеграции
docker network create mis-integration

# Запуск сервисов интеграции
docker-compose -f docker-compose.integration.yml up -d
```

### 2. Конфигурация продакшена:
```json
{
  "export_configs": {
    "production": {
      "hl7v2": {
        "mllp": {
          "host": "his.hospital.local",
          "port": 2575,
          "tls": true
        }
      },
      "fhir": {
        "base_url": "https://fhir.hospital.local/fhir",
        "auth": {
          "type": "oauth2",
          "client_id": "ctg_monitor",
          "client_secret": "secret_key"
        }
      }
    }
  }
}
```

### 3. Мониторинг и алерты:
```yaml
# Prometheus конфигурация
scrape_configs:
  - job_name: 'ctg-integration'
    static_configs:
      - targets: ['localhost:8081']
    metrics_path: '/metrics'
    scrape_interval: 30s
```

## 📚 Документация по интеграции

### Ссылки на стандарты:
- **HL7 v2.5**: http://www.hl7.org/implement/standards/product_brief.cfm?product_id=185
- **FHIR R4**: https://www.hl7.org/fhir/
- **DICOM 3.0**: https://www.dicomstandard.org/

### Примеры интеграции:
- **HAPI FHIR**: https://hapifhir.io/
- **MLLP**: https://hapifhir.io/hapi-hl7v2/
- **Orthanc**: https://www.orthanc-server.com/

---

**Версия документации**: 1.0  
**Дата обновления**: 2024-01-15  
**Автор**: Команда разработки системы мониторинга КТГ
