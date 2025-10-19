#!/bin/bash

echo "🏗️  Простая сборка для ARM64..."

# Проверяем, что мы в правильной директории
if [ ! -f "Dockerfile.arm64" ]; then
    echo "❌ Ошибка: Dockerfile.arm64 не найден. Запустите скрипт из корневой директории проекта."
    exit 1
fi

# Останавливаем существующие контейнеры
echo "🛑 Остановка существующих контейнеров..."
docker-compose -f docker-compose.arm64.yml down 2>/dev/null || true

# Удаляем контейнеры проекта
echo "🗑️  Удаление контейнеров проекта..."
docker-compose -f docker-compose.arm64.yml rm -f 2>/dev/null || true

# Удаляем ВСЕ образы проекта
echo "🗑️  Удаление всех образов проекта..."
docker rmi fetal-app 2>/dev/null || true
docker rmi fetal-app:arm64 2>/dev/null || true
docker rmi fetal-app:simple 2>/dev/null || true
docker rmi fetal-app:latest 2>/dev/null || true

# Удаляем все неиспользуемые образы
echo "🗑️  Удаление всех неиспользуемых образов..."
docker image prune -a -f

# Полная очистка Docker
echo "🧹 Полная очистка Docker..."
docker system prune -a -f --volumes

# Сборка для ARM64 (простая сборка без buildx)
echo "🔨 Сборка Docker образа для ARM64..."
docker build -f Dockerfile.arm64 -t fetal-app:arm64 .

if [ $? -eq 0 ]; then
    echo "✅ Сборка успешно завершена!"
    echo "🚀 Запуск контейнеров..."
    docker-compose -f docker-compose.arm64.yml up -d
    
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
    docker-compose -f docker-compose.arm64.yml ps
    
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
