#!/bin/bash

echo "🛑 Остановка проекта x86_64..."

# Останавливаем контейнеры
echo "⏹️  Остановка контейнеров..."
docker-compose -f docker-compose.x86.yml down

# Очищаем образы
echo "🧹 Очистка образов..."
docker rmi fetal-app:x86 2>/dev/null || true

echo "✅ Проект остановлен и очищен!"
