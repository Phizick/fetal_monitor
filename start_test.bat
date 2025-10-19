@echo off
echo Запуск тестирования плавных графиков...
echo.

echo 1. Запуск Python API сервера...
start "Fetal API Server" cmd /k "python realtime_api.py"

echo 2. Ожидание запуска сервера...
timeout /t 5 /nobreak >nul

echo 3. Открытие упрощенного медицинского теста...
start "" "simple_medical_test.html"

echo.
echo Готово! Тестовая страница должна открыться в браузере.
echo API сервер запущен в отдельном окне.
echo.
pause
