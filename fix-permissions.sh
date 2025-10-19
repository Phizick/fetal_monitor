#!/bin/bash

echo "🔧 Исправление прав доступа к скриптам..."

# Делаем все скрипты исполняемыми
chmod +x build-arm64.sh
chmod +x build-simple-arm64.sh
chmod +x debug-build.sh

echo "✅ Права доступа исправлены!"
echo "Теперь можно запускать: ./build-arm64.sh"
