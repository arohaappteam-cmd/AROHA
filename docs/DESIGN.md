# Design system

## The colour rule

**The interface is black and white. Colour belongs to elements.**

| Black, white and grays | Colour |
| --- | --- |
| Backgrounds, cards, panels, sidebar | Icons (nav, life areas, catalogue symbols) |
| Text, headings, links | Badges and chips (plan tier, status, proof tier) |
| Buttons, inputs, borders, focus rings | XP (gold) and progress / "done" (jade) |
| Logo, hover and active states | Avatar colour chosen by the user |

Element colours use the **light tints (300–400)** that read on the dark
background — e.g. `text-sky-300`, `text-rose-400` — never saturated
backgrounds. A coloured *chip* may use its hue at ~10–15% opacity behind
coloured text (`bg-amber-500/12 text-amber-300`); a whole *panel* never gets
a hue (`bg-muted/40` instead).

The app ships in dark mode only (`<html class="dark">`).

## Tokens (`src/app/globals.css`)

| Token | Dark value | Use |
| --- | --- | --- |
| `--background` / `--card` / `--popover` | near-black grays | Surfaces |
| `--foreground` / `--muted-foreground` | white / gray | Text |
| `--primary` | white | Buttons, active marks, logo tile |
| `--border`, `--input`, `--ring` | translucent white / gray | Lines and focus |
| `--success` | jade | Progress, completion, heatmaps |
| `--xp` | gold | XP numbers and icons |
| `--destructive` | red | Errors, delete |

Green-family Tailwind classes (`green`, `emerald`, `teal`) are remapped to
the same jade, so every "done" state matches. Other hues keep Tailwind's
real colours for elements.

## Icons, not emojis

Catalogues and stored rows name their symbol with an emoji (skill trees,
achievements, challenges, life areas, moods…). The UI never shows the emoji:

```tsx
import { Glyph } from "@/components/common/glyph";

<Glyph emoji={tree.emoji} />           // coloured icon, sized to the text (1em)
<Glyph emoji={tree.emoji} plain />     // inherits the text colour
```

`src/components/common/glyph.tsx` maps each emoji to a
[lucide](https://lucide.dev/icons) icon and a tone. To add a symbol, add a
line to its map (unknown emojis fall back to a sparkle). Stored data never
needs a migration.

Feature icons elsewhere use lucide directly (`import { MapIcon } from
"lucide-react"`).

## Logo and app icons

- The mark — a summit with a waypoint and a spark — is drawn in
  `src/app/icon.svg` and `BrandMark` (`src/components/shell/brand.tsx`):
  white tile, black mark.
- `node scripts/brand/generate-icons.mjs` renders `favicon.ico`, the Apple
  touch icon, PWA icons and the link-preview image from `icon.svg`.

## Navigation

- `src/config/navigation.ts` is the single list: groups (Today, Grow,
  Progress, Explore), icon, icon tone, and plan badge per destination.
- Desktop: grouped sidebar; only the link list scrolls. A small spinner
  confirms a click while the next page streams in (`useLinkStatus`).
- Phone: bottom tab bar (Home, Goals, Journey, Community) + **More**, which
  opens the full list, Plans and sign-out.
- Every top-level route has a `loading.tsx` skeleton, so taps respond
  instantly.

## Components

- shadcn/ui primitives in `src/components/ui/` (Base UI under the hood).
- `PageHeader`, `EmptyState`, `PageSkeleton` in `src/components/common/`.
- Plans: `PlanBadge`, `LockedFeature`, `UpgradeNotice`.
- Hero panels use the `hud-panel` / `hud-grid` classes for the quiet
  game-like frame.

## Tone

From the spec (§57): modern, clean, slightly game-like, motivating, never
childish or corporate. Copy is honest and never punitive — limits explain
what to do next, missed days are never "failures".
