# TON Shooter (Timing Range) — Telegram Mini App

Монорепа:  
- `apps/web` — фронт Telegram WebApp  
- `apps/api` — backend Node.js + PostgreSQL  
- `apps/bot` — Telegram-бот (админ-диалог для заданий)

## Локальный старт (быстрый)

1) Запусти Postgres:
```bash
docker compose up -d
```

2) Установи зависимости:
```bash
npm install
```

3) Скопируй env:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/bot/.env.example apps/bot/.env
```

4) Применить миграции Prisma:
```bash
npm --workspace apps/api run db:migrate
npm --workspace apps/api run db:seed
```

5) Запуск dev:
```bash
npm run dev
```

## Подключение к Telegram

1) Создай бота у @BotFather и возьми `BOT_TOKEN`.
2) В `apps/api/.env` и `apps/bot/.env` укажи `BOT_TOKEN`.
3) Для WebApp:
   - Домен должен быть HTTPS.
   - В боте добавь кнопку “Играть” с Web App URL на фронт.

## Важно

В проде обязательно включай проверку `initData` (Telegram WebApp auth) на backend.
