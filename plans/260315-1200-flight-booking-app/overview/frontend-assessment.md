# Frontend Engineer — Take-Home Assessment

*Flight Booking Application · Next.js + React + Duffel API*

---

## Overview

Build a production-ready flight booking application using Next.js and React. The app will consume the Duffel Flights API and walk a user through the complete booking flow: searching for flights, selecting an offer, entering passenger details, and confirming a booking.

This assignment evaluates your front-end system design, state management, API integration, component architecture, and UX implementation skills.

> Time guideline: 6–8 hours.
> The use of AI tools is welcome — document which tools you used and how.

---

## Tech Stack

- **Next.js** and **React** (required)
- **TypeScript** (strongly recommended)
- **Duffel Flights API** — sign up for a free trial account at duffel.com and use your own API key
- Styling, state management, and other libraries are your choice — justify them in your documentation

API reference: https://duffel.com/docs/api/overview

---

## What to Build

Your application should cover the full booking flow described below. Each screen is a required deliverable.

### 1. Search

A flight search form that captures:

- Origin and destination (with airport auto-suggest)
- Departure date (and return date for round trips)
- Number of passengers
- Cabin class

Input components should feel polished and production-ready (e.g., date pickers, comboboxes with search).

### 2. Results Listing

Display the search results returned by the Duffel API. Required features:

- **Flight cards** showing price, airline, departure/arrival times, number of stops, and duration
- **Filtering** — by stops, airlines, departure time range
- **Sorting** — by price, duration, or departure time

The listing must be responsive and handle loading and empty states gracefully.

### 3. Passenger Details

Once the user selects a flight, collect passenger information required by the Duffel API to create an order (names, date of birth, contact details, etc.). Implement client-side validation.

### 4. Booking Confirmation

Submit the booking via the Duffel API and display a confirmation screen with the order summary. Handle API errors clearly.

---

## Documentation

Include a short written document (Markdown or PDF) covering the following:

1. **Architectural decisions** — component structure, state management approach, and data-fetching/rendering strategy (SSR, CSR, Server Components, etc.), with your rationale.
2. **Competitor analysis** — summarise the UX and UI patterns you studied from major OTAs (e.g., Trip.com, Booking.com, AirAsia, Expedia) and explain what you adopted or deliberately avoided.
3. **AI tools** — which tools you used, how you used them, and where they helped most.
4. **Setup instructions** — clear steps to run the project locally.

---

## Deliverables

1. Source code in a Git repository (GitHub, GitLab, or Bitbucket) with a clean commit history
2. A deployed, working version of the application (Vercel, Netlify, or provider of your choice)
3. The documentation described above, included in the repository

---

## What We're Looking For

| Area | What Good Looks Like |
|------|---------------------|
| **Component Architecture** | Modular, reusable components with clear separation of concerns |
| **State Management** | Thoughtful choice of tools with clear justification |
| **API Integration** | Robust data fetching with proper loading, error, and empty states |
| **UX & Visual Design** | Polished, responsive UI that feels like a real product |
| **TypeScript Usage** | Strong typing that adds safety without over-engineering |
| **Code Quality** | Clean, readable code with consistent conventions |
| **Documentation** | Clear reasoning behind decisions, not just descriptions of what was built |

---

## Tips

- Prioritise a working end-to-end flow over pixel-perfect design. A complete booking flow with good UX beats a flawless search page with nothing after it.
- Use the Duffel test environment so you can create bookings without real charges.
- Commit early and often — we value seeing how you work, not just the final result.
- If you run over the time guideline, scope down and note what you would improve given more time.

Good luck — we're looking forward to seeing what you build.
