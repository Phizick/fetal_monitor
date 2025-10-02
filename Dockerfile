# Multi-stage build for frontend + backend
# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Python backend with frontend
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY . .

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Configure nginx for serving frontend and proxying API with performance optimizations
RUN echo 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
    \n\
    # Performance optimizations\n\
    gzip on;\n\
    gzip_vary on;\n\
    gzip_min_length 1024;\n\
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;\n\
    \n\
    # Cache static assets\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {\n\
        root /app/frontend/build;\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
        add_header X-Content-Type-Options nosniff;\n\
    }\n\
    \n\
    # Serve frontend with caching\n\
    location / {\n\
        root /app/frontend/build;\n\
        index index.html;\n\
        try_files $uri $uri/ /index.html;\n\
        \n\
        # Cache HTML files for shorter time\n\
        location ~* \\.html$ {\n\
            expires 1h;\n\
            add_header Cache-Control "public";\n\
        }\n\
    }\n\
    \n\
    # Proxy API requests with optimizations\n\
    location /api/ {\n\
        proxy_pass http://localhost:8081/;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
        \n\
        # Performance optimizations\n\
        proxy_buffering on;\n\
        proxy_buffer_size 4k;\n\
        proxy_buffers 8 4k;\n\
        proxy_read_timeout 30s;\n\
    }\n\
    \n\
    # Proxy SSE streams with optimizations\n\
    location ~ ^/(stream|patients|monitoring|sim|health|docs|openapi\\.json) {\n\
        proxy_pass http://localhost:8081$request_uri;\n\
        proxy_set_header Host $host;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
        \n\
        # SSE specific optimizations\n\
        proxy_buffering off;\n\
        proxy_cache off;\n\
        proxy_read_timeout 24h;\n\
        proxy_send_timeout 24h;\n\
    }\n\
}' > /etc/nginx/sites-available/default

ENV HOST=0.0.0.0 \
    PORT=8081 \
    MONGO_URI=mongodb://mongo:27017 \
    MONGO_DB=fetal \
    TELEGRAM_BOT_TOKEN=8231116636:AAEzm1aDfPAo1yXY4Zmv6pjekIqnokk3afs

EXPOSE 80 8081

# Create startup script
RUN echo '#!/bin/bash\n\
echo "🏥 Запуск системы мониторинга КТГ..."\n\
\n\
echo "🚀 Запуск API сервера..."\n\
uvicorn realtime_api:app --host ${HOST:-0.0.0.0} --port ${PORT:-8081} &\n\
API_PID=$!\n\
echo "✅ API сервер запущен (PID: $API_PID)"\n\
\n\
echo "🌐 Запуск Nginx для фронтенда..."\n\
nginx -g "daemon off;" &\n\
NGINX_PID=$!\n\
echo "✅ Nginx запущен (PID: $NGINX_PID)"\n\
\n\
echo "🤖 Запуск Telegram бота..."\n\
python -c "\n\
import asyncio\n\
from telegram_bot import telegram_bot, notification_system\n\
\n\
async def run_bot():\n\
    print(\"✅ Telegram бот запущен и готов к работе!\")\n\
    while True:\n\
        await asyncio.sleep(60)\n\
\n\
asyncio.run(run_bot())\n\
" &\n\
BOT_PID=$!\n\
echo "✅ Telegram бот запущен (PID: $BOT_PID)"\n\
\n\
echo "=" * 50\n\
echo "✅ ВСЕ СЕРВИСЫ ЗАПУЩЕНЫ!"\n\
echo "=" * 50\n\
echo "🌐 Frontend: http://localhost"\n\
echo "🔧 API сервер: http://localhost:8081"\n\
echo "📊 Swagger UI: http://localhost:8081/docs"\n\
echo "🤖 Telegram бот: активен"\n\
echo "=" * 50\n\
\n\
# Cleanup function\n\
cleanup() {\n\
    echo "🛑 Остановка сервисов..."\n\
    kill $API_PID $NGINX_PID $BOT_PID 2>/dev/null\n\
    exit 0\n\
}\n\
\n\
# Signal handling\n\
trap cleanup SIGTERM SIGINT\n\
\n\
# Wait\n\
wait\n\
' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]