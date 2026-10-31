# SocialHub developer guide

This guide is for a frontend developer learning full-stack development through SocialHub. It explains what each part of the project does, why it exists, and how a request travels through it, using the real code. Everything here was checked against the repository on branch `cursor/web-ui-polish` (October 2026).

Related documents:

- [User guide](USER_GUIDE.md): how the product is used.
- [Project status](PROJECT_STATUS.md): what is finished, what is missing, known bugs, and the roadmap.
- [Architecture notes](architecture.md), [Integrations](integrations.md), and [Deployment](deployment.md): the shorter, older reference notes.
- [`DESIGN.md`](../DESIGN.md): the visual system of the web app.

## Contents

1. [The big picture](#1-the-big-picture)
2. [Technology stack and why each piece is used](#2-technology-stack-and-why-each-piece-is-used)
3. [Monorepo structure](#3-monorepo-structure)
4. [Getting it running](#4-getting-it-running)
5. [How the frontend talks to the backend](#5-how-the-frontend-talks-to-the-backend)
6. [How NestJS handles a request](#6-how-nestjs-handles-a-request)
7. [Drizzle ORM and PostgreSQL](#7-drizzle-orm-and-postgresql)
8. [Database structure](#8-database-structure)
9. [End-to-end trace: from "Schedule simulation" to the worker](#9-end-to-end-trace-from-schedule-simulation-to-the-worker)
10. [Background jobs, Redis, and the sweeper](#10-background-jobs-redis-and-the-sweeper)
11. [Social providers and the mock](#11-social-providers-and-the-mock)
12. [The shared contracts package](#12-the-shared-contracts-package)
13. [Authentication, authorization, and security](#13-authentication-authorization-and-security)
14. [The web app](#14-the-web-app)
15. [The mobile app](#15-the-mobile-app)
16. [Docker Compose](#16-docker-compose)
17. [Environment variables](#17-environment-variables)
18. [Testing, linting, and builds](#18-testing-linting-and-builds)
19. [Git and CI/CD](#19-git-and-cicd)
20. [Troubleshooting](#20-troubleshooting)
21. [API reference](#21-api-reference)
22. [Glossary](#22-glossary)
23. [What to learn from each part](#23-what-to-learn-from-each-part)

---

## 1. The big picture

```text
                 Browser (React, Vite)                 Phone (Expo)
                 http://localhost:5173                 EXPO_PUBLIC_API_URL
                        │  fetch("/api/...")                 │
                        ▼                                    │
         Vite dev proxy (dev) or nginx (Docker)              │
                        │  /api/* → API :3000                │
                        ▼                                    ▼
             ┌──────────────────────── NestJS API (apps/api) ────────────────────────┐
             │ Controllers → Services → Drizzle ORM ─────────────▶ PostgreSQL         │
             │                   │                                                    │
             │                   ├── PublishingService ── BullMQ queue ──▶ Redis      │
             │                   │        ▲  worker + 20 s sweeper (same process)      │
             │                   └── providers.ts (MockSocialProvider / Live stub)    │
             │ Media files on disk (STORAGE_DIR)                                       │
             └─────────────────────────────────────────────────────────────────────────┘
```

There are five moving parts:

1. **Web app** (`apps/web`): a React single-page app. It only talks to the API over HTTP.
2. **API** (`apps/api`): a NestJS server. It owns all business rules and is the only thing that touches the database, Redis, and the media folder.
3. **PostgreSQL**: stores users, brands, accounts, media metadata, posts, targets, and attempts.
4. **Redis**: holds the delayed "publish this post at time X" jobs for BullMQ.
5. **Worker**: not a separate program. The BullMQ worker and a 20-second sweeper run inside the API process (`PublishingService`).

There is also an **Expo mobile app** (`apps/mobile`) that calls the same API, and a small **shared package** (`packages/contracts`) with the network rules and wording used by the API, web, and mobile apps.

## 2. Technology stack and why each piece is used

| Layer | Technology (version from `package.json`) | Why it is used here |
| --- | --- | --- |
| Language (API) | TypeScript 5.9 | Types catch mistakes in database rows and request shapes before runtime. |
| Language (web, mobile, contracts) | JavaScript (ES modules / CommonJS) | Simpler for the UI. The brief asked for JavaScript there. |
| Runtime | Node.js 22 or newer (`engines` in the root `package.json`) | Runs the API, the build tools, and the tests. |
| Package manager | npm workspaces | One `npm install` for the API, web, and contracts, plus shared `node_modules`. |
| API framework | NestJS 11 (`@nestjs/core`, `@nestjs/platform-express`) | Gives structure: modules, controllers, services, guards, and dependency injection, on top of Express. |
| Validation | Zod 3 | Checks request bodies and produces readable field errors (`apps/api/src/parse.ts`). |
| Database | PostgreSQL 16 (Docker image `postgres:16-alpine`) | A relational database with foreign keys and cascades, which suits brands → posts → targets → attempts. |
| ORM | Drizzle ORM 0.44 with `pg` (node-postgres) | Type-safe SQL queries in TypeScript without hiding the SQL. |
| Queue | BullMQ 5 on Redis 7 (`ioredis`) | Delayed jobs: "run this post at 09:00". Redis keeps them if the API restarts. |
| Auth | `@nestjs/jwt` (JSON Web Tokens), `bcryptjs` | Stateless sign-in tokens, and password hashing. |
| Uploads | Multer (via `FileInterceptor`) | Parses `multipart/form-data` file uploads. |
| Web UI | React 19, React Router 7, Vite 7, `lucide-react` icons, `@fontsource/dm-sans` | A fast dev server, client-side routing, and self-hosted fonts. |
| Mobile | Expo SDK 58, React Native 0.88, `expo-image-picker` | One JavaScript codebase for iOS and Android. |
| Tests | Jest 29, ts-jest, Supertest | Unit tests, plus HTTP tests that boot the real Nest app. |
| Containers | Docker, Docker Compose, nginx 1.27 | Runs Postgres, Redis, the API, and the web server together. |
| CI | GitHub Actions (`.github/workflows/ci.yml`) | Runs tests and builds on every push and pull request. |

## 3. Monorepo structure

A **monorepo** keeps several apps in one Git repository so they can share code and be changed together.

```text
SocialHub/
├── package.json             Root: workspaces + shortcut scripts
├── package-lock.json        Exact dependency versions for the workspaces
├── docker-compose.yml       postgres, redis, api, web
├── .env.example             Template for your local .env
├── .github/workflows/ci.yml GitHub Actions pipeline
├── scripts/check-copy.mjs   Fails if the UI ever claims a real publish
├── packages/
│   └── contracts/           Shared rules: platforms, limits, wording (CommonJS)
├── apps/
│   ├── api/                 NestJS API + worker
│   │   ├── src/
│   │   │   ├── main.ts                  Starts the HTTP server
│   │   │   ├── app.module.ts            Wires controllers and services together
│   │   │   ├── env.ts                   Loads .env without a library
│   │   │   ├── parse.ts                 Zod → 400 errors with field messages
│   │   │   ├── seed.ts                  Owner user + Furnio/Smart Leads sample data
│   │   │   ├── png.ts                   Generates the sample swatch PNGs
│   │   │   ├── system.controller.ts     GET /api/health
│   │   │   ├── auth/                    Login, /me, and the JWT guard
│   │   │   ├── db/                      Drizzle schema, SQL bootstrap, connection
│   │   │   ├── workspace/               Brands, accounts, sets, media, integrations
│   │   │   ├── posts/                   Posts CRUD, calendar, dashboard, history
│   │   │   ├── publishing/              Scheduling, queue, worker, result rollup
│   │   │   └── integrations/            Mock and live provider classes
│   │   ├── test/                        Jest tests
│   │   └── Dockerfile
│   ├── web/                 React app (Vite)
│   │   ├── src/
│   │   │   ├── main.jsx, App.jsx        Entry point and routes
│   │   │   ├── api.js                   fetch wrapper + token storage
│   │   │   ├── shell.jsx                Sidebar, tab bar, brand scope context
│   │   │   ├── format.js                Date and status helpers
│   │   │   ├── components/              ui.jsx, DueSlip, WeekChart, Preview
│   │   │   └── pages/                   One file per screen
│   │   ├── nginx.conf, Dockerfile
│   │   └── vite.config.js
│   └── mobile/              Expo app (NOT an npm workspace, installed separately)
└── docs/                    This guide and the other documentation
```

Why is `apps/mobile` outside the workspaces? React Native pulls in many native-oriented packages and pins its own React version. Keeping it separate stops it from conflicting with the API and web dependencies. It imports the shared rules with a relative path (`../../packages/contracts/index.js`), and `metro.config.js` adds the repository root to `watchFolders` so the Metro bundler can see that file.

## 4. Getting it running

All commands are run from the repository root unless stated otherwise. PowerShell (Windows) and bash (macOS/Linux) versions are shown where they differ.

### Prerequisites

- Node.js 22 or newer and npm (checked here with Node 24.14 and npm 11.11).
- Docker Desktop (or Docker Engine) with Compose v2.
- For mobile only: the Expo Go app or an emulator.

### Option A: everything in Docker (closest to production)

```bash
docker compose up --build        # builds the api and web images, starts all four services
```

Open `http://localhost:8090` and sign in with `owner@socialhub.local` / `change-me` (or your `ADMIN_EMAIL` / `ADMIN_PASSWORD`). Compose reads a root `.env` file for variable substitution if one exists. Every value has a default, so it also works without one.

```bash
docker compose up -d --build     # same, in the background
docker compose logs -f api       # follow the API logs
docker compose ps                # what is running
docker compose stop              # stop, keep containers and data
docker compose down              # remove containers, keep the database and media volumes
docker compose down -v           # remove containers AND delete the database and media (destructive)
```

This path was verified for this guide: both images build, `GET /api/health` answers through nginx on port 8090, and protected routes return 401 without a token.

### Option B: local development (hot reload)

Run only Postgres and Redis in Docker, and the API and web on your machine:

```bash
docker compose up -d postgres redis   # Postgres on localhost:5434, Redis on localhost:6380

# create your local env file (only once)
cp .env.example .env                  # bash
Copy-Item .env.example .env           # PowerShell

npm install                           # installs api, web, and contracts dependencies

npm run dev:api                       # terminal 1: API on http://localhost:3000 (tsx watch, restarts on save)
npm run dev:web                       # terminal 2: web on http://localhost:5173 (Vite, hot reload)
```

Open `http://localhost:5173`. Vite proxies every `/api` request to `http://localhost:3000` (`apps/web/vite.config.js`), so the browser only ever sees one origin.

How the API finds its configuration: `apps/api/src/env.ts` reads `.env` from the current folder and from two folders up. `npm run dev:api` runs inside `apps/api`, so it picks up the root `.env`. Variables that are already set in your shell win over the file.

Stop the dev servers with `Ctrl+C`, then `docker compose stop` for Postgres and Redis.

Why ports 5434 and 6380? Compose publishes Postgres and Redis on non-default host ports so they do not clash with a Postgres or Redis already installed on your machine. Inside the compose network the API still uses `postgres:5432` and `redis:6379`.

### Option C: the mobile app

```bash
cd apps/mobile
npm install
# point the app at the API (default http://localhost:3000)
EXPO_PUBLIC_API_URL=http://192.168.1.20:3000 npx expo start          # bash
$env:EXPO_PUBLIC_API_URL="http://192.168.1.20:3000"; npx expo start  # PowerShell
```

Replace the address with your computer's LAN address when you use a physical phone. In Docker mode the API port 3000 is not published, so use `http://<computer>:8090`, because nginx proxies `/api` there.

### Database tools

There is no migration tool and no database GUI script. The root `package.json` defines `npm run db:studio`, but it calls a script that does not exist in `apps/api` and fails with `Missing script: "db:studio"`. To look at the data, use `psql`:

```bash
docker compose exec postgres psql -U socialhub -d socialhub
# then for example:  \dt   SELECT id, title, status, scheduled_at FROM posts ORDER BY updated_at DESC LIMIT 10;
```

To start from an empty database: `docker compose down -v`, then start again. The API recreates the tables and the sample data on boot.

## 5. How the frontend talks to the backend

Every web request goes through one small function in `apps/web/src/api.js`:

```javascript
export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (token()) headers.set("Authorization", `Bearer ${token()}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api${path}`, { ...options, headers });
  if (response.status === 401 && !path.startsWith("/auth/login")) {
    setToken("");
    if (window.location.pathname !== "/login") window.location.assign("/login");
  }
  // ...parse JSON, throw an Error with .fields and .status when !response.ok
}
```

What to notice:

- **Relative URL** (`/api/...`). In development, Vite's proxy forwards it to port 3000. In Docker, nginx forwards it to the `api` container (`apps/web/nginx.conf`, `location /api/ { proxy_pass http://api:3000/api/; }`). The browser never needs to know where the API really lives, and there are no CORS problems.
- **Bearer token.** After sign-in, the JWT is kept in `sessionStorage` under `socialhub.token` and sent on every request.
- **Errors as data.** The API answers validation errors with `400 { message, fields }`. `api()` throws an `Error` with `fields` attached, so a page can show `err.fields.composition` or `err.message`.
- **A 401 signs you out.** An expired or invalid token clears storage and sends you to `/login`.
- **Images** cannot send headers from an `<img>` tag, so `fileUrl(id)` adds the token as a query string: `/api/media/<id>/file?token=...`. The API guard accepts that form (see [Security](#13-authentication-authorization-and-security) for why this is a weakness).

There is no data-fetching library such as React Query. Each page calls `api()` inside `useEffect` and keeps the result in `useState`.

## 6. How NestJS handles a request

NestJS organises a server into **modules**, **controllers**, and **providers** (services). SocialHub has one module, `apps/api/src/app.module.ts`:

```typescript
@Module({
  imports: [JwtModule.register({ global: true, secret: process.env.JWT_SECRET || "dev-only-change-me", signOptions: { expiresIn: "30d" } })],
  controllers: [AuthController, WorkspaceController, PostsController, SystemController],
  providers: [DatabaseService, AuthGuard, WorkspaceService, PostsService, PublishingService],
})
export class AppModule {}
```

`main.ts` creates the app, adds the `/api` prefix to every route, and listens on `PORT` (3000).

The life of a request such as `POST /api/posts`:

1. **Express** receives the HTTP request. Nest runs on Express via `@nestjs/platform-express`.
2. **Routing.** Nest finds the controller method decorated with `@Post("posts")` in `PostsController`.
3. **Guard.** `@UseGuards(AuthGuard)` on the controller class runs `AuthGuard.canActivate` first. It reads the `Authorization: Bearer` header (or `?token=`), verifies the JWT, and puts the payload on `request.user`. An invalid token throws `UnauthorizedException`, and the response is a 401.
4. **Controller.** The method receives the raw body (`@Body() body: unknown`) and validates it with Zod: `parseBody(saveSchema, body)`. If validation fails, `parseBody` throws `BadRequestException({ message, fields })`, which becomes a 400.
5. **Service.** The controller delegates to `PostsService.create(...)`. Services hold the business logic. Controllers stay thin.
6. **Dependency injection.** The services ask for each other in their constructors (`@Inject(DatabaseService) private readonly database: DatabaseService`). Nest creates one instance of each provider (a **singleton**) and passes it in. You never write `new PostsService()`.
7. **Response.** Whatever the method returns is serialised to JSON. Nest's default status is 201 for `@Post` and 200 for the other methods.
8. **Errors.** Any `HttpException` subclass thrown anywhere (`NotFoundException`, `BadRequestException`, ...) is turned into the matching HTTP status by Nest's built-in exception filter.

**Lifecycle hooks** are used for startup work:

- `DatabaseService.onModuleInit()` opens the Postgres pool, runs the schema SQL, and seeds.
- `PublishingService.onModuleInit()` creates the BullMQ queue and worker and starts the sweeper timer.
- `onModuleDestroy()` closes them. `app.enableShutdownHooks()` in `main.ts` makes that happen on `Ctrl+C` or `docker stop`.

## 7. Drizzle ORM and PostgreSQL

An **ORM** (object-relational mapper) lets you write database queries in your programming language instead of raw SQL strings. Drizzle stays very close to SQL.

### The connection

`apps/api/src/db/database.service.ts`:

```typescript
this.pool = new Pool({ connectionString: url });   // node-postgres connection pool
this.db = drizzle(this.pool, { schema });           // Drizzle wraps the pool
await this.pool.query(SCHEMA_SQL);                  // create tables if missing
if (process.env.SEED !== "false") await seedIfEmpty(this.db);
```

A **pool** keeps several open connections and reuses them, because opening a Postgres connection for every query would be slow.

### The schema

Tables are described in TypeScript in `apps/api/src/db/schema.ts`:

```typescript
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  brandId: uuid("brand_id").notNull().references(() => brands.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "date" }),
  // ...
});
```

The TypeScript property (`brandId`) maps to the SQL column (`brand_id`). From this, Drizzle knows the row type, so `typeof posts.$inferSelect` is a real TypeScript type.

### Queries

Examples from `PostsService` and `PublishingService`:

```typescript
// INSERT ... RETURNING *
const [post] = await this.database.db.insert(posts).values({ brandId, title, format, status: "draft" }).returning();

// SELECT with joins
await this.database.db
  .select({ post: posts, brandName: brands.name, collectionName: collections.name })
  .from(posts)
  .innerJoin(brands, eq(brands.id, posts.brandId))
  .leftJoin(collections, eq(collections.id, posts.collectionId))
  .where(and(...conditions))
  .orderBy(desc(posts.updatedAt));

// Conditional UPDATE used as a lock ("claim"): see section 10
await this.database.db.update(posts)
  .set({ status: "publishing" })
  .where(and(eq(posts.id, postId), inArray(posts.status, ["scheduled", "queued", "failed", "partial"])))
  .returning({ id: posts.id });
```

`eq`, `and`, `inArray`, `lte`, and `desc` are Drizzle helpers that become SQL `=`, `AND`, `IN`, `<=`, and `DESC`. Values are always sent as parameters, which prevents SQL injection.

### Migrations: how the schema is created today

There is **no migration system**. On every boot, the API runs `SCHEMA_SQL` from `apps/api/src/db/sql.ts`, a list of `CREATE TABLE IF NOT EXISTS ...` statements. This means:

- A fresh database gets all the tables automatically.
- **Changing an existing table does not work this way.** If you add a column to `schema.ts` and `sql.ts`, an existing database keeps its old table, because the table already exists. You would have to `ALTER TABLE` by hand or reset the volume.
- The schema is written twice, once in `schema.ts` for Drizzle's types and once in `sql.ts` for the real tables. They must be kept identical by hand.

`drizzle-kit`, Drizzle's migration generator, is not installed. Adding it is on the roadmap in [Project status](PROJECT_STATUS.md). It would generate versioned SQL migration files from `schema.ts`, so `sql.ts` could be deleted.

## 8. Database structure

```text
users                (owner sign-in; not linked to other tables)

brands ─┬─< collections            ("sets")
        ├─< social_accounts        (one row per connected network handle)
        ├─< media_assets           (file metadata; the bytes live on disk)
        └─< posts ─┬─< post_media >── media_assets      (ordered files in a post)
                   └─< post_targets >── social_accounts (one row per account the post goes to)
                             └─< publish_attempts       (one row per try, the history)

  ─<  means "one to many"; every child row has ON DELETE CASCADE to its parent,
      except posts.collection_id, which is ON DELETE SET NULL.
```

| Table | What a row is | Key columns |
| --- | --- | --- |
| `users` | The owner | `email` (unique), `password_hash` (bcrypt), `name` |
| `brands` | A brand such as Furnio | `name`, `slug` (unique, generated), `description` |
| `collections` | A "set" of posts within a brand | `brand_id`, `name` |
| `social_accounts` | A network handle attached to a brand | `platform` (`facebook`/`instagram`/`linkedin`/`tiktok`), `handle`, `external_id` (`sim_...`), `connection_mode` (`simulated`/`live`), `status` (`connected`/`disconnected`), `simulate_next_failure` |
| `media_assets` | An uploaded file | `kind` (`image`/`video`), `mime_type`, `byte_size`, `storage_key` (file name on disk), `alt_text`, `sample` |
| `posts` | A post | `format`, `status`, `publishing_mode`, `scheduled_at`, `published_at`, `collection_id` |
| `post_media` | A file used in a post | composite primary key (`post_id`, `media_id`), `sort_order` |
| `post_targets` | "This post goes to this account" | `status`, `publishing_mode`, `external_post_id`, `last_error`, `summary`, `attempt_count` |
| `publish_attempts` | One try at one target | `publishing_mode`, `simulated`, `outcome` (`succeeded`/`failed`), `error_code`, `summary`, `started_at`, `finished_at` |

Why split **targets** from **posts**? One post can go to several accounts, and each account can succeed or fail on its own. The post's status is a rollup of its targets (`apps/api/src/publishing/aggregate.ts`): all succeeded becomes `published`, all failed becomes `failed`, and a mix becomes `partial`.

Why keep **attempts** separately? `post_targets` holds the *latest* state. `publish_attempts` is an append-only log of *every* try, which is what the History page shows.

Status values are plain `text`. There are no database enums or `CHECK` constraints, so the allowed values are only enforced by the code:

- Post status: `draft`, `scheduled`, `queued`, `publishing`, `published`, `failed`, `partial`, `cancelled`.
- Target status: `pending`, `scheduled`, `published`, `failed`, `skipped`.

There are no indexes beyond the primary keys and unique constraints.

### Sample data (seed)

`apps/api/src/seed.ts` runs on boot unless `SEED=false`:

1. If no user with `ADMIN_EMAIL` exists, it creates one with a bcrypt hash of `ADMIN_PASSWORD`.
2. If the `brands` table is **empty**, it creates Furnio and Smart Leads, four simulated accounts each, one set each, four generated PNG swatches, and six posts: two simulated successes, one simulated failure, two scheduled, and one draft Reel without a video.

The seed never changes an existing user. Changing `ADMIN_PASSWORD` later does not update the stored password, and changing `ADMIN_EMAIL` creates a second user.

## 9. End-to-end trace: from "Schedule simulation" to the worker

This is the most important section. It follows one real action through every layer: a user writes a new Instagram image post in the composer and chooses **Schedule simulation**.

### Step 1: the React composer builds the request

`apps/web/src/pages/Composer.jsx` keeps the form in state:

```javascript
const [form, setForm] = useState({ ...EMPTY, brandId: scopedBrand || "" });
// EMPTY = { brandId, collectionId, title, body, format: "image", mediaIds: [], accountIds: [] }
```

As the user types, `validateComposition` from `@socialhub/contracts` runs in the browser for each chosen account, and the problems show above the run bar. The **Schedule simulation** button is disabled while `issues.length > 0` or while no slot is chosen.

On click, `run("schedule")` makes **two** requests in a row:

```javascript
const saved = await save();   // 1) POST /api/posts   (or PATCH /api/posts/:id when editing)
const scheduled = await api(`/posts/${saved.id}/schedule`, {
  method: "POST",
  body: JSON.stringify({ scheduledAt: new Date(when).toISOString() }),   // 2) local time → UTC ISO string
});
navigate(`/posts/${scheduled.id}`);
```

The `<input type="datetime-local">` value has no time zone. `new Date(when)` reads it as the browser's local time, and `.toISOString()` sends it in UTC, for example `2026-11-01T08:00:00.000Z` for 09:00 in UTC+1.

### Step 2: the request reaches the API

- **Development:** Vite proxy → `http://localhost:3000/api/posts`.
- **Docker:** nginx `location /api/` → `http://api:3000/api/posts`.

`main.ts` set the global prefix `api`, so the route `@Post("posts")` matches `/api/posts`. `AuthGuard` verifies the bearer token.

### Step 3: the controller validates the input

`apps/api/src/posts/posts.controller.ts`:

```typescript
const saveSchema = z.object({
  brandId: z.string().uuid("Choose a brand."),
  title: z.string().trim().min(1, "Name the post.").max(140, "Keep the name under 140 characters."),
  format: z.enum(["text", "image", "carousel", "video", "reel"]),
  mediaIds: z.array(z.string().uuid()).default([]),
  accountIds: z.array(z.string().uuid()).default([]),
  // ...
});

@Post("posts")
create(@Body() body: unknown) {
  return this.posts.create(parseBody(saveSchema, body));
}
```

Zod checks the *shape* of the input: types, lengths, and allowed values. It does not check whether the brand exists. That is the service's job.

### Step 4: the service applies business rules and writes to PostgreSQL

`PostsService.create` in `apps/api/src/posts/posts.service.ts`:

```typescript
await this.assertRelations(input);   // brand exists; the set, accounts, and files all belong to THIS brand
const [post] = await this.database.db.insert(posts).values({ ...input, status: "draft" }).returning();
await this.replaceLinks(post.id, input);   // inserts post_media rows (with sort_order) and post_targets rows (status "pending")
return this.view(post.id);                 // reads it back with joins and returns the full post JSON
```

The SQL Drizzle sends is roughly:

```sql
INSERT INTO posts (brand_id, collection_id, title, body, format, status) VALUES ($1,$2,$3,$4,$5,'draft') RETURNING *;
DELETE FROM post_media WHERE post_id = $1;
INSERT INTO post_media (post_id, media_id, sort_order) VALUES ($1,$2,0);
INSERT INTO post_targets (post_id, social_account_id, status) VALUES ($1,$2,'pending');
```

These statements are **not** wrapped in a transaction. If the server crashed between them, a post could exist without its links. See [Project status](PROJECT_STATUS.md).

`view()` assembles the response: the post, its brand and set names, `targets[]` (with the account's platform and handle), `media[]` (ordered), `attempts[]`, and a human `statusLabel` from the contracts package (`"Draft"`).

### Step 5: scheduling

`POST /api/posts/:id/schedule` → `PublishingService.schedule(postId, when)` in `apps/api/src/publishing/publishing.service.ts`:

```typescript
if (Number.isNaN(when.getTime()) || when.getTime() < Date.now() + 30_000) throw new BadRequestException(...);
await this.assertReady(postId);   // runs validateComposition again on the SERVER for every target
await db.update(posts).set({ status: "scheduled", scheduledAt: when }).where(eq(posts.id, postId));
await db.update(postTargets).set({ status: "scheduled" }).where(eq(postTargets.postId, postId));
await this.enqueue(postId, when);
```

The same rules run in the browser *and* on the server. The browser check is for a good user experience. The server check is the one that counts, because anyone can call the API directly.

`enqueue` adds a **delayed BullMQ job**:

```typescript
await this.queue.add("publish", { postId },
  { jobId: `post-${postId}`, delay: Math.max(0, when.getTime() - Date.now()), removeOnComplete: 200, removeOnFail: 200 });
```

The job is stored in Redis with a delay in milliseconds. `jobId` is fixed per post, so rescheduling first removes the old job and adds a new one. If Redis is unreachable, the error is logged, and the post still runs because of the sweeper.

The controller then returns `this.posts.view(id)`. The composer shows "Scheduled as a simulation. Nothing has been sent." and the post appears on the calendar (`GET /api/calendar?from&to`) and the dashboard (`GET /api/dashboard`).

### Step 6: the slot arrives, and the worker picks it up

Two mechanisms can trigger the run, both inside the API process:

1. **BullMQ worker.** When the delay expires, Redis hands the job to the `Worker("publish-post", ...)` created in `onModuleInit`, which calls `claimAndRun(job.data.postId)`.
2. **Sweeper.** Every 20 seconds, `sweepDue()` selects `posts WHERE status = 'scheduled' AND scheduled_at <= now()` and calls `claimAndRun` for each. This covers a lost Redis job, Redis being down, or the API being off at slot time.

Both paths can fire for the same post, so `claimAndRun` starts with an **atomic claim**:

```typescript
const claimed = await db.update(posts)
  .set({ status: "publishing" })
  .where(and(eq(posts.id, postId), inArray(posts.status, ["scheduled", "queued", "failed", "partial"])))
  .returning({ id: posts.id });
if (claimed.length === 0) return;   // someone else already claimed it
```

PostgreSQL guarantees that only one `UPDATE` can change that row from `scheduled` to `publishing`. The second caller updates zero rows and stops. This is a common pattern called a *compare-and-set* or *optimistic claim*.

### Step 7: each target is "published" through the provider

```typescript
const loaded = await this.load(postId);          // post, ordered media, targets joined with accounts
for (const target of loaded.targets) {
  if (target.status === "published") continue;   // retries skip targets that already succeeded
  await this.runTarget(loaded.post, loaded.media, target);
}
```

`runTarget` decides the result:

- Account not `connected`: a failed result with `errorCode: "disconnected"`.
- Composition invalid now (for example, a file was changed): a failed result with `errorCode: "invalid_composition"`.
- Otherwise: `providerFor(target.connectionMode).publish({ platform, fail })`. For simulated accounts that is `MockSocialProvider`, which waits `SIMULATE_DELAY_MS` (180 ms by default) and returns `{ ok: true, simulated: true, externalPostId: "sim_instagram_ab12cd34", summary: "Simulated success. Nothing was sent to Instagram." }`. If the account's **Fail next simulation** switch was on, it returns a simulated failure instead, and the switch is reset.

Then it writes the outcome:

```sql
INSERT INTO publish_attempts (post_target_id, publishing_mode, simulated, outcome, summary, external_post_id, started_at, finished_at) VALUES (...);
UPDATE post_targets SET status = 'published', external_post_id = 'sim_...', summary = '...', attempt_count = attempt_count + 1 WHERE id = $1;
```

### Step 8: the post's final status

```typescript
const aggregate = aggregateTargets(fresh.map((t) => ({ status: t.status, publishingMode: t.publishingMode })));
await db.update(posts).set({ status: aggregate.status, publishingMode: aggregate.publishingMode, publishedAt: ... });
```

All targets published gives `status = 'published'` with `publishing_mode = 'simulated'`. `statusLabel` in the contracts package turns that pair into **"Simulated success"**, never "Published". The next time the web app loads the dashboard, calendar, or history, it shows the new state. There is no push or WebSocket. The page shows changes when it next fetches.

### The same flow for "Run simulation"

`POST /api/posts/:id/publish` → `publishNow` sets `status = 'queued'` and `scheduled_at = now`, removes any delayed job, and calls `claimAndRun` **inside the HTTP request**. The response therefore already contains the results.

`POST /api/posts/:id/retry` calls `claimAndRun` directly on a `failed` or `partial` post. Only the non-published targets run again.

## 10. Background jobs, Redis, and the sweeper

Key facts:

- **Queue name:** `publish-post`. **Job name:** `publish`. **Job id:** `post-<postId>`. **Payload:** `{ postId }`.
- **Where the worker runs:** inside the API process, started by `PublishingService.onModuleInit`. There is no separate worker container. If you ran two API instances, both would run workers and sweepers. The atomic claim prevents double processing.
- **`WORKER_ENABLED=false`** disables the queue, the worker, *and* the sweeper. Tests and CI use this. Scheduled posts then never run on their own.
- **Without `REDIS_URL`**, there is no queue, and only the sweeper runs (every 20 seconds).
- **Cancel** removes the delayed job and sets the post to `cancelled` and its targets to `skipped`.
- **Delete** removes the job (`release`) and then the post. The cascade deletes its targets and attempts.
- **There is no automatic retry.** BullMQ's `attempts` and `backoff` options are not used. A failed result is final until the owner presses Retry.
- **There is no recovery for a crash mid-run.** If the process dies while a post is `publishing`, nothing moves it back. The claim only accepts `scheduled`, `queued`, `failed`, and `partial`, and the UI blocks editing and deleting while a post is publishing. See [Project status](PROJECT_STATUS.md).

## 11. Social providers and the mock

`apps/api/src/integrations/providers.ts` defines two classes with the same shape (a **port**, in "ports and adapters" terms):

| | `MockSocialProvider` | `LiveSocialProvider` |
| --- | --- | --- |
| `connect` | Returns a fake `externalId` such as `sim_instagram_1a2b3c4d` and the summary "Simulated connection. … is not linked to Instagram." | Always refuses: "Live Instagram publishing is not connected. No credentials are stored, so nothing was sent." |
| `publish` | Waits `SIMULATE_DELAY_MS`, then returns a simulated success (or a failure when `fail` is true) | Always returns `ok: false`, `errorCode: "credentials_missing"`, `simulated: false` |

`providerFor(connectionMode)` picks the class per **account**, not globally: `live` accounts use the live class and every other account uses the mock. Today:

- `WorkspaceService.connect` refuses `connectionMode: "live"` with a 400, so no live account can be created through the API.
- `INTEGRATIONS_MODE` (`mock` by default) only changes the banner text and the `mode` field returned by `/api/integrations` and `/api/health`. It does not switch providers.

Important limitation of the current port: `publish` receives only `{ platform, fail }`. It does not receive the caption, the files, or the account's tokens. A real provider needs all of those, so the interface must be extended before any real integration can work. [`docs/integrations.md`](integrations.md) lists each network's API, permissions, and review requirements, and [Project status](PROJECT_STATUS.md) lists the work.

## 12. The shared contracts package

`packages/contracts/index.js` (CommonJS, with types in `index.d.ts`) is imported as `@socialhub/contracts` by the API and web, and by relative path from mobile. It contains:

- `PLATFORMS`, `FORMATS`, `PLATFORM_LABELS`, `FORMAT_LABELS`.
- `LIMITS`: per-network caption length, carousel size, allowed formats, and allowed MIME types.
- `validateComposition({ format, body, media, platform })`: returns a list of `{ field, message }` problems. **The same function runs in the browser, on the phone, and on the server.**
- `resultCopy(...)` and `statusLabel(...)`: the wording rules that make sure a simulation is never called "Published".
- `TOKENS`: an older copy of the design colours. Nothing imports it any more. The web tokens live in `apps/web/src/styles.css` and the mobile ones in `apps/mobile/src/theme.js`.

Why it matters: one source of truth for the rules prevents the classic bug where the UI allows something the server rejects, or the other way round.

## 13. Authentication, authorization, and security

### What exists

- **Single owner.** The `users` table normally has one row, created by the seed from `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_NAME`. There is no sign-up endpoint.
- **Password hashing.** bcrypt with cost 10 (`bcryptjs`). Passwords are never stored in plain text.
- **Login.** `POST /api/auth/login` compares the hash and returns `{ token, user }`. The token is a JWT signed with `JWT_SECRET` (HS256 by default), with `sub` (user id) and `email`, and it is valid for **30 days**.
- **Guard.** Every controller except `AuthController.login` and `SystemController.health` uses `@UseGuards(AuthGuard)`.
- **Authorization** is all-or-nothing: any valid token can do everything. There are no roles and no per-brand permissions. Data is not filtered by user.
- **Validation.** Zod on bodies. The services check that sets, accounts, and files belong to the post's brand.
- **Uploads.** MIME type allow-list, 200 MB limit, and files stored under the asset's UUID, so the original file name is never used as a path. `Content-Disposition` strips quotes from the file name.
- **Headers.** `x-powered-by` is disabled and `Referrer-Policy: no-referrer` is set.
- **SQL injection.** Drizzle always uses parameters.
- **Copy check.** `scripts/check-copy.mjs` fails `npm test` if the web or mobile source contains phrases such as "Published to Instagram".

### Known weaknesses

These are listed with priorities in [Project status](PROJECT_STATUS.md).

- `JWT_SECRET` falls back to `"dev-only-change-me"` when unset, and the default admin password is `change-me`.
- The token is accepted in the URL (`?token=`) for media files, so it can end up in server logs and browser history.
- CORS allows any origin (`enableCors({ origin: true })`). `WEB_ORIGIN` is defined in the env files but never read by the code.
- No rate limiting on login, no account lockout, no token revocation (sign-out only deletes the token in the browser), and no refresh tokens.
- No security headers beyond the two above (no Helmet, CSP, or HSTS). No HTTPS in the compose file. TLS is expected from the host, for example Dokploy's proxy.
- Uploads are read fully into memory (Multer memory storage), and the MIME type comes from the client, not from inspecting the file.

## 14. The web app

- **Entry:** `main.jsx` loads the DM Sans font and `styles.css`, then renders `<BrowserRouter><App/></BrowserRouter>`.
- **Routes** (`App.jsx`): `/login`; and, behind `RequireSession` (which checks for a token), `/` (Dashboard), `/calendar`, `/posts`, `/posts/new`, `/posts/:id` (both Composer), `/media`, `/brands`, and `/history`.
- **Shell** (`shell.jsx`): loads `/brands`, `/auth/me`, and `/integrations` on every navigation, renders the sidebar, top bar, and tab bar, and provides `DeskContext` with `{ brands, brandId, setBrandId, user, integrations }`. The selected brand is stored in `localStorage` under `socialhub.brand`. Pages read it with `useDesk()` and add `?brandId=` to their requests.
- **Shared UI** (`components/ui.jsx`): `StatusBadge`, `NetworkIcon`, `BrandAvatar`, `Thumb`, `EmptyState`, `SkeletonRows`, and `ErrorNote`. The dashboard uses `DueSlip.jsx` and `WeekChart.jsx`. The composer uses `Preview.jsx`.
- **Styling:** one plain CSS file with custom properties (design tokens). No CSS framework. The visual rules are in [`DESIGN.md`](../DESIGN.md).
- **No TypeScript, no tests, and no linter** in the web app.

## 15. The mobile app

`apps/mobile` is a single-file Expo app (`App.js`) with a hand-rolled tab bar: Today, Calendar, Posts, Library, and More (Brands, History). `src/api.js` builds requests against `EXPO_PUBLIC_API_URL` (default `http://localhost:3000`). The token is held in React state only, so it is lost when the app restarts.

It is not part of the npm workspaces, CI, or the test suite. It was bundled successfully when it was written, but it has not been verified running on a device. There is a known hooks-ordering bug in `App.js` that is likely to crash right after sign-in (see [Project status](PROJECT_STATUS.md)). The composer can only run a simulation immediately. There is no file picking, scheduling, or draft saving.

## 16. Docker Compose

`docker-compose.yml` defines four services on one default network. Containers reach each other by **service name**: `postgres`, `redis`, `api`, and `web`.

| Service | Image / build | Host port → container | Talks to | Notes |
| --- | --- | --- | --- | --- |
| `postgres` | `postgres:16-alpine` | 5434 → 5432 | — | Volume `postgres`. Healthcheck `pg_isready`. |
| `redis` | `redis:7-alpine` | 6380 → 6379 | — | No volume and no AOF, so queued jobs are lost if the container is removed. The sweeper covers that. Healthcheck `redis-cli ping`. |
| `api` | `apps/api/Dockerfile` | not published | `postgres:5432`, `redis:6379` | Waits for both healthchecks. Volume `media` at `/data/media`. `WORKER_ENABLED=true`. |
| `web` | `apps/web/Dockerfile` | 8090 → 80 | `api:3000` | nginx serves the built SPA and proxies `/api/`. `client_max_body_size 200m`. |

The **Dockerfiles are multi-stage builds**:

- **API:** the first stage runs `npm ci` and `tsc`. The second stage installs production dependencies only, copies `dist`, and runs `node dist/main.js`.
- **Web:** the first stage runs `vite build`. The second stage is nginx with `dist` copied into it.

`.dockerignore` keeps `node_modules`, `dist`, `.git`, and `apps/mobile` out of the build context.

The `api` service has no healthcheck and no restart policy, and `web` only waits for `api` to *start*, not to be ready.

## 17. Environment variables

The API reads these (from `.env`, the shell, or Compose):

| Variable | Default in code | Used by | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | none (**required**; boot fails without it) | `DatabaseService` | Postgres connection string |
| `REDIS_URL` | none (no queue, sweeper only) | `PublishingService` | BullMQ connection |
| `JWT_SECRET` | `dev-only-change-me` | `AppModule` | Signs tokens. **Set a long random value outside local use.** |
| `ADMIN_EMAIL` | `owner@socialhub.local` | `seed.ts` | Owner login created on first boot |
| `ADMIN_PASSWORD` | `change-me` | `seed.ts` | Owner password, only used when the user is first created |
| `ADMIN_NAME` | `Owner` | `seed.ts` | Display name |
| `SEED` | on unless `"false"` | `DatabaseService` | Create the owner and sample data when the brands table is empty |
| `INTEGRATIONS_MODE` | `mock` | banner, `/integrations`, `/health` | Label only. It does not switch providers. |
| `WORKER_ENABLED` | on unless `"false"` | `PublishingService` | Queue, worker, and sweeper |
| `STORAGE_DIR` | `<cwd>/storage` | `seed.ts`, `WorkspaceService` | Folder for uploaded files |
| `PORT` | `3000` | `main.ts` | HTTP port |
| `SIMULATE_DELAY_MS` | `180` | `MockSocialProvider` | Fake network delay. Tests set it to 0. |
| `WEB_ORIGIN` | — | **not used by the code** | Present in `.env.example` and Compose, intended for CORS |

Compose-only: `POSTGRES_PASSWORD` (default `socialhub`) sets the database password and is substituted into the API's `DATABASE_URL`.

Mobile: `EXPO_PUBLIC_API_URL` (default `http://localhost:3000`).

`.env.example` sets `STORAGE_DIR=./storage`. Because the API runs inside `apps/api`, files land in `apps/api/storage` (git-ignored). In Docker they live in the `media` volume. The two locations are separate, so files uploaded in one mode do not appear in the other.

## 18. Testing, linting, and builds

### Commands (verified against `package.json`)

| Command | What it runs |
| --- | --- |
| `npm test` | `jest --runInBand` in `apps/api`, then `node scripts/check-copy.mjs` |
| `npm run test -w @socialhub/api` | API tests only |
| `node scripts/check-copy.mjs` | Copy check only |
| `npm run build` | `tsc` for the API (output `apps/api/dist`), then `vite build` for web (output `apps/web/dist`) |
| `npm run build -w @socialhub/api` / `-w @socialhub/web` | One app |
| `npm run preview -w @socialhub/web` | Serves the built web app on `http://127.0.0.1:4173`. Vite reuses the dev `/api` proxy, so the API must be running on port 3000. |
| `npm run start -w @socialhub/api` | Runs the built API (`node dist/main.js`) |
| `npm run db:studio` | **Broken:** the target script does not exist |

### What the tests cover

- `apps/api/test/rules.spec.ts` (unit tests, no database needed): the wording never calls a simulation "Published", the live provider refuses without credentials, mock results are always marked simulated, mixed live and simulated results are not labelled live, and the composition rules.
- `apps/api/test/http.spec.ts` (HTTP tests): boots the full Nest app against `DATABASE_URL`, signs in, checks the dashboard, creates a brand, a simulated account, a refused live account, an upload, a post, a publish, a forced failure, and a retry. **It is skipped if `DATABASE_URL` is unset**, and the variable is also read from `.env`.

Seven tests in two suites currently pass. To run them locally, start Postgres (`docker compose up -d postgres redis`) and have a `.env`, or set the variables in your shell as in CI:

```powershell
$env:DATABASE_URL="postgres://socialhub:socialhub@127.0.0.1:5434/socialhub"; $env:JWT_SECRET="test-secret"; $env:WORKER_ENABLED="false"; $env:SIMULATE_DELAY_MS="0"; npm test
```

Caveats:

- The HTTP test writes to whatever database `DATABASE_URL` points at and does not clean up. It leaves "Desk test" brands behind in your dev data. Point it at a separate database if that bothers you.
- One assertion in the dashboard test compares a value with itself, so it always passes.

### Linting and type checking

There is **no linter or formatter** configured: no ESLint, no Prettier, and no `lint` script. The only type check is the API's `tsc` during `npm run build`. The web and mobile code is plain JavaScript and is not type-checked.

## 19. Git and CI/CD

### Branches and commits

The remote is `https://github.com/omercerkezi/SocialHub.git`. At the time of writing:

| Branch | Points at | On GitHub? |
| --- | --- | --- |
| `main` | `155a07f` | Yes (`origin/main`) |
| `cursor/web-ui-polish` | `c4bcefc` (UI redesign) | No (local only) |
| `feat/foundation`, `feat/api`, `feat/web`, `feat/mobile`, `docs/design` | Older points in `main`'s history | No (local only) |

History is linear, with one commit per area: foundation → API → web → mobile → docs/design → UI redesign. No pull requests have been opened.

### CI

`.github/workflows/ci.yml` runs on **every push and pull request** on `ubuntu-latest` with Postgres 16 and Redis 7 service containers:

1. `npm ci`
2. `npm test` (with `WORKER_ENABLED=false`, `INTEGRATIONS_MODE=mock`, and `SEED=true`)
3. `npm run build -w @socialhub/api`
4. `npm run build -w @socialhub/web`

The last run on `main` passed. CI does **not** lint, build the Docker images, build the mobile app, or deploy anything. There is **no CD**. Deployment is manual (see [deployment.md](deployment.md) and [Project status](PROJECT_STATUS.md)).

### Project board

GitHub has 8 milestones and 19 issues (labels `backend`, `frontend`, `mobile`, `design`, `infra`, `integrations`, and `docs`). **All of them are still open**, including the ones that are already built. Use [Project status](PROJECT_STATUS.md) as the accurate picture, and close the issues that are done.

## 20. Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| API exits with `DATABASE_URL is required` | No `.env` and no variable set | Copy `.env.example` to `.env`, or set the variable in your shell |
| `ECONNREFUSED 127.0.0.1:5434` | Postgres container not running | `docker compose up -d postgres redis`, then check `docker compose ps` |
| `port is already allocated` when starting Compose | Something else uses 5434, 6380, or 8090 | Stop it, or change the left-hand port in `docker-compose.yml` and the matching `.env` URL |
| Redis connection errors in the API log | Redis not running or the wrong `REDIS_URL` | Start Redis. Scheduled posts still run through the sweeper, up to 20 s late. |
| Scheduled posts never run | `WORKER_ENABLED=false` (as in tests), or the API is not running | Unset it and keep the API running |
| Web shows the login page again after every new tab | The token is in `sessionStorage` (per tab) | Expected behaviour |
| Signed out right after signing in | The API was restarted with a different `JWT_SECRET` | Sign in again. Keep `JWT_SECRET` stable. |
| Images show as broken | The file is not in this mode's `STORAGE_DIR` (dev and Docker use different folders), or the token expired | Upload again in this mode, or sign in again |
| A new column does not exist | `CREATE TABLE IF NOT EXISTS` does not alter existing tables | `ALTER TABLE` by hand, or `docker compose down -v` to reset (deletes data) |
| Changed `ADMIN_PASSWORD` but the old one still works | The seed only creates the user once | Update `users.password_hash` by hand, or reset the database |
| "Desk test" brands appear | `npm test` ran against your dev database | Delete them in Brands, or use a separate test database |
| `npm run db:studio` fails | The script does not exist | Use `docker compose exec postgres psql -U socialhub -d socialhub` |
| Phone app cannot reach the API | `localhost` on the phone means the phone itself | Set `EXPO_PUBLIC_API_URL` to your computer's LAN IP (`:3000` in dev, `:8090` with Docker) |
| PowerShell says `npm.ps1 cannot be loaded` | Script execution policy | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use `npm.cmd` |

## 21. API reference

All routes have the `/api` prefix. All of them except `POST /auth/login` and `GET /health` need `Authorization: Bearer <token>`. Optional query parameters are shown in brackets.

| Method and path | Purpose |
| --- | --- |
| `GET /health` | `{ ok, service, integrationsMode }` |
| `POST /auth/login` | `{ email, password }` → `{ token, user }` |
| `GET /auth/me` | The current user |
| `GET /brands`, `POST /brands`, `PATCH /brands/:id`, `DELETE /brands/:id` | Brands (the web UI has no rename) |
| `GET /accounts[?brandId]` | Accounts |
| `POST /brands/:brandId/accounts` | Connect `{ platform, displayName, handle, connectionMode? }`. `live` is refused. |
| `POST /accounts/:id/disconnect` | Mark disconnected |
| `POST /accounts/:id/failure` | `{ enabled }`: the fail-next switch (simulated accounts only) |
| `GET /collections[?brandId]`, `POST /collections`, `DELETE /collections/:id` | Sets (the web UI has no delete) |
| `GET /media[?brandId]`, `POST /media` (multipart: `file`, `brandId`, `altText`) | Library |
| `GET /media/:id/file` | File bytes (`?token=` accepted) |
| `DELETE /media/:id` | Refused while a post uses the file |
| `GET /integrations` | Mode, banner, and per-network formats |
| `GET /posts[?brandId&status&collectionId]`, `POST /posts` | List and create |
| `GET /posts/:id`, `PATCH /posts/:id`, `DELETE /posts/:id` | View, update, delete (the web UI has no delete) |
| `POST /posts/:id/duplicate` | Copy as a draft |
| `POST /posts/:id/schedule` | `{ scheduledAt }` (ISO). Must be at least 30 s ahead. |
| `POST /posts/:id/publish` | Run now (simulated) |
| `POST /posts/:id/cancel` | Scheduled → cancelled |
| `POST /posts/:id/retry` | Re-run failed targets |
| `GET /calendar[?from&to&brandId]` | Dated posts in a range (default: this week) |
| `GET /dashboard[?brandId]` | Counts, next slot, week chart, failed, recent |
| `GET /history[?brandId]` | Every attempt, newest first |

## 22. Glossary

- **API (Application Programming Interface):** here, the set of HTTP URLs the server offers, such as `POST /api/posts`.
- **REST:** a style of API where URLs name resources (`/posts/123`) and HTTP methods say what to do (`GET` to read, `POST` to create, `PATCH` to change, `DELETE` to remove).
- **HTTP status codes:** 200 OK, 201 Created, 400 Bad Request (invalid input), 401 Unauthorized (not signed in), 404 Not Found, and 500 Server Error.
- **JSON:** the text format used for request and response bodies.
- **SPA (single-page application):** the browser loads one HTML page, and JavaScript swaps the screens. React Router handles the URLs. nginx's `try_files ... /index.html` makes deep links work.
- **Proxy:** a server that forwards requests. Vite (in dev) and nginx (in Docker) forward `/api` to the API.
- **CORS:** a browser rule that blocks a page from calling a different origin unless the server allows it. A same-origin proxy avoids the problem.
- **Monorepo / workspaces:** several packages in one repo, and npm's feature for installing and linking them together.
- **Controller:** the class that maps URLs to methods and handles HTTP details.
- **Service:** the class that holds business logic. It is reusable and does not know about HTTP.
- **Dependency injection (DI):** the framework creates objects and passes them into constructors, so classes do not create their own dependencies. This makes testing and swapping implementations easy.
- **Guard (NestJS):** code that runs before a controller method and can reject the request. Used here for authentication.
- **DTO / schema validation:** checking that incoming data has the right shape. Done here with Zod.
- **ORM:** a library that maps database tables to code. Drizzle here.
- **Migration:** a versioned script that changes a database schema step by step. **Not present in this project yet.**
- **Primary key / foreign key:** a column that uniquely identifies a row / a column that points to a row in another table.
- **Cascade delete:** deleting a parent row automatically deletes its children.
- **Transaction:** a group of SQL statements that either all succeed or all fail. **Not used in this project yet.**
- **Connection pool:** a set of reusable database connections.
- **Index:** a database structure that speeds up lookups on a column. Only primary and unique keys are indexed here.
- **Queue / job / worker:** a list of tasks (jobs) waiting to be done, and the code (worker) that takes and runs them. BullMQ stores them in Redis.
- **Delayed job:** a job that becomes runnable only after a delay. Used for scheduled slots.
- **Cron / sweeper / polling:** running a check on a timer. Here `sweepDue` runs every 20 seconds.
- **Idempotency / atomic claim:** making sure a task runs once even if it is triggered twice. Here the conditional `UPDATE ... WHERE status IN (...)` does that.
- **Redis:** a fast in-memory key-value store, used here only as BullMQ's storage.
- **JWT (JSON Web Token):** a signed token that proves who you are. The server verifies the signature and does not need to store sessions.
- **bcrypt / hashing:** a one-way scramble of a password, made deliberately slow to resist guessing.
- **Port and adapter (hexagonal architecture):** the code depends on an interface (port) such as "publish a post". Concrete classes (adapters) such as the mock or a real Instagram client plug into it.
- **Mock / simulation:** a stand-in for an external system that behaves similarly but does nothing real.
- **Seed:** sample data inserted automatically for development.
- **Environment variable:** configuration supplied from outside the code (`.env`, the shell, or Docker).
- **Container / image / volume:** a running isolated process / the packaged file system it starts from / storage that survives container restarts.
- **Docker Compose:** a file that describes several containers and how they connect.
- **Multi-stage build:** a Dockerfile that builds in one image and copies only the result into a small final image.
- **Reverse proxy (nginx):** a web server in front of the app that serves static files and forwards API calls.
- **CI/CD:** Continuous Integration (automatically test every change) / Continuous Delivery or Deployment (automatically ship it). Only CI exists here.
- **Healthcheck:** a command or URL that tells the orchestrator whether a service is ready.

## 23. What to learn from each part

| Part | What it teaches | Where to look first |
| --- | --- | --- |
| `apps/web/src/api.js` | How a frontend talks to a backend: headers, tokens, errors, and 401 handling | 35 lines, read it fully |
| `apps/web/vite.config.js`, `nginx.conf` | Proxies and why same-origin avoids CORS | `server.proxy`, `location /api/` |
| `posts.controller.ts` + `parse.ts` | Thin controllers and input validation at the boundary | `saveSchema`, `parseBody` |
| `posts.service.ts` | Business rules, joins, and assembling a response from several tables | `create`, `assertRelations`, `assemble` |
| `db/schema.ts` + `db/sql.ts` | Relational modelling, foreign keys, cascades, and why migrations matter | Compare the two files |
| `publishing.service.ts` | Background jobs, delayed queues, polling fallbacks, and race-safe claims | `schedule`, `enqueue`, `sweepDue`, `claimAndRun` |
| `aggregate.ts` | Deriving a parent status from children | 20 lines |
| `integrations/providers.ts` | Designing for an external API you do not have yet | `MockSocialProvider` vs `LiveSocialProvider` |
| `packages/contracts` | Sharing validation between client and server | `validateComposition` |
| `auth/*` | Password hashing, JWTs, and guards | `login`, `AuthGuard.canActivate` |
| `test/http.spec.ts` | Integration testing a real HTTP app with Supertest | `beforeAll`, the publish/retry test |
| `docker-compose.yml`, Dockerfiles | Service networking, healthchecks, volumes, and multi-stage builds | `depends_on`, `volumes` |
| `.github/workflows/ci.yml` | Running tests against real Postgres and Redis in CI | `services:` |

Suggested exercises, all of which touch real gaps listed in [Project status](PROJECT_STATUS.md):

1. Add a "Delete post" button in the composer. The API endpoint already exists.
2. Wrap `PostsService.create` in `db.transaction(...)`.
3. Add `drizzle-kit` and generate the first migration from `schema.ts`.
4. Add a Helmet middleware and restrict CORS to `WEB_ORIGIN`.
5. Write a test that cancelling a scheduled post leaves its targets `skipped`.
