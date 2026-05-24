---
version: alpha
name: Idea Garden
description: >
  A friendly, whimsical garden-themed design system for a single-user web app
  where ideas are planted as seeds and grown through "watering" updates. Visual
  language is earthy, soft, and rewarding — never enterprise-flat.
colors:
  primary: "#4F8C3A"
  primary-hover: "#3F7330"
  primary-soft: "#E7F3DD"
  secondary: "#8C6A3F"
  tertiary: "#C97B3F"
  neutral: "#F6F4EC"
  surface: "#FFFFFF"
  on-surface: "#2A2E26"
  on-surface-muted: "#6B7166"
  border: "#E4E2D6"
  star: "#E2B53C"
  wilted: "#B5703A"
  success: "#4F8C3A"
  error: "#B0463C"
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.35
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.02em
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: 0.01em
spacing:
  base: 16px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  card-padding: 16px
  grid-gutter: 20px
  card-min-width: 220px
rounded:
  none: 0px
  sm: 6px
  md: 10px
  lg: 14px
  xl: 20px
  full: 9999px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: 10px 16px
    typography: "{typography.label-md}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 10px 14px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.card-padding}"
  card-hover:
    backgroundColor: "{colors.surface}"
  chip-filter:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-muted}"
    rounded: "{rounded.full}"
    padding: 6px 12px
    typography: "{typography.label-md}"
  chip-filter-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-hover}"
  input-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    padding: 10px 12px
    typography: "{typography.body-md}"
  sidebar-item:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface-muted}"
    rounded: "{rounded.md}"
    padding: 8px 12px
    typography: "{typography.body-md}"
  sidebar-item-active:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-hover}"
  badge-stage:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-hover}"
    rounded: "{rounded.full}"
    padding: 2px 8px
    typography: "{typography.caption}"
  badge-wilted:
    backgroundColor: "#F4E5D6"
    textColor: "{colors.wilted}"
    rounded: "{rounded.full}"
    padding: 2px 8px
    typography: "{typography.caption}"
---

# Idea Garden Design System

This document is the visual source of truth for the Idea Garden app. It pairs
the prose rationale below with the machine-readable tokens above. When the
mockup ([ui_mockup.png](ui_mockup.png)) and this document disagree, this
document wins; when this document and the constitution disagree, the
constitution wins.

## Overview

Idea Garden is a playful, single-user web app where every idea is a plant.
The visual language has to make a CRUD app feel like tending a garden:
warm, soft, and quietly rewarding. The aesthetic is **friendly-whimsical
without being childish** — think "indie productivity tool that loves its
user," not "kids' app."

- **Tone:** earthy, calm, a little whimsical. Lush greens, warm off-whites,
  generous rounding.
- **Mood:** rewarding and forgiving. Watering an idea should feel good;
  neglecting one should feel sad, not punitive.
- **Density:** spacious. Cards breathe. Negative space is part of the art.
- **Anti-patterns:** flat enterprise blue, hard 90° corners, dense data
  tables, neon accents, dark-mode-by-default.

The product is a tiny CRUD app dressed as a garden — the delight *is* the
product, so visual restraint here means losing the point.

## Colors

The palette is rooted in a warm cream foundation, a single confident garden
green, and earthy supporting tones. There is exactly **one** accent for
primary action: the garden green. Everything else recedes.

- **Primary — Garden Green (#4F8C3A):** the single driver for primary
  actions ("Plant New Seed"), active filter chips, active sidebar items,
  stage badges, and growth-success states. Used sparingly to keep its
  signaling power.
- **Primary Soft (#E7F3DD):** the tinted backdrop for active states
  (selected sidebar item, active filter chip, stage badge). Pairs with
  primary text on top.
- **Secondary — Bark Brown (#8C6A3F):** structural earthy accent — the
  warmer counterpart to green. Reserved for plant-related metadata
  illustrations and decorative emphasis, not for actions.
- **Tertiary — Terracotta (#C97B3F):** secondary highlight for
  alerts that aren't errors (e.g., "your garden has been quiet").
- **Neutral — Cream (#F6F4EC):** the page background. Warm off-white,
  never pure white. This is what makes the app feel like a garden journal
  instead of a SaaS dashboard.
- **Surface — White (#FFFFFF):** card and modal backgrounds. The contrast
  with cream is what creates depth (see *Elevation*).
- **On-surface — Ink (#2A2E26):** primary text. Slightly green-tinted near-
  black, never pure #000.
- **On-surface Muted (#6B7166):** secondary text — descriptions,
  timestamps, captions, sidebar inactive items.
- **Border (#E4E2D6):** the only border color. Hairline, warm-toned.
- **Star (#E2B53C):** the favorite-star color. Used only on filled stars.
- **Wilted (#B5703A):** the "wilted" badge text and any neglected-state
  iconography. Warm, not red — a wilted plant is sad, not broken.
- **Error (#B0463C):** form validation, server error toasts. Distinct from
  wilted so the two cannot be confused.

> **Color allocation rule:** roughly 70% neutral/surface, 20% on-surface
> ink, 10% primary green. If a screen has more than ~10% green coverage,
> the primary action stops feeling primary.

## Typography

A single typeface — **Inter** — across the entire app. Hierarchy is
expressed through size and weight, not through font mixing. This is a
deliberate constraint: the visual richness lives in the plant art and the
animation, not in the type.

- **Headlines (600):** the page title ("My Garden"), modal titles, and
  section labels in the sidebar. Confident but not loud.
- **Body (400):** card descriptions, modal copy, the "Today's Focus"
  paragraph in the sidebar. Optimized for short-form reading.
- **Labels (500):** filter chips, button text, sidebar items, stage
  badges. Slightly tighter line-height; small caps spacing for legibility
  at small sizes.
- **Captions (400):** "Watered 3d ago," "Level 7" indicators, helper
  text. Sits one tier below body, always paired with muted color.

`headline-lg` is reserved for the main page title only; one per screen.
Cards use `headline-sm` for their title to avoid competing with the page
title.

## Layout

A **two-column layout** anchors every primary screen: a fixed-width sidebar
on the left (~240px) and a fluid main content area on the right with a
max-width around 1280px. Within the main area, ideas live in a
**responsive auto-fit grid** of cards.

- **Grid:** CSS `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))`,
  with a 20px gutter (`spacing.grid-gutter`). Cards stretch to fill the row;
  there is no manual breakpoint juggling.
- **Card composition (top to bottom):** plant illustration block (square,
  centered), full title, 2-line truncated description with ellipsis, a
  metadata row containing the stage indicator ("Level 7") and the relative
  timestamp ("Watered 3d ago"). Optional favorite star pinned to the
  top-right.
- **Sidebar composition:** "My Garden" header, vertical nav list (All
  Ideas / Growing / Wilted / Just Seeds / Favorites), then a "Today's
  Focus" tip card at the bottom. The active nav item gets the
  `sidebar-item-active` treatment.
- **Top bar:** logo (left), search input (center, fluid), filter chip
  group, primary "Plant New Seed" button (far right). The primary button
  is the only green element in the top bar.
- **Spacing rhythm:** an 8px scale (`xs:4 / sm:8 / md:16 / lg:24 / xl:32 / 2xl:48`).
  Card internal padding is 16px; section spacing is 32px; page outer margin is
  32px on desktop. No magic numbers — everything snaps to the scale.

## Elevation & Depth

Depth comes from **tonal layering**, not from heavy shadows. The page
background is cream; cards sit on pure white; modals sit on a slightly
elevated white with a soft shadow. This keeps the interface feeling
papery and warm rather than glassy.

- **Cards:** white surface on cream background. **Hairline border**
  (`colors.border`) plus an extremely soft shadow (e.g., `0 1px 2px rgba(0,0,0,0.04)`).
  No drop shadow on hover — instead, a subtle border-color darken.
- **Modals:** white surface, `rounded.xl` corners, larger shadow
  (`0 12px 32px rgba(0,0,0,0.10)`), and a 50%-opacity neutral backdrop.
- **Sidebar:** sits flat on the cream background — no shadow, no border.
  The active item provides its own visual weight via `primary-soft`.
- **Buttons:** flat, no shadow. Hover is a darker fill, not a lift.

## Shapes

Corners are **generously rounded everywhere**. This is the single most
important shape rule: nothing in this app should have sharp 90° corners
except text itself.

- **Cards & modals:** `rounded.lg` (14px) for cards, `rounded.xl` (20px) for modals.
- **Buttons & inputs:** `rounded.md` (10px). Large enough to feel friendly,
  small enough to keep buttons feeling clickable.
- **Filter chips, badges, and the favorite-star pill:** `rounded.full`.
- **Plant artwork frames:** no clipping; plants render on a transparent
  background within the card padding. Don't crop them into a circle.

## Components

### Buttons

- **Primary** — green fill, white text, `rounded.md`, 10×16 padding.
  Used exactly once per screen for the dominant action ("Plant New Seed,"
  "Water this idea"). Hover darkens the fill to `primary-hover`.
- **Secondary** — white surface, ink text, hairline border. For
  destructive-but-not-dangerous actions (close, cancel) and any non-primary
  CTA inside modals.
- **Ghost / icon button** — transparent surface, muted icon, hover fades
  to `primary-soft`. Used for sidebar nav, search-icon, modal close (X).

### Filter chips

Chips in the top bar (All Ideas / Growing / Wilted / Seeds) are
`rounded.full` with the active state filled in `primary-soft` and text in
`primary-hover`. Inactive chips are surface-on-cream with muted text.
At most one is active at a time.

### Sidebar items

A vertical stack of `sidebar-item` rows. Active row gets `primary-soft`
fill and `primary-hover` text; the leading icon adopts the same green.
Hover on inactive rows tints the background at ~50% of the active fill.

### Cards

The atomic unit of the garden. Composition was specified under *Layout*.
Card-level interaction states:

- **Default:** white surface, hairline border, soft shadow.
- **Hover:** border darkens by one step toward `on-surface-muted`; cursor
  becomes pointer; the plant illustration may bob 1–2px (optional).
- **Wilted variant:** card itself stays white, but a `badge-wilted` chip
  is pinned in the metadata row. Card border does not change color — the
  badge is the signal.

### Stage badge

A `rounded.full` chip rendering "Level N" (1–16) using the `badge-stage`
token. At stage 16 the badge text becomes "Fully bloomed" and the chip
keeps the same styling; do not introduce a new color.

### Inputs

- Text inputs are `rounded.md`, white surface, 1px border in `colors.border`.
- Focus state: border becomes `colors.primary`, no glow ring.
- Validation errors render **inline below the field** in `colors.error`,
  never as a popup or alert.
- Search input in the top bar uses the same token but with a leading
  search icon and no visible label.

### Modals

Used for the "Plant New Seed" form and the idea-detail / watering view.
- Centered, `rounded.xl`, max-width ~560px.
- Title uses `headline-md`; body copy uses `body-md`.
- Closeable three ways (X / Escape / backdrop) — see Constitution
  Principle III.
- Primary action sits bottom-right; secondary action (cancel/close) sits
  to its left in the secondary button style.

### Empty states

Empty garden, idea-without-updates, and stage-16 ("Fully bloomed") each
get a designed state, not a blank panel. Use a centered illustration,
one line of `headline-sm`, one line of muted `body-sm`, and an optional
primary action.

## Do's and Don'ts

- **Do** use the primary green only for one dominant action per screen.
- **Don't** introduce a second accent color to "balance" the green.
- **Do** keep page background cream and card surfaces white.
- **Don't** use pure white as a page background — it kills the warmth.
- **Do** round every container generously (`rounded.md` minimum).
- **Don't** mix sharp and rounded corners in the same view.
- **Do** express depth through tonal layering and hairline borders.
- **Don't** add drop shadows on hover, gradients on buttons, or glow
  rings on focus.
- **Do** use Inter at the documented sizes; lean on weight + size for
  hierarchy.
- **Don't** introduce a second typeface, even for "personality."
- **Do** render validation errors inline beside or below the offending
  field.
- **Don't** open a modal or alert for a form error.
- **Do** treat the wilted state as melancholy, not alarming —
  `colors.wilted`, never `colors.error`.
- **Don't** conflate wilted with error states; they signal different
  things to the user.
- **Do** snap every spacing value to the 8px scale.
- **Don't** hand-tune pixel values to "make it fit" — fix the layout
  instead.
- **Do** keep plant illustrations as the visual hero of each card.
- **Don't** crop, mask, or filter the plant art; it ships at the size
  and aspect ratio the sprites were authored at.
