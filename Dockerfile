# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_USE_ENV_PROXY=1
RUN --mount=type=secret,id=proxy_ca,required=false \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm install --global pnpm@10.30.3
COPY . .
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_ADMIN_URL=http://localhost:4200
ARG NEXT_PUBLIC_WP_URL=http://localhost:8080
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL NEXT_PUBLIC_WP_URL=$NEXT_PUBLIC_WP_URL
RUN --mount=type=secret,id=proxy_ca,required=false \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    pnpm install --frozen-lockfile && pnpm db:generate && pnpm build
FROM node:22-alpine AS api
WORKDIR /app
ENV NODE_ENV=production NODE_USE_ENV_PROXY=1
RUN --mount=type=secret,id=proxy_ca,required=false \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    npm install --global pnpm@10.30.3
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api ./apps/api
COPY packages/types ./packages/types
RUN --mount=type=secret,id=proxy_ca,required=false \
    if [ -f /run/secrets/proxy_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca; fi; \
    pnpm install --prod --filter @apex/api... --frozen-lockfile && pnpm --filter @apex/api db:generate
EXPOSE 4000
CMD ["sh","-c","pnpm --filter @apex/api db:migrate && pnpm --filter @apex/api db:seed && pnpm --filter @apex/api start"]
FROM nginx:1.28-alpine AS web
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/out /usr/share/nginx/html
EXPOSE 80
FROM nginx:1.28-alpine AS admin
COPY infra/admin-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist/browser /usr/share/nginx/html
EXPOSE 80
