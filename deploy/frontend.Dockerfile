FROM node:24-alpine AS build
WORKDIR /app
COPY blog-web/package.json blog-web/package-lock.json ./
RUN npm ci
COPY blog-web/index.html blog-web/tsconfig.json blog-web/vite.config.ts ./
COPY blog-web/src ./src
RUN npm run build

FROM caddy:2-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
