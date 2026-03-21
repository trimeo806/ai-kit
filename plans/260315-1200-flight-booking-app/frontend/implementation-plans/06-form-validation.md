# Gap 4 — Form Validation Plan

*Stack: react-hook-form + Zod · Two forms: Search (F1) + Passenger (F3)*
*Origin === destination error: field-level on destination field*

---

## File Structure

```
lib/types/
└── forms.ts          # All Zod schemas + inferred types

components/
├── search/
│   └── SearchForm.tsx          # useForm<SearchFormValues>
└── passengers/
    └── PassengerForm.tsx       # useForm<PassengerFormValues>
```

---

## 1. `lib/types/forms.ts` — Complete File

```ts
import { z } from "zod"

// ─── Search Form ────────────────────────────────────────────────────────────

const airportSchema = z.object({
  iata: z.string().length(3, "Select a valid airport"),
  name: z.string().min(1),
  city: z.string().min(1),
})

const passengerCountSchema = z.object({
  type:  z.enum(["adult", "child", "infant_without_seat"]),
  count: z.number().int().min(0).max(9),
})

export const searchFormSchema = z
  .object({
    tripType:    z.enum(["one_way", "round_trip"]),
    origin:      airportSchema,
    destination: airportSchema,
    departDate:  z
      .string()
      .min(1, "Select a departure date")
      .refine(
        (d) => new Date(d) >= new Date(new Date().setHours(0, 0, 0, 0)),
        "Departure must be today or later"
      ),
    returnDate:  z.string().nullable(),
    passengers:  z
      .array(passengerCountSchema)
      .refine(
        (p) => p.reduce((sum, x) => sum + x.count, 0) >= 1,
        "At least 1 passenger required"
      ),
    cabinClass:  z.enum(["economy", "premium_economy", "business", "first"]),
  })
  .refine(
    (d) => d.origin.iata !== d.destination.iata,
    { message: "Origin and destination must differ", path: ["destination"] }
  )
  .refine(
    (d) => d.tripType === "one_way" || !!d.returnDate,
    { message: "Select a return date", path: ["returnDate"] }
  )
  .refine(
    (d) =>
      !d.returnDate ||
      !d.departDate ||
      new Date(d.returnDate) >= new Date(d.departDate),
    { message: "Return must be after departure", path: ["returnDate"] }
  )

export type SearchFormValues = z.infer<typeof searchFormSchema>

export const searchFormDefaults: SearchFormValues = {
  tripType:    "one_way",
  origin:      { iata: "", name: "", city: "" },
  destination: { iata: "", name: "", city: "" },
  departDate:  "",
  returnDate:  null,
  passengers:  [
    { type: "adult",               count: 1 },
    { type: "child",               count: 0 },
    { type: "infant_without_seat", count: 0 },
  ],
  cabinClass:  "economy",
}

// ─── Passenger Form ─────────────────────────────────────────────────────────

const identityDocumentSchema = z.object({
  number:         z.string().min(6, "Enter a valid passport number"),
  expiryDate:     z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
    .refine(
      (d) => new Date(d) > new Date(),
      "Passport must not be expired"
    ),
  issuingCountry: z
    .string()
    .length(2, "Select a country"),  // ISO 3166-1 alpha-2
})

const singlePassengerSchema = z.object({
  firstName:   z.string().min(1, "Required").max(50),
  lastName:    z.string().min(1, "Required").max(50),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
    .refine((d) => new Date(d) < new Date(), "Date of birth must be in the past"),
  title:   z.enum(["mr", "mrs", "ms", "miss", "dr"], {
    errorMap: () => ({ message: "Select a title" }),
  }),
  gender:  z.enum(["m", "f"], {
    errorMap: () => ({ message: "Select a gender" }),
  }),
  email:   z.string().email("Enter a valid email"),
  phone:   z
    .string()
    .regex(/^\+\d{7,15}$/, "Include country code e.g. +60123456789"),
  passport: identityDocumentSchema.nullable(), // null when not required by offer
})

export const passengerFormSchema = z.object({
  passengers: z.array(singlePassengerSchema),
})

export type PassengerFormValues   = z.infer<typeof passengerFormSchema>
export type SinglePassengerValues = z.infer<typeof singlePassengerSchema>
```

---

## 2. Search Form — `SearchForm.tsx`

### Setup

```tsx
// components/search/SearchForm.tsx
"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { searchFlights } from "@/actions/search"
import { searchFormSchema, searchFormDefaults } from "@/lib/types/forms"
import type { SearchFormValues } from "@/lib/types/forms"
import { useFlightStore } from "@/lib/store"

export function SearchForm() {
  const router     = useRouter()
  const store      = useFlightStore()
  const [pending, startTransition] = useTransition()

  const form = useForm<SearchFormValues>({
    resolver:      zodResolver(searchFormSchema),
    defaultValues: searchFormDefaults,
    mode:          "onSubmit",    // validate on submit, not on every keystroke
    reValidateMode: "onChange",   // re-validate changed fields after first submit attempt
  })

  const tripType = form.watch("tripType")

  async function onSubmit(values: SearchFormValues) {
    startTransition(async () => {
      const result = await searchFlights(values)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      store.setSearch(values)
      store.setOfferRequest(result.data.offerRequestId, result.data.passengerIds)
      router.push(`/results?orq=${result.data.offerRequestId}`)
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <TripTypePills form={form} />

        {/* Airport row */}
        <div className="flex items-center gap-2">
          <AirportCombobox
            form={form}
            name="origin"
            placeholder="From"
            className="flex-1"
          />
          <SwapButton
            onSwap={() => {
              const o = form.getValues("origin")
              const d = form.getValues("destination")
              form.setValue("origin",      d, { shouldValidate: false })
              form.setValue("destination", o, { shouldValidate: false })
            }}
          />
          <AirportCombobox
            form={form}
            name="destination"
            placeholder="To"
            className="flex-1"
          />
        </div>

        {/* Date + passengers row */}
        <div className="flex gap-3">
          <DateRangePicker
            form={form}
            mode={tripType === "round_trip" ? "range" : "single"}
            className="flex-1"
          />
          <PassengerSelector form={form} className="w-[200px]" />
        </div>

        <Button type="submit" size="lg" disabled={pending} className="w-full h-12">
          {pending ? "Searching..." : "Search flights"}
        </Button>
      </form>
    </Form>
  )
}
```

### Error Display per Field

Each sub-component uses `FormField` from shadcn to wire errors automatically:

```tsx
// Pattern used in AirportCombobox, DateRangePicker, PassengerSelector
<FormField
  control={form.control}
  name="destination"
  render={({ field, fieldState }) => (
    <FormItem>
      <FormControl>
        <AirportComboboxInput
          value={field.value}
          onChange={field.onChange}
          error={!!fieldState.error}
          placeholder="To"
        />
      </FormControl>
      <FormMessage />  {/* renders fieldState.error.message below the field */}
    </FormItem>
  )}
/>
```

### Error Scenarios

| Scenario | Field | Message |
|----------|-------|---------|
| No origin selected | `origin` | "Select a valid airport" |
| No destination selected | `destination` | "Select a valid airport" |
| Origin === destination | `destination` | "Origin and destination must differ" |
| No departure date | `departDate` | "Select a departure date" |
| Departure in the past | `departDate` | "Departure must be today or later" |
| Round-trip, no return date | `returnDate` | "Select a return date" |
| Return before departure | `returnDate` | "Return must be after departure" |
| 0 passengers total | `passengers` | "At least 1 passenger required" |

---

## 3. Passenger Form — `PassengerForm.tsx`

### Setup

Number of passenger form instances = `store.passengerIds.length` from Zustand.

```tsx
// components/passengers/PassengerForm.tsx
"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { createOrder } from "@/actions/booking"
import { passengerFormSchema } from "@/lib/types/forms"
import type { PassengerFormValues } from "@/lib/types/forms"
import { useFlightStore } from "@/lib/store"

export function PassengerForm() {
  const router  = useRouter()
  const store   = useFlightStore()
  const [pending, startTransition] = useTransition()

  const requiresPassport = store.selectedOffer?.passenger_identity_documents_required ?? false

  const form = useForm<PassengerFormValues>({
    resolver:      zodResolver(passengerFormSchema),
    defaultValues: {
      passengers: store.passengerIds.map(() => ({
        firstName:   "",
        lastName:    "",
        dateOfBirth: "",
        title:       undefined,
        gender:      undefined,
        email:       "",
        phone:       "",
        passport:    requiresPassport
          ? { number: "", expiryDate: "", issuingCountry: "" }
          : null,
      })),
    },
    mode:          "onSubmit",
    reValidateMode: "onChange",
  })

  async function onSubmit(values: PassengerFormValues) {
    startTransition(async () => {
      const result = await createOrder({
        selectedOfferId:  store.selectedOffer!.id,
        offerTotalAmount: store.selectedOffer!.total_amount,
        offerCurrency:    store.selectedOffer!.total_currency,
        passengerIds:     store.passengerIds,
        passengers:       values.passengers,
      })

      if (!result.success) {
        if (result.code === "offer_expired" || result.code === "offer_no_longer_available") {
          store.reset()
          router.push("/")
          toast.error("Session expired. Please search again.")
          return
        }
        if (result.code === "invalid_passenger_name") {
          // Highlight all name fields
          values.passengers.forEach((_, i) => {
            form.setError(`passengers.${i}.firstName`, {
              message: "Check for special characters",
            })
            form.setError(`passengers.${i}.lastName`, {
              message: "Check for special characters",
            })
          })
          toast.error("Check passenger names — no special characters allowed.")
          return
        }
        toast.error(result.error)
        return
      }

      store.setOrderId(result.data.orderId)
      router.push(`/confirmation/${result.data.orderId}`)
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Accordion type="multiple" defaultValue={["passenger-0"]}>
          {store.passengerIds.map((_, i) => (
            <PassengerCard
              key={i}
              index={i}
              form={form}
              requiresPassport={requiresPassport}
            />
          ))}
        </Accordion>
        <Button type="submit" size="lg" disabled={pending} className="h-12 w-full">
          {pending ? "Confirming booking..." : "Confirm booking"}
        </Button>
      </form>
    </Form>
  )
}
```

### `PassengerCard.tsx` — Fields per Passenger

```tsx
// components/passengers/PassengerCard.tsx
export function PassengerCard({
  index,
  form,
  requiresPassport,
}: {
  index: number
  form: UseFormReturn<PassengerFormValues>
  requiresPassport: boolean
}) {
  const prefix = `passengers.${index}` as const

  return (
    <AccordionItem value={`passenger-${index}`}>
      <AccordionTrigger className="text-base font-semibold">
        Passenger {index + 1}
      </AccordionTrigger>
      <AccordionContent className="grid grid-cols-2 gap-4 pt-2">

        {/* Title */}
        <FormField control={form.control} name={`${prefix}.title`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {["mr", "mrs", "ms", "miss", "dr"].map((t) => (
                    <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Gender */}
        <FormField control={form.control} name={`${prefix}.gender`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="m">Male</SelectItem>
                  <SelectItem value="f">Female</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* First name */}
        <FormField control={form.control} name={`${prefix}.firstName`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>First name</FormLabel>
              <FormControl><Input placeholder="Tony" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Last name */}
        <FormField control={form.control} name={`${prefix}.lastName`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last name</FormLabel>
              <FormControl><Input placeholder="Stark" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date of birth — full width */}
        <FormField control={form.control} name={`${prefix}.dateOfBirth`}
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Date of birth</FormLabel>
              <FormControl>
                <Input type="date" max={format(new Date(), "yyyy-MM-dd")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email — full width */}
        <FormField control={form.control} name={`${prefix}.email`}
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Email</FormLabel>
              <FormControl><Input type="email" placeholder="tony@example.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phone — full width */}
        <FormField control={form.control} name={`${prefix}.phone`}
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>Phone</FormLabel>
              <FormControl>
                <Input placeholder="+60123456789" {...field} />
              </FormControl>
              <FormDescription>Include country code</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Passport section — only when required by offer */}
        {requiresPassport && (
          <>
            <FormField control={form.control} name={`${prefix}.passport.number`}
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Passport number</FormLabel>
                  <FormControl><Input placeholder="A12345678" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name={`${prefix}.passport.expiryDate`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      min={format(new Date(), "yyyy-MM-dd")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField control={form.control} name={`${prefix}.passport.issuingCountry`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Issuing country</FormLabel>
                  <FormControl><Input placeholder="MY" maxLength={2} {...field} /></FormControl>
                  <FormDescription>2-letter country code</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

      </AccordionContent>
    </AccordionItem>
  )
}
```

---

## 4. Error Display Patterns

### Field-level — via `<FormMessage />`

Renders automatically below each field when `fieldState.error` is set. No custom code needed.

```
┌──────────────────────────┐
│ To                   ∨   │  ← red border when error
└──────────────────────────┘
  Origin and destination must differ  ← FormMessage
```

### Form-level API errors — via `toast`

Used when the Server Action returns `{ success: false }`:

```ts
toast.error("Session expired. Please search again.")
```

### Programmatic field errors — via `form.setError`

Used when the API returns `invalid_passenger_name` — highlights the specific fields:

```ts
form.setError(`passengers.${i}.firstName`, { message: "Check for special characters" })
```

### Accordion auto-open on error

When submit fails validation, open the first accordion item with an error:

```ts
form.handleSubmit(onSubmit, (errors) => {
  // Find first passenger index with an error
  const errorIndex = errors.passengers?.findIndex((p) => p !== undefined) ?? 0
  // Open that accordion item
  setAccordionOpen([`passenger-${errorIndex}`])
})
```

---

## 5. Dependencies

Both are already standard in Next.js + shadcn setups:

```bash
npm install react-hook-form @hookform/resolvers zod
```

Shadcn components used: `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `FormDescription` — all from `npx shadcn@latest add form`.

---

## 6. Field → API Mapping Reference

| Form field | Zod field | Maps to `POST /air/orders` |
|-----------|-----------|---------------------------|
| First name | `firstName` | `given_name` |
| Last name | `lastName` | `family_name` |
| Date of birth | `dateOfBirth` | `born_on` |
| Title | `title` | `title` |
| Gender | `gender` | `gender` |
| Email | `email` | `email` |
| Phone | `phone` | `phone_number` (E.164) |
| Passport number | `passport.number` | `identity_documents[0].unique_identifier` |
| Passport expiry | `passport.expiryDate` | `identity_documents[0].expires_on` |
| Issuing country | `passport.issuingCountry` | `identity_documents[0].issuing_country_code` |
