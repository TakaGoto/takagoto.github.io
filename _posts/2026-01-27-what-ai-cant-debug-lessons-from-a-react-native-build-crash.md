---
layout: post
title: "What AI Can't Debug: Lessons from a React Native Build Crash"
date: 2026-01-27
categories: [mobile, ai, react-native]
tags: [expo, pnpm, monorepo, claude, ai-development]
---

I spent hours with an AI coding assistant trying to fix a crash in my React Native app. The app worked perfectly in debug mode but crashed immediately on launch in production builds. Here's what happened, and what it taught me about the limits of AI-assisted mobile development.

## The Setup

I'm building a trading card grading app with Expo SDK 52 and React Native 0.76 inside a pnpm monorepo managed by Turborepo. The monorepo also hosts a Next.js web app and several shared packages. I've been using Claude to help build the app, and for most tasks -- writing components, setting up auth flows, configuring Supabase -- it's been excellent.

Then I tried to build a preview release for TestFlight.

## The Crash

The EAS Build completed without errors. The app installed on my phone. I tapped the icon and... instant crash. The console log showed:

```
Invariant Violation: Failed to call into JavaScript module method
JSTimers.callTimers(). Module has not been registered as callable.
Bridgeless Mode: false. Registered callable JavaScript modules (n = 0).
```

Zero JavaScript modules registered. The entire JS runtime failed to initialize.

## The AI Debugging Spiral

This is where things got interesting. The AI assistant and I went through a systematic debugging process:

1. **Disabled the New Architecture** (`newArchEnabled: false`) -- didn't help
2. **Added missing `babel-preset-expo`** as an explicit dependency -- fixed the local build temporarily
3. **Forgot to push changes** before triggering EAS Build -- wasted a build cycle
4. **Tried `node-linker=hoisted`** in `.npmrc` -- this hoisted ALL monorepo dependencies including `react@19` from the Next.js app into the React Native bundle, producing a 12MB blob that also crashed
5. **Created a `metro.config.js`** with `watchFolders` pointing to the monorepo root -- Metro tried to crawl the other workspace apps' `node_modules` through pnpm symlinks and errored with `EINVAL: invalid argument, readlink`
6. **Removed `watchFolders`**, kept `nodeModulesPaths` -- Metro's `TreeFS` couldn't index pnpm's symlinked root `node_modules`
7. **Pushed the broken metro config** to the repo before testing locally -- another wasted EAS build
8. **Investigated hermesc** (the Hermes bytecode compiler) as a potential culprit -- it compiled fine, it was the bundle content that was wrong
9. **Compared bundle sizes**: working build was 5.96MB with ~2850 modules, broken build was 6.7MB with ~3300 modules. The extra 450 modules from pnpm's resolution were crashing the runtime

Each step made logical sense in isolation. The AI reasoned through the problem methodically, proposed hypotheses, and tested them. But the debugging session took hours because the feedback loop for mobile builds is painfully slow.

## What AI Gets Wrong About Mobile Development

### 1. Build Toolchain Complexity Is Opaque

The AI can read your `package.json`, `metro.config.js`, and `app.json`. What it can't see is how pnpm's symlinked `node_modules` structure interacts with Metro's `TreeFS` file indexer, which feeds into the Hermes bytecode compiler, which produces the binary blob that the Objective-C runtime loads at app launch. When something breaks in this chain, the error message (`n = 0 registered modules`) gives you almost nothing to work with.

The AI treated each layer of the build toolchain as independent. In reality, they're deeply coupled, and a decision at the package manager level (pnpm's isolation model) cascades through every layer below it.

### 2. The Feedback Loop Is Too Slow

Web development has hot reload. You change a line, you see the result in milliseconds. Mobile release builds take minutes. EAS cloud builds take 10-20 minutes. Each hypothesis the AI generated required a full rebuild cycle to test.

The AI would suggest a fix, I'd rebuild, install, launch, crash, share the log, and the AI would suggest the next fix. Nine iterations of this consumed the entire session. A developer who'd hit this exact pnpm + Metro issue before would have known the answer in minutes.

### 3. AI Commits Broken Code Confidently

Twice during the session, code was committed and pushed to the remote repository before being validated locally. The AI treated "the code compiles" as sufficient validation, but mobile apps have a critical gap between "compiles" and "runs on device." The broken `metro.config.js` was pushed to git, which meant the next EAS build was guaranteed to fail.

This isn't unique to AI -- human developers do this too. But the AI's confidence in its fix made it feel less necessary to pause and verify.

### 4. Monorepo Tooling Is Underdocumented

The AI searched Expo's docs, GitHub issues, and community posts for guidance on pnpm monorepo configuration. The official docs say SDK 52 "auto-configures" Metro for monorepos. The reality is that this auto-configuration doesn't handle pnpm's isolated `node_modules` well, and the workarounds (`node-linker=hoisted`) have side effects that aren't documented (like hoisting `react@19` from a sibling Next.js app into your React Native bundle).

The AI synthesized all available documentation correctly but the documentation itself was incomplete. No amount of reasoning can compensate for missing information.

## The Fix

We extracted the app from the monorepo into its own standalone repository. The first build produced a 5.96MB bundle with 2849 modules -- identical to the original working build. The pnpm + Metro interaction was the entire problem, and removing the monorepo removed the problem.

This wasn't a sophisticated fix. It was giving up on making the tools work together and simplifying the setup instead. The AI suggested this option after exhausting the configuration-based approaches. A more experienced mobile developer might have started here.

## What AI Is Actually Good At

To be fair, the AI was excellent at the non-debugging parts of this project:

- **Writing React Native components** with proper TypeScript types
- **Setting up Supabase auth** with Apple and Google Sign-In
- **Generating JWT secrets** from Apple's `.p8` key files
- **Configuring EAS Build** profiles and environment variables
- **Explaining error messages** and proposing hypotheses

The pattern is clear: AI excels at tasks with well-documented APIs and predictable behavior. It struggles with tasks that require understanding how multiple underdocumented systems interact at runtime.

## Takeaways

**For developers using AI assistants:**
- Always verify on device before committing mobile build changes
- If you're past the third debugging iteration without progress, step back and question your architecture
- Monorepo setups multiply the surface area for build toolchain bugs. Keep mobile apps simple unless you have a strong reason not to

**For AI tool builders:**
- Mobile development needs faster feedback loops integrated into the assistant workflow
- Build toolchain knowledge graphs (pnpm -> Metro -> Hermes -> iOS runtime) would help AI reason about cascading failures
- "Works in debug" is not "works in production" -- AI should be more skeptical of partial success signals
