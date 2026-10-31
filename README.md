# SocialHub

SocialHub is a personal desk for planning social media posts across several brands (sample brands: Furnio and Smart Leads). You keep brands and their Facebook, Instagram, LinkedIn, and TikTok accounts, a media library, posts in five formats with per-network previews, a calendar, a dashboard, and a full history with retries.

> **Publishing is simulated.** SocialHub does not connect to or send anything to Facebook, Instagram, LinkedIn, or TikTok. Every connection and result comes from a mock provider and is labelled "Simulated". The word *Published* is reserved for a real, network-confirmed post, which is not implemented yet. See [Project status](docs/PROJECT_STATUS.md).

## Stack

| Part | Technology | Folder |
| --- | --- | --- |
| API and background worker | NestJS 11, TypeScript, Drizzle ORM, BullMQ | `apps/api` |
| Database and queue | PostgreSQL 16, Redis 7 | Docker Compose |
| Web app | React 19, Vite 7, React Router 7 | `apps/web` |
| Mobile app (early) | Expo SDK 58, React Native | `apps/mobile` |
| Shared rules and wording | Plain JS package `@socialhub/contracts` | `packages/contracts` |

It is an npm workspace monorepo. `apps/mobile` is installed separately.

## Quick start

Requirements: Node.js 22 or newer, npm, and Docker with Compose v2.

### Everything in Docker

```bash
docker compose up --build
```

Open <http://localhost:8090> and sign in with `owner@socialhub.local` / `change-me`. To use your own values, copy `.env.example` to `.env` and edit it before the first start.

### Local development (hot reload)

```bash
docker compose up -d postgres redis   # Postgres on :5434, Redis on :6380
cp .env.example .env                  # PowerShell: Copy-Item .env.example .env
npm install
npm run dev:api                       # http://localhost:3000
npm run dev:web                       # http://localhost:5173 (proxies /api to :3000)
```

### Common commands

| Command | What it does |
| --- | --- |
| `npm test` | API tests (Jest; needs Postgres) and the simulation-copy check |
| `npm run build` | Builds the API (`tsc`) and the web app (`vite build`) |
| `docker compose down` | Stops the stack and keeps the data |
| `docker compose down -v` | Stops the stack and **deletes** the database and media |

The [Developer guide](docs/DEVELOPER_GUIDE.md) covers mobile setup, environment variables, database access, and troubleshooting.

## Documentation

| Document | For |
| --- | --- |
| [User guide](docs/USER_GUIDE.md) | Using SocialHub: brands, accounts, posts, scheduling, the calendar, history, and simulation |
| [Developer guide](docs/DEVELOPER_GUIDE.md) | Architecture, an end-to-end code trace, the database, jobs, auth, Docker, testing, CI, and a glossary |
| [Project status](docs/PROJECT_STATUS.md) | What is done, partial, simulated, or missing, plus known bugs and the roadmap |
| [Integrations](docs/integrations.md) | What real Facebook, Instagram, LinkedIn, and TikTok providers will need |
| [Deployment](docs/deployment.md) | Dokploy and Compose notes |
| [Architecture](docs/architecture.md) | Short architecture reference |
| [`DESIGN.md`](DESIGN.md) | Visual design system of the web app |
| [`PRODUCT.md`](PRODUCT.md) | Product brief and principles |

## Status at a glance

- **Works (simulated):** brands, simulated accounts, sets, the media library, posts in all five formats, network rule checks, previews, scheduling with a background queue, run now, retries, the calendar, the dashboard, and history.
- **Not built yet:** real network publishing and OAuth, database migrations, multi-user support, monitoring, a verified production deployment, and several UI actions such as deleting a post.
- **Before production:** fix the known scheduling bugs, add migrations, and harden security. The phased plan is in [Project status](docs/PROJECT_STATUS.md#roadmap).
