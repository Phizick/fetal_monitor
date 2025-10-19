@echo off
echo Запуск React фронтенда с медицинским монитором...

echo.
echo 1. Запуск Python API сервера...
start "Fetal API Server" cmd /k "cd .. && python realtime_api.py"

echo.
echo 2. Ожидание запуска API сервера...
timeout /t 5 /nobreak >nul

echo.
echo 3. Запуск React фронтенда...
cd frontend
npm run dev

echo.
echo Готово! React приложение должно открыться в браузере.
echo API сервер запущен в отдельном окне.
