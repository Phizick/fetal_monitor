FROM node:23-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY yarn.lock ./
RUN yarn config set network-timeout 600000 -g && \
    yarn install --frozen-lockfile --verbose
COPY . .
RUN yarn build

FROM node:23-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

RUN mkdir -p /etc/letsencrypt && \
    chmod 755 /etc/letsencrypt

EXPOSE 4000 4000
CMD ["node", "dist/main.js"]
