# Gap 6 — Round-Trip Plan

*Scope: one-way + round-trip · Multi-city: deferred*
*Results display: Option A — stacked slices in one card*

---

## What Changes vs One-Way

| Area | One-way | Round-trip addition |
|------|---------|---------------------|
| Trip type pills | "One-way" selected | "Round-trip" pill activates return date |
| Search form | 1 date field | Return date field appears |
| Calendar | Single date picker | Date range picker (`mode="range"`) |
| Zod schema | `returnDate` optional, unused | `returnDate` required when `tripType === "round_trip"` |
| API payload | 1 slice | 2 slices (outbound + return) |
| Zustand store | No change | No change — `search.returnDate` already in store shape |
| Flight card | 1 slice row | 2 slice rows stacked |
| Filter: stops | `slices[0].segments.length - 1` | Apply to both slices separately |
| Filter: departure time | `slices[0].segments[0].departing_at` | Filter on outbound leg only |
| Sort: duration | `slices[0].duration` | Sum of both slice durations |

---

## 1. Trip Type Pills — `TripTypePills.tsx`

Two pills. Selecting "Round-trip" shows the return date field; "One-way" hides it and clears `returnDate`.

```tsx
// components/search/TripTypePills.tsx
"use client"
import { useFlightStore } from "@/lib/store"

const OPTIONS = [
  { value: "one_way",    label: "One-way" },
  { value: "round_trip", label: "Round-trip" },
] as const

export function TripTypePills() {
  const tripType = useFlightStore((s) => s.search.tripType)
  const setSearch = useFlightStore((s) => s.setSearch)

  return (
    <div className="flex gap-2">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() =>
            setSearch({
              tripType:   value,
              returnDate: value === "one_way" ? null : undefined, // clear on switch to one-way
            })
          }
          className={cn(
            "rounded-full border px-4 py-1.5 text-base font-medium transition-colors",
            tripType === value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-muted text-muted-foreground hover:border-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

---

## 2. Date Fields — `DateRangePicker.tsx`

Return date field is conditionally rendered. Both fields share one `DateRangePicker` component that handles `mode="single"` vs `mode="range"` internally.

### Layout in `SearchForm.tsx`

```tsx
// Inside SearchForm — date row
<div className="flex gap-3">
  <DateRangePicker
    mode={tripType === "round_trip" ? "range" : "single"}
    departDate={search.departDate}
    returnDate={search.returnDate}
    onSelect={({ departDate, returnDate }) =>
      setSearch({ departDate, returnDate: returnDate ?? null })
    }
    className="flex-1"
  />
</div>
```

### `DateRangePicker.tsx` component

```tsx
// components/search/DateRangePicker.tsx
"use client"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"

interface Props {
  mode: "single" | "range"
  departDate:  string | null  // ISO YYYY-MM-DD
  returnDate:  string | null
  onSelect: (dates: { departDate: string | null; returnDate: string | null }) => void
  className?: string
}

export function DateRangePicker({ mode, departDate, returnDate, onSelect, className }: Props) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const displayLabel =
    mode === "range" && departDate && returnDate
      ? `${format(new Date(departDate), "d MMM")} – ${format(new Date(returnDate), "d MMM")}`
      : departDate
      ? format(new Date(departDate), "EEE, d MMM")
      : "Select date"

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-12 justify-start gap-2 text-base font-normal",
            !departDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0" />
          {displayLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {mode === "single" ? (
          <Calendar
            mode="single"
            selected={departDate ? new Date(departDate) : undefined}
            onSelect={(date) =>
              onSelect({
                departDate: date ? format(date, "yyyy-MM-dd") : null,
                returnDate: null,
              })
            }
            disabled={{ before: today }}
            numberOfMonths={1}
            initialFocus
          />
        ) : (
          <Calendar
            mode="range"
            selected={{
              from: departDate ? new Date(departDate) : undefined,
              to:   returnDate ? new Date(returnDate) : undefined,
            }}
            onSelect={(range: DateRange | undefined) =>
              onSelect({
                departDate: range?.from ? format(range.from, "yyyy-MM-dd") : null,
                returnDate: range?.to   ? format(range.to,   "yyyy-MM-dd") : null,
              })
            }
            disabled={{ before: today }}
            numberOfMonths={2}   // show 2 months side by side for range selection
            initialFocus
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
```

---

## 3. Zod Schema Update — `lib/types/forms.ts`

`returnDate` is required when `tripType === "round_trip"`, forbidden otherwise.

```ts
// lib/types/forms.ts
import { z } from "zod"

export const searchFormSchema = z
  .object({
    tripType:    z.enum(["one_way", "round_trip"]),  // multi_city deferred
    origin: z.object({
      iata: z.string().length(3, "Select a valid airport"),
      name: z.string(),
      city: z.string(),
    }),
    destination: z.object({
      iata: z.string().length(3, "Select a valid airport"),
      name: z.string(),
      city: z.string(),
    }),
    departDate:  z
      .string()
      .min(1, "Select a departure date")
      .refine(
        (d) => new Date(d) >= new Date(new Date().setHours(0, 0, 0, 0)),
        "Departure must be today or later"
      ),
    returnDate: z.string().nullable(),
    passengers: z
      .array(
        z.object({
          type:  z.enum(["adult", "child", "infant_without_seat"]),
          count: z.number().min(0).max(9),
        })
      )
      .refine(
        (p) => p.reduce((sum, x) => sum + x.count, 0) >= 1,
        "At least 1 passenger required"
      ),
    cabinClass: z.enum(["economy", "premium_economy", "business", "first"]),
  })
  // Cross-field: origin ≠ destination
  .refine((d) => d.origin.iata !== d.destination.iata, {
    message: "Origin and destination must differ",
    path:    ["destination"],
  })
  // Cross-field: returnDate required for round-trip
  .refine(
    (d) => d.tripType === "one_way" || (d.tripType === "round_trip" && !!d.returnDate),
    { message: "Select a return date", path: ["returnDate"] }
  )
  // Cross-field: returnDate must be after departDate
  .refine(
    (d) =>
      !d.returnDate ||
      !d.departDate ||
      new Date(d.returnDate) >= new Date(d.departDate),
    { message: "Return date must be after departure", path: ["returnDate"] }
  )

export type SearchFormValues = z.infer<typeof searchFormSchema>
```

---

## 4. `searchFlights` Action — No Change Needed

Already handles round-trip in `14-data-layer.md §6`:

```ts
// Already in actions/search.ts
const slices = [
  { origin: params.origin.iata, destination: params.destination.iata, departure_date: params.departDate },
  ...(params.tripType === "round_trip" && params.returnDate
    ? [{ origin: params.destination.iata, destination: params.origin.iata, departure_date: params.returnDate }]
    : []),
]
```

No further changes to the action.

---

## 5. Flight Card — Stacked Slices (Option A)

Round-trip offers have `slices.length === 2`. Render both slices stacked, same card.

```tsx
// components/results/FlightCard.tsx
import { parseDuration } from "@/lib/utils"
import type { DuffelOffer } from "@/lib/types/duffel"

export function FlightCard({ offer, onSelect }: { offer: DuffelOffer; onSelect: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
      {/* Render one row per slice */}
      {offer.slices.map((slice, i) => {
        const firstSeg = slice.segments[0]
        const lastSeg  = slice.segments[slice.segments.length - 1]
        const stops    = slice.segments.length - 1

        return (
          <div
            key={slice.id}
            className={cn(
              "grid grid-cols-[2fr_1.5fr_1.5fr] items-center gap-3 p-5",
              i > 0 && "border-t border-border"  // divider between outbound + return
            )}
          >
            {/* Left: airline + times */}
            <div className="flex items-center gap-3">
              <AirlineLogo
                iata={offer.owner.iata_code}
                url={offer.owner.logo_symbol_url}
                name={offer.owner.name}
              />
              <div>
                <p className="text-lg font-bold tabular-nums">
                  {firstSeg.departing_at.slice(11, 16)}
                  <span className="mx-1.5 font-normal text-muted-foreground">→</span>
                  {lastSeg.arriving_at.slice(11, 16)}
                </p>
                <p className="text-base text-muted-foreground">{offer.owner.name}</p>
              </div>
            </div>

            {/* Center: duration + stop badge */}
            <div className="flex flex-col items-center gap-1">
              <p className="text-base text-muted-foreground">{parseDuration(slice.duration)}</p>
              <div className="flex w-full items-center gap-1">
                <div className="h-px flex-1 bg-border" />
                <StopBadge stops={stops} />
                <div className="h-px flex-1 bg-border" />
              </div>
              <p className="text-base text-muted-foreground">
                {slice.origin.iata_code} → {slice.destination.iata_code}
              </p>
            </div>

            {/* Right: price + button — only on last slice row */}
            {i === offer.slices.length - 1 ? (
              <div className="flex flex-col items-end gap-2">
                <p className="text-2xl font-bold">
                  {offer.total_currency} {parseFloat(offer.total_amount).toFixed(2)}
                </p>
                <Button onClick={onSelect} className="h-10 px-6">Select</Button>
              </div>
            ) : (
              <div /> // empty cell — price shown only once on last row
            )}
          </div>
        )
      })}
    </div>
  )
}
```

---

## 6. Filter & Sort Adjustments for Round-Trip

### Stops filter

Apply to **both slices** — an offer passes only if both legs meet the stops criterion.

```ts
// In useFilteredOffers.ts
if (filters.stops !== "all") {
  result = result.filter((o) =>
    o.slices.every((slice) => {                    // ← every, not slices[0] only
      const stops = slice.segments.length - 1
      if (filters.stops === "direct") return stops === 0
      if (filters.stops === "1stop")  return stops === 1
      if (filters.stops === "2plus")  return stops >= 2
      return true
    })
  )
}
```

### Departure time filter

Apply to **outbound leg only** (`slices[0]`) — filtering return leg departure is unexpected UX.

```ts
// Already correct — slices[0].segments[0].departing_at
```

### Sort by duration

For round-trip, sort by **total trip duration** (sum of all slices).

```ts
if (sortBy === "total_duration") {
  result = [...result].sort((a, b) => {
    const totalMs = (offer: DuffelOffer) =>
      offer.slices.reduce((sum, s) => sum + parseDurationMs(s.duration), 0)
    return totalMs(a) - totalMs(b)
  })
}

// Helper — parse ISO 8601 duration to milliseconds
function parseDurationMs(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  const h   = parseInt(m?.[1] ?? "0")
  const min = parseInt(m?.[2] ?? "0")
  return (h * 60 + min) * 60 * 1000
}
```

---

## 7. Zustand Store — No Changes Needed

The store shape from `8-layout-guide.md` already has:

```ts
search: {
  tripType:   "one_way" | "round_trip"
  returnDate: string | null
  ...
}
```

No additions required.

---

## 8. `parseDuration` Utility — `lib/utils.ts`

Used in `FlightCard` and `useFilteredOffers`. Add alongside the existing `cn()`:

```ts
// lib/utils.ts
export function parseDuration(iso: string): string {
  const m   = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  const h   = parseInt(m?.[1] ?? "0")
  const min = parseInt(m?.[2] ?? "0")
  return h ? `${h}h ${min}m` : `${min}m`
}
```

---

## Summary of File Changes

| File | Change |
|------|--------|
| `components/search/TripTypePills.tsx` | Clear `returnDate` on switch to one-way |
| `components/search/DateRangePicker.tsx` | New component — `mode="single"` or `"range"` |
| `components/search/SearchForm.tsx` | Wire `DateRangePicker` with mode driven by `tripType` |
| `lib/types/forms.ts` | Add `returnDate` conditionally required refinements |
| `actions/search.ts` | No change — already handles round-trip |
| `components/results/FlightCard.tsx` | Map over `offer.slices`, divider between rows, price on last row only |
| `components/results/useFilteredOffers.ts` | Stops filter on every slice; duration sort sums all slices |
| `lib/utils.ts` | Add `parseDuration` + `parseDurationMs` |
