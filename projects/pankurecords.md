---
layout: page
title: "Panku Records — One Piece TCG Tools"
permalink: /projects/pankurecords/
---

Panku Records is a web platform with five free AI-powered tools for One Piece TCG players. It covers card search, price tracking, deck discovery, and event browsing — all under one roof.

## What it does

A suite of tools accessible from a single site:

- **Xebec** — AI card search that understands natural language
- **Joyboy** — real-time price tracker with 24-hour movement data
- **Color Compass** — playstyle quiz that recommends deck colors
- **Foxy** — archetype quiz to find your ideal deck build
- **B** — TCG+ event browser for finding local and regional tournaments

## The Stack

```
Next.js 15 (App Router)  — framework
React 19                 — UI
TypeScript               — type safety
Supabase                 — database + auth
Vercel                   — deployment
pnpm                     — package manager
```

## Architecture Decisions

**Next.js App Router with server components.** Each sub-app has different data requirements. Server components handle the heavy data fetching (card database, price history, event listings) without shipping that logic to the client. Client components handle interactivity — quiz flows, search inputs, chart interactions. The boundary is explicit and per-component.

**Route groups for sub-apps.** The five tools live in parenthesized route groups: `(xebec)`, `(joyboy)`, `(color_compass)`, `(foxy)`. Each group gets its own layout and loading states without affecting the URL structure. Adding a new tool means creating a new route group — the shared nav and layout stay untouched.

**Supabase for everything data.** The card database, price snapshots, user wishlists, and collections all live in Supabase. Price data is ingested on a schedule and queried with range filters for trend charts. Supabase's row-level security handles multi-tenant data isolation without custom middleware.

## The Sub-Apps

**Xebec** parses natural language card queries into structured filters. Ask for "red characters under 3 cost with 5000 power" and it translates that into the right combination of color, cost, power, and type filters against the card database. The AI layer sits between the search input and the Supabase query builder.

**Joyboy** tracks market prices from TCGplayer with 24-hour price movement data. It stores periodic snapshots in Supabase and renders trend charts on the client. Users can set target prices on wishlisted cards and see at a glance what is rising or falling.

**Color Compass** is a quiz that maps playstyle preferences to One Piece TCG color identities. It asks about aggression vs. control, resource management style, and preferred win conditions, then recommends colors with explanations for why they fit.

**Foxy** goes a level deeper than Color Compass — instead of broad color recommendations, it identifies specific archetypes and deck builds. The quiz factors in budget, competitive goals, and card availability.

**B** is the newest addition. It pulls TCG+ event data and presents it in a browsable format with date, location, and format filters. The goal is to make finding local tournaments less painful than scrolling through social media posts.

## Links

- [Live Site](https://www.pankurecords.com)
- [Landing Page](/pankurecords/)
