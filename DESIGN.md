---
name: SocialHub
description: A personal publishing desk that marks every slot like a library due-date card.
colors:
  stamp-blue: "#0e6e7a"
  stamp-ink: "#083e48"
  stamp-soft: "#e6f3f5"
  stamp-track: "#c5e3e8"
  manila: "#f4e7cf"
  manila-edge: "#e3d3b0"
  ground: "#f4f8f9"
  surface: "#ffffff"
  raised: "#e7eef0"
  border: "#d5e0e3"
  control-border: "#6d8288"
  ink: "#142026"
  muted: "#3d5158"
  positive: "#146b43"
  positive-soft: "#e5f6ee"
  positive-ink: "#0d4a2e"
  negative: "#9d1c28"
  negative-soft: "#fdecea"
  negative-ink: "#6f1219"
  warning: "#8a4b08"
  warning-soft: "#fbf3e4"
  warning-ink: "#6b3a06"
typography:
  title:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  card: "8px"
  control: "6px"
spacing:
  gap: "24px"
  pad: "16px"
  slip: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "40px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  due-slip:
    backgroundColor: "{colors.manila}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "24px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "8px 10px"
    height: "40px"
---

## Overview

SocialHub is a working desk for one person running several brands. The screen is an open plane: a quiet sidebar, a white sheet, and one warm object. That object is the next slot, drawn as a manila library due-date card. Stamp blue (`#0e6e7a`) appears on the card's stamp, the week's bars, and the active navigation icon. It is not a theme color for whole panels.

The direction came from the installed design skills, not from a generic dashboard kit. Taste dealt an accent-ladder working screen (seed 1712768588). The face uses the sheet's option to replace the dealt raspberry with the object's own hue, here the library stamp. Impeccable's assigned world is the library due-date card. Navigation and controls stay ordinary. Sample swatches in the library are generated color fields, not photographs.

Publishing copy is part of the visual system. A simulation says "Simulated success" or "Simulated failure" and that nothing was sent. The word Published is reserved for a live provider that has confirmed a post.

## Colors

The ground is a cool paper, slightly tinted toward the stamp. White panels sit on it with a quiet border. Manila is the only warm surface, and only the next-slot card uses it.

### Primary

- **Stamp blue** (`#0e6e7a`): the stamp outline, chart bars, and the active nav icon. Contrast on white is about 5.95:1.
- **Stamp ink** (`#083e48`): text on the soft stamp wash (`#e6f3f5`), about 10.32:1.

### Neutral

- **Ground** (`#f4f8f9`): the page. Body ink on it is about 15.54:1.
- **Surface** (`#ffffff`): panels, inputs, and the primary button's label.
- **Raised** (`#e7eef0`): the count row's quiet division, not a second card color.
- **Border** (`#d5e0e3`): panel and row rules. It is intentionally quiet, about 1.35:1 on white.
- **Control border** (`#6d8288`): inputs and secondary buttons, about 4.04:1 on white.
- **Ink** (`#142026`): text and the primary button. On white, about 16.61:1.
- **Muted** (`#3d5158`): secondary sentences. On white, about 8.35:1. On manila, about 6.83:1.

### Status

Status is never color alone. The stamp also carries the words Simulated success, Simulated failure, Scheduled, or Published.

- **Positive ink** (`#0d4a2e`) on `#e5f6ee`.
- **Negative ink** (`#6f1219`) on `#fdecea`. The mark itself is `#9d1c28`.
- **Warning ink** (`#6b3a06`) on `#fbf3e4`.

**The One Hue Rule.** Charts use stamp blue only. A failed day is named in a sentence under the chart, not painted a second color inside the bars.

## Typography

**Body font:** DM Sans, with Segoe UI then sans-serif. The files are self-hosted from `@fontsource/dm-sans` at weights 400, 500, 600, and 700.

**Character:** A short working scale. Titles are 24px, not a hero. Figures match the title size and use a medium weight so the number does not shout.

### Hierarchy

- **Title** (600, 24px, line-height 1.2): the page heading and the due-slip title.
- **Headline** (600, 18px, line-height 1.3): panel headings.
- **Body** (400, 14px, line-height 1.5): sentences. The finding line stays within about 62 characters.
- **Label** (500, 12px): field names and meta lines. Nothing in the interface is set below 12px.

### Named Rules

**The Sentence Rule.** Status, empty states, and errors are full sentences. Headers are not uppercase and are not tracked out.

## Layout

The desk is a two-column shell. The sidebar is 230px. The canvas uses 24px of page padding and a 24px gap. At 1440px the content row is a flexible main column plus a 384px rail.

The count row is one divided surface, not three cards. The due slip sits first in the main stack. Below it, the week chart, then the rest of the scheduled list. The rail holds failed simulations and recent simulated results.

At 960px and below, the sidebar becomes a full-screen sheet under a 48px top bar. The main column is `inert` while that sheet is open. The desk, composer, week chart, and counts stack in one column.

## Elevation & Depth

Surfaces are flat. Depth comes from the ground, the white sheet, and the manila card. There is no resting drop shadow. Images use a 1px inset hairline (`oklch(0 0 0 / 0.1)`) so a pale swatch stays visible on white.

Press feedback is a scale to 0.96 for 150ms, ease-out, and only when the user has not asked for reduced motion. Transitions name `transform` and `background-color`. They do not animate layout.

## Shapes

Cards and panels use an 8px radius. Controls, stamps, and notices use 6px. The stamp is a bordered label, width to its words, not a filled pill. The pocket mark in the sidebar is a simple outlined card, not an icon in a tinted square.

## Components

### Buttons

- **Shape:** 6px radius, 40px minimum height, 14px horizontal padding.
- **Primary:** ink background, white label. Used for the one next action, such as New post or Sign in.
- **Secondary:** white background, control-border stroke, ink label.
- **Focus:** 2px stamp-blue outline, 2px offset, on `:focus-visible` only.
- **Disabled:** 45% opacity.
- Publishing actions are named Run simulation, Schedule simulation, or Try live publish. They do not say Publish when the provider is simulated.

### Cards / Containers

- **Panels:** white, 1px `#d5e0e3`, 8px radius, 16px padding.
- **Due slip:** manila `#f4e7cf`, edge `#e3d3b0`, 24px padding, at least 280px tall. One slip per screen.
- **Counts:** a single white row split by hairline rules.

### Inputs / Fields

- **Style:** white, 1px `#6d8288`, 6px radius, 16px text, 40px minimum height.
- **Focus:** the same 2px stamp outline as buttons.
- **Error:** negative ink, in a sentence, not color alone.

### Navigation

The sidebar lists Today's run, Calendar, Posts, Library, Brands, and History in 14px. The active row uses the soft stamp wash and stamp ink. Only the icon turns stamp blue. The persistent status line in the sidebar says simulated publishing is on. It is not an eyebrow above the page title.

On a narrow screen the same list opens from the top bar. Escape closes it.

### Due-date stamp

The stamp sits on the manila card. Its word is the status. Its second line says whether anything was sent. A scheduled simulation reads "This slot will be simulated. Nothing is sent."

## Do's and Don'ts

### Do

- **Do** keep stamp blue to the stamp, the chart, and the active icon.
- **Do** keep manila on the next-slot card only.
- **Do** say "Simulated success" or "Simulated failure" and that nothing was sent.
- **Do** use DM Sans at the sizes above, with tabular figures for counts and times.
- **Do** leave panels flat, with the quiet border `#d5e0e3`.

### Don't

- **Don't** label a simulation as Published, or write "Published to Facebook", "Posted to Instagram", or "Live on TikTok".
- **Don't** put a kicker or eyebrow above a heading.
- **Don't** use emoji as icons, gradient text, glass, or a hard offset shadow.
- **Don't** nest a card inside a card, or turn the count row into three hero metrics.
- **Don't** saturate the sidebar, put icons in tinted squares, or draw a sparkline.
- **Don't** set interface text below 12px, or a page title at 32px.
