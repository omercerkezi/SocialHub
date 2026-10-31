# Architecture

SocialHub is an npm workspace monorepo for one owner. Brands, posts, media, and the calendar live in PostgreSQL. Network calls go through a provider port. Until credentials exist, that port is a simulator.

## Layout

| Path | Role |
| --- | --- |
| `apps/api` | NestJS API, Drizzle schema, publish worker |
| `apps/web` | React desk |
| `apps/mobile` | Expo companion, installed on its own so native dependencies stay out of the API workspace |
| `packages/contracts` | Platforms, composition limits, result wording, color tokens |
| `docs/integrations.md` | What a future live provider must satisfy |
| `docker-compose.yml` | PostgreSQL, Redis, API, and web for local use and Dokploy |

## Publishing port

`SocialProvider` has two implementations:

- `MockSocialProvider` (`publishingMode: "simulated"`). Connects a stand-in account, waits briefly, and returns a simulated success or a simulated failure. The external id always starts with `sim_`. The summary always says nothing was sent.
- `LiveSocialProvider` (`publishingMode: "live"`). Refuses connect and publish while credentials are absent. A refusal is a failed live attempt, never a simulated success, and never a published id.

`INTEGRATIONS_MODE=mock` is the default. An account stores `connection_mode`. A simulated account always uses the mock provider, even if the process is later switched toward live. A live account uses the live provider, which still refuses without credentials.

The desk copies `resultCopy` and `statusLabel` from `@socialhub/contracts`. A completed simulation is stored as status `published` (the provider returned ok) and shown as **Simulated success**. The word Published is reserved for `publishingMode: "live"`.

## Jobs

Scheduling writes `scheduled` and a `scheduled_at`. BullMQ adds a delayed job when Redis is reachable. A sweeper in the API process also claims due rows, so a missed Redis job still runs. Publish-now runs in the request. Each target gets a `publish_attempts` row with `publishing_mode` and `simulated`.

Retries re-queue failed targets only. Cancelling a scheduled post removes the delayed job.

## Media

Uploads are stored on a volume (`STORAGE_DIR`), addressed by id. The API never uses the original filename as a path.

## Auth

One owner, email and password, bcrypt, JWT. Seed credentials come from the environment. There is no public signup.
