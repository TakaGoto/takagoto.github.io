---
layout: page
title: "Loki — TCG Finance & Match Tracker"
permalink: /projects/loki/
---

Loki is an iOS app for One Piece TCG players who want to track matches, manage trade expenses, and see how their decks actually perform over time. It started as a personal tool for logging locals and evolved into a full-featured companion app.

## What it does

- **Match logging** with opponent, decks played, result, event type, and notes
- **Expense tracking** across cards, accessories, and tournament entries
- **Win rate analytics** broken down by deck, matchup, and event type
- **Deck cost calculator** to track investment per build
- **iCloud sync** so data follows you across devices without an account

## The Stack

```
Expo / React Native    — cross-platform UI
TypeScript             — type safety throughout
Zustand                — state management
AsyncStorage           — local persistence
iCloud KV Store        — cross-device sync
RevenueCat             — subscription management
Expo Router            — file-based navigation
```

## Architecture Decisions

**Zustand over Redux.** Loki's state is straightforward — match lists, expense records, user preferences. Zustand's minimal API (`create` + selectors) keeps store files under 100 lines. There is no middleware chain to debug and no action/reducer boilerplate. For a solo-built app, that simplicity compounds fast.

**iCloud KV Store dual-write pattern.** Every store write goes to both AsyncStorage (local) and iCloud KV Store (cloud) through a custom `syncedStorage` adapter. This gives instant local reads with eventual cross-device consistency — no Supabase account required. The sync layer is transparent to the rest of the app; stores just call `set()` and the adapter handles both targets.

**File-based navigation with Expo Router.** Routes map 1:1 to the file system under `app/`. Adding a new screen is creating a file — no registration step, no navigation config to update. Deep linking works automatically.

## Challenges

**iCloud conflict resolution.** When the same store key is written on two devices before a sync round-trip, iCloud picks a winner silently. Loki handles this by treating array data (matches, expenses) as append-only logs keyed by UUID. Conflicts on scalar values (settings, preferences) use last-write-wins, which is acceptable for non-critical data.

**Excluding premium status from sync.** `isPremium` is explicitly excluded from the persisted state via Zustand's `partialize` option. Without this, a user could manipulate the iCloud KV Store value and bypass the paywall on another device. RevenueCat is the single source of truth for entitlement status — it gets checked fresh on each app launch.

**App Store review compliance.** Subscription apps get extra scrutiny. The paywall screen includes the auto-renewal disclaimer, links to both the privacy policy and Apple's standard EULA, and restores purchases on tap. Missing any of these is an automatic rejection.

## Links

- [App Store](https://apps.apple.com/us/app/loki-optcg-buddy/id6758023975)
- [Landing Page](/loki/)
