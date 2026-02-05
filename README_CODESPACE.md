# TON Shooter — Codespaces Quick Start (initData)

This bundle is prepared to run in GitHub Codespaces with:
- Postgres via docker-compose on host port **5433**
- API on **4001**
- Web (Vite) on **5173**

## 1) Create env files
Copy examples and fill values:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/bot/.env.example apps/bot/.env
# web env is optional
cp apps/web/.env.example apps/web/.env || true
```

**Important:** set `BOT_TOKEN` in `apps/api/.env` (and `apps/bot/.env` if you run the bot) to the token of the SAME bot you use to open the Mini App.

## 2) Install deps
```bash
npm install
```

## 3) Start DB + migrate
```bash
docker compose up -d
npm --workspace apps/api run db:migrate
```

## 4) Start API (terminal 1)
```bash
cd apps/api
npm run dev
```
Check:
```bash
curl -s http://localhost:4001/health
```

## 5) Start Web (terminal 2)
```bash
cd /workspaces/tonshooter
npm --workspace apps/web run dev -- --host 0.0.0.0 --port 5173 --strictPort
```
Check proxy:
```bash
curl -i -X POST http://localhost:5173/api/auth/telegram -H "Content-Type: application/json" -d '{"initData":"x"}'
```

## 6) (Optional) Start admin bot (terminal 3)
```bash
cd /workspaces/tonshooter
npm --workspace apps/bot run dev
```

## 7) Codespaces Ports
In the **Ports** tab set:
- **5173** → Public
- **4001** → Public
- **5433** → Private

Copy the public URL of **5173** and set it as the Mini App URL in BotFather (Menu Button → Web App URL).

## Notes
- `apps/web/index.html` loads `telegram-web-app.js` so `initData` works in Telegram.
- Frontend avoids `@ton/ton` in the browser to prevent "Buffer is not defined" crashes in Telegram Desktop.
