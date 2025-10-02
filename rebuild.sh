#!/bin/bash

echo "🧹 Полная очистка Docker..."
docker-compose down
docker-compose rm -f
docker rmi fetal-app 2>/dev/null || true
docker rmi fetal-app:arm64 2>/dev/null || true
docker rmi fetal-app:simple 2>/dev/null || true
docker system prune -a -f --volumes

echo "🔨 Пересборка проекта..."
docker-compose build --no-cache --pull

echo "🚀 Запуск сервисов..."
docker-compose up -d

echo "⏳ Ожидание запуска (30 секунд)..."
sleep 30

echo "🔍 Проверка статуса..."
docker-compose ps

echo "🌐 Проверка API..."
curl -f http://localhost:8081/health || echo "❌ API не отвечает"

echo "🌐 Проверка фронтенда..."
curl -f http://localhost/ || echo "❌ Frontend не отвечает"

echo "✅ Пересборка завершена!"
