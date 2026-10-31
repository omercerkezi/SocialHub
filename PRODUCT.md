# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed by the brief: npm-workspace monorepo; NestJS and TypeScript API; PostgreSQL and Drizzle ORM; React and JavaScript web app; React Native, Expo, and JavaScript mobile app; Docker Compose for local and Dokploy deployment; a Redis-backed job queue for scheduled publishing. UI libraries were left open and are chosen in the design pass.

## Users

One person, the owner, managing their own brands from a desk or a phone. The named brands are Furnio, Smart Leads, and later projects the owner adds. There is no team, no client login, and no advertiser.

## Product Purpose

SocialHub is the owner’s desk for planning, scheduling, and recording social posts across those brands. Success means a post can be drafted, previewed per network, scheduled, and given an honest publishing result without opening each network’s app.

## Positioning

One calendar and one media library serve every brand, while each network stays a separate account with its own format rules. Publishing runs through a provider interface. Until official credentials exist, that interface is a simulator and every result says so. A neighboring scheduler that only talks to live APIs, or one that hides a dry run inside a “published” state, cannot make this claim.

## Operating Context

The owner works in stretches: checking what is about to go out, fixing a failed slot, and filing media before a post is written. Furnio is a furniture brand. Smart Leads is a lead-generation brand. Posts are text, single images, carousels, videos, and Reels where a network supports them. There are no paid promotions and no ad accounts.

## Capabilities and Constraints

- Brands and the Facebook, Instagram, LinkedIn, and TikTok accounts attached to them.
- Draft, edit, and organize posts, including text, images, carousels, and videos.
- Schedule posts, Reels, and other formats the provider says it supports.
- Calendar in day, week, and month views.
- Media library.
- Previews that follow each network’s frame, not a generic card.
- Publishing status, history, errors, and retries.
- A dashboard of upcoming and already published work.
- Personal use only. No advertisements or paid promotions.
- No API credentials or developer approvals exist yet. That absence must not block the product. Mock providers simulate connect, publish, schedule, failure, and result. Simulated publishing is labeled in the API and in the interface. Live providers may be added later without changing post, calendar, or history behavior. A live provider with no credentials must fail, not pretend to publish.
- Sample brands and posts shipped for development are workspace fixtures, not proof of an audience.

## Brand Commitments

The product name is SocialHub. The owner’s brand names, Furnio and Smart Leads, stay as workspace data, not as the application’s visual identity.

## Evidence on Hand

No photographs, logos, or API credentials were provided. Network behavior in the product is simulated until credentials exist. Official publishing requirements are recorded in `docs/integrations.md` from public platform documentation.

## Product Principles

- Say when a result was simulated.
- A brand is a scope, not a theme that repaints the whole app.
- Format rules belong to the network, and the composer shows them before a slot is saved.
- A failed publish stays visible, with the error and a retry, until the owner resolves it.
- The calendar is the plan. The dashboard answers what is next and what already went out.

## Accessibility & Inclusion

The owner uses the web app with a keyboard and the phone app with touch. Body text stays at least 16px on small screens. Status never relies on color alone. The interface is English.
