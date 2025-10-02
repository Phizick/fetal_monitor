# Stage 1: build static assets
FROM node:20-alpine AS builder
WORKDIR /app

ENV CI=true

COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

COPY . .

# Allow passing env file name at build time (default .env.frontend)
ARG VITE_ENV_FILE=.env.frontend
# Optional direct values (used if file is absent)
ARG VITE_API_BASE_URL
ARG VITE_WS_BASE_URL

# Build with frontend mode; create .env from file or build args
RUN if [ -f "$VITE_ENV_FILE" ]; then \
      echo "Using $VITE_ENV_FILE" && cp "$VITE_ENV_FILE" .env; \
    else \
      echo "Generating .env from build args" && \
      printf "VITE_API_BASE_URL=%s\nVITE_WS_BASE_URL=%s\n" "${VITE_API_BASE_URL:-http://localhost:4000}" "${VITE_WS_BASE_URL:-http://localhost:4000}" > .env; \
    fi && \
    cat .env && \
    yarn build:frontend

# Stage 2: serve with nginx on port 3000
FROM nginx:1.27-alpine AS runtime

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY --from=builder /app/dist .

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]


