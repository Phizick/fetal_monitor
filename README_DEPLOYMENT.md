# 🚀 Развертывание системы мониторинга КТГ

## 📋 Требования

- **Архитектура**: ARM64 (Ubuntu 22.04+)
- **RAM**: 8+ ГБ
- **Диск**: 100+ ГБ SSD
- **Docker**: 20.10+
- **Docker Compose**: 2.0+

## 🛠️ Быстрое развертывание

### 1. На локальной машине (разработка)

```bash
# Клонирование репозитория
git clone <your-repo-url>
cd fetal

# Сборка и запуск
chmod +x build-arm64.sh
./build-arm64.sh
```

### 2. На сервере ARM64

```bash
# Автоматическое развертывание
chmod +x deploy-server.sh
./deploy-server.sh 176.108.250.117
```

### 3. Ручное развертывание на сервере

```bash
# Подключение к серверу
ssh root@176.108.250.117

# Клонирование репозитория
git clone <your-repo-url>
cd fetal

# Установка Docker (если не установлен)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable docker
systemctl start docker

# Установка Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Сборка и запуск
chmod +x build-arm64.sh
./build-arm64.sh
```

## 🌐 Доступ к приложению

После успешного развертывания:

- **Frontend**: http://176.108.250.117
- **API**: http://176.108.250.117:8081
- **Swagger UI**: http://176.108.250.117:8081/docs
- **Health Check**: http://176.108.250.117:8081/health

## 🔧 Управление контейнерами

```bash
# Просмотр статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Перезапуск
docker-compose restart

# Обновление (после git pull)
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📊 Мониторинг

### Проверка здоровья системы

```bash
# Проверка API
curl http://176.108.250.117:8081/health

# Проверка MongoDB
docker exec fetal-mongo mongosh --eval "db.adminCommand('ping')"

# Проверка логов
docker-compose logs --tail=50
```

### Ресурсы системы

```bash
# Использование ресурсов контейнерами
docker stats

# Использование диска
df -h

# Использование памяти
free -h
```

## 🐛 Устранение неполадок

### Проблемы с сборкой

1. **Недостаточно памяти**:
   ```bash
   # Увеличьте swap
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

2. **Ошибки Docker**:
   ```bash
   # Очистка Docker
   docker system prune -a
   docker volume prune
   ```

3. **Проблемы с портами**:
   ```bash
   # Проверка занятых портов
   netstat -tulpn | grep :80
   netstat -tulpn | grep :8081
   ```

### Проблемы с фронтендом

1. **Белый экран**:
   - Проверьте консоль браузера на ошибки
   - Убедитесь, что API доступен

2. **Ошибки API**:
   - Проверьте логи: `docker-compose logs app`
   - Проверьте подключение к MongoDB

## 🔄 Обновление

```bash
# На сервере
cd fetal
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## 📝 Конфигурация

### Переменные окружения

Основные переменные в `docker-compose.yml`:

- `MONGO_URI`: Строка подключения к MongoDB
- `MONGO_DB`: Имя базы данных
- `HOST`: Хост для API (0.0.0.0)
- `PORT`: Порт для API (8081)
- `TELEGRAM_BOT_TOKEN`: Токен Telegram бота

### Nginx конфигурация

Nginx настроен для:
- Обслуживания статических файлов фронтенда
- Проксирования API запросов
- Поддержки SPA роутинга

## 🆘 Поддержка

При возникновении проблем:

1. Проверьте логи: `docker-compose logs -f`
2. Проверьте статус контейнеров: `docker-compose ps`
3. Проверьте ресурсы системы: `docker stats`
4. Создайте issue в репозитории с логами
