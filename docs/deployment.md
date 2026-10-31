# Deployment

Dokploy can deploy this repository from `docker-compose.yml`. The compose file builds the API and the web image, and runs PostgreSQL and Redis beside them.

## Dokploy

1. Create a Docker Compose application pointed at this repository and `docker-compose.yml`.
2. Set environment values in Dokploy, not in the image:
   - `JWT_SECRET` — a long random string
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD` — replace the local default
   - `POSTGRES_PASSWORD` — and match it inside `DATABASE_URL`
   - `INTEGRATIONS_MODE=mock` until a live provider exists
3. Publish the web service port (80). The web image proxies `/api` to the API container, so the browser uses one origin.
4. Keep the `media` volume. It holds the library.
5. Point a phone build at `https://<your-host>` with `EXPO_PUBLIC_API_URL`.

The API container creates any missing tables (`CREATE TABLE IF NOT EXISTS`; there are no migrations yet) and starts the publish worker and sweeper on boot. With `SEED=true` (the default), it creates the owner from `ADMIN_EMAIL` and `ADMIN_PASSWORD` if no user with that email exists, and inserts the Furnio and Smart Leads sample data if the `brands` table is empty. It never changes an existing user. Set the admin values before the first boot, and set `SEED=false` afterwards if you do not want sample data recreated on an empty database.

`WEB_ORIGIN` is accepted in the environment but is not read by the API yet. CORS currently allows any origin. See `docs/PROJECT_STATUS.md` for the remaining production work.

## Local

```bash
docker compose up --build
```

The desk is at `http://localhost:8090`. Sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env` (copy `.env.example`).

Without Docker, start PostgreSQL and Redis, then:

```bash
npm install
npm run dev:api
npm run dev:web
```

The Vite server proxies `/api` to port 3000.

## Mobile

```bash
cd apps/mobile
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` to the machine running the API. A simulator on the same machine can use `http://localhost:3000`. A physical phone needs the computer's LAN address.

## What does not ship

Live Facebook, Instagram, LinkedIn, and TikTok calls. See `docs/integrations.md`. Leaving `INTEGRATIONS_MODE` on `mock` is the intended personal setup until those approvals exist.
