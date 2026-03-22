# TON Shooter — Quickstart (Codespaces)

## 1) Create `.env` files

Copy examples and fill your values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/bot/.env.example apps/bot/.env
cp apps/web/.env.example apps/web/.env
```

Edit `apps/api/.env` and `apps/bot/.env`:
- `BOT_TOKEN` — token from BotFather
- `ADMIN_IDS` — your Telegram user ID (comma-separated)
- `JWT_SECRET` — any long random string

## 2) Install deps

From repo root:

```bash
npm install
```

## 3) Terminal 1: database

```bash
docker compose up -d
```

## 4) Terminal 2: migrate + seed + API

```bash
cd apps/api
npm run db:migrate
npm run db:seed
PORT=4001 npm run dev
```

Check:
```bash
curl -s http://localhost:4001/health
```

## 5) Terminal 3: WEB

```bash
cd /workspaces/tonshooter
npm --workspace apps/web run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

## 6) Terminal 4: Admin bot (optional)

```bash
cd apps/bot
npm run dev
```

## 7) Codespaces Ports

Open **Ports** tab and set visibility:
- `5173` **Public** (Mini App URL)
- `4001` **Public** (API)
- `5433` **Private**

## 8) BotFather Mini App URL

In BotFather set Web App URL to the forwarded public URL of **5173**.

---

### Notes
- Web uses Vite proxy: `/api/*` -> `http://127.0.0.1:4001`.
- `apps/web/index.html` includes Telegram Mini App script, so `Telegram.WebApp.initData` works.
