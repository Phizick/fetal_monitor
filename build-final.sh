#!/bin/bash

echo "🏗️  ФИНАЛЬНАЯ СБОРКА ПРОЕКТА ДЛЯ ARM64"
echo "========================================"

# Проверяем, что мы в правильной директории
if [ ! -f "Dockerfile" ]; then
    echo "❌ Ошибка: Dockerfile не найден. Запустите скрипт из корневой директории проекта."
    exit 1
fi

if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Ошибка: docker-compose.yml не найден."
    exit 1
fi

# ПОЛНАЯ ОЧИСТКА DOCKER
echo "🧹 ПОЛНАЯ ОЧИСТКА DOCKER..."

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

# Очистка buildx кеша
echo "🧹 Очистка buildx кеша..."
docker buildx prune -a -f 2>/dev/null || true

echo "✅ Очистка завершена!"

# СБОРКА ОБРАЗА
echo "🔨 СБОРКА ОБРАЗА ДЛЯ ARM64..."

# Простая сборка без buildx
docker build --platform linux/arm64 -t fetal-app:arm64 . --no-cache

if [ $? -eq 0 ]; then
    echo "✅ Сборка образа завершена успешно!"
    
    # ЗАПУСК КОНТЕЙНЕРОВ
    echo "🚀 ЗАПУСК КОНТЕЙНЕРОВ..."
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        echo "✅ Контейнеры запущены успешно!"
        
        # Ожидание инициализации
        echo "⏳ Ожидание инициализации сервисов (30 секунд)..."
        sleep 30
        
        # Проверка статуса
        echo "📊 СТАТУС КОНТЕЙНЕРОВ:"
        docker-compose ps
        
        # Проверка API
        echo "🔍 ПРОВЕРКА API..."
        if curl -f http://localhost:8081/health >/dev/null 2>&1; then
            echo "✅ API работает: http://localhost:8081"
        else
            echo "❌ API не отвечает"
        fi
        
        # Проверка фронтенда
        echo "🔍 ПРОВЕРКА FRONTEND..."
        if curl -f http://localhost/ >/dev/null 2>&1; then
            echo "✅ Frontend работает: http://localhost"
        else
            echo "❌ Frontend не отвечает"
        fi
        
        echo ""
        echo "=================================================="
        echo "✅ ПРОЕКТ УСПЕШНО ЗАПУЩЕН!"
        echo "=================================================="
        echo "🌐 Frontend: http://localhost"
        echo "🔧 API: http://localhost:8081"
        echo "📊 Swagger: http://localhost:8081/docs"
        echo "📋 Логи: docker-compose logs -f"
        echo "🛑 Остановка: docker-compose down"
        echo "=================================================="
        
    else
        echo "❌ Ошибка при запуске контейнеров!"
        echo "📋 Логи ошибок:"
        docker-compose logs
        exit 1
    fi
    
else
    echo "❌ ОШИБКА ПРИ СБОРКЕ ОБРАЗА!"
    echo "Проверьте логи выше для диагностики проблемы."
    exit 1
fi
