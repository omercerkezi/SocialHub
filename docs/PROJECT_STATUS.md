# SocialHub project status

An audit of the repository as of 31 October 2026, on branch `cursor/web-ui-polish` (commit `c4bcefc`, one commit ahead of `origin/main`).

Read alongside the [User guide](USER_GUIDE.md) (how it is used) and the [Developer guide](DEVELOPER_GUIDE.md) (how it works). This document says **what state things are in** and **what is left**.

## How this audit was done

Everything below comes from reading the code and running it, not from the GitHub tickets.

- Read every file in `apps/api/src`, `apps/web/src`, `apps/mobile`, `packages/contracts`, the Dockerfiles, `docker-compose.yml`, the CI workflow, and the existing docs.
- Ran `npm test`: 2 suites and 7 tests pass, and the copy check passes.
- Ran `npm run build`: API (`tsc`) and web (`vite build`) succeed.
- Ran `docker compose build`: both images build. Started `api` and `web` from Compose: `/api/health` answers through nginx on port 8090, and protected routes return 401 without a token.
- Ran `npm run db:studio`: **fails** (missing script).
- Reproduced two API bugs against a running API (see [Known bugs](#known-bugs)).
- Read the GitHub issues and milestones through the public API: 8 milestones and 19 issues, **all open**. The last CI run on `main` succeeded.
- Exercised the web app in a browser during the earlier UI review, at 1440 px and 390 px.

**Not verified:**

- The mobile app on a device or simulator.
- A Dokploy deployment.
- Behaviour under load.
- Running several API instances at once.

## Status legend

| Label | Meaning |
| --- | --- |
| **Implemented** | Works end to end in the web app and the API, and was exercised in this audit. |
| **Partial** | Some layers exist (often the API) but not all, or it works with notable gaps. |
| **Simulated** | Works, but only against the mock provider. Nothing reaches a real network. |
| **Missing** | Not built. |

## Feature status

### Product features

| Area | Status | Notes |
| --- | --- | --- |
| Owner sign-in | Implemented | One seeded user. JWT valid for 30 days, stored in the tab's `sessionStorage`. |
| Sign-out | Partial | Clears the browser token only. The token stays valid on the server until it expires. |
| Sign-up, password change or reset, multiple users, roles | Missing | |
| Brands: create, delete, scope switcher | Implemented | |
| Brands: rename or edit description | Partial | `PATCH /api/brands/:id` exists. There is no UI. |
| Sets: create, choose in the composer | Implemented | |
| Sets: delete, rename, filter posts by set | Partial | Delete and filter exist in the API (`DELETE /collections/:id`, `?collectionId=`). No UI, and no rename endpoint. |
| Social accounts: connect | **Simulated** | Any handle is accepted. A fake `sim_…` external id is stored. `connectionMode: "live"` is refused. |
| Social accounts: disconnect | Implemented | Sets the status only. |
| Social accounts: reconnect | Missing | |
| "Fail next simulation" switch | Implemented | Simulated accounts only. Resets after one failure. |
| Media library: upload, list, delete, sample swatches | Implemented | Images and videos, 200 MB, MIME allow-list. Delete is refused while a post uses the file. |
| Media: edit description, thumbnails, image or video dimensions | Missing | `width`, `height`, and `duration_seconds` columns exist but are never filled for uploads. |
| Posts: create, edit, duplicate | Implemented | Five formats. Brand locked after the first save. Finished posts are locked. |
| Posts: delete | Partial | `DELETE /api/posts/:id` exists. There is no button in the web or mobile app. |
| Posts: list with status filters | Implemented | |
| Composition rules per network | Implemented | Shared `validateComposition`, run in the browser and again on the server. Planning limits only: no aspect ratio, resolution, or duration checks. |
| Per-network previews | Implemented | Approximations of each network's frame, not pixel-accurate. |
| Scheduling | Implemented (simulated execution) | Delayed BullMQ job plus a 20-second sweeper. Atomic claim. Minimum 30 s ahead. |
| Cancel a scheduled post | Implemented | |
| Run now | **Simulated** | |
| Per-target results, attempts, history | Implemented | Append-only `publish_attempts`. |
| Retry failed targets | Implemented | Manual only. There is no automatic retry or backoff. |
| Dashboard (Today's run) | Implemented | Counts, next slot, week chart, failed, recent. Week boundaries use the server's time zone. |
| Calendar day, week, and month | Implemented | Read-only. No drag-to-reschedule. |
| Real publishing to Facebook, Instagram, LinkedIn, TikTok | Missing | `LiveSocialProvider` always refuses. See [Real integrations](#what-is-needed-for-real-integrations). |
| OAuth account linking | Missing | |
| Analytics or engagement data | Missing | Out of current scope. |
| Notifications (email, push) about failures | Missing | |
| Mobile companion app | Partial | See [Mobile](#mobile-app). |

### Platform and infrastructure

| Area | Status | Notes |
| --- | --- | --- |
| npm workspace monorepo | Implemented | `apps/api`, `apps/web`, `packages/contracts`. Mobile is installed separately. |
| PostgreSQL schema | Implemented | 9 tables, foreign keys, and cascades. |
| Database migrations | **Missing** | `CREATE TABLE IF NOT EXISTS` on boot. Existing tables are never altered. |
| Transactions | Missing | Multi-statement writes are not atomic. |
| Indexes | Missing | Only primary and unique keys. |
| Redis job queue | Implemented | BullMQ inside the API process. Redis has no persistence configured in Compose. |
| Separate worker process | Missing | The worker shares the API process. |
| Docker images and Compose stack | Implemented | Verified in this audit. |
| Health endpoint | Partial | `/api/health` does not check the database or Redis. Compose has no API healthcheck. |
| CI (tests and builds) | Implemented | GitHub Actions on every push and PR. |
| CD (automatic deploy) | Missing | |
| Linting, formatting, type-checking of JS | Missing | No ESLint, no Prettier, no `lint` script. |
| Logging, monitoring, error tracking, metrics | Missing | `console.error` only. |
| Backups | Missing | |
| Dokploy deployment | Not verified | The guide and compose file exist. No deployment has been confirmed. |
| `npm run db:studio` | **Broken** | The root script calls a script that does not exist in `apps/api`. |

### What is mocked or simulated

Everything that would touch a social network:

- **Account connection.** `MockSocialProvider.connect` invents `sim_<platform>_<8 hex>`.
- **Publishing.** `MockSocialProvider.publish` sleeps `SIMULATE_DELAY_MS` (180 ms) and returns success, or failure when the account's fail switch is on.
- **External post ids.** `sim_<platform>_<8 hex>`, or `sim_<platform>_sample` in the seed.
- **The "live" provider.** It is a stub that always returns `credentials_missing`.
- **`INTEGRATIONS_MODE=live`.** It only changes banner text. It does not change which provider is used.
- **Sample data.** Two brands, eight accounts, four generated 64×64 PNG swatches, and six posts with pre-written results.

The labelling of simulations is consistent and tested. A simulated success is stored as `status = published` with `publishing_mode = simulated`, and it is always shown as "Simulated success". `scripts/check-copy.mjs` blocks "Published to …"-style copy in the web and mobile source.

### Mobile app

| Item | Status |
| --- | --- |
| Screens: Today, Calendar list, Posts, Composer, Library, Brands, History | Partial (basic lists) |
| Composer: pick files, choose a set, save a draft, schedule | Missing (it can only "Run simulation") |
| Upload from the phone gallery | Implemented in code, not verified on a device |
| Token persistence and sign-out | Missing |
| Live banner from the API | Missing (the text is hard-coded) |
| Tests, CI build, EAS config | Missing |
| Runs on a device | **Not verified**, and a likely crash after sign-in (see bugs) |

## Known bugs

The first two were **reproduced** against the running API during this audit. The rest are confirmed by reading the code.

| # | Severity | Bug | Where | Evidence |
| --- | --- | --- | --- | --- |
| B1 | High | **A finished post can be rescheduled and would run again.** `schedule()` does not check the post status. It sets the post and *all* targets (including `published` ones) to `scheduled`. The web UI hides the button for finished posts, but the API allows it. | `publishing.service.ts` `schedule` | Reproduced: published → `POST /schedule` → post `scheduled`, target `scheduled` |
| B2 | Medium | **Changing accounts on a failed post is silently ignored.** For `failed` posts, `update()` only replaces media, not targets, but returns 200. | `posts.service.ts` `update` | Reproduced: Facebook → LinkedIn, response still lists Facebook |
| B3 | High (mobile) | **Hooks-order violation.** `if (!token) return <Login/>` comes before `useMemo(...)` in `App`, so the hook count changes after sign-in. React throws "Rendered more hooks than during the previous render". | `apps/mobile/App.js` | Code reading. Not run. |
| B4 | Medium | **Posts can get stuck in `publishing`.** If the process dies mid-run, nothing resets the status. The claim, the UI edit, and delete all reject `publishing`. | `publishing.service.ts` `claimAndRun` | Code reading |
| B5 | Medium | **Multi-step writes are not atomic.** Creating a post, replacing its links, or running a target is several statements without a transaction. A crash can leave partial data. | `posts.service.ts`, `publishing.service.ts` | Code reading |
| B6 | Low | Dashboard week, "this week" counts, and day grouping use the **server's** time zone. The Docker image runs in UTC, so posts near midnight can land on the wrong day for a UTC+1 owner. | `posts.service.ts` `dashboard` | Code reading. Container logs show UTC. |
| B7 | Low | Schedule error says "at least a minute from now", but the check is 30 seconds. | `publishing.service.ts` | Code reading |
| B8 | Low | Library delete confirmation says posts "will lose this file", but the API refuses to delete a file that is in use. | `MediaLibrary.jsx` | Code reading |
| B9 | Low | `publishNow` overwrites `scheduled_at` with "now", so a post run early loses its planned slot time on the calendar. | `publishing.service.ts` | Code reading |
| B10 | Low | Changing `ADMIN_EMAIL` after the first boot creates a **second** owner. Changing `ADMIN_PASSWORD` has no effect. `deployment.md` described the seed condition inaccurately (now corrected). | `seed.ts` | Code reading |
| B11 | Low | `npm run db:studio` fails. | root `package.json` | Ran it |
| B12 | Low | One dashboard test assertion compares a value with itself. | `test/http.spec.ts` | Code reading |
| B13 | Low | Tests write to the dev database and leave "Desk test" brands behind. | `test/http.spec.ts` | Observed |

## Technical debt and architectural weaknesses

1. **No migrations, and the schema is written twice.** `db/schema.ts` (Drizzle types) and `db/sql.ts` (real DDL) must be kept identical by hand, and changes to existing tables never apply. This is the biggest blocker for evolving the data model.
2. **No transactions** (see B5), and **no indexes** on `posts(status, scheduled_at)`, foreign keys, or `publish_attempts(finished_at)`. The sweeper query and history will slow down as data grows.
3. **In-memory filtering.** `calendar()` and `dashboard()` load *every* post with targets and media, then filter in JavaScript. History has no pagination. This is fine for hundreds of posts, not for tens of thousands.
4. **The provider port is too thin for a real integration.** `publish({ platform, fail })` receives no caption, media, account id, or credentials. There is nowhere to store OAuth tokens, no media URL or upload pipeline, no rate-limit handling, and no async status polling (which Instagram containers and TikTok need).
5. **The worker is coupled to the API process.** It scales and restarts with the web traffic. Running several API replicas runs several sweepers. That is safe because of the atomic claim, but wasteful. There is no graceful drain of in-flight jobs.
6. **Redis has no persistence** in Compose (no volume or AOF). Delayed jobs vanish when the container is recreated. The sweeper covers this, at up to 20 s lateness.
7. **Status columns are free text.** There are no enums or `CHECK` constraints. The state machine lives only in the services and is not documented as one diagram.
8. **Media is stored on the local disk**, in a single volume. That blocks horizontal scaling and gives networks nothing to fetch from a public URL, which Instagram and TikTok often require. Uploads are buffered fully in memory (up to 200 MB).
9. **Leftovers and inconsistencies:**
   - The `TOKENS` export in contracts is unused and outdated.
   - `WEB_ORIGIN` is configured but unused.
   - `INTEGRATIONS_MODE` only affects labels.
   - `apps/mobile/.claude/settings.json` and `AGENTS.md` are tool files committed inside the app folder.
10. **There is little test coverage.** Only the API has tests: 5 unit tests and 2 HTTP flows. There are no tests for scheduling and the sweeper, cancel, edit rules, the calendar, deletion cascades, auth failure cases, the web app, or the mobile app. The tests share the dev database.
11. **No linting or formatting**, and the web and mobile code is untyped JavaScript.
12. **The GitHub board is out of date.** All 19 issues are open, although issues 1–14 are substantially delivered.

## Security status

| Item | Current | Needed for production |
| --- | --- | --- |
| Password storage | bcrypt cost 10 | OK. Consider cost 12. |
| Default credentials | `change-me` password, `dev-only-change-me` JWT fallback | Refuse to boot in production without a strong `JWT_SECRET` and a non-default password |
| Token lifetime and revocation | 30 days, no revocation | Short-lived access token plus refresh token, or a server-side session. Logout invalidation. |
| Token in URL | `?token=` accepted for media | Signed short-lived media URLs, or an HttpOnly cookie for media |
| Brute force | No rate limit | Rate limit `/auth/login` (for example `@nestjs/throttler`), plus a lockout or backoff |
| CORS | Any origin | Restrict to `WEB_ORIGIN` |
| Security headers | Only `Referrer-Policy` | Helmet: CSP, HSTS, `X-Content-Type-Options`, frame options |
| HTTPS | None in Compose | Terminate TLS at Dokploy, Traefik, or another proxy. Redirect HTTP. |
| Upload safety | Client MIME, memory buffer | Magic-byte sniffing, streaming to disk or object storage, per-type size limits |
| Authorization | Any token can do everything | Fine for one owner. Roles and per-brand access if a team is ever added. |
| Secrets for networks | None stored | Encrypted at rest (KMS or a libsodium key from the environment), never in git or the seed |
| Dependency scanning | None | `npm audit` in CI, Dependabot |
| Audit log | Attempts only | Log sign-ins and destructive actions |

## Reliability, monitoring, and testing gaps

Reliability:

- Recover stuck `publishing` posts on boot, or after a timeout.
- Use transactions.
- Add automatic retry with backoff for transient provider errors (not for validation errors).
- Make provider calls idempotent so a retry after a timeout cannot double-post. Store a request key, and check the network before re-sending.
- Add a Redis volume with AOF.
- Add an API healthcheck in Compose, plus `restart: unless-stopped` on all services.
- Check the database and Redis in `/health` (readiness), separately from liveness.
- Shut down gracefully so in-flight jobs finish before the process exits.

Monitoring:

- Structured JSON logs (for example `pino` or `nestjs-pino`) with request ids.
- Error tracking (Sentry or similar) for the API and web.
- Metrics: queue depth, job latency against the slot, success and failure rate per platform, sweeper runs.
- Alerts on failed publishes and on an empty sweeper heartbeat.
- Uptime checks on `/api/health`.

Testing:

- A separate test database, reset per run.
- Unit tests for `aggregateTargets` edge cases, the status transitions, and `validateComposition` for every network and format.
- Integration tests for schedule, sweep, cancel, edit-while-scheduled, delete cascades, auth 401s, and upload rejection.
- Web: component tests (Vitest and Testing Library) and a few Playwright end-to-end flows (sign in, compose, schedule, see it on the calendar).
- Mobile: at least a render test and a CI bundle build (`npx expo export`).
- Contract tests per real provider against recorded or sandbox responses.

## What is needed before production

Required, in order:

1. Fix B1–B5.
2. Introduce migrations (drizzle-kit) and drop the hand-written `sql.ts`.
3. Harden security: secrets, rate limit, CORS, Helmet, media URLs, TLS.
4. Add backups for Postgres and the media volume, and test a restore.
5. Add logging, error tracking, health and readiness checks, and restart policies.
6. Add Redis persistence.
7. Do a real deployment target (Dokploy) with a documented procedure and a rollback plan.
8. Write tests for the scheduling and publishing state machine.

The product can then be used in production **in simulation mode**. Real publishing needs the next section as well.

## What is needed for real integrations

Common work for all four networks (required before any of them):

- **Extend the provider port.** Pass the full post (caption, ordered media with readable URLs or streams, and format), the target account, and its credentials. Return a structured result, including a "pending" state for asynchronous publishing.
- **Add OAuth connect flows.** Redirect, callback, state/PKCE, and token exchange. Store access and refresh tokens **encrypted** in a new table (`account_credentials`), add token refresh before expiry, and handle revoked tokens by marking the account `disconnected`.
- **Make account connection real.** Replace the "Name + Handle" form with "Connect with …". Pick the Page, organisation, or professional account from the network's list. Keep simulated accounts as they are.
- **Media delivery.** Most networks either fetch from a public HTTPS URL or need a chunked upload. Move media to object storage (S3-compatible) with signed URLs, or build per-network upload code. Convert formats where needed (for example PNG to JPEG for Instagram).
- **Asynchronous status.** Poll or use webhooks until the network confirms. Only then set `publishing_mode = live`, `simulated = false`, and store the real external id.
- **Rate limits and quotas.** Handle per-network limits and error codes, with backoff and clear messages.
- **Pass app review.** Each network requires an approved developer app before it works for accounts without a role on the app. Plan weeks, not days.
- **Live-mode wiring.** Make `INTEGRATIONS_MODE` (or per-account `connection_mode`) actually select the live provider, and remove the "live is refused" branch in `WorkspaceService.connect` for networks that have credentials.

Per network (details and links in [`integrations.md`](integrations.md)):

| Network | Needs | Specific work |
| --- | --- | --- |
| Facebook Pages | Meta developer app, Facebook Login, `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, App Review, often Business Verification | Page token from the user token. `/{page-id}/feed`, `/photos`, the video upload, and the Reels upload session. Multi-photo posts. |
| Instagram (professional accounts) | The same Meta app. `instagram_basic`, `instagram_content_publish` (or the Instagram Login business scopes). App Review. A professional account linked to a Page. | Two-step container then `media_publish`. Carousel children (2–10). `REELS` media type. Poll the container status. Public media URLs. JPEG conversion. A cap of about 50 API posts per 24 h per account. |
| LinkedIn | LinkedIn developer app, `w_member_social` and/or `w_organization_social` (Community Management API access), a versioned API header | Upload images and videos first, then create the post with URNs. MultiImage for 2–20 images (no video). Organization admin role checks. |
| TikTok | TikTok developer app, Login Kit, Content Posting API (`video.publish`, `video.upload`), `user.info.basic`, **an audit for public posting** | A posting screen that meets the audit rules: creator info, a privacy choice with no default, comment, duet, and stitch toggles, disclosure, explicit consent. Separate photo and video init. A verified domain for URL pulls. Poll until `PUBLISH_COMPLETE`. Before the audit, posts are private only. |

## Deployment requirements for Dokploy

What exists: `docker-compose.yml` and [`deployment.md`](deployment.md). The images build. Nothing has been deployed or verified on Dokploy.

Required:

1. Create a Compose application in Dokploy pointing at the repository and branch.
2. **Set the secrets in Dokploy:**
   - `JWT_SECRET`: a long random value.
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD`, set **before the first boot**, because the seed only uses them once.
   - `POSTGRES_PASSWORD`.
   - `INTEGRATIONS_MODE=mock`.
   - `WEB_ORIGIN`: once the code actually uses it.
3. **Domain and TLS.** Route the domain to the `web` service, port 80, through Dokploy's Traefik with Let's Encrypt. Do not expose `api` publicly. nginx already proxies `/api`.
4. **Do not publish the Postgres (5434) and Redis (6380) ports** on a public server. Remove or restrict the `ports:` entries for those services, for example with a production override file.
5. **Persistent volumes**: `postgres` and `media` (and `redis`, once persistence is added). Use Dokploy volume backups, or a scheduled `pg_dump` plus a media copy to off-site storage.
6. **Add healthchecks and restart policies** so Dokploy can tell the API is ready, and set `SEED=false` after the first boot if you do not want sample data recreated on an empty database.
7. **Choose a deploy trigger.** Use a webhook on push to `main`, or add a CD job after CI passes. Document the rollback (redeploy the previous image or commit).
8. **Plan the schema.** Until migrations exist, schema changes require a manual `ALTER TABLE` on the server.

## Reconciling the GitHub board

All 19 issues are open. Based on this audit:

| Issue | Suggested state |
| --- | --- |
| #1 Establish the monorepo, Postgres, Redis, and CI | Close. Done (migrations tracked separately). |
| #2 Document the architecture and the provider port | Close. Done (these docs). |
| #3 Manage brands and their sets | Keep open, or split: rename, set delete UI |
| #4 Connect accounts in simulation | Close. Done (simulated). |
| #5 Refuse a live connection until credentials exist | Close. Done. |
| #6 Create, edit, duplicate, and organize posts | Keep open: delete UI, B2 |
| #7 Support all five formats | Close. Done (planning rules). |
| #8 Media library | Close, or keep for the description edit and dimensions |
| #9 Platform previews | Close. Done. |
| #10 Schedule and run with a background job | Keep open: B1, B4, B5 |
| #11 Calendar | Close. Done (drag-to-reschedule is a new optional issue). |
| #12 Status, history, errors, and retries | Close. Done (automatic retry is a new issue). |
| #13 Dashboard | Close, or keep for B6 |
| #14 React desk | Close. Done. |
| #15 Expo companion | Keep open: B3 and the missing features |
| #16–#18 Live providers | Keep open. Blocked on developer apps and reviews. |
| #19 Dokploy | Keep open |

## Roadmap

Priorities:

- **P0**: required before relying on it at all.
- **P1**: required before production.
- **P2**: required before real publishing.
- **P3**: optional improvements.

### Phase 1: Correctness (P0, required)

- [ ] B1: `schedule()` must reject `published`, `partial`, `publishing`, and `queued` posts, and only reset non-published targets.
- [ ] B2: allow target changes on failed posts (replace targets, or reject the change with a clear 400).
- [ ] B3: move `useMemo` above the early return in `apps/mobile/App.js`.
- [ ] B4: on boot and on every sweep, reset posts stuck in `publishing` for longer than N minutes back to `failed` with an explanatory attempt.
- [ ] B5: wrap post create and update, and each target's attempt and target update, in `db.transaction`.
- [ ] B7–B9: fix the message, the library copy, and stop `publishNow` overwriting `scheduled_at` (store the run time in `published_at` only).
- [ ] B11: remove the `db:studio` script, or add drizzle-kit and a real `db:studio`.
- [ ] Tests for each fix.

### Phase 2: Data and developer foundations (P1, required)

- [ ] Add drizzle-kit. Generate the baseline migration from `schema.ts`, run migrations on boot or as a release step, and delete `sql.ts`.
- [ ] Add indexes: `posts(status, scheduled_at)`, `posts(brand_id)`, `post_targets(post_id)`, `publish_attempts(post_target_id)`, and `publish_attempts(finished_at)`.
- [ ] Add `CHECK` constraints or Postgres enums for the status, platform, format, and mode columns.
- [ ] Move calendar and dashboard filtering into SQL. Paginate history and posts.
- [ ] Use a separate test database and clean up after tests. Fix B12 and B13.
- [ ] ESLint and Prettier for all packages, plus a `lint` script in CI.
- [ ] Close or update the GitHub issues per the table above.

### Phase 3: Security and operations (P1, required)

- [ ] Refuse to start with the default `JWT_SECRET` or admin password when `NODE_ENV=production`.
- [ ] Rate-limit login. Use shorter tokens with refresh, or server sessions. Revoke on sign-out.
- [ ] Replace `?token=` media access with signed, expiring URLs.
- [ ] Restrict CORS to `WEB_ORIGIN`. Add Helmet.
- [ ] Sniff upload content and stream uploads instead of buffering them.
- [ ] A `/health/ready` endpoint that checks the database and Redis. Compose healthchecks and restart policies.
- [ ] Persistent Redis (a volume and AOF).
- [ ] Structured logging, error tracking, and basic metrics and alerts.
- [ ] Postgres and media backups, with a tested restore.
- [ ] Optionally run the worker as a separate Compose service (same image, `WORKER_ENABLED=true`, with the API set to `false`).
- [ ] Deploy on Dokploy with TLS, private database and Redis, and a documented rollback (closes #19).
- [ ] CD: deploy after CI on `main`. Build the Docker images in CI.

### Phase 4: Finish the simulated product (P1/P3)

- [ ] Delete post (P1). Rename brand, delete and rename set, filter by set (P3).
- [ ] Reconnect a disconnected account (P3).
- [ ] Edit a file's description. Store image dimensions and video duration. Generate thumbnails (P3).
- [ ] Owner password change in the UI (P1).
- [ ] Show the owner's time zone explicitly, and compute the dashboard week in it (P1, fixes B6).
- [ ] Calendar drag-to-reschedule (P3).
- [ ] Mobile: persist the token (SecureStore), sign out, the file picker in the composer, schedule and draft, a banner from `/integrations`, a CI bundle build (P3 unless the phone is a primary tool).

### Phase 5: Real integrations (P2, required for real publishing)

- [ ] Extend the provider port, with full post context and asynchronous results.
- [ ] Encrypted credential storage, OAuth connect and callback, and token refresh.
- [ ] Media in object storage with public signed URLs, and format conversion.
- [ ] Automatic retry with backoff, idempotency keys, and rate-limit handling.
- [ ] **Facebook Pages** provider (closes part of #16), then **Instagram** (rest of #16).
- [ ] **LinkedIn** provider (#17).
- [ ] **TikTok** provider and the audit-compliant posting screen (#18).
- [ ] Per-provider contract tests. A manual end-to-end check on a real test account per network.
- [ ] Copy review: "Published" appears only after network confirmation. Keep `check-copy.mjs`.

### Phase 6: Optional improvements (P3)

- Engagement analytics pulled from the networks.
- Email or push notifications for failures.
- Multi-user support with roles and per-brand access.
- Best-time suggestions, hashtag sets, and caption templates.
- Bulk scheduling and CSV import.
- Web and mobile end-to-end tests in CI.
- TypeScript for the web and mobile apps.
