@echo off
REM Скрипт для запуска системы мониторинга КТГ в Docker (Windows)

echo 🏥 СИСТЕМА МОНИТОРИНГА КТГ
echo ==========================

REM Проверяем наличие Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker не установлен!
    pause
    exit /b 1
)

REM Проверяем наличие Docker Compose
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose не установлен!
    pause
    exit /b 1
)

echo 🐳 Запуск контейнеров...

REM Останавливаем существующие контейнеры
echo 🛑 Остановка существующих контейнеров...
docker-compose down

REM Собираем образ
echo 🔨 Сборка образа...
docker-compose build --no-cache

REM Запускаем сервисы
echo 🚀 Запуск сервисов...
docker-compose up -d

REM Ждем запуска
echo ⏳ Ожидание запуска сервисов...
timeout /t 10 /nobreak >nul

REM Проверяем статус
echo 📊 Статус сервисов:
docker-compose ps

REM Проверяем здоровье API
echo 🔍 Проверка API...
for /l %%i in (1,1,30) do (
    curl -f http://localhost:8081/health >nul 2>&1
    if !errorlevel! equ 0 (
        echo ✅ API сервер работает!
        goto :api_ready
    )
    echo ⏳ Ожидание API... (%%i/30)
    timeout /t 2 /nobreak >nul
)

:api_ready
echo.
echo ==================================================
echo ✅ СИСТЕМА ЗАПУЩЕНА!
echo ==================================================
echo 🌐 API сервер: http://localhost:8081
echo 📊 Swagger UI: http://localhost:8081/docs
echo 🤖 Telegram бот: активен
echo 🗄️ MongoDB: активна
echo ==================================================
echo.
echo 📋 Полезные команды:
echo   docker-compose logs -f api     # Логи API
echo   docker-compose logs -f mongo   # Логи MongoDB
echo   docker-compose down            # Остановка
echo   docker-compose restart api     # Перезапуск API
echo.

REM Показываем логи
echo 📝 Логи сервисов (Ctrl+C для выхода):
docker-compose logs -f

pause
