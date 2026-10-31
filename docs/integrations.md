# Network integrations

SocialHub does not call Facebook, Instagram, LinkedIn, or TikTok. No app credentials are stored. The desk is fully usable because every account connection and every publish goes through a provider port, and the shipped providers are simulators.

A later live provider must implement the same port. Posts, the calendar, history, and retries should not need to change.

## How to tell the two apart

| | Simulated | Live |
| --- | --- | --- |
| `publishingMode` | `simulated` | `live` |
| `simulated` | `true` | `false` |
| External id | `sim_<platform>_<id>` | A network id, only after a confirmed publish |
| What the owner reads | “Simulated success. Nothing was sent to Instagram.” | “Published to Instagram.” |
| Failure | “Simulated failure. Nothing was sent to …” | The provider error, and a statement that nothing was confirmed |

`LiveSocialProvider` returns `ok: false` until credentials and an approved app exist. It never invents an external id.

`INTEGRATIONS_MODE=mock` is the default. Accounts created in the product are `connection_mode = simulated`. Switching the environment variable does not relabel old rows as live.

## Port

A provider must implement:

- `connect` — start an account link and return the mode
- `publish` — send one target and return `{ ok, publishingMode, simulated, externalPostId, errorCode, errorMessage, summary }`
- `supports` — formats and file types from `@socialhub/contracts`

The API already enforces those composition limits before it calls `publish`. The limits below are the ones the composer uses. Confirm them against the current official page before shipping a live provider. Platform rules change.

## Facebook

Official references:

- [Pages API posts](https://developers.facebook.com/docs/pages-api/posts/)
- [Permissions reference](https://developers.facebook.com/docs/permissions/)

Intended use: publish to Facebook Pages the owner manages. Not personal profiles, and not ads.

Permissions to plan for:

- `pages_show_list` — list Pages
- `pages_read_engagement` — read Page posts and engagement needed around publishing
- `pages_manage_posts` — create and update Page posts

Access is a Page token derived from the owner’s user token. Meta App Review, and often Business Verification, is required before an app can ask for these permissions from anyone who is not an admin or developer on the app.

Formats this product already models:

- Text, single image, multi-photo (stored here as a carousel), video, and Reel
- Live mapping to sketch later: `/{page-id}/feed`, `/{page-id}/photos`, the video upload flow, and the Reels upload session
- SocialHub should keep its own clock and call the Page when the slot is due, so a post is not scheduled twice

Mock behavior: connects a Page-shaped stand-in (`external_id` starts with `sim_facebook_`) and returns a simulated result.

## Instagram

Official reference: [Instagram content publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing).

Intended use: organic feed posts and Reels on an Instagram professional account (Business or Creator). Personal Instagram profiles are not supported by this API. No promotions.

Typical Facebook Login permissions:

- `instagram_basic`
- `instagram_content_publish`
- `pages_show_list`
- `pages_read_engagement`

Instagram Login uses the business equivalents (`instagram_business_basic`, `instagram_business_content_publish`). Either flow needs App Review before it works for an account that does not have a role on the app. The professional account is linked to a Facebook Page in the Facebook Login flow.

Publishing is two steps: create a media container, then `media_publish`. Carousels create a container per child, then a `CAROUSEL` container (2 to 10 children). Reels use `media_type=REELS`. Meta’s documented cap is 50 API-published posts in a rolling 24 hours per Instagram account. Confirm that number before a live provider retries in a loop.

Composer limits already enforced:

- Caption 2,200 characters, 30 hashtags
- Carousel 2–10 files
- Reel and video posts need one video
- Text-only posts are rejected

Live media notes to handle in the provider, not in the composer’s data model:

- Containers often need a URL Meta’s servers can fetch, or a resumable upload where that flow exists
- The live image path expects JPEG. PNG is accepted in simulation so local swatches work. Convert before a live call
- Aspect ratio rules (feed and 9:16 for Reels) should be warnings on the preview, then hard failures once the live provider knows the current bounds

Mock behavior: same port, `sim_instagram_…`, summary states nothing was sent.

## LinkedIn

Official references:

- [Posts API](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-10)
- [MultiImage](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/multiimage-post-api?view=li-lms-2026-09)

Intended use: organic posts as the owner or as a Company Page. Sponsored posts and ads are out of scope. LinkedIn’s carousel content type is for sponsored posts. Organic multi-image posts use MultiImage (2 to 20 images). This product stores that shape as a carousel and must not send it as a sponsored carousel.

Permissions:

- `w_member_social` — post as the authenticated member
- `w_organization_social` — post as a Company Page where the member is ADMINISTRATOR, CONTENT_ADMIN, or DIRECT_SPONSORED_CONTENT_POSTER
- `r_organization_social` — read Page posts when a history sync is added
- `r_member_social` is restricted; do not plan on it

The Posts API is versioned (`LinkedIn-Version` header). Images and videos are uploaded first and then referenced by URN. MultiImage does not accept video children. Caption planning limit in this app is 3,000 characters. Confirm the current commentary limit before the live call.

There is no scheduling endpoint to rely on. SocialHub should publish when the slot is due.

Mock behavior: `sim_linkedin_…`. Reels are rejected by the shared rules because LinkedIn is not a Reel surface.

## TikTok

Official references:

- [Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started)
- [Direct Post](https://developers.tiktok.com/doc/content-posting-api-reference-direct-post)

Intended use: organic video and photo posts to the owner’s TikTok account. No ads.

Products and scopes to request:

- Login Kit
- Content Posting API: `video.publish` (direct post) and `video.upload` (send to the TikTok inbox as a draft)
- `user.info.basic` so the composer can show the account it is about to use

Unaudited clients are restricted. TikTok’s own documentation says content from an unaudited client is private, and public posting requires an audit. The audit reviews the posting screen: creator identity, a privacy choice with no default, comment, duet, and stitch controls, a disclosure, and an explicit consent to send the file. Build that screen when the live provider is added. Do not hide it behind a single “Publish” button.

Photo posts and video posts use different init endpoints. Pulling media from a URL requires a verified domain or URL prefix. TikTok does not provide a scheduling API. This app should hold the slot and call TikTok when it is due. Direct-post status is polled until `PUBLISH_COMPLETE` or `FAILED`.

Composer limits already enforced:

- Video caption 2,200 characters
- Photo posts (stored as carousels) 2 to 35 images, JPEG or WebP
- Text-only and Reels are rejected. A TikTok video is format `video`, not `reel`

Mock behavior: `sim_tiktok_…`. The failure switch on an account simulates a rejected init without contacting TikTok.

## What stays in SocialHub either way

- The schedule and the sweeper
- Per-target status, attempt history, and retry of failed targets only
- Previews and composition limits
- The simulated banner, for as long as any connected account is simulated

## Adding a live provider later

1. Create the developer app and complete that network’s review. Keep the credentials in the deployment environment, not in the database seed and not in git.
2. Implement `LiveSocialProvider` for that platform behind the existing port. Return `publishingMode: "live"` and `simulated: false` only after the network confirms the post.
3. Connect new accounts with `connection_mode: "live"`. Leave existing simulated accounts as they are.
4. Map the composer’s format onto the network’s object (Instagram container, LinkedIn MultiImage, TikTok init) inside the provider.
5. On failure, store the network’s code and message. Do not mark the target published.
6. Keep the copy helpers in `@socialhub/contracts`. The desk already renders whatever `summary` the provider returns.
