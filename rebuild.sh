#!/bin/bash

echo "🧹 Полная очистка и пересборка проекта..."

# Остановка всех контейнеров
echo "🛑 Остановка всех контейнеров..."
docker stop $(docker ps -aq) 2>/dev/null || true

# Удаление всех контейнеров
echo "🗑️  Удаление всех контейнеров..."
docker rm $(docker ps -aq) 2>/dev/null || true

# Удаление всех образов
echo "🗑️  Удаление всех образов..."
docker rmi $(docker images -aq) 2>/dev/null || true

# Полная очистка системы Docker
echo "🧹 Полная очистка Docker системы..."
docker system prune -a -f --volumes

echo "✅ Очистка завершена!"

# Сборка с нуля
echo "🔨 Сборка образа с нуля..."
docker build --platform linux/arm64 -t fetal-app:arm64 . --no-cache

if [ $? -eq 0 ]; then
    echo "✅ Сборка успешно завершена!"
    echo "🚀 Запуск контейнеров..."
    docker-compose up -d
    
    echo "=================================================="
    echo "✅ ПРОЕКТ ЗАПУЩЕН!"
    echo "=================================================="
    echo "🌐 Frontend: http://localhost"
    echo "🔧 API: http://localhost:8081"
    echo "📊 Swagger: http://localhost:8081/docs"
    echo "=================================================="
    
    # Показываем статус контейнеров
    echo "📊 Статус контейнеров:"
    docker-compose ps
else
    echo "❌ Ошибка при сборке!"
    exit 1
fi