#!/bin/bash

echo "🏗️  Сборка проекта для ARM64..."

# Проверяем, что мы в правильной директории
if [ ! -f "Dockerfile" ]; then
    echo "❌ Ошибка: Dockerfile не найден. Запустите скрипт из корневой директории проекта."
    exit 1
fi

# Останавливаем существующие контейнеры
echo "🛑 Остановка существующих контейнеров..."
docker-compose down

# Удаляем контейнеры проекта
echo "🗑️  Удаление контейнеров проекта..."
docker-compose rm -f

# Удаляем образы проекта
echo "🗑️  Удаление образов проекта..."
docker rmi fetal-app 2>/dev/null || true
docker rmi fetal-app:arm64 2>/dev/null || true

# Полная очистка Docker
echo "🧹 Полная очистка Docker..."
docker image prune -f
docker container prune -f
docker volume prune -f

# Сборка для ARM64
echo "🔨 Сборка Docker образа для ARM64..."
docker buildx build --platform linux/arm64 -t fetal-app:arm64 . --no-cache --pull

if [ $? -eq 0 ]; then
    echo "✅ Сборка успешно завершена!"
    echo "🚀 Запуск контейнеров..."
    docker-compose up -d
    
    echo "=" * 50
    echo "✅ ПРОЕКТ ЗАПУЩЕН!"
    echo "=" * 50
    echo "🌐 Frontend: http://localhost"
    echo "🔧 API: http://localhost:8081"
    echo "📊 Swagger: http://localhost:8081/docs"
    echo "=" * 50
    
    # Показываем статус контейнеров
    echo "📊 Статус контейнеров:"
    docker-compose ps
else
    echo "❌ Ошибка при сборке!"
    exit 1
fi
