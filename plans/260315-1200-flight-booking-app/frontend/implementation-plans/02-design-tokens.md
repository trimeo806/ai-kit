# Design Tokens — Flight Booking App

*Derived from Skyscanner design system · light-only palette · wireframes.html*

---

## 1. Color Tokens

> **Tailwind v4 Note**: In Tailwind v4, `@theme { --color-primary: #0770E3; }` in `globals.css` auto-generates `bg-primary`, `text-primary`, `border-primary` utilities. Use these semantic classes instead of `bg-[var(--...)]` arbitrary values.

| CSS Variable (`--color-*`) | Value | Tailwind class | Usage |
|----------------------------|-------|---------------|-------|
| `--color-primary` | `#0770E3` | `bg-primary` / `text-primary` / `border-primary` | Nav bar, hero, sort bar, progress stepper |
| `--color-primary-foreground` | `#FFFFFF` | `text-primary-foreground` | Text/icons on blue sections |
| `--color-secondary` | `#F1F2F8` | `bg-secondary` / `text-secondary` | Page bg, body areas, card-on-card |
| `--color-secondary-foreground` | `#000000` | `text-secondary-foreground` | Text on light backgrounds and cards |
| `--color-border` | `#E6E6E6` | `border-border` / `bg-border` | Input borders, card borders, dividers |
| `--color-success` | `#00A698` | `text-success` / `bg-success` | Nonstop/Direct badge, success icons |
| `--color-warning` | `#FF7733` | `text-warning` / `bg-warning` | 1-stop badge text + border |
| `--color-error` | `#E20A17` | `text-error` / `border-error` | 2+ stops badge, form errors, destructive actions |
| `--color-highlight-primary` | `#FFFFFF` | `bg-highlight-primary` | Highlights on blue (primary) sections |
| `--color-highlight-primary-fg` | `#0770E3` | `text-highlight-primary-fg` | Text on white highlights within blue sections |
| `--color-highlight-secondary` | `#0770E3` | `bg-highlight-secondary` | Highlights on gray/white (secondary) sections |
| `--color-highlight-secondary-fg` | `#FFFFFF` | `text-highlight-secondary-fg` | Text on blue highlights within gray sections |
| `--color-primary-dark` | `#084EB2` | `to-primary-dark` | Gradient endpoint (hero section) |

Legacy `--bg-primary`, `--text-primary`, etc. aliases remain in `:root` and are referenced by custom utilities (`.sort-tab-active`, `.time-chip`, etc.) — they delegate to the `--color-*` vars.

**White surfaces** (`#FFFFFF`) are not a named token — use `bg-white` for card/panel/input backgrounds.

**Rule**: Text on `bg-primary` → always `text-primary-foreground` (white). Text on `bg-secondary` or white → always `text-secondary-foreground` (black).

**Highlight rule**: Elements to highlight *within* a `bg-primary` zone → use `bg-highlight-primary` / `text-highlight-primary-fg`. Elements to highlight *within* a `bg-secondary` or white zone → use `bg-highlight-secondary` / `text-highlight-secondary-fg`.

### Applied highlight examples

| Element | Zone | Tailwind class applied |
|---------|------|----------------------|
| Autocomplete selected row | white card (surface) | `combobox-item-selected` (custom utility) |
| Calendar selected date circle | white card (surface) | shadcn calendar default |
| Sort tab active indicator | `bg-primary` (blue bar) | `sort-tab-active` (custom utility) |
| Progress stepper done/active dot | `bg-primary` (blue header) | `prog-dot-done` / `prog-dot-active` (custom utility) |
| Sticky search bar text | `bg-primary` (blue header) | `text-white` |
| Error messages | any | `text-error` |
| Success icon | confirmation card | `text-success` |
| Select flight button | white card | `bg-primary hover:bg-primary/90 text-white` |
| Departure time chip (active) | white sidebar (surface) | `time-chip active` (custom utility) |

### Departure time chip labels

Chips use compact AM/PM format with full label in `title` tooltip:

| Chip label | Time range | Zustand filter value |
|-----------|-----------|---------------------|
| `6AM–12PM` | 06:00–12:00 | `"morning"` |
| `12PM–6PM` | 12:00–18:00 | `"afternoon"` |
| `6PM–12AM` | 18:00–00:00 | `"evening"` |
| `12AM–6AM` | 00:00–06:00 | `"night"` |

- Multi-select: user can activate more than one chip simultaneously
- Active chip: `time-chip active` — `bg-highlight-secondary` bg + `text-highlight-secondary` text
- Inactive chip: `time-chip` — `bg-secondary` bg + `text-secondary` text + `border` border

### CSS custom properties (Tailwind v4)

In Tailwind v4, use `@theme` for color tokens. The `--color-*` prefix causes Tailwind to auto-generate `bg-*`, `text-*`, `border-*` utilities:

```css
/* globals.css — BEFORE @layer base */
@theme {
  --color-primary: #0770E3;
  --color-primary-foreground: #FFFFFF;
  --color-secondary: #F1F2F8;
  --color-secondary-foreground: #000000;
  --color-border: #E6E6E6;
  --color-success: #00A698;
  --color-warning: #FF7733;
  --color-error: #E20A17;
  --color-highlight-primary: #FFFFFF;
  --color-highlight-primary-fg: #0770E3;
  --color-highlight-secondary: #0770E3;
  --color-highlight-secondary-fg: #FFFFFF;
  --color-primary-dark: #084EB2;
}

/* Legacy aliases in :root (for custom utilities that use var()) */
:root {
  --bg-primary:              var(--color-primary);
  --text-primary:            var(--color-primary-foreground);
  --bg-secondary:            var(--color-secondary);
  --text-secondary:          var(--color-secondary-foreground);
  --border:                  var(--color-border);
  --success:                 var(--color-success);
  --warning:                 var(--color-warning);
  --error:                   var(--color-error);
  --bg-highlight-primary:    var(--color-highlight-primary);
  --text-highlight-primary:  var(--color-highlight-primary-fg);
  --bg-highlight-secondary:  var(--color-highlight-secondary);
  --text-highlight-secondary:var(--color-highlight-secondary-fg);
  /* badge tokens unchanged */
  --badge-ok-bg:       #E8F5F4;
  --badge-ok-fg:       #00A698;
  --badge-ok-border:   #00A698;
  --badge-warn-bg:     #FFF0E8;
  --badge-warn-fg:     #FF7733;
  --badge-warn-border: #FF7733;
}
```

---

## 2. Typography Tokens

> **Note — unified base size**: 16px is the single base text size for all body copy, labels, captions, secondary text, badges, and tab labels. Visual hierarchy is achieved through **color** (`muted-foreground` for secondary roles) and **weight** (400 / 500 / 600) — not through size reduction. Never use `text-sm` (14px) or `text-xs` (12px) for UI text.

| Token name | Value | Use |
|-----------|-------|-----|
| `--font-sans` | `Inter, system-ui, sans-serif` | All body text — loaded via Google Fonts |
| `--font-mono` | `ui-monospace, monospace` | Booking reference |
| Hero heading | `40px / 700` | `text-[40px] font-bold tracking-tight` |
| Section heading | `32px / 700` | `text-[32px] font-bold tracking-tight` |
| Card title | `24px / 600` | `text-2xl font-semibold` |
| Body | `16px / 400` | `text-base` |
| Secondary | `16px / 400` | `text-base text-muted-foreground` |
| Label | `16px / 500` | `text-base font-medium text-muted-foreground` |
| Caption | `16px / 400` | `text-base text-muted-foreground` |
| Price | `24px / 700` | `text-2xl font-bold` |
| Flight time | `24px / 700` | `text-2xl font-bold` |
| Booking reference | `24px / 700 mono, letter-spacing 0.2em` | `font-mono text-2xl font-bold tracking-widest` |

---

## 3. Spacing Tokens (8px grid)

| Token | Value | Tailwind equiv | Use |
|-------|-------|---------------|-----|
| `--space-1` | `8px` | `space-2` | Icon gap, tight padding (min 8px) |
| `--space-2` | `8px` | `space-2` | Inline padding |
| `--space-3` | `16px` | `space-4` | Label-to-field gap |
| `--space-4` | `16px` | `space-4` | Card internal padding |
| `--space-5` | `24px` | `space-6` | Medium breathing room |
| `--space-6` | `24px` | `space-6` | Section padding |
| `--space-8` | `32px` | `space-8` | Modal / card header |
| `--space-10` | `48px` | `space-12` | Input / button height (h-12) |
| `--space-12` | `48px` | `space-12` | Hero top padding |
| `--space-16` | `64px` | `space-16` | Section separator |
| `--space-20` | `80px` | `space-20` | Screen-to-screen gap |

### Semantic Aliases

| Alias | Value | Use |
|-------|-------|-----|
| `--padding-xs` | `8px` | Pill, badge inner padding |
| `--padding-sm` | `16px` | Compact button, tab |
| `--padding-md` | `24px` | Card, section default |
| `--padding-lg` | `32px` | Page / hero padding |
| `--padding-xl` | `40px` | Modal / confirmation |
| `--gap-xs` | `8px` | Field group, icon |
| `--gap-sm` | `8px` | List rows, filter items |
| `--gap-md` | `16px` | Form fields |
| `--gap-lg` | `24px` | Sidebar sections |
| `--gap-xl` | `32px` | Major sections |
| `--height-input` | `48px` | Standard input height — `h-12` |
| `--height-btn` | `48px` | Primary button height — `h-12` |
| `--height-btn-sm` | `40px` | Small button height — `h-10` |

> Search inputs and the search button use a custom `56px` height override (`h-[56px]`) — larger than standard to increase tap target prominence in the hero search card.

---

## 4. Component Size Reference

| Component | Height | Width | Padding | Tailwind |
|-----------|--------|-------|---------|---------|
| Search input | `56px` | full | `16px 16px` | `h-[56px] px-4 text-base` |
| Search button | `56px` | auto | `0 32px` | `h-[56px] px-8 text-base font-semibold` |
| Primary button | `48px` | auto | `0 32px` | `h-12 px-8 text-base font-medium` |
| Small button | `40px` | auto | `0 24px` | `h-10 px-6 text-base font-medium` |
| Sort tab | `48px` | auto | `0 24px` | `h-[48px] px-6 text-base font-medium` |
| Filter sidebar | auto | `320px` | `24px` | `w-[320px] p-6` |
| Booking sidebar | auto | `360px` | `24px` | `w-[360px] p-6` |
| Search card | auto | `880px` | `24px` | `max-w-[880px] p-6` |
| Confirmation card | auto | `640px` | `24px` | `max-w-[640px] p-6` |
| Stop badge | `32px` | auto | `8px 16px` | `h-8 px-4 py-2 text-base font-semibold rounded-full` |
| Airline logo | `40px` | `40px` | — | `h-10 w-10 rounded` |
| Filter row (checkbox/radio) | `48px` min | auto | `8px 0` | `min-h-[48px] py-2` |
| Swap button | `40px` | `40px` | — | `h-10 w-10 rounded-full` |
| Progress stepper dot | `32px` | `32px` | — | `h-8 w-8 rounded-full` |
| Card content padding | — | — | `24px` | `p-6` |

---

## 5. Border Radius Tokens

| Use | Value | Tailwind |
|-----|-------|---------|
| Input | `4px` | `rounded` |
| Card | `8px` | `rounded-lg` |
| Button | `6px` | `rounded-md` |
| Badge / pill | `9999px` | `rounded-full` |
| Airline logo | `4px` | `rounded` |

---

## 6. Shadow Tokens

| Use | Value |
|-----|-------|
| Card default | `none` (border only) |
| Card hover | `0 2px 8px rgba(0,0,0,0.08)` |
| Dropdown | `0 4px 16px rgba(0,0,0,0.12)` |
| Sticky header | `0 1px 0 var(--border)` (border-b only) |

---

## 7. Animation Tokens

| Token | Value | Use |
|-------|-------|-----|
| Skeleton shimmer | `@keyframes shimmer` — bg-gradient sweep 1.5s infinite | Loading cards |
| Transition default | `150ms ease` | Hover states |
| Accordion open | `200ms ease-out` | Passenger card expand |
| Toast dismiss | `300ms ease-in` | Offer expired toast |
