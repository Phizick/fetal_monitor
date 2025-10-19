#!/bin/bash

# Скрипт для развертывания на ARM64 сервере
# Использование: ./deploy-server.sh [SERVER_IP]

SERVER_IP=${1:-"176.108.250.117"}
SERVER_USER="root"

echo "🚀 Развертывание на сервере $SERVER_IP..."

# Проверяем подключение к серверу
echo "🔍 Проверка подключения к серверу..."
ssh -o ConnectTimeout=10 $SERVER_USER@$SERVER_IP "echo '✅ Подключение успешно'"

if [ $? -ne 0 ]; then
    echo "❌ Не удается подключиться к серверу $SERVER_IP"
    echo "💡 Убедитесь, что:"
    echo "   - SSH ключи настроены"
    echo "   - Сервер доступен"
    echo "   - Пользователь $SERVER_USER существует"
    exit 1
fi

# Клонируем репозиторий на сервере
echo "📥 Клонирование репозитория на сервере..."
ssh $SERVER_USER@$SERVER_IP "
    if [ -d 'fetal' ]; then
        echo '📁 Директория существует, обновляем...'
        cd fetal && git pull
    else
        echo '📁 Клонируем репозиторий...'
        git clone https://github.com/your-repo/fetal.git
        cd fetal
    fi
"

# Устанавливаем Docker и Docker Compose (если нужно)
echo "🐳 Проверка Docker на сервере..."
ssh $SERVER_USER@$SERVER_IP "
    if ! command -v docker &> /dev/null; then
        echo '📦 Установка Docker...'
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        systemctl enable docker
        systemctl start docker
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo '📦 Установка Docker Compose...'
        curl -L \"https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
"

# Собираем и запускаем проект
echo "🔨 Сборка и запуск проекта на сервере..."
ssh $SERVER_USER@$SERVER_IP "
    cd fetal
    chmod +x build-arm64.sh
    ./build-arm64.sh
"

if [ $? -eq 0 ]; then
    echo "=" * 50
    echo "✅ РАЗВЕРТЫВАНИЕ ЗАВЕРШЕНО!"
    echo "=" * 50
    echo "🌐 Frontend: http://$SERVER_IP"
    echo "🔧 API: http://$SERVER_IP:8081"
    echo "📊 Swagger: http://$SERVER_IP:8081/docs"
    echo "=" * 50
else
    echo "❌ Ошибка при развертывании!"
    exit 1
fi
