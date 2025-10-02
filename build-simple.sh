#!/bin/bash

echo "🏗️  Упрощенная сборка проекта..."

# Остановка существующих контейнеров
echo "🛑 Остановка существующих контейнеров..."
docker-compose down 2>/dev/null || true

# Очистка
echo "🧹 Очистка Docker..."
docker system prune -f

# Сборка с упрощенным Dockerfile
echo "🔨 Сборка с упрощенным Dockerfile..."
docker-compose build --no-cache

# Запуск
echo "🚀 Запуск сервисов..."
docker-compose up -d

echo "✅ Готово! Проверьте статус:"
docker-compose ps
