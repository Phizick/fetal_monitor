#!/bin/bash

echo "🏗️  Сборка проекта на сервере..."

# Проверяем, что мы в правильной директории
if [ ! -f "Dockerfile" ]; then
    echo "❌ Ошибка: Dockerfile не найден. Запустите скрипт из корневой директории проекта."
    exit 1
fi

# Останавливаем существующие контейнеры
echo "🛑 Остановка существующих контейнеров..."
docker-compose down 2>/dev/null || true

# Удаляем контейнеры проекта
echo "🗑️  Удаление контейнеров проекта..."
docker-compose rm -f 2>/dev/null || true

# Удаляем образы проекта
echo "🗑️  Удаление образов проекта..."
docker rmi fetal-app 2>/dev/null || true
docker rmi fetal-app:arm64 2>/dev/null || true
docker rmi fetal-app:simple 2>/dev/null || true

# Полная очистка Docker
echo "🧹 Полная очистка Docker..."
docker system prune -f

# Сборка проекта
echo "🔨 Сборка Docker образа..."
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    echo "✅ Сборка успешно завершена!"
    echo "🚀 Запуск контейнеров..."
    docker-compose up -d
    
    echo "⏳ Ожидание запуска (30 секунд)..."
    sleep 30
    
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
    
    # Проверяем API
    echo "🔍 Проверка API..."
    curl -f http://localhost:8081/health && echo "✅ API работает" || echo "❌ API не отвечает"
    
    # Проверяем фронтенд
    echo "🔍 Проверка фронтенда..."
    curl -f http://localhost/ && echo "✅ Frontend работает" || echo "❌ Frontend не отвечает"
    
else
    echo "❌ Ошибка при сборке!"
    exit 1
fi
