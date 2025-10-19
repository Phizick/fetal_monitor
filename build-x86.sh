#!/bin/bash

echo "🏗️  Сборка проекта для x86_64 архитектуры..."

# Проверяем, что мы в правильной директории
if [ ! -f "Dockerfile" ]; then
    echo "❌ Ошибка: Dockerfile не найден. Запустите скрипт из корневой директории проекта."
    exit 1
fi

# Полная очистка Docker
echo "🧹 Полная очистка Docker..."
docker system prune -a -f --volumes 2>/dev/null || true
docker volume prune -f 2>/dev/null || true
docker network prune -f 2>/dev/null || true
docker rmi $(docker images -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true
echo "✅ Docker полностью очищен."

# Сборка для x86_64
echo "🔨 Сборка Docker образа для x86_64..."
docker build --platform linux/amd64 -t fetal-app:x86 . --no-cache

if [ $? -eq 0 ]; then
    echo "✅ Сборка успешно завершена!"
    echo "🚀 Запуск контейнеров..."
    docker-compose -f docker-compose.x86.yml up -d

    echo "=" * 50
    echo "✅ ПРОЕКТ ЗАПУЩЕН!"
    echo "=" * 50
    echo "🌐 Frontend: http://localhost"
    echo "🔧 API: http://localhost:8081"
    echo "📊 Swagger: http://localhost:8081/docs"
    echo "=" * 50

    # Показываем статус контейнеров
    echo "📊 Статус контейнеров:"
    docker-compose -f docker-compose.x86.yml ps
else
    echo "❌ Ошибка при сборке!"
    exit 1
fi
