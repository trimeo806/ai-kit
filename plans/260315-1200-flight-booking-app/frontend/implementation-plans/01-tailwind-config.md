# Tailwind CSS Configuration — Flight Booking App

*Next.js 14 App Router · shadcn/ui · Tailwind v3*

---

## Step 1 — Install dependencies

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

If starting from a fresh Next.js scaffold:

```bash
npx create-next-app@latest flight-app \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"
```

---

## Step 2 — Install shadcn/ui

```bash
npx shadcn-ui@latest init
```

Answers for the init prompt:

| Question | Answer |
|----------|--------|
| Style | Default |
| Base color | **Zinc** |
| CSS variables | **Yes** |
| `tailwind.config.ts` location | `tailwind.config.ts` |
| `globals.css` location | `src/app/globals.css` |
| Component alias | `@/components` |
| Utils alias | `@/lib/utils` |

---

## Step 3 — `tailwind.config.ts`

Colors are now handled via `@theme` in `globals.css` (Tailwind v4 approach).
Remove the old `colors` object from `extend` — it caused double-prefix utilities like `bg-bg-primary`.
The `@theme { --color-primary: #0770E3; }` block in globals.css auto-generates `bg-primary`, `text-primary`, `border-primary` utilities.

```ts
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],                             // shadcn dark mode via class
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      // Colors are handled via @theme in globals.css (Tailwind v4)
      // @theme { --color-primary, --color-secondary, etc. } auto-generates
      // bg-primary, text-primary, border-primary utilities — no config needed here

      // ── Border radius ─────────────────────────────────
      borderRadius: {
        lg:  "var(--radius)",         // 8px — cards
        md:  "calc(var(--radius) - 2px)",  // 6px — buttons
        sm:  "calc(var(--radius) - 4px)",  // 4px — inputs
        pill: "9999px",              // badges
      },

      // ── Typography ────────────────────────────────────
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "monospace"],
      },
      fontSize: {
        // Custom semantic sizes — body stays at text-base (16px, Tailwind default)
        "price":       ["24px", { fontWeight: "700", letterSpacing: "-0.02em" }],
        "time":        ["24px", { fontWeight: "700", letterSpacing: "-0.02em" }],
        "booking-ref": ["24px", { fontWeight: "700", letterSpacing: "0.2em" }],
      },

      // ── Spacing extras ────────────────────────────────
      width: {
        "filter-sidebar":  "320px",   // w-[320px] FilterPanel
        "booking-sidebar": "360px",   // w-[360px] BookingSummary sidebar
        "search-card":     "880px",   // max-w-[880px] SearchForm card
      },
      height: {
        "search-input":  "56px",   // h-search-input — hero search field
        "search-btn":    "56px",   // h-search-btn   — hero search button
        "filter-row":    "48px",   // h-filter-row   — checkbox/radio rows
        "sort-tab":      "48px",   // h-sort-tab     — SortBar tab buttons
        "airline-logo":  "40px",   // h-airline-logo — AirlineLogo tile
        "prog-dot":      "32px",   // h-prog-dot     — ProgressStepper dot
      },

      // ── Skeleton shimmer animation ─────────────────────
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
      },
      animation: {
        shimmer:         "shimmer 1.5s infinite linear",
        "accordion-down": "accordion-down 200ms ease-out",
        "accordion-up":   "accordion-up 200ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],  // required by shadcn
}

export default config
```

---

## Step 4 — `src/app/globals.css`

Replace the default shadcn globals with the flight app tokens. In Tailwind v4, add an `@theme` block BEFORE `@layer base` to auto-generate semantic utilities:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));
@config "../../tailwind.config.ts";

@theme {
  /* Primary brand zone (#0770E3 blue) */
  --color-primary: #0770E3;
  --color-primary-foreground: #FFFFFF;

  /* Secondary surface zone (#F1F2F8 gray) */
  --color-secondary: #F1F2F8;
  --color-secondary-foreground: #000000;

  /* Border */
  --color-border: #E6E6E6;

  /* Status */
  --color-success: #00A698;
  --color-warning: #FF7733;
  --color-error: #E20A17;

  /* Highlight tokens */
  --color-highlight-primary: #FFFFFF;
  --color-highlight-primary-fg: #0770E3;
  --color-highlight-secondary: #0770E3;
  --color-highlight-secondary-fg: #FFFFFF;

  /* Gradient dark variant */
  --color-primary-dark: #084EB2;
}

@layer base {
  :root {
    /* ── Flight app tokens (legacy aliases for custom utilities) ── */
    --bg-primary:        var(--color-primary);
    --text-primary:      var(--color-primary-foreground);
    --bg-secondary:      var(--color-secondary);
    --text-secondary:    var(--color-secondary-foreground);
    --border:            var(--color-border);
    --success:           var(--color-success);
    --warning:           var(--color-warning);
    --error:             var(--color-error);
    --badge-ok-bg:       #E8F5F4;
    --badge-ok-fg:       #00A698;
    --badge-ok-border:   #00A698;
    --badge-warn-bg:     #FFF0E8;
    --badge-warn-fg:     #FF7733;
    --badge-warn-border: #FF7733;
    /* Highlight tokens — flip bg/text of the parent zone */
    --bg-highlight-primary:      var(--color-highlight-primary);
    --text-highlight-primary:    var(--color-highlight-primary-fg);
    --bg-highlight-secondary:    var(--color-highlight-secondary);
    --text-highlight-secondary:  var(--color-highlight-secondary-fg);
    --radius:            0.5rem;   /* 8px */

    /* ── Spacing aliases ── */
    --padding-xs:    8px;
    --padding-sm:   16px;
    --padding-md:   24px;
    --padding-lg:   32px;
    --padding-xl:   40px;
    --gap-xs:        8px;
    --gap-sm:        8px;
    --gap-md:       16px;
    --gap-lg:       24px;
    --gap-xl:       32px;
    --height-input: 48px;
    --height-btn:   48px;
    --height-btn-sm:40px;
  }

  * { border-color: var(--color-border); }
  body { background: var(--color-secondary); color: var(--color-secondary-foreground); font-family: "Inter", system-ui, sans-serif; }
}

@layer utilities {
  /* Skeleton shimmer utility */
  .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      var(--bg-secondary) 25%,
      #E4E5EB 50%,
      var(--bg-secondary) 75%
    );
    background-size: 1000px 100%;
    @apply animate-shimmer;
  }

  /* Flight state badge utilities — 32px height, 8px 16px padding, 16px text */
  .badge-nonstop {
    background: var(--badge-ok-bg);
    color: var(--badge-ok-fg);
    border: 1px solid var(--badge-ok-border);
    @apply inline-flex items-center rounded-full px-4 py-2 text-base font-semibold;
    /* height: 32px achieved via py-2 + text-base line-height */
  }
  .badge-one-stop {
    background: var(--badge-warn-bg);
    color: var(--badge-warn-fg);
    border: 1px solid var(--badge-warn-border);
    @apply inline-flex items-center rounded-full px-4 py-2 text-base font-semibold;
  }
  .badge-multi-stop {
    background: #FDECEA;
    color: var(--error);
    border: 1px solid var(--error);
    @apply inline-flex items-center rounded-full px-4 py-2 text-base font-semibold;
  }

  /* ── Sort tab — tabs live on --bg-primary (blue) bar ──────────────────
     Active:   border + text use --bg-highlight-primary (#FFFFFF)
     Inactive: text rgba(255,255,255,0.75), transparent border
  ──────────────────────────────────────────────────────────────────────── */
  .sort-tab-active {
    @apply border-b-2 text-base font-semibold;
    border-color: var(--bg-highlight-primary);
    color: var(--bg-highlight-primary);
  }
  .sort-tab-inactive {
    @apply border-b-2 border-transparent text-base font-medium;
    color: rgba(255, 255, 255, 0.75);
  }

  /* ── Departure time chips — on white sidebar (bg-secondary context) ───
     Active:   --bg-highlight-secondary bg + --text-highlight-secondary text
     Inactive: --bg-secondary bg + --text-secondary text + border
     Labels:   "6AM–12PM" | "12PM–6PM" | "6PM–12AM" | "12AM–6AM"
  ──────────────────────────────────────────────────────────────────────── */
  .time-chip {
    @apply inline-flex items-center rounded-full px-4 text-base font-medium cursor-pointer;
    height: 40px;
    border: 1px solid var(--border);
    background: var(--bg-secondary);
    color: var(--text-secondary);
  }
  .time-chip[data-active="true"],
  .time-chip.active {
    background: var(--bg-highlight-secondary);
    color: var(--text-highlight-secondary);
    border-color: var(--bg-highlight-secondary);
  }

  /* ── Nav active link — on --bg-primary bar ─────────────────────────── */
  .nav-link-active {
    color: var(--bg-highlight-primary);
    border-bottom: 2px solid var(--bg-highlight-primary);
    padding-bottom: 2px;
  }

  /* ── Progress stepper — on --bg-primary header ─────────────────────── */
  .prog-dot-done,
  .prog-dot-active {
    @apply flex h-8 w-8 items-center justify-center rounded-full text-base font-bold;
    background: var(--bg-highlight-primary);
    border: 2px solid var(--bg-highlight-primary);
    color: var(--text-highlight-primary);
  }
  .prog-line-done {
    background: var(--bg-highlight-primary);
  }

  /* ── Autocomplete selected row — on white card (surface) ─────────────
     Uses --bg-highlight-secondary bg + --text-highlight-secondary text
  ──────────────────────────────────────────────────────────────────────── */
  .combobox-item-selected {
    background: var(--bg-highlight-secondary);
    color: var(--text-highlight-secondary);
    @apply rounded;
  }
}
```

---

## Step 5 — Inter font (Next.js)

```tsx
// src/app/layout.tsx
import { Inter } from "next/font/google"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <TooltipProvider>
          {children}
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  )
}
```

> `Inter` is loaded via `next/font/google` with no extra install needed. The `globals.css` body rule sets `font-family: "Inter", system-ui, sans-serif` as the fallback chain.

---

## Step 6 — Key utility class map

In Tailwind v4, `@theme { --color-primary: #0770E3; }` auto-generates `bg-primary`, `text-primary`, `border-primary` utilities. No more `bg-[var(--...)]` arbitrary values needed.

| Design spec | Tailwind / utility classes |
|-------------|--------------------------|
| **Nav bar** | `bg-primary text-primary-foreground h-14 px-8` |
| Nav active link | `nav-link-active` (custom utility) |
| **Hero section** | `bg-gradient-to-b from-primary to-primary-dark px-8 py-12` |
| Hero heading | `text-[40px] font-bold tracking-tight text-white` |
| **Search card** | `max-w-[880px] w-full rounded-xl bg-white shadow-lg p-6` |
| Search input (56px) | `h-[56px] px-4 text-base rounded border border-border` |
| Search button (56px) | `h-[56px] px-8 text-base font-semibold rounded-md bg-primary text-white` |
| Trip type pill (active) | `rounded-full bg-primary border-primary text-white px-6 h-10 text-base font-medium` |
| Trip type pill (inactive) | `rounded-full bg-white text-secondary-foreground border-border px-6 h-10 text-base hover:border-primary` |
| **Sticky search bar** | `bg-primary text-primary-foreground px-8 py-3` |
| "Modify search" button | `text-white hover:bg-white/20` |
| **Sort bar** | `bg-primary px-8` |
| Sort tab (active) | `sort-tab-active h-[48px] pb-3 px-6` (custom utility) |
| Sort tab (inactive) | `sort-tab-inactive h-[48px] pb-3 px-6` (custom utility) |
| **Filter sidebar** | `w-[320px] shrink-0 bg-white border-r border-border p-6` |
| Departure time chip (active) | `time-chip active` (custom utility) |
| Departure time chip (inactive) | `time-chip` (custom utility) |
| Chip labels | `"6AM–12PM"` · `"12PM–6PM"` · `"6PM–12AM"` · `"12AM–6AM"` |
| Filter row | `flex items-center gap-2 min-h-[48px]` |
| **Flight card** | `rounded-lg border border-border bg-white p-6 cursor-pointer hover:shadow-md transition-shadow` |
| Flight time text | `text-2xl font-bold tracking-tight text-secondary-foreground` |
| Price text | `text-2xl font-bold tracking-tight text-secondary-foreground` |
| Select button | `bg-primary hover:bg-primary/90 text-white h-9 px-4` |
| Nonstop badge | `badge-nonstop` |
| 1-stop badge | `badge-one-stop` |
| 2+ stops badge | `badge-multi-stop` |
| Skeleton card | `rounded-lg border border-border p-6 skeleton-shimmer` |
| **Progress stepper** | on `bg-primary` header |
| Stepper dot (done/active) | `prog-dot-done` / `prog-dot-active` (custom utility) |
| Stepper line (done) | `h-0.5 flex-1 prog-line-done` |
| **Autocomplete** selected row | `combobox-item-selected` (custom utility) |
| **Calendar** selected date | Override: shadcn calendar default |
| Primary button (48px) | `h-12 px-8 text-base font-medium rounded-md bg-primary text-white` |
| Outline button | `h-10 px-6 text-base font-medium rounded-md border` |
| Booking reference | `font-mono text-2xl font-bold tracking-widest text-secondary-foreground` |
| Airline logo | `h-10 w-10 rounded` (40×40px) |
| Empty state icon bg | `h-16 w-16 rounded-full bg-secondary` |
| Error text | `text-error` |
| Success icon | `text-success` |
| Error card border | `border-error/30` |
| Card content | `p-6` (24px — not p-4) |
| Body text | `text-base text-secondary-foreground` |
| Label text | `text-base font-medium text-secondary-foreground` |
