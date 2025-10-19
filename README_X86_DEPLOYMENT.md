# 🚀 Развертывание на x86_64 сервере

## 📋 Требования

- **ОС**: Linux (Ubuntu 20.04+, CentOS 7+, Debian 10+)
- **Архитектура**: x86_64 (amd64)
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **RAM**: минимум 2GB, рекомендуется 4GB+
- **Диск**: минимум 5GB свободного места

## 🔧 Установка зависимостей

### Ubuntu/Debian:
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Перезагрузка для применения изменений
sudo reboot
```

### CentOS/RHEL:
```bash
# Установка Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## 📦 Развертывание проекта

### 1. Клонирование репозитория:
```bash
git clone <repository-url>
cd fetal
```

### 2. Настройка прав доступа:
```bash
chmod +x build-x86.sh
chmod +x stop-x86.sh
```

### 3. Сборка и запуск:
```bash
./build-x86.sh
```

### 4. Проверка статуса:
```bash
docker-compose -f docker-compose.x86.yml ps
```

## 🌐 Доступ к приложению

- **Frontend**: http://your-server-ip
- **API**: http://your-server-ip:8081
- **Swagger UI**: http://your-server-ip:8081/docs
- **MongoDB**: localhost:27018

## 🔧 Управление сервисами

### Остановка:
```bash
./stop-x86.sh
```

### Перезапуск:
```bash
docker-compose -f docker-compose.x86.yml restart
```

### Просмотр логов:
```bash
docker-compose -f docker-compose.x86.yml logs -f
```

### Обновление:
```bash
git pull
./build-x86.sh
```

## 🛠️ Настройка

### Переменные окружения:
Отредактируйте `docker-compose.x86.yml` для изменения:
- `TELEGRAM_BOT_TOKEN` - токен Telegram бота
- `MONGO_URI` - строка подключения к MongoDB
- Порты (80, 8081, 27018)

### Файрвол:
```bash
# Открытие портов
sudo ufw allow 80
sudo ufw allow 8081
sudo ufw allow 27018
```

## 📊 Мониторинг

### Проверка здоровья:
```bash
curl http://localhost:8081/health
```

### Статус контейнеров:
```bash
docker ps
```

### Использование ресурсов:
```bash
docker stats
```

## 🚨 Устранение неполадок

### Проблемы с портами:
```bash
# Проверка занятых портов
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :8081
```

### Проблемы с Docker:
```bash
# Перезапуск Docker
sudo systemctl restart docker
```

### Очистка системы:
```bash
# Полная очистка Docker
docker system prune -a -f --volumes
```

## 📝 Логи

### Все сервисы:
```bash
docker-compose -f docker-compose.x86.yml logs
```

### Конкретный сервис:
```bash
docker-compose -f docker-compose.x86.yml logs app
docker-compose -f docker-compose.x86.yml logs mongo
```

## 🔒 Безопасность

### Настройка SSL (опционально):
1. Получите SSL сертификат (Let's Encrypt)
2. Настройте Nginx для HTTPS
3. Обновите конфигурацию в Dockerfile

### Резервное копирование:
```bash
# Бэкап MongoDB
docker exec $(docker ps -q --filter "name=mongo") mongodump --out /backup

# Бэкап конфигурации
tar -czf config-backup.tar.gz docker-compose.x86.yml build-x86.sh
```

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose -f docker-compose.x86.yml logs`
2. Проверьте статус: `docker ps`
3. Проверьте ресурсы: `docker stats`
4. Обратитесь к документации проекта
