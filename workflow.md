---
layout: page
title: How I Build
permalink: /workflow/
description: "My AI-assisted development workflow — from idea to App Store using Claude Code, multi-agent patterns, and automated quality gates."
---

I ship apps solo -- iOS and web -- using AI as my primary development partner. This page documents my current workflow, which I update as it evolves.

## The Stack

Every tool here was chosen for one reason: speed-to-ship as a solo developer.

- **Expo / React Native** -- cross-platform mobile apps that ship to iOS (and Android when needed) from a single TypeScript codebase
- **SwiftUI** -- native iOS apps where performance or platform APIs demand it
- **Next.js** -- web apps and landing pages
- **Supabase** -- auth, Postgres database, edge functions. Handles the backend I don't want to build from scratch
- **Turso** -- embedded SQLite for edge-first data
- **Cloudflare Workers** -- serverless compute at the edge
- **RevenueCat** -- in-app purchases and subscriptions without writing billing code
- **Claude Code** -- AI-assisted development across the entire workflow

No one tool does everything. But together they let one person handle frontend, backend, infrastructure, and App Store submissions without a team.

## The Multi-Agent Workflow

This is the core of how I build. For every feature or bug fix, Claude Code runs multiple specialized agents in parallel:

1. **Feature Dev Agent** -- Implements the feature or fix. This is the agent doing the actual coding work: writing components, updating stores, wiring up API calls.

2. **Test Dev Agent** -- Writes tests for the new functionality. Runs in parallel with Feature Dev so that tests are ready by the time the implementation lands.

3. **Code Review Agent** -- Reviews the code for bugs, anti-patterns, and best practices. This has caught real issues: onboarding navigation dead-ends, division-by-zero bugs in timers, stat calculation errors that would have shipped otherwise.

4. **Security Audit Agent** -- Checks for OWASP top 10 vulnerabilities, injection risks, XSS, hardcoded credentials, client-side premium bypass, and production logging leaks. This runs against every change, not just security-sensitive ones.

The PR only gets created after all four agents complete and their feedback is addressed. No exceptions.

For App Store submissions, there's a fifth agent:

5. **App Store Review Agent** -- A pre-flight audit that catches rejection-causing issues before they waste a build cycle. Hardcoded prices, missing privacy permissions, unimplemented paywall features, placeholder text. I run this before every production build.

The parallel execution is what makes this practical. Four agents running concurrently means a feature plus tests plus review can finish in minutes rather than the hours it would take sequentially.

## CLAUDE.md as the Source of Truth

Each project has a `CLAUDE.md` file at the root. This is not documentation -- it's a persistent instruction set that the AI reads at the start of every session. It contains:

- Coding conventions and architectural decisions
- Build commands and deployment workflows
- Patterns to follow (and mistakes to avoid)
- Framework-specific gotchas accumulated over time

This is what makes the AI effective across sessions. Without it, every conversation starts from zero. With it, the AI knows that Expo Router projects need `"expo-router/entry"` as their main, that `.env` vars require the `EXPO_PUBLIC_` prefix, that RevenueCat `appl_` keys work in both sandbox and production, and dozens of other project-specific details.

The file grows over time. Every hard-won lesson gets added so it never has to be learned again.

## Git Worktrees for Parallel Sessions

When multiple Claude Code sessions need to work on different features simultaneously, branch switching in a single repo creates conflicts. Worktrees solve this.

```bash
# Create a worktree for a new feature
git worktree add ../punk_records-new-feature -b feature/new-feature

# Each worktree is a full working directory with its own branch
# Run npm install, pod install, etc. independently

# Clean up when done
git worktree remove ../punk_records-new-feature
```

The main repo checkout always stays on `main`. Each worktree gets its own directory as a sibling, its own branch, and its own dependency installation. This means three Claude sessions can be building three different features at the same time without stepping on each other.

## Quality Gates

Before any PR gets created, it must pass through a series of gates:

- All four agents (Feature Dev, Test Dev, Code Review, Security Audit) must complete
- All agent feedback must be addressed -- not just acknowledged, but fixed
- Tests must pass
- The build must succeed
- For mobile apps: the App Store Review agent must run a pre-flight audit
- The PR description must include a token usage breakdown by agent

These gates are not optional. They are enforced in the `CLAUDE.md` instructions, which means the AI follows them automatically. Skipping a gate requires deliberately overriding the workflow.

## What This Enables

As a solo developer, this workflow lets one person ship at the pace of a small team. The agents catch bugs, security issues, and App Store rejection risks before they become problems. The parallel execution compresses what would be a full review cycle into a single step.

Some concrete results: the Security Audit agent caught a client-side premium bypass that would have let users skip the paywall via iCloud data manipulation. The Code Review agent found a navigation dead-end in an onboarding flow. The App Store Review agent flagged hardcoded prices that would have triggered a rejection in certain locales.

None of these were things I would have caught in a self-review at 11pm after writing the feature. That is the point.

## Tradeoffs and Limitations

This workflow is not magic. There are real limitations worth being honest about.

**Complex native debugging.** When an iOS build fails deep in Xcode's build system -- provisioning profile mismatches, entitlement conflicts, native module linking errors -- AI still struggles. These problems require understanding platform-specific toolchains that change with every OS release.

**Large codebase context.** AI works best when the scope is well-defined. A tightly scoped feature with clear acceptance criteria gets excellent results. A vague "refactor the whole app" request does not.

**Platform edge cases.** Subtle behavior differences between iOS versions, device-specific rendering bugs, and App Store review policy changes are areas where the AI has limited visibility. These still require manual testing and human judgment.

**Token cost.** Running four agents in parallel is not free. Every PR has a token budget, and complex features can burn through it. The token usage section in each PR description exists partly to keep this visible.

The workflow works best when you treat AI as a capable junior developer who needs clear direction and whose work needs review -- which is exactly what the multi-agent pattern provides.

---

*Last updated March 2026. This page is a living document -- it changes as the workflow evolves.*
