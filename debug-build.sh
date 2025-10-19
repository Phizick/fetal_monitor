#!/bin/bash

# Скрипт диагностики проблем сборки Docker
# Используйте: ./debug-build.sh

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log "🔍 Диагностика проблем сборки Docker..."

# Проверка Docker
log "🐳 Проверка Docker..."
if ! docker --version >/dev/null 2>&1; then
    error "Docker не установлен или не запущен"
    exit 1
else
    success "Docker доступен: $(docker --version)"
fi

# Проверка Docker buildx
log "🔧 Проверка Docker buildx..."
if ! docker buildx version >/dev/null 2>&1; then
    error "Docker buildx не доступен"
    exit 1
else
    success "Docker buildx доступен: $(docker buildx version)"
fi

# Проверка доступного места на диске
log "💾 Проверка свободного места..."
df -h / | tail -1 | awk '{print "Свободно: " $4 " из " $2 " (" $5 " используется)"}'

# Проверка Docker daemon
log "🔍 Проверка Docker daemon..."
if ! docker info >/dev/null 2>&1; then
    error "Docker daemon не запущен"
    exit 1
else
    success "Docker daemon работает"
fi

# Проверка платформ
log "🏗️  Проверка доступных платформ..."
docker buildx inspect --bootstrap 2>/dev/null | grep -A 10 "Platforms:" || warning "Не удалось получить список платформ"

# Проверка файлов проекта
log "📁 Проверка файлов проекта..."
if [ ! -f "Dockerfile.arm64" ]; then
    error "Dockerfile.arm64 не найден"
    exit 1
else
    success "Dockerfile.arm64 найден"
fi

if [ ! -f "docker-compose.arm64.yml" ]; then
    error "docker-compose.arm64.yml не найден"
    exit 1
else
    success "docker-compose.arm64.yml найден"
fi

if [ ! -f "requirements.txt" ]; then
    error "requirements.txt не найден"
    exit 1
else
    success "requirements.txt найден"
fi

# Проверка синтаксиса Dockerfile
log "🔍 Проверка синтаксиса Dockerfile.arm64..."
if docker buildx build --dry-run --platform linux/arm64 -f Dockerfile.arm64 . >/dev/null 2>&1; then
    success "Синтаксис Dockerfile.arm64 корректен"
else
    error "Ошибки в синтаксисе Dockerfile.arm64"
    docker buildx build --dry-run --platform linux/arm64 -f Dockerfile.arm64 . 2>&1 | head -20
fi

# Проверка Docker образов
log "📦 Проверка существующих образов..."
docker images | grep fetal || warning "Образы fetal не найдены"

# Проверка контейнеров
log "📦 Проверка контейнеров..."
docker ps -a | grep fetal || warning "Контейнеры fetal не найдены"

# Проверка сетей
log "🌐 Проверка Docker сетей..."
docker network ls | grep fetal || warning "Сети fetal не найдены"

# Проверка томов
log "💾 Проверка Docker томов..."
docker volume ls | grep fetal || warning "Тома fetal не найдены"

# Тест сборки с минимальным кешем
log "🧪 Тестовая сборка (только проверка синтаксиса)..."
if docker buildx build --platform linux/arm64 -f Dockerfile.arm64 --target=0 . --dry-run >/dev/null 2>&1; then
    success "Тестовая сборка прошла успешно"
else
    error "Тестовая сборка не удалась"
    docker buildx build --platform linux/arm64 -f Dockerfile.arm64 --target=0 . --dry-run 2>&1 | head -20
fi

log "✅ Диагностика завершена"
log "💡 Если проблемы остаются, попробуйте:"
log "   1. docker system prune -a -f --volumes"
log "   2. docker buildx prune -a -f"
log "   3. Перезапустить Docker daemon"
log "   4. Проверить логи: docker logs <container_id>"
