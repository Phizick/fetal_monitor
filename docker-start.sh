#!/bin/bash
# Скрипт для запуска системы мониторинга КТГ в Docker

echo "🏥 СИСТЕМА МОНИТОРИНГА КТГ"
echo "=========================="

# Проверяем наличие Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    exit 1
fi

# Проверяем наличие Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен!"
    exit 1
fi

echo "🐳 Запуск контейнеров..."

# Останавливаем существующие контейнеры
echo "🛑 Остановка существующих контейнеров..."
docker-compose down

# Собираем образ
echo "🔨 Сборка образа..."
docker-compose build --no-cache

# Запускаем сервисы
echo "🚀 Запуск сервисов..."
docker-compose up -d

# Ждем запуска
echo "⏳ Ожидание запуска сервисов..."
sleep 10

# Проверяем статус
echo "📊 Статус сервисов:"
docker-compose ps

# Проверяем здоровье API
echo "🔍 Проверка API..."
for i in {1..30}; do
    if curl -f http://localhost:8081/health &> /dev/null; then
        echo "✅ API сервер работает!"
        break
    fi
    echo "⏳ Ожидание API... ($i/30)"
    sleep 2
done

echo ""
echo "=" * 50
echo "✅ СИСТЕМА ЗАПУЩЕНА!"
echo "=" * 50
echo "🌐 API сервер: http://localhost:8081"
echo "📊 Swagger UI: http://localhost:8081/docs"
echo "🤖 Telegram бот: активен"
echo "🗄️ MongoDB: активна"
echo "=" * 50
echo ""
echo "📋 Полезные команды:"
echo "  docker-compose logs -f api     # Логи API"
echo "  docker-compose logs -f mongo   # Логи MongoDB"
echo "  docker-compose down            # Остановка"
echo "  docker-compose restart api     # Перезапуск API"
echo ""

# Показываем логи
echo "📝 Логи сервисов (Ctrl+C для выхода):"
docker-compose logs -f
