# Docker Deployment - Система Мониторинга КТГ

## Описание

Полная система мониторинга КТГ с Telegram ботом, развернутая в Docker контейнерах.

## Компоненты

- **API Server** - FastAPI сервер с эндпоинтами
- **Telegram Bot** - Бот для уведомлений врачей
- **MongoDB** - База данных для хранения данных пациенток

## Быстрый запуск

### Linux/macOS
```bash
chmod +x docker-start.sh
./docker-start.sh
```

### Windows
```cmd
docker-start.bat
```

### Ручной запуск
```bash
# Сборка и запуск
docker-compose up --build -d

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

## Структура сервисов

### API Server (fetal-api)
- **Порт**: 8081
- **URL**: http://localhost:8081
- **Swagger**: http://localhost:8081/docs
- **Health Check**: http://localhost:8081/health

### MongoDB (fetal-mongo)
- **Порт**: 27017 (внутренний)
- **База данных**: fetal
- **Том**: mongo_data

### Telegram Bot
- **Токен**: 8231116636:AAEzm1aDfPAo1yXY4Zmv6pjekIqnokk3afs
- **Статус**: Активен в контейнере API

## Переменные окружения

### API Server
```env
HOST=0.0.0.0
PORT=8081
MONGO_URI=mongodb://mongo:27017
MONGO_DB=fetal
TELEGRAM_BOT_TOKEN=8231116636:AAEzm1aDfPAo1yXY4Zmv6pjekIqnokk3afs
```

## Управление

### Просмотр статуса
```bash
docker-compose ps
```

### Просмотр логов
```bash
# Все сервисы
docker-compose logs -f

# Только API
docker-compose logs -f api

# Только MongoDB
docker-compose logs -f mongo
```

### Перезапуск сервисов
```bash
# Перезапуск API
docker-compose restart api

# Перезапуск всех
docker-compose restart
```

### Остановка
```bash
# Остановка с сохранением данных
docker-compose down

# Остановка с удалением данных
docker-compose down -v
```

## Мониторинг

### Health Checks
- **API**: `curl http://localhost:8081/health`
- **MongoDB**: Автоматическая проверка подключения

### Логи
Все логи доступны через `docker-compose logs`:
- API сервер: HTTP запросы, ошибки, отладочная информация
- Telegram бот: Уведомления, ошибки отправки
- MongoDB: Запросы к базе данных

## Развертывание на сервере

### 1. Подготовка сервера
```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Клонирование проекта
```bash
git clone <repository-url>
cd fetal
```

### 3. Запуск
```bash
chmod +x docker-start.sh
./docker-start.sh
```

### 4. Настройка Telegram бота
```bash
# Добавление врача
curl -X POST "http://localhost:8081/telegram/doctors?chat_id=YOUR_CHAT_ID"
```

## Безопасность

### Сетевая безопасность
- MongoDB доступна только внутри Docker сети
- API сервер доступен на порту 8081
- Telegram бот работает через HTTPS

### Переменные окружения
- Токен бота хранится в переменной окружения
- В продакшене рекомендуется использовать секреты Docker

## Устранение неполадок

### Проблемы с запуском
```bash
# Проверка логов
docker-compose logs

# Пересборка образа
docker-compose build --no-cache

# Очистка контейнеров
docker-compose down -v
docker system prune -f
```

### Проблемы с MongoDB
```bash
# Проверка подключения
docker-compose exec mongo mongosh --eval "db.adminCommand('ping')"

# Просмотр данных
docker-compose exec mongo mongosh fetal --eval "db.patients.find()"
```

### Проблемы с API
```bash
# Проверка здоровья
curl http://localhost:8081/health

# Проверка эндпоинтов
curl http://localhost:8081/docs
```

### Проблемы с Telegram ботом
```bash
# Проверка логов бота
docker-compose logs api | grep -i telegram

# Тест отправки сообщения
curl -X POST "http://localhost:8081/telegram/doctors?chat_id=YOUR_CHAT_ID"
```

## Масштабирование

### Горизонтальное масштабирование
```yaml
# docker-compose.yml
services:
  api:
    deploy:
      replicas: 3
```

### Вертикальное масштабирование
```yaml
# docker-compose.yml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
```

## Резервное копирование

### MongoDB
```bash
# Создание бэкапа
docker-compose exec mongo mongodump --db fetal --out /backup

# Восстановление
docker-compose exec mongo mongorestore --db fetal /backup/fetal
```

### Конфигурация
```bash
# Сохранение docker-compose.yml
cp docker-compose.yml backup/

# Сохранение переменных окружения
docker-compose config > docker-compose.backup.yml
```

## Обновление

### Обновление кода
```bash
# Получение обновлений
git pull

# Пересборка и перезапуск
docker-compose down
docker-compose up --build -d
```

### Обновление зависимостей
```bash
# Обновление requirements.txt
pip freeze > requirements.txt

# Пересборка образа
docker-compose build --no-cache
```

## Мониторинг производительности

### Метрики контейнеров
```bash
# Использование ресурсов
docker stats

# Детальная информация
docker-compose top
```

### Логирование
```bash
# Настройка логирования в docker-compose.yml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs -f`
2. Проверьте статус: `docker-compose ps`
3. Проверьте здоровье: `curl http://localhost:8081/health`
4. Обратитесь к документации API: http://localhost:8081/docs
