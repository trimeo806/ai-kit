# shadcn/ui Components — Flight Booking App

*Which components, where they're used, props, and install commands*

---

## Quick install (all at once)

```bash
npx shadcn-ui@latest add \
  button \
  input \
  label \
  select \
  popover \
  calendar \
  command \
  badge \
  card \
  accordion \
  separator \
  toast \
  sonner \
  skeleton \
  form \
  radio-group \
  checkbox \
  slider \
  progress \
  sheet \
  dialog \
  tooltip
```

---

## Component Registry

### 1. Button

**Used on**: Every CTA — Search flights, Select (card), Confirm booking, Load more, Search again

```bash
npx shadcn-ui@latest add button
```

**Key variants**:

```tsx
import { Button } from "@/components/ui/button"

// Primary CTA — Search flights (56px tall, hero override)
<Button size="lg" className="w-full h-[56px] text-base font-semibold">
  Search flights
</Button>

// Primary CTA — Confirm booking (standard 48px / h-12)
<Button size="lg" className="w-full h-12 text-base font-semibold">
  Confirm booking
</Button>

// Card Select button (40px / h-10)
<Button variant="outline" size="sm" className="h-10 px-6 text-base">Select</Button>

// Destructive / retry
<Button variant="destructive">Try again</Button>

// Ghost (load more)
<Button variant="ghost" className="w-44">Load more flights</Button>
```

**Token overrides**

| Variant | Context | className overrides |
|---------|---------|---------------------|
| Primary (default) | Any surface | `bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[#084EB2]` |
| Outline | Light / gray surfaces (search card, filter sidebar, results area) | `border-[var(--bg-highlight-secondary)] text-[var(--bg-highlight-secondary)]` |
| Ghost-white | Blue sections (nav, hero, sort bar, sticky search bar) | `bg-white/15 text-[var(--text-primary)] border border-white/40` |

```tsx
// Primary button (any section)
<Button className="bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[#084EB2] text-base font-semibold">
  Search flights
</Button>

// Outline button on light bg (e.g. filter sidebar, results area)
<Button variant="outline" className="border-[var(--bg-highlight-secondary)] text-[var(--bg-highlight-secondary)] text-base">
  Select
</Button>

// Ghost-white button on blue bg (e.g. nav Sign In)
<Button variant="ghost" className="bg-white/15 text-[var(--text-primary)] border border-white/40 text-base">
  Sign in
</Button>
```

| Prop | Type | Notes |
|------|------|-------|
| `variant` | `"default" \| "destructive" \| "outline" \| "ghost"` | |
| `size` | `"default" \| "sm" \| "lg" \| "icon"` | |
| `disabled` | `boolean` | Disable until form valid |
| `asChild` | `boolean` | Wrap link as button |

---

### 2. Input

**Used on**: All text fields in passenger form, search bar compact display

```bash
npx shadcn-ui@latest add input
```

```tsx
import { Input } from "@/components/ui/input"

// Standard field (48px / h-12)
<Input placeholder="First name" className="h-12 text-base" />

// Search input (56px tall — hero override)
<Input className="h-[56px] text-base" placeholder="From" />

// Error state
<Input className="border-destructive focus-visible:ring-destructive" />
```

**Token overrides**

| State | className overrides |
|-------|---------------------|
| Focus ring (all surfaces) | `focus-visible:ring-[var(--bg-highlight-secondary)]` |
| Error state | `border-[var(--error)] focus-visible:ring-[var(--error)]` |
| Disabled (return date — one-way mode) | `opacity-30 cursor-not-allowed` |

```tsx
// Standard field with token focus ring
<Input
  placeholder="First name"
  className="h-12 text-base focus-visible:ring-[var(--bg-highlight-secondary)]"
/>

// Error state using token
<Input
  className="h-12 text-base border-[var(--error)] focus-visible:ring-[var(--error)]"
  aria-invalid="true"
/>

// Disabled return-date input (one-way mode)
<Input
  placeholder="Return date"
  disabled
  className="h-[56px] text-base opacity-30 cursor-not-allowed"
/>
```

| Prop | Type | Notes |
|------|------|-------|
| `className` | string | Override height for search inputs |
| `disabled` | boolean | Return date when one-way |
| `aria-describedby` | string | Point to error message id |

---

### 3. Label

**Used on**: All form fields — positioned above input

```bash
npx shadcn-ui@latest add label
```

```tsx
import { Label } from "@/components/ui/label"

<div className="flex flex-col gap-1.5">
  <Label htmlFor="given_name" className="text-base font-medium text-muted-foreground">First name</Label>
  <Input id="given_name" className="h-12 text-base" />
</div>
```

---

### 4. Select

**Used on**: Title (Mr/Ms/Mrs/Miss/Dr), Cabin class (Economy/Premium/Business/First), Gender

```bash
npx shadcn-ui@latest add select
```

```tsx
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select"

// Title select
<Select onValueChange={(v) => form.setValue("title", v)}>
  <SelectTrigger className="w-[120px]">
    <SelectValue placeholder="Title" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="mr">Mr</SelectItem>
    <SelectItem value="ms">Ms</SelectItem>
    <SelectItem value="mrs">Mrs</SelectItem>
    <SelectItem value="miss">Miss</SelectItem>
    <SelectItem value="dr">Dr</SelectItem>
  </SelectContent>
</Select>

// Cabin class (search form — 56px hero context)
<Select defaultValue="economy">
  <SelectTrigger className="h-[56px] text-base">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="economy">Economy</SelectItem>
    <SelectItem value="premium_economy">Premium Economy</SelectItem>
    <SelectItem value="business">Business</SelectItem>
    <SelectItem value="first">First</SelectItem>
  </SelectContent>
</Select>
```

**Token overrides**

| State | className override |
|-------|-------------------|
| Trigger focus ring | `focus:ring-[var(--bg-highlight-secondary)]` on `SelectTrigger` |

```tsx
// Select trigger with token focus ring
<SelectTrigger className="h-[56px] text-base focus:ring-[var(--bg-highlight-secondary)]">
  <SelectValue placeholder="Cabin class" />
</SelectTrigger>
```

---

### 5. Popover

**Used on**: Passenger count + cabin class selector trigger on search form

```bash
npx shadcn-ui@latest add popover
```

```tsx
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="h-[56px] w-full justify-start text-base">
      {label}  {/* e.g. "1 adult · Economy" */}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-72 p-4" align="start">
    {/* PassengerCounter + CabinRadioGroup */}
  </PopoverContent>
</Popover>
```

---

### 6. Calendar

**Used on**: Departure date, Return date pickers

```bash
npx shadcn-ui@latest add calendar
```

```tsx
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"

// Single date picker (one-way)
const [date, setDate] = useState<Date>()

<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" className="h-[56px] justify-start text-base">
      {date ? format(date, "d MMM yyyy") : "Departure date"}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0">
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      disabled={(d) => d < new Date()}   // no past dates
      initialFocus
    />
  </PopoverContent>
</Popover>

// Date range picker (round-trip)
const [range, setRange] = useState<DateRange>()

<Calendar
  mode="range"
  selected={range}
  onSelect={setRange}
  numberOfMonths={2}              // 2-month desktop view
  disabled={(d) => d < new Date()}
/>
```

**Install date-fns**:
```bash
npm install date-fns
```

**Token overrides**

| Element | className override |
|---------|-------------------|
| Selected day | `[&_.rdp-day_selected]:bg-[var(--bg-highlight-secondary)] [&_.rdp-day_selected]:text-[var(--text-highlight-secondary)]` on `<Calendar>` |
| Today indicator | `[&_.rdp-day_today]:text-[var(--bg-highlight-secondary)]` on `<Calendar>` |

```tsx
// Calendar with token-overridden selected and today styles
<Calendar
  mode="single"
  selected={date}
  onSelect={setDate}
  disabled={(d) => d < new Date()}
  initialFocus
  className="[&_.rdp-day_selected]:bg-[var(--bg-highlight-secondary)] [&_.rdp-day_selected]:text-[var(--text-highlight-secondary)] [&_.rdp-day_today]:text-[var(--bg-highlight-secondary)]"
/>
```

---

### 7. Command (Combobox — Airport Autocomplete)

**Used on**: Origin / Destination airport search

```bash
npx shadcn-ui@latest add command
npx shadcn-ui@latest add popover
```

```tsx
import {
  Command, CommandEmpty, CommandGroup,
  CommandInput, CommandItem, CommandList
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// AirportCombobox
<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger asChild>
    <Button
      variant="outline"
      role="combobox"
      className="h-[56px] w-full justify-start font-normal text-base"
    >
      {value ? `${value.iata} — ${value.name}` : "From"}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-[400px] p-0">
    <Command shouldFilter={false}>
      <CommandInput
        placeholder="Search airports..."
        onValueChange={handleSearch}   // debounce 300ms → GET /places/suggestions
      />
      <CommandList>
        <CommandEmpty>No airports found.</CommandEmpty>
        <CommandGroup>
          {suggestions.map((airport) => (
            <CommandItem
              key={airport.iata_code}
              value={airport.iata_code}
              onSelect={() => { setValue(airport); setOpen(false) }}
            >
              <span className="mr-2">{airport.flag}</span>
              <span className="font-medium">{airport.iata_code}</span>
              <span className="ml-2 text-base text-muted-foreground">
                {airport.name} · {airport.city}, {airport.country}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  </PopoverContent>
</Popover>
```

**Key props**:
- `shouldFilter={false}` — disable client filtering; results come from API
- `onValueChange` on `CommandInput` — trigger debounced fetch

**Token overrides**

| Element | className override |
|---------|-------------------|
| Selected / highlighted item | `data-[selected=true]:bg-[var(--bg-highlight-secondary)] data-[selected=true]:text-[var(--text-highlight-secondary)]` on `CommandItem` — or use `.combobox-item-selected` utility |

```tsx
// CommandItem with token-based selection highlight
<CommandItem
  key={airport.iata_code}
  value={airport.iata_code}
  onSelect={() => { setValue(airport); setOpen(false) }}
  className="data-[selected=true]:bg-[var(--bg-highlight-secondary)] data-[selected=true]:text-[var(--text-highlight-secondary)]"
>
  {/* ... */}
</CommandItem>
```

---

### 8. Badge

**Used on**: Stop indicator on flight cards (Nonstop / 1 stop / 2+ stops), result count

```bash
npx shadcn-ui@latest add badge
```

```tsx
import { Badge } from "@/components/ui/badge"

// Use custom CSS utilities defined in globals.css
function StopBadge({ stops }: { stops: number }) {
  if (stops === 0) return <span className="badge-nonstop">Nonstop</span>
  if (stops === 1) return <span className="badge-one-stop">1 stop</span>
  return <span className="badge-multi-stop">{stops} stops</span>
}

// Or with shadcn Badge variant + className override
<Badge className="bg-[var(--badge-ok-bg)] text-[var(--badge-ok-fg)] border-[var(--badge-ok-border)]">
  Nonstop
</Badge>
```

**Token overrides**

Prefer the custom utility classes over inline token strings for stop badges — they are already defined in `globals.css`:

| Stop count | Utility class | Tokens used |
|------------|--------------|-------------|
| 0 (Nonstop) | `.badge-nonstop` | `--badge-ok-bg`, `--badge-ok-fg`, `--badge-ok-border` |
| 1 stop | `.badge-one-stop` | `--badge-warn-bg`, `--badge-warn-fg`, `--badge-warn-border` |
| 2+ stops | `.badge-multi-stop` | `--badge-warn-bg`, `--badge-warn-fg`, `--badge-warn-border` |

Use `<span className="badge-nonstop">` (plain element) or apply the class to `<Badge>` for full shadcn integration.

---

### 9. Card

**Used on**: Search card, flight cards, booking summary sidebar, confirmation card

```bash
npx shadcn-ui@latest add card
```

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Booking summary sidebar
<Card>
  <CardHeader className="px-6 pt-6 pb-3">
    <CardTitle className="text-2xl font-semibold">Your booking</CardTitle>
  </CardHeader>
  <CardContent className="flex flex-col gap-3 px-6 pb-6">
    {/* flight summary + price breakdown */}
  </CardContent>
</Card>

// Flight card (custom — not shadcn Card)
// Prefer a plain div with wf-card styles for flight cards
// because they need the 3-column grid layout
<div className="rounded-lg border border-border bg-card p-6 cursor-pointer hover:shadow-md transition-shadow">
  {/* flight-card-grid: 2fr / 1.5fr / 1.5fr */}
</div>
```

---

### 10. Accordion

**Used on**: Passenger cards (one card per passenger, expanded by default if ≤2 passengers)

```bash
npx shadcn-ui@latest add accordion
```

```tsx
import {
  Accordion, AccordionContent,
  AccordionItem, AccordionTrigger
} from "@/components/ui/accordion"

<Accordion
  type="multiple"
  defaultValue={passengers.map((_, i) => `passenger-${i}`)}  // all open if ≤2
>
  {passengers.map((pax, i) => (
    <AccordionItem key={i} value={`passenger-${i}`} className="border rounded-lg mb-3">
      <AccordionTrigger className="px-6 py-4 hover:no-underline">
        <div className="flex flex-col items-start gap-1">
          <span className="text-base text-muted-foreground">
            Passenger {i + 1} · {pax.type}
          </span>
          <span className="text-2xl font-semibold">
            {pax.given_name ? `${pax.given_name} ${pax.family_name}` : "Not filled yet"}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6">
        {/* PassengerForm fields */}
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

**Token overrides**

No token change required. Note: the `AccordionTrigger` chevron icon inherits its color from the surrounding text. Ensure the trigger text uses `text-[var(--text-secondary)]` so the chevron follows the same color in the gray/white form body context.

```tsx
// AccordionTrigger chevron follows text color
<AccordionTrigger className="px-6 py-4 hover:no-underline text-[var(--text-secondary)]">
  {/* ... */}
</AccordionTrigger>
```

---

### 11. Separator

**Used on**: Dividers inside flight cards, booking summary, confirmation card sections

```bash
npx shadcn-ui@latest add separator
```

```tsx
import { Separator } from "@/components/ui/separator"

<Separator className="my-2" />           // horizontal
<Separator orientation="vertical" />    // vertical (rarely used)
```

---

### 12. Sonner (Toast)

**Used on**: Offer expired notification, booking error feedback

```bash
npx shadcn-ui@latest add sonner
npm install sonner
```

```tsx
// layout.tsx — add once
import { Toaster } from "@/components/ui/sonner"
<Toaster position="bottom-right" />

// Usage anywhere
import { toast } from "sonner"

toast.warning("Flight offer expired — redirecting to search…", {
  duration: 3000,
  onAutoClose: () => router.push("/"),
})

toast.error("Booking failed", {
  description: "This offer is no longer available. Please search again.",
})
```

---

### 13. Skeleton

**Used on**: Flight card loading state (3 skeleton cards with shimmer)

```bash
npx shadcn-ui@latest add skeleton
```

```tsx
import { Skeleton } from "@/components/ui/skeleton"

function FlightCardSkeleton() {
  return (
    <div className="rounded-lg border border-border p-6">
      <div className="grid grid-cols-[2fr_1.5fr_1.5fr] gap-3 items-center">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded" />  {/* 40×40 airline logo */}
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-16" />  {/* 24px / text-2xl time */}
          <Skeleton className="h-8 w-16" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-1 w-full" />
          <Skeleton className="h-8 w-20 rounded-full" />  {/* 32px badge */}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-8 w-24" />  {/* 24px price */}
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-24 rounded-md" />  {/* h-10 / 40px select button */}
        </div>
      </div>
    </div>
  )
}

// Render 3 skeletons while loading
{isLoading && Array.from({ length: 3 }).map((_, i) => <FlightCardSkeleton key={i} />)}
```

---

### 14. Form (react-hook-form integration)

**Used on**: Passenger details form — all fields with zod validation

```bash
npx shadcn-ui@latest add form
npm install react-hook-form zod @hookform/resolvers
```

```tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Form, FormControl, FormField,
  FormItem, FormLabel, FormMessage
} from "@/components/ui/form"

const passengerSchema = z.object({
  title:       z.enum(["mr","ms","mrs","miss","dr"]),
  given_name:  z.string().min(1, "Required"),
  family_name: z.string().min(1, "Required"),
  born_on:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  gender:      z.enum(["m","f"]),
  email:       z.string().email().optional(),    // lead passenger only
  phone_number: z.string()
    .regex(/^\+\d{7,15}$/, "Must start with country code e.g. +60")
    .optional(),
})

const form = useForm({ resolver: zodResolver(passengerSchema) })

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="given_name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>First name</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />   {/* shows zod error inline */}
        </FormItem>
      )}
    />
  </form>
</Form>
```

---

### 15. RadioGroup

**Used on**: Stops filter (Any / Nonstop / 1 stop / 2+ stops), cabin class in popover

```bash
npx shadcn-ui@latest add radio-group
```

```tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

<RadioGroup value={stops} onValueChange={setStops} className="flex flex-col gap-1">
  {[
    { value: "all",    label: "Any" },
    { value: "direct", label: "Nonstop", count: 47 },
    { value: "1stop",  label: "1 stop",  count: 28 },
    { value: "2plus",  label: "2+ stops",count: 6  },
  ].map(({ value, label, count }) => (
    <div key={value} className="flex items-center gap-2 min-h-[48px]">
      <RadioGroupItem value={value} id={`stop-${value}`} />
      <Label htmlFor={`stop-${value}`} className="flex-1 cursor-pointer text-base">
        {label}
      </Label>
      {count && <span className="text-base text-muted-foreground">{count}</span>}
    </div>
  ))}
</RadioGroup>
```

**Token overrides**

| State | className override on `RadioGroupItem` |
|-------|----------------------------------------|
| Checked indicator | `data-[state=checked]:bg-[var(--bg-highlight-secondary)] data-[state=checked]:border-[var(--bg-highlight-secondary)]` |

```tsx
<RadioGroupItem
  value={value}
  id={`stop-${value}`}
  className="data-[state=checked]:bg-[var(--bg-highlight-secondary)] data-[state=checked]:border-[var(--bg-highlight-secondary)]"
/>
```

---

### 16. Checkbox

**Used on**: Airlines filter (multi-select)

```bash
npx shadcn-ui@latest add checkbox
```

```tsx
import { Checkbox } from "@/components/ui/checkbox"

{airlines.map((airline) => (
  <div key={airline.iata} className="flex items-center gap-2 min-h-[48px]">
    <Checkbox
      id={airline.iata}
      checked={selectedAirlines.includes(airline.iata)}
      onCheckedChange={(checked) => toggleAirline(airline.iata, checked)}
    />
    <Label htmlFor={airline.iata} className="flex items-center gap-2 flex-1 cursor-pointer text-base">
      <img src={airline.logo} className="h-5 w-5" alt={airline.name} />
      <span className="text-base">{airline.name}</span>
    </Label>
    <span className="text-base text-muted-foreground">{airline.count}</span>
  </div>
))}
```

**Token overrides**

| State | className override on `Checkbox` |
|-------|----------------------------------|
| Checked | `data-[state=checked]:bg-[var(--bg-highlight-secondary)] data-[state=checked]:border-[var(--bg-highlight-secondary)]` |

```tsx
<Checkbox
  id={airline.iata}
  checked={selectedAirlines.includes(airline.iata)}
  onCheckedChange={(checked) => toggleAirline(airline.iata, checked)}
  className="data-[state=checked]:bg-[var(--bg-highlight-secondary)] data-[state=checked]:border-[var(--bg-highlight-secondary)]"
/>
```

---

### 17. Slider

**Used on**: Price range filter (dual-handle), optionally departure time range

```bash
npx shadcn-ui@latest add slider
```

```tsx
import { Slider } from "@/components/ui/slider"

const [priceRange, setPriceRange] = useState([20, 500])

<div className="flex flex-col gap-3">
  <Slider
    min={minPrice}
    max={maxPrice}
    step={5}
    value={priceRange}
    onValueChange={setPriceRange}
    className="mt-2"
  />
  <div className="flex justify-between text-base text-muted-foreground">
    <span>€{priceRange[0]}</span>
    <span>€{priceRange[1]}</span>
  </div>
</div>
```

**Token overrides**

| Element | className override on `Slider` |
|---------|-------------------------------|
| Thumb | `[&_.slider-thumb]:bg-[var(--bg-highlight-secondary)]` |
| Track fill (range) | `[&_.slider-range]:bg-[var(--bg-highlight-secondary)]` |

```tsx
<Slider
  min={minPrice}
  max={maxPrice}
  step={5}
  value={priceRange}
  onValueChange={setPriceRange}
  className="mt-2 [&_.slider-thumb]:bg-[var(--bg-highlight-secondary)] [&_.slider-range]:bg-[var(--bg-highlight-secondary)]"
/>
```

---

### 18. Sheet

**Used on**: Mobile filter drawer (full-screen bottom/side sheet on < 1024px)

```bash
npx shadcn-ui@latest add sheet
```

```tsx
import {
  Sheet, SheetContent, SheetHeader,
  SheetTitle, SheetTrigger
} from "@/components/ui/sheet"

// Mobile filter button
<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline" className="lg:hidden h-10 px-6 text-base">
      Filters
    </Button>
  </SheetTrigger>
  <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
    <SheetHeader>
      <SheetTitle>Filters</SheetTitle>
    </SheetHeader>
    <FilterPanel />
  </SheetContent>
</Sheet>
```

---

### 19. Tooltip

**Used on**: Sort tab labels (server-side vs client-side indicator), baggage icons

```bash
npx shadcn-ui@latest add tooltip
```

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Wrap app in TooltipProvider (layout.tsx)
<TooltipProvider>
  {children}
</TooltipProvider>

// Sort tab with hint
<Tooltip>
  <TooltipTrigger asChild>
    <button className="sort-tab sort-tab-active">Earliest</button>
  </TooltipTrigger>
  <TooltipContent>Sorted client-side</TooltipContent>
</Tooltip>
```

---

## Component–Screen Matrix

| Screen | Components used |
|--------|----------------|
| **Search** (`/`) | Button, Input, Label, Select, Popover, Calendar, Command |
| **Results** (`/results`) | Button, Badge, Skeleton, RadioGroup, Checkbox, Slider, Sheet, Tooltip, Separator |
| **Passengers** (`/passengers`) | Form, Input, Label, Select, Accordion, Card, Separator, Button |
| **Confirmation** (`/confirmation/[id]`) | Card, Badge, Separator, Button, Sonner |

---

## Typography Conventions (post font-scale update)

All text sizes are unified at 16px base. Visual hierarchy is achieved through color (`muted-foreground` for secondary roles) and weight (400 / 500 / 600) — never through size reduction below 16px.

| Role | Size | Weight | Color | Tailwind |
|------|------|--------|-------|----------|
| Hero heading | 40px | 700 | foreground | `text-[40px] font-bold tracking-tight` |
| Section heading | 32px | 700 | foreground | `text-[32px] font-bold tracking-tight` |
| Card title / Subheading | 24px | 600 | foreground | `text-2xl font-semibold` |
| Price / Flight time | 24px | 700 | foreground | `text-2xl font-bold tracking-tight` |
| Booking reference | 24px | 700 | foreground | `font-mono text-2xl font-bold tracking-widest` |
| Body text | 16px | 400 | foreground | `text-base` |
| Secondary text | 16px | 400 | muted-foreground | `text-base text-muted-foreground` |
| Labels | 16px | 500 | muted-foreground | `text-base font-medium text-muted-foreground` |
| Badge text | 16px | 600 | badge-fg (varies) | `text-base font-semibold` |
| Tab / Sort text | 16px | 500 | foreground / muted | `text-base font-medium` |

**Never use** `text-xs` (12px) or `text-sm` (14px) for UI text. These classes are reserved only for internal shadcn component overrides where Tailwind applies them automatically and they cannot easily be overridden.

### Tailwind class quick reference

```tsx
// Body
className="text-base"

// Secondary / muted
className="text-base text-muted-foreground"

// Label above input
className="text-base font-medium text-muted-foreground"

// Card title
className="text-2xl font-semibold"

// Price or flight time
className="text-2xl font-bold tracking-tight"

// Section heading
className="text-[32px] font-bold tracking-tight"

// Hero heading
className="text-[40px] font-bold tracking-tight"

// Booking reference (monospaced)
className="font-mono text-2xl font-bold tracking-widest"
```

---

## Token Application to shadcn Components

This section is the single reference for mapping the design token system to every shadcn/ui (and custom) component in the app. Use it during implementation to apply the correct `className` overrides.

### Section background rules

| Section | Background | Text token | Highlight tokens |
|---------|-----------|-----------|-----------------|
| Nav bar | `bg-[var(--bg-primary)]` | `text-[var(--text-primary)]` | `bg-highlight-primary` / `text-highlight-primary` |
| Hero | gradient `from-[#0770E3] to-[#084EB2]` | `text-[var(--text-primary)]` | `bg-highlight-primary` / `text-highlight-primary` |
| Search card | `bg-white` | `text-[var(--text-secondary)]` | `bg-highlight-secondary` / `text-highlight-secondary` |
| Sticky search bar | `bg-[var(--bg-primary)]` | `text-[var(--text-primary)]` | `bg-highlight-primary` / `text-highlight-primary` |
| Sort bar | `bg-[var(--bg-primary)]` | `text-[var(--text-primary)]` | `bg-highlight-primary` / `text-highlight-primary` |
| Filter sidebar | `bg-white` | `text-[var(--text-secondary)]` | `bg-highlight-secondary` / `text-highlight-secondary` |
| Results area | `bg-[var(--bg-secondary)]` | `text-[var(--text-secondary)]` | `bg-highlight-secondary` / `text-highlight-secondary` |
| Progress header (p3/p4) | `bg-[var(--bg-primary)]` | `text-[var(--text-primary)]` | `bg-highlight-primary` / `text-highlight-primary` |
| Form body (p3) | `bg-[var(--bg-secondary)]` | `text-[var(--text-secondary)]` | `bg-highlight-secondary` / `text-highlight-secondary` |
| Confirmation body (p4) | `bg-[var(--bg-secondary)]` | `text-[var(--text-secondary)]` | `bg-highlight-secondary` / `text-highlight-secondary` |

**Highlight rule summary:**
- In a **blue** section (`bg-primary`) — active/selected elements use `bg-highlight-primary` (white) + `text-highlight-primary` (blue)
- In a **gray or white** section — active/selected elements use `bg-highlight-secondary` (blue) + `text-highlight-secondary` (white)

---

### 1. Button

| Variant | Context | className |
|---------|---------|-----------|
| Primary | Any | `bg-[var(--bg-primary)] text-[var(--text-primary)] hover:bg-[#084EB2]` |
| Outline | Light / gray surface | `border-[var(--bg-highlight-secondary)] text-[var(--bg-highlight-secondary)]` |
| Ghost-white | Blue section | `bg-white/15 text-[var(--text-primary)] border border-white/40` |

---

### 2. Input

| State | className |
|-------|-----------|
| Focus ring | `focus-visible:ring-[var(--bg-highlight-secondary)]` |
| Error | `border-[var(--error)] focus-visible:ring-[var(--error)]` |
| Disabled (one-way return date) | `opacity-30 cursor-not-allowed` |

---

### 3. Select

| State | className on `SelectTrigger` |
|-------|------------------------------|
| Focus ring | `focus:ring-[var(--bg-highlight-secondary)]` |

---

### 4. Calendar

| Element | className on `<Calendar>` |
|---------|--------------------------|
| Selected day | `[&_.rdp-day_selected]:bg-[var(--bg-highlight-secondary)] [&_.rdp-day_selected]:text-[var(--text-highlight-secondary)]` |
| Today indicator | `[&_.rdp-day_today]:text-[var(--bg-highlight-secondary)]` |

---

### 5. Command (Combobox)

| Element | className on `CommandItem` |
|---------|---------------------------|
| Selected / highlighted | `data-[selected=true]:bg-[var(--bg-highlight-secondary)] data-[selected=true]:text-[var(--text-highlight-secondary)]` |

Alternatively apply the `.combobox-item-selected` utility class (defined in `globals.css`).

---

### 6. RadioGroup

| State | className on `RadioGroupItem` |
|-------|-------------------------------|
| Checked | `data-[state=checked]:bg-[var(--bg-highlight-secondary)] data-[state=checked]:border-[var(--bg-highlight-secondary)]` |

---

### 7. Checkbox

| State | className on `Checkbox` |
|-------|-------------------------|
| Checked | `data-[state=checked]:bg-[var(--bg-highlight-secondary)] data-[state=checked]:border-[var(--bg-highlight-secondary)]` |

---

### 8. Slider

| Element | className on `Slider` |
|---------|-----------------------|
| Thumb | `[&_.slider-thumb]:bg-[var(--bg-highlight-secondary)]` |
| Track fill (range) | `[&_.slider-range]:bg-[var(--bg-highlight-secondary)]` |

---

### 9. ToggleGroup (Departure time chips)

Install:
```bash
npx shadcn-ui@latest add toggle-group
```

Use `ToggleGroup type="multiple"` for the four departure time filter chips. Apply the `.time-chip` utility class (defined in `globals.css`) as the base style. Active state is driven by `data-[state=on]`.

**Chip labels:** `6AM–12PM` | `12PM–6PM` | `6PM–12AM` | `12AM–6AM`

```tsx
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const TIME_CHIPS = [
  { value: "morning",   label: "6AM–12PM"  },
  { value: "afternoon", label: "12PM–6PM"  },
  { value: "evening",   label: "6PM–12AM"  },
  { value: "night",     label: "12AM–6AM"  },
]

<ToggleGroup
  type="multiple"
  value={selectedTimes}
  onValueChange={setSelectedTimes}
  className="flex flex-wrap gap-2"
>
  {TIME_CHIPS.map(({ value, label }) => (
    <ToggleGroupItem
      key={value}
      value={value}
      className="time-chip data-[state=on]:bg-[var(--bg-highlight-secondary)] data-[state=on]:text-[var(--text-highlight-secondary)] data-[state=on]:border-[var(--bg-highlight-secondary)]"
    >
      {label}
    </ToggleGroupItem>
  ))}
</ToggleGroup>
```

| State | className on `ToggleGroupItem` |
|-------|-------------------------------|
| Inactive base | `.time-chip` (rounded-full, `bg-secondary`, `text-secondary`, border) |
| Active (on) | `data-[state=on]:bg-[var(--bg-highlight-secondary)] data-[state=on]:text-[var(--text-highlight-secondary)] data-[state=on]:border-[var(--bg-highlight-secondary)]` |

---

### 10. Sort tabs (custom — not shadcn)

The sort bar sits on a blue (`bg-[var(--bg-primary)]`) background. Use the `.sort-tab-active` and `.sort-tab-inactive` utility classes from `globals.css`.

```tsx
// Sort bar — custom tab component on blue background
const SORT_TABS = [
  { value: "best",     label: "Best" },
  { value: "cheapest", label: "Cheapest" },
  { value: "fastest",  label: "Fastest" },
  { value: "earliest", label: "Earliest" },
]

<div className="s2-sort-bar flex gap-0 bg-[var(--bg-primary)]">
  {SORT_TABS.map(({ value, label }) => (
    <button
      key={value}
      onClick={() => setSort(value)}
      className={`px-5 py-3 text-base transition-colors ${
        sort === value ? "sort-tab-active" : "sort-tab-inactive"
      }`}
    >
      {label}
    </button>
  ))}
</div>
```

| State | Utility class | Effect |
|-------|--------------|--------|
| Active tab | `.sort-tab-active` | `border-b-2 border-[var(--bg-highlight-primary)] text-[var(--bg-highlight-primary)] font-semibold` |
| Inactive tab | `.sort-tab-inactive` | `border-b-2 border-transparent text-white/75 font-medium` |

---

### 11. Progress Stepper (custom)

The progress header sits on a blue (`bg-[var(--bg-primary)]`) background. Use the utility classes from `globals.css`.

```tsx
// Progress stepper — custom component in blue progress header
const STEPS = ["Search", "Select", "Passengers", "Confirm"]

<div className="flex items-center gap-0">
  {STEPS.map((label, i) => {
    const isDone   = i < currentStep
    const isActive = i === currentStep
    return (
      <React.Fragment key={label}>
        {/* Connector line */}
        {i > 0 && (
          <div className={`h-0.5 flex-1 ${isDone ? "prog-line-done" : "bg-white/30"}`} />
        )}
        {/* Step dot */}
        <div className="flex flex-col items-center gap-1">
          <div
            className={`h-8 w-8 rounded-full flex items-center justify-center text-base font-semibold ${
              isDone   ? "prog-dot-done"   :
              isActive ? "prog-dot-active" :
              "bg-white/20 text-white/60"
            }`}
          >
            {isDone ? "✓" : i + 1}
          </div>
          <span className="text-base text-white/80">{label}</span>
        </div>
      </React.Fragment>
    )
  })}
</div>
```

| Element | Utility class | Effect |
|---------|--------------|--------|
| Completed dot | `.prog-dot-done` | `bg-[var(--bg-highlight-primary)] text-[var(--text-highlight-primary)]` |
| Active dot | `.prog-dot-active` | `bg-[var(--bg-highlight-primary)] text-[var(--text-highlight-primary)]` (ring or bold border) |
| Completed line | `.prog-line-done` | `bg-[var(--bg-highlight-primary)]` |
| Step label | — | `text-white/80` (literal, no token needed) |

---

### 12. Nav

```tsx
// Nav — active link and ghost Sign In button
<nav className="bg-[var(--bg-primary)] flex items-center gap-4 px-6 h-16">
  {NAV_LINKS.map(({ href, label }) => (
    <Link
      key={href}
      href={href}
      className={`text-base transition-colors ${
        isActive(href) ? "nav-link-active" : "text-white/85"
      }`}
    >
      {label}
    </Link>
  ))}

  {/* Ghost Sign In button — blue bg context */}
  <Button variant="ghost" className="bg-white/15 text-[var(--text-primary)] border border-white/40 text-base">
    Sign in
  </Button>
</nav>
```

| Element | className |
|---------|-----------|
| Active nav link | `.nav-link-active` (defined in globals.css — `text-[var(--bg-highlight-primary)] border-b-2 border-[var(--bg-highlight-primary)]`) |
| Inactive nav link | `text-white/85` |
| Sign In button (ghost) | `bg-white/15 text-[var(--text-primary)] border border-white/40` |

---

### 13. Badge (stop badges)

Use the custom utility classes from `globals.css` — do not apply raw `bg-[...]` inline classes directly on stop badges:

| Stop count | Element | className |
|------------|---------|-----------|
| 0 — Nonstop | `<span>` or `<Badge>` | `badge-nonstop` |
| 1 stop | `<span>` or `<Badge>` | `badge-one-stop` |
| 2+ stops | `<span>` or `<Badge>` | `badge-multi-stop` |

```tsx
function StopBadge({ stops }: { stops: number }) {
  if (stops === 0) return <span className="badge-nonstop">Nonstop</span>
  if (stops === 1) return <span className="badge-one-stop">1 stop</span>
  return <span className="badge-multi-stop">{stops} stops</span>
}
```

---

### 14. Accordion (passenger cards)

No token change required on the Accordion itself. The form body section uses `bg-[var(--bg-secondary)]` with `text-[var(--text-secondary)]`. Ensure the `AccordionTrigger` inherits `text-[var(--text-secondary)]` so the chevron icon color follows:

```tsx
<AccordionTrigger className="px-6 py-4 hover:no-underline text-[var(--text-secondary)]">
  {/* ... */}
</AccordionTrigger>
```

The chevron rendered inside `AccordionTrigger` by shadcn is a `currentColor` SVG — it will automatically pick up the text color set on the trigger element.
