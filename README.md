# SocialHub

Personal desk for Furnio, Smart Leads, and later brands. Plan posts, keep a media library, and read a calendar. Publishing is simulated until you add network credentials.

Nothing in the default setup is sent to Facebook, Instagram, LinkedIn, or TikTok. A finished simulation is labeled **Simulated success**. The word Published is reserved for a live provider that has actually confirmed a post.

## Run

```bash
docker compose up --build
```

Open `http://localhost:8090` and sign in with the values in `.env` (copy `.env.example`). The local defaults are `owner@socialhub.local` / `change-me`. Change them before anyone else can reach the machine.

Compose publishes Postgres on host port 5434, Redis on 6380, and the desk on 8090. Inside the compose network the API still uses `postgres:5432` and `redis:6379`.

Without Docker:

```bash
npm install
npm run dev:api
npm run dev:web
```

The web app runs at `http://localhost:5173` and proxies `/api`.

The phone app is in `apps/mobile` and is installed separately. See `docs/deployment.md`.

## Where to read next

- `docs/architecture.md` — monorepo, provider port, jobs
- `docs/integrations.md` — what a future live provider has to satisfy
- `docs/deployment.md` — Dokploy
- `PRODUCT.md` — product record
- `DESIGN.md` — visual system, written from the built desk
