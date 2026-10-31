# SocialHub user guide

This guide explains how to use SocialHub day to day. It is written for the person running the brands, not for developers. If you need to install or run the application, see the [Developer guide](DEVELOPER_GUIDE.md). For what is finished and what is still missing, see [Project status](PROJECT_STATUS.md).

## Contents

1. [What SocialHub is](#what-socialhub-is)
2. [The most important thing to know: publishing is simulated](#the-most-important-thing-to-know-publishing-is-simulated)
3. [Signing in and out](#signing-in-and-out)
4. [Finding your way around](#finding-your-way-around)
5. [Brands, accounts, and sets](#brands-accounts-and-sets)
6. [The library (your files)](#the-library-your-files)
7. [Writing a post](#writing-a-post)
8. [Scheduling a post](#scheduling-a-post)
9. [Running a simulation now](#running-a-simulation-now)
10. [What happens when a scheduled post comes due](#what-happens-when-a-scheduled-post-comes-due)
11. [Failures and retries](#failures-and-retries)
12. [Editing, duplicating, and cancelling](#editing-duplicating-and-cancelling)
13. [Today's run (the dashboard)](#todays-run-the-dashboard)
14. [The calendar](#the-calendar)
15. [The posts list](#the-posts-list)
16. [History](#history)
17. [The phone app](#the-phone-app)
18. [What each status means](#what-each-status-means)
19. [Network rules the composer checks](#network-rules-the-composer-checks)
20. [Limitations and features not available yet](#limitations-and-features-not-available-yet)

## What SocialHub is

SocialHub is a personal desk for planning social media posts for several brands from one place. It is built for one owner. The sample brands are **Furnio** (furniture) and **Smart Leads** (lead generation), and you can add more.

With SocialHub you can:

- Keep several **brands**, each with its own social **accounts** on Facebook, Instagram, LinkedIn, and TikTok.
- Keep a **library** of images and videos for each brand.
- Write **posts** in five formats: text, image, carousel, video, and Reel.
- See a **preview** of how each post would look on each network.
- **Schedule** posts for a date and time, and see them on a **calendar**.
- See what is coming up and what needs attention on **Today's run**.
- Read a **history** of every attempt, and **retry** failed ones.

## The most important thing to know: publishing is simulated

**SocialHub does not send anything to Facebook, Instagram, LinkedIn, or TikTok.** It has no connection to those networks.

Every account you connect is a *simulated* account. When a post "runs", SocialHub pretends to send it, waits a moment, and records a result. The result always says it was simulated, for example:

> Simulated success. Nothing was sent to Instagram.

What simulation **does**:

- Checks your post against each network's rules (format, caption length, number of files, file types).
- Records a result for each account, with a made-up reference that starts with `sim_` (for example `sim_instagram_3f9a1c2e`).
- Lets you practise the whole workflow, including failures and retries.

What simulation **does not** do:

- It does not post anything, anywhere.
- It does not log in to any network or check that an account or handle really exists.
- It does not collect likes, comments, views, or any other numbers from the networks.

You will see this reminder in the sidebar under **Simulation mode**, on every preview ("Preview only. Not sent to …"), and under the run buttons. The word **Published** is only used for a real, confirmed post on a network. Because real publishing is not built yet, you should never see it today.

## Signing in and out

1. Open SocialHub in your browser. Whoever set it up will give you the address. On a local computer it is usually `http://localhost:8090` (Docker) or `http://localhost:5173` (development).
2. Enter your email and password and choose **Sign in**.
3. To sign out, choose the arrow button next to your name at the bottom of the sidebar.

Things to know:

- There is one owner account. There is no sign-up page, no "forgot password" link, and no way to change your password inside the app. The person who installed SocialHub sets the email and password.
- You stay signed in only in that browser tab. If you close the tab or open SocialHub in a new tab, you will be asked to sign in again.

## Finding your way around

On a computer, the dark sidebar on the left contains:

- **Working in**: picks which brand you are looking at. Choose **All brands** to see everything, or one brand to filter every page to that brand. SocialHub remembers your choice in this browser.
- **New post**: opens the composer.
- The pages: **Today's run**, **Calendar**, **Posts**, **Library**, **Brands**, and **History**.
- The **Simulation mode** note.
- Your name and the sign-out button.

On a phone-sized screen, the sidebar is replaced by a bar at the top (with **New post**) and tabs at the bottom: **Today**, **Calendar**, **Posts**, **Library**, and **More**. **More** opens the full menu, including Brands and History.

## Brands, accounts, and sets

Open **Brands** in the sidebar.

### Add a brand

1. Find the **Add a brand** card at the end of the list.
2. Type a **Name** and, optionally, **What it is** (a short description).
3. Choose **Add brand**.

You cannot rename a brand or change its description from the screen yet.

### Work in one brand

On a brand's card, choose **Work in this brand**. This does the same thing as picking the brand under **Working in** in the sidebar. The card then shows **Working here**.

### Connect a simulated account

Each brand has its own accounts. A brand can have several accounts on the same network (for example two Instagram handles).

1. On the brand's card, open **Connect a simulated account**.
2. Choose the **Network** (Facebook, Instagram, LinkedIn, or TikTok). The hint below tells you which post formats that network accepts.
3. Enter a **Name** (shown in previews) and a **Handle** (without the @).
4. Choose **Connect simulation**.

The account is marked **Simulated · connected**. Nothing is checked with the network, so any handle is accepted.

### Practise a failure

Next to a simulated account, choose **Fail next simulation**. The button changes to **Will fail next**. The next time a post runs on that account, it will record a *simulated failure*. After that one failure the switch turns itself off. Use this to see how failures and retries look.

### Disconnect an account

Choose **Disconnect** next to the account. The account stays on the card, marked **disconnected**, and you can no longer pick it in the composer. A scheduled post that still uses it will fail when it comes due, with the message that the account is disconnected. There is no **Reconnect** button yet. Connect a new account instead.

### Sets

A **set** is a simple folder for a brand's posts, such as "Showroom" or "Follow-ups". To add one, type a name in **Name a new set** and choose **Add set**. You choose a post's set in the composer. Sets cannot be renamed or deleted from the screen yet.

### Delete a brand

Choose **Delete brand** at the bottom of the card and confirm. **This permanently deletes the brand's accounts, sets, files, posts, and history.** It cannot be undone. Nothing on any network is affected, because nothing was ever sent.

## The library (your files)

Open **Library**. It shows the files for the brand chosen under **Working in**, or for every brand.

### Add a file

1. Pick the **Brand** the file belongs to.
2. Choose the **File**. Accepted types are JPEG, PNG, WebP, and GIF images, and MP4, WebM, and QuickTime (MOV) videos, up to 200 MB.
3. Optionally write a **Description** of what is in the file. It is used as the image's text alternative for screen readers.
4. Choose **Add file**.

A file belongs to one brand. You can only use it in that brand's posts.

### Delete a file

Choose the bin button on a file and confirm. If any post still uses the file, SocialHub refuses and asks you to remove it from those posts first.

The sample files marked **Sample** are generated colour swatches, not photographs.

## Writing a post

Choose **New post** (sidebar, top bar, or the Posts page). The composer has the form on the left and previews on the right.

1. **Brand**: choose the brand. This decides which files and accounts you can use. You cannot change the brand after the post is saved.
2. **Set** (optional): file the post in one of the brand's sets.
3. **Name**: a working title that only you see, up to 140 characters.
4. **Format**: Text, Image, Carousel, Video, or Reel. See [Network rules](#network-rules-the-composer-checks).
5. **Caption**: the text of the post. The counter shows the caption length against the strictest limit among the accounts you chose.
6. **Files**: tick the files to include. The small number on each tile is the order the files will appear in. To change the order, untick the files and tick them again in the order you want.
7. **Accounts**: tick each account the post should go to. An account is greyed out if it is disconnected or if its network does not accept the chosen format.

As you work, the **Previews** column shows one frame per chosen account, drawn like that network (square for Instagram, a tall frame for videos and Reels). Carousels have arrows to step through the files. Any problems appear above the run bar, starting with the network name, for example "Instagram: An image post needs exactly one image." The schedule and run buttons stay disabled until you fix them.

To keep the post without running it, choose **Save draft**. You see "Draft saved. Nothing was sent." The draft appears under **Posts → Drafts**.

## Scheduling a post

1. Write the post as above and make sure there are no problems listed.
2. In **Slot**, choose a date and time. Use your own local time. The time must be at least a minute from now.
3. Choose **Schedule simulation**.

You see "Scheduled as a simulation. Nothing has been sent." The post now shows **Scheduled** and appears on the calendar and on Today's run.

## Running a simulation now

To try a post straight away, choose **Run simulation** (the primary button). SocialHub saves the post, simulates each account immediately, and shows the result for each one, for example "Simulated success. Nothing was sent to Facebook." The **Attempts** list under the previews records each try.

## What happens when a scheduled post comes due

You do not need to keep SocialHub open. While the SocialHub server is running, it checks for due posts. When a post's slot arrives:

1. The post changes to **Sending** for a moment.
2. For each chosen account, SocialHub checks the account is still connected and that the post still meets the network's rules.
3. It records a simulated result for each account and adds a line to **History**.
4. The post ends in one of these states:
   - **Simulated success**: every account succeeded in simulation.
   - **Simulated failure**: every account failed.
   - **Simulated, incomplete**: some accounts succeeded and some failed.

A post usually runs at its slot time. If the background queue is unavailable, a backup check that runs every 20 seconds picks it up instead, so it can run up to about 20 seconds late. If the server was switched off at the slot time, the post runs shortly after the server starts again.

## Failures and retries

A failure can happen because you used **Fail next simulation**, the account was disconnected, or the post no longer meets a network's rules. Failures are easy to find:

- **Today's run** lists them under **Needs a retry**.
- **Posts → Failed** and **Posts → Partial** list them.
- **History** shows the reason in **What happened**.

To retry, choose **Retry** on Today's run, or open the post and choose **Retry simulation**. Only the accounts that failed are tried again. Accounts that already succeeded are left alone.

## Editing, duplicating, and cancelling

- **Edit a draft or a scheduled post**: open it from Posts, the calendar, or Today's run, make changes, and choose **Save draft**. A scheduled post stays scheduled at the same time after you save. It is checked again, so the save fails if your changes break a network rule.
- **Move a scheduled post**: change **Slot** and choose **Schedule simulation** again.
- **Cancel a scheduled post**: open it and choose **Cancel slot**. It becomes **Cancelled** and will not run. If you edit and save a cancelled post, it goes back to being a draft.
- **Duplicate**: open any post and choose **Duplicate**. A copy named "… copy" is created as a draft, with the same caption, files, and accounts.
- **Finished posts** (simulated success or incomplete) are locked. To post something similar again, duplicate it.
- **Failed posts**: you can change the caption, format, and files and then retry. **Changing the accounts on a failed post is not saved** (see [Limitations](#limitations-and-features-not-available-yet)). Duplicate the post if you need different accounts.

You cannot delete a post from the screen yet.

## Today's run (the dashboard)

**Today's run** answers "what is next, and what needs me?" It respects the **Working in** brand choice.

- The heading line shows today's date and one sentence about the most important thing, such as "1 simulation failed and is still waiting." or "Next slot is …".
- Four counters, each of which opens the related list:
  - **Scheduled**: posts waiting for their slot.
  - **Failed**: posts that need a retry.
  - **Simulated**: posts simulated successfully this week.
  - **Slots this week**: everything dated this week, whatever the result.
- The **next post card** (the beige slip) shows the next scheduled post: date and time, title, caption, brand, accounts, its status stamp, and the first file. **Open post** opens it in the composer.
- **Slots this week** is a chart with one bar per day, Monday to Sunday, with failed posts shown in red.
- **After the next slot** lists the following scheduled posts.
- **Needs a retry** lists failed posts with a **Retry** button.
- **Simulated recently** lists the latest finished simulations.

## The calendar

Open **Calendar**. Use the arrows to move back and forward, **Today** to jump back, and **Day**, **Week**, or **Month** to change the view. The calendar respects the **Working in** brand choice.

- **Week** shows seven columns with a card per post: time, title, networks, brand, and status. Choose a day's heading to open that day.
- **Month** shows the whole month. Today is circled. If a day has many posts, choose **N more** to open the day view.
- **Day** shows that day's posts as a timeline.

Select any post to open it. Posts are placed on their scheduled time, or on the time they were simulated. Drafts without a slot do not appear on the calendar. You cannot drag posts to new times yet. Open the post and change **Slot** instead.

## The posts list

Open **Posts** to see every post, newest change first, with a thumbnail, brand, networks, format, date, and status. Use the tabs to filter: **All**, **Drafts**, **Scheduled**, **Succeeded**, **Failed**, **Partial**, and **Cancelled**. Choose a title to open it.

## History

Open **History** to see every attempt, newest first. Each row shows when it ran, the post and brand, the network, the result (**Simulated success** or **Simulated failure**), and **What happened**: the full sentence, plus the simulated reference (`sim_…`). History is a record. It cannot be edited.

## The phone app

There is also an early phone app built with Expo. It is simpler than the web desk:

- Tabs: **Today**, **Calendar** (a list for day, week, or month), **Posts**, **Library**, and **More** (Brands and History).
- In the phone composer you can pick a brand, name, caption, format, and accounts, and then **Run simulation**. You cannot pick files, choose a set, save a draft separately, or schedule from the phone.
- In Library you can **Add from this phone** (an image or video from the phone's gallery).
- In Brands you can connect simulated accounts.
- You have to sign in every time the app restarts, and there is no sign-out button.

The phone app is an early companion. It has not been tested on real devices (see [Project status](PROJECT_STATUS.md)). Use the web desk for day-to-day work.

## What each status means

| Status you see | Meaning |
| --- | --- |
| Draft | Saved, not scheduled. Nothing will happen until you schedule or run it. |
| Scheduled | Waiting for its slot. It will be simulated, not sent. |
| Queued / Sending | Being simulated right now. You cannot edit it for those few moments. |
| Simulated success | Every account succeeded in simulation. Nothing was sent. |
| Simulated failure | Every account failed in simulation. Retry when ready. |
| Simulated, incomplete | Some accounts succeeded and some failed. A retry only tries the failed ones. |
| Cancelled | A scheduled slot you cancelled. It will not run. |
| Published | Reserved for a real post confirmed by a network. Not possible today. |

## Network rules the composer checks

SocialHub checks these planning rules before a post can be scheduled or run. They come from each network's public documentation and may change over time.

| | Facebook | Instagram | LinkedIn | TikTok |
| --- | --- | --- | --- | --- |
| Formats | Text, image, carousel, video, Reel | Image, carousel, video, Reel | Text, image, carousel (images only), video | Carousel (photo post, images only), video |
| Caption limit | 63,206 characters | 2,200 characters, up to 30 hashtags | 3,000 characters | 2,200 characters |
| Carousel files | 2 to 10 | 2 to 10 | 2 to 20 | 2 to 35 |
| Image types | JPEG, PNG, WebP | JPEG, PNG | JPEG, PNG, GIF | JPEG, WebP |
| Video types | MP4, MOV | MP4, MOV | MP4 | MP4, WebM, MOV |

Rules for every network:

- A **text** post needs a caption and cannot have files.
- An **image** post needs exactly one image.
- A **video** or **Reel** needs exactly one video.

SocialHub does not check image sizes, aspect ratios, or video length.

## Limitations and features not available yet

Not available at all:

- **Real publishing** to Facebook, Instagram, LinkedIn, or TikTok. Every connection and result is simulated.
- **Real account login** with the networks. Any handle is accepted.
- **Analytics**: likes, comments, reach, and followers.
- **Several users**, teams, client access, or roles.
- **Password change** or password reset.
- **Ads** or paid promotion. These are out of scope by design.

Not available on the screen yet (the server partly supports some of them):

- Deleting a post.
- Renaming a brand or editing its description.
- Renaming or deleting a set, or filtering posts by set.
- Reconnecting a disconnected account.
- Dragging posts on the calendar.
- Reordering files in a post other than by unticking and re-ticking them.
- Editing a file's description after upload.

Known problems:

- On a **failed** post, changing the accounts and saving keeps the old accounts. Duplicate the post instead.
- The bin button in the library says posts "will lose this file", but SocialHub actually refuses to delete a file that is still used in a post.
- The weekly chart and counters on Today's run follow the server's clock. If the server runs in a different time zone from you, posts near midnight can appear on the neighbouring day.
