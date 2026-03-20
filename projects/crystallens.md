---
layout: page
title: "CrystalLens — AI Crystal Identification"
permalink: /projects/crystallens/
---

CrystalLens is a native iOS app that identifies crystals and minerals from photographs using AI. Point your camera at a stone, get back its name, mineral properties, Mohs hardness, metaphysical attributes, and formation details. It also manages your collection so you can catalog everything you find.

## What it does

- **AI-powered identification** from camera or photo library
- **Detailed mineral profiles** with hardness, chemical composition, and origin
- **Metaphysical attributes** for the crystal-curious crowd
- **Collection management** with photos stored in the cloud
- **Apple Sign In** for zero-friction onboarding

## The Stack

```
SwiftUI (iOS 17+)          — native UI
Swift 5.9                  — MVVM with async/await
Cloudflare Workers + Hono  — edge API
Turso                      — edge-replicated SQLite
Cloudflare R2              — image storage
Anthropic Claude API       — vision-based identification
Apple Sign In              — authentication
```

## Why Native Swift

This is the first app in the lineup built with SwiftUI instead of Expo/React Native. The reasons were practical: camera performance matters when the core UX is "take a photo and get an answer," iOS-specific frameworks like `AVFoundation` and `PhotosUI` work best without a bridge layer, and building natively was a chance to learn the platform deeply rather than through an abstraction.

The MVVM architecture uses `@Observable` classes for view models and structured concurrency (`async/await`, `TaskGroup`) throughout. No Combine, no callback pyramids.

## Architecture Decisions

**Cloudflare Workers over a traditional server.** The identification flow is entirely I/O bound — receive an image, call Claude Vision, store the result, return it. Workers excel at this pattern because they do not pay for idle compute while waiting on external API calls. Hono keeps the routing layer lightweight with strong TypeScript support purpose-built for the Workers runtime.

**Turso over D1 or Postgres.** Turso gives edge-replicated SQLite: a single writer with fast reads distributed globally. The data model (users, crystals, collections) fits SQLite well, and Turso's local SQLite compatibility means the development loop is just a local `.db` file — no Docker, no hosted dev database.

**Claude Vision over a custom ML model.** Training and hosting a mineral classification model would mean dataset curation, GPU infrastructure, and a long feedback loop for accuracy improvements. Claude's vision capabilities handle the identification well enough that improving accuracy is a prompt edit, not a retraining cycle. The tradeoff is per-request API cost, but for a consumer app with moderate volume, it is manageable.

**R2 for image storage.** Zero egress fees. Crystal images are write-once, read-many — users upload a photo, then view it repeatedly in their collection. R2's S3-compatible API integrates natively with Workers via bindings, so there is no SDK to configure.

## Status

Currently building. The iOS app and backend API are in active development.

## Links

- [Landing Page](/crystallens/)
