---
name: SocialHub
description: A publishing desk for several brands, with a dark ink rail, a cool paper sheet, and one manila due slip for the next slot.
colors:
  accent: "#0e6e7a"
  accent-strong: "#0b5a64"
  accent-soft: "#e3f2f4"
  accent-track: "#c5e3e8"
  accent-ink: "#083e48"
  rail: "#0f2b31"
  rail-raised: "#163840"
  rail-text: "#e3eef0"
  rail-muted: "#9dbcc2"
  rail-accent: "#6fd0db"
  manila: "#f6ead2"
  manila-edge: "#e4d1a8"
  manila-ink: "#6a4710"
  manila-dot: "#b9822a"
  ground: "#f4f6f7"
  surface: "#ffffff"
  sunken: "#f0f3f4"
  raised: "#e8edef"
  border: "#e2e8ea"
  border-strong: "#d3dcdf"
  control-border: "#7f9096"
  text: "#13222a"
  muted: "#46585f"
  subtle: "#5f7178"
  positive: "#1d8a57"
  positive-soft: "#e5f6ee"
  positive-ink: "#0d4a2e"
  negative: "#c8303e"
  negative-soft: "#fdecec"
  negative-edge: "#efc7cb"
  negative-ink: "#7a1620"
  warning: "#c77d16"
  warning-soft: "#fbf1df"
  warning-ink: "#6b3a06"
  network-facebook: "#1462c8"
  network-instagram: "#b02a76"
  network-linkedin: "#0a5cad"
  network-tiktok: "#111111"
typography:
  display:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.03em"
  figure:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  slip-title:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.45
rounded:
  xs: "4px"
  control: "6px"
  card: "10px"
  pill: "999px"
spacing:
  gap: "24px"
  panel: "20px"
  row: "12px"
  sidebar: "248px"
  side-rail: "360px"
  control-height: "36px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "20px"
  due-slip:
    backgroundColor: "{colors.manila}"
    textColor: "{colors.text}"
    rounded: "{rounded.card}"
    padding: "20px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "36px"
  badge:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  rail:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-text}"
    width: "248px"
---

## Overview

**Creative North Star: "The library desk."**

SocialHub is a working desk for one person running several brands. The shell is a dark ink rail on the left and a cool paper sheet on the right. One warm object sits on the sheet: the next slot, drawn as a manila library due-date slip with a date block, a stamp, and the file it will carry. Everything else is quiet white panels with hairline borders, so the slip and the status colours do the talking.

The direction came from the installed design skills. UI UX Pro Max matched a Minimalism and Swiss style for a dense SaaS dashboard. Taste dealt an accent-ladder working screen. Impeccable's operate mode asked for a committed shell palette and one signature move, and the due slip is that move. The Krehel better-* skills set the interaction values: press scale, hover gating, named transitions, image hairlines, and spacing-based grouping.

Publishing copy is part of the visual system. A simulation says "Simulated success" or "Simulated failure" and that nothing was sent. The word Published is reserved for a live provider that has confirmed a post.

**Key Characteristics:**

- Dark ink rail with the brand switcher, navigation, simulation note, and user row
- Cool paper ground with flat white panels and 1px hairlines
- One manila due slip for the next slot
- Status as a pill with a dot and a word, never colour alone
- Network marks drawn as icons in their own tint, not as text labels
- Thumbnails on every post row, so a list reads like a content queue
- A bottom tab bar on phones

## Colors

### Shell

- **Rail** (`#0f2b31`): the sidebar and the login side panel. Rail text (`#e3eef0`) is 12.59:1 on it. Rail muted (`#9dbcc2`) is 7.38:1.
- **Rail raised** (`#163840`): the brand switcher and the "All brands" mark.
- **Rail accent** (`#6fd0db`): the New post button in the rail, with rail ink as its label (8.31:1).

### Accent

- **Accent** (`#0e6e7a`): primary buttons, focus rings, today markers, selected tiles, chart bars. White on it is 5.95:1.
- **Accent soft** (`#e3f2f4`) with **accent ink** (`#083e48`): the simulated badge and notices, 10.19:1.
- **Accent track** (`#c5e3e8`): focus halos and selected-tile rings.

### Neutral

- **Ground** (`#f4f6f7`): the page.
- **Surface** (`#ffffff`): panels, inputs, cards.
- **Sunken** (`#f0f3f4`): table headers, empty thumbs, segmented control tracks, skeletons.
- **Border** (`#e2e8ea`) and **border strong** (`#d3dcdf`): panel hairlines and dashed "add" cards.
- **Control border** (`#7f9096`): input strokes, 3.32:1 on white, above the 3:1 floor for interface components.
- **Text** (`#13222a`, 16.28:1 on white), **muted** (`#46585f`, 7.44:1), **subtle** (`#5f7178`, 5.10:1 on white and 4.70:1 on ground).

### Manila

Manila (`#f6ead2`, edge `#e4d1a8`) is the due slip and the Scheduled status. Manila ink (`#6a4710`) is 6.99:1 on it. Manila dot (`#b9822a`) marks scheduled items.

### Status

Every status is a pill with a dot and a word.

| Status | Surface | Ink | Dot |
| --- | --- | --- | --- |
| Draft | sunken | muted | `#8a9aa0` |
| Scheduled | manila | manila ink | manila dot |
| Simulated success | accent soft | accent ink | accent |
| Published (live only) | `#e5f6ee` | `#0d4a2e` | `#1d8a57` |
| Failed | `#fdecec` | `#7a1620` | `#c8303e` |
| Partial | `#fbf1df` | `#6b3a06` | `#c77d16` |

### Networks

Network marks use the network's own hue on a pale tint of it: Facebook `#1462c8` on `#e8f1fe` (5.11:1), Instagram `#b02a76` on `#fbe9f3` (5.25:1), LinkedIn `#0a5cad` on `#e6f0fa`, and TikTok `#111111` on `#e9ecee`. These hues appear only inside the network marks.

### Brand avatars

Each brand gets one of six muted hues (teal, amber, plum, moss, slate, rust), chosen from a hash of its name, so a brand keeps the same colour on every screen.

**The Quiet Sheet Rule.** Panels stay white with hairlines. Colour belongs to status, networks, brand avatars, and the one manila slip.

## Typography

**Font:** DM Sans, with Segoe UI then sans-serif. The files are self-hosted from `@fontsource/dm-sans` at weights 400, 500, 600, and 700. Counts, times, and dates use tabular figures.

### Scale

- **Display** (600, 40px): the day number in the due slip's date block, 32px on phones.
- **Figure** (600, 28px): KPI counts and the week total.
- **Title** (600, 24px, -0.02em): page headings.
- **Slip title** (600, 20px): the due slip's post title.
- **Headline** (600, 16px): panel headings. Brand card names are 18px.
- **Body** (400, 14px, line-height 1.5): sentences and table cells.
- **Small** (500, 13px): row titles, event titles, button labels in dense bars.
- **Label** (500, 12px): field labels, meta lines, badges, and tab bar labels.

Interface text is never set below 12px. The one exception is the two-letter initials inside the 20px brand avatar, which are 10px glyphs on a coloured tile.

**The Sentence Rule.** Status, empty states, and errors are full sentences. Headers are not uppercase and not tracked out. There is no eyebrow or kicker above a heading.

## Layout

- **Desktop shell:** a 248px rail and a fluid canvas, capped at 1360px, with 24px padding and gaps.
- **Today's run:** a page head with the date and the finding sentence, four KPI links, then a main column (the due slip, the week chart, "After the next slot") beside a 360px rail ("Needs a retry", "Simulated recently").
- **Calendar:** a toolbar with icon arrows, Today, and the range title on the left and a Day, Week, Month segmented switch on the right. Week view is a bordered seven-column board. Month view is a hairline grid.
- **Composer:** a form column and a sticky preview column. A sticky run bar holds the slot and every action.
- **Lists:** tables sit in a flush panel with a sunken header row.

### Breakpoints

- **≤1180px:** the KPIs drop to two columns, the dashboard to one column, and the composer preview to 340px.
- **≤960px:** a 56px top bar with the mark, the scoped brand, and New post. A bottom tab bar holds Today, Calendar, Posts, Library, and More. More opens the full rail as a sheet, with the main column `inert`. The week view scrolls sideways with snap points. The composer run bar stops being sticky and sits at the end of the form. Controls grow to 40px, and to 44px on coarse pointers.
- **≤640px:** compact KPIs, a 76px date column in the slip, month events as coloured dots, three-up file pickers, and tables that scroll inside their panel at a 640px minimum width.

## Elevation & Depth

Panels are flat. Depth comes from the dark rail, the white sheet, the ground, and the manila slip. One shadow token exists:

- **Float** (`0 8px 24px -6px rgb(15 43 49 / 0.18), 0 2px 6px rgb(15 43 49 / 0.08)`): the sticky run bar, the skip link, and other overlays.

Focus rings, selected tiles, and the active brand card use a ring (`0 0 0 2px` or `3px` of accent track, or `1px` of accent), not a drop shadow. Images use a 1px inset hairline (`oklch(0 0 0 / 0.1)`) so a pale swatch stays visible on white.

## Motion

- **Press:** buttons scale to 0.96 over 150ms, ease-out.
- **State changes:** transitions name their properties (`background-color`, `border-color`, `color`, `transform`) and run 150ms ease-out. Layout is never animated.
- **Hover:** gated behind `@media (hover: hover)` so touch devices do not get sticky hovers.
- **Skeletons:** loading rows pulse in opacity between 1 and 0.45.
- **Reduced motion:** press scaling and the skeleton pulse switch off.

## Shapes

- **Cards, panels, the due slip, preview frames:** 10px.
- **Controls, notices, the stamp:** 6px.
- **Small marks (network icons, swatches):** 4px or 5px.
- **Pills (badges, counts, tabs, position indicators):** 999px.

## Components

### Rail

Top to bottom: the pocket mark and "Personal desk", a "Working in" brand switcher (a styled select with the brand avatar and a chevron), a full-width New post button, six navigation rows with 18px icons, a simulation note with a pulse dot, and a user row with a sign-out icon button. The active row is a 10% white wash with white text.

### Buttons

- **Primary:** accent fill, white label. One per view, for the next action.
- **Secondary:** white, control-border stroke.
- **Ghost and icon buttons:** no fill at rest. Icon-only buttons carry a screen-reader label.
- **Danger:** negative ink with no fill at rest and a negative-soft wash on hover. Deleting a brand or a file asks for confirmation first.
- **Focus:** a 2px accent outline at 2px offset on `:focus-visible`.
- Publishing actions are named Run simulation, Schedule simulation, or Try live publish. They do not say Publish when the provider is simulated.

### KPI links

Four white cards with a status dot, a label, a 28px figure, and a meta sentence. Each one links to the filtered list behind it. On hover, the border turns accent.

### Due slip (signature)

A horizontal manila slip. On the left is a white date block with the weekday, the 40px day, the month, and a time pill. In the middle are the title, a two-line caption, the brand chip, the networks, and the stamp: a bordered label whose word is the status and whose second line says whether anything was sent. On the right is the first media thumbnail with a file count. With no slot, it becomes a dashed empty slip with a "Schedule a post" button. There is one slip per screen.

### Week chart

Each day's bar shows its count above it, and today's column is highlighted. A failed share is drawn as a red segment at the base of the bar and named in the legend sentence. A screen-reader table carries the same numbers.

### Status badge, network marks, brand chips

- **Badge:** a pill with a dot and a word, using the status table above.
- **Network mark:** a 20px tinted tile with the network glyph (lucide for Facebook, Instagram, and LinkedIn, and an authored stroke SVG for TikTok). When a post targets several accounts, the marks sit in a row 4px apart.
- **Brand chip:** the avatar and the brand name in 12px.

### Calendar events

Week events are tinted cards in the status tone, showing time, title, networks, brand, and status. Month events are compact chips with a dot, a time, and a title, and a "N more" button opens the day view. On phones, month events collapse to dots.

### Composer

- **Format:** a row of radio chips.
- **Caption:** a counter checked against the tightest limit among the selected accounts.
- **Files:** a grid of thumbnail tiles with a checkbox and an order number.
- **Accounts:** a grid of tiles with the network mark, the handle, and the reason a tile is disabled.
- **Issues:** a list with icons, in sentences.
- **Run bar:** the slot input and the actions, with a note that a simulation does not send the post.

### Previews

Each selected account gets a frame drawn like that network's own post. A strip at the top says "Preview only. Not sent to {network}." Below it are the author row with the avatar, name, and handle, then a stage whose aspect ratio matches the network (square for Instagram, 4:3 for Facebook and LinkedIn, 9:16 for tall formats). The stage has arrow buttons, a position pill, and dots, followed by the network's action icons, the caption, and a limit bar.

### Inputs

White fields with a control-border stroke, 6px radius, 36px height, and 14px text. On touch devices they grow to 44px with 16px text, so iOS does not zoom on focus. On focus, the border turns accent and gains a 3px accent-track halo. Errors are sentences in negative ink.

### Empty, loading, and error states

- **Empty:** an icon, a title, a sentence, and the next action.
- **Loading:** skeleton rows with `aria-busy`, so an empty state never flashes before the data arrives.
- **Error:** a negative notice with `role="alert"`.

### Login

A split layout. On the left, a rail-coloured panel holds a tilted sample due slip and one line of copy. On the right is the form with a full-width primary button. On phones the panel is hidden and the mark is shown above the form.

## Do's and Don'ts

### Do

- **Do** keep manila for the due slip and the Scheduled status.
- **Do** show every status as a dot and a word in a pill.
- **Do** use network marks and brand avatars to make rows scannable.
- **Do** say "Simulated success" or "Simulated failure" and that nothing was sent.
- **Do** keep panels white and flat, with hairline borders.
- **Do** give every list a skeleton, an empty state with an action, and an error notice.
- **Do** gate hover styles behind `(hover: hover)` and name transitioned properties.

### Don't

- **Don't** label a simulation as Published, or write "Published to Facebook", "Posted to Instagram", or "Live on TikTok".
- **Don't** put a kicker or eyebrow above a heading.
- **Don't** use emoji or unicode glyphs as icons, gradient fills, gradient text, or glass cards.
- **Don't** put a drop shadow on a resting panel. Shadows are for overlays and sticky bars.
- **Don't** use a border-left accent stripe thicker than 1px.
- **Don't** set interface text below 12px, or a page title above 24px.
- **Don't** nest a card inside a card.
