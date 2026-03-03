---
layout: post
title: "Apple Only Tells You One Rejection Reason at a Time"
date: 2026-03-03
categories: [development, ai, mobile]
tags: [app-store, claude-code, ios, app-review, automation]
author: Taka Goto
---

# Apple Only Tells You One Rejection Reason at a Time

If you've ever submitted an app to the App Store, you know the drill. You wait a day or two. You get a rejection email. You fix the one thing they flagged. You resubmit. You wait another day. You get rejected again for something completely different that was there the whole time.

Apple's App Store Review process doesn't give you a full list of problems. It gives you one. Maybe two if you're lucky. Then you fix those, resubmit, and discover the next layer of issues they didn't bother mentioning the first time around. Each round costs you 24-48 hours of review queue time, sometimes more.

I've been through this cycle enough times to know it's not a bug in their process. It's just how it works. The reviewer catches the first dealbreaker, flags it, and moves on. They're not incentivized to do a full audit of your app. They're processing hundreds of submissions a day.

## The Real Cost

For indie developers and small teams, this is brutal. Each rejection cycle means:

- 1-2 days waiting for review
- Context switching back to a project you thought was done
- Re-testing, re-building, re-submitting
- Explaining to users (or yourself) why the app still isn't live

I've had apps go through three or four rejection rounds before finally getting approved. The fixes themselves took minutes. The waiting took weeks.

The worst part is the false sense of progress. You fix the rejection reason, resubmit feeling confident, and then get hit with something that was sitting in your code the entire time. Missing privacy manifest. Unused permission declaration. No privacy policy link. App icon with an alpha channel. Each one obvious in hindsight, each one invisible until Apple's reviewer happened to notice it.

## Building a Pre-Flight Checklist That Actually Works

After enough rejection cycles, I started maintaining a mental checklist. Then a written one. Then I realized I was still missing things because the checklist kept growing and I'd forget to check items that hadn't bitten me recently.

So I wrote a Claude Code skill file for it. It's a markdown file called `claude-app-store-review.md` that I can point at any app in my repo before submission. The idea is simple: instead of discovering rejection reasons one at a time over two weeks, discover all of them in two minutes.

The file is structured around Apple's actual rejection hotspots, scored by category:

```
A) App Completeness & Stability
B) Login / Demo Access & Review Friction
C) Payments / IAP / Subscriptions
D) Privacy: Data Collection, Tracking (ATT), Privacy Labels, SDKs
E) Permissions & Sensitive APIs
F) Content & Safety (UGC, AI content, moderation)
G) Metadata Accuracy
H) Platform Compliance
```

Each category gets a score from 0-20. The file defines stop-ship gates that auto-fail the review if any are true: crashes on clean install, tracking SDKs without ATT, missing permission strings, IAP violations. Things that are guaranteed rejections, not maybes.

## What It Actually Found

I ran it against FitTrack, a native Swift fitness app I'm working on. The app compiles, runs fine on simulator, has real functionality. Feels done. The kind of app you'd confidently submit.

The audit found 12 issues across 4 severity levels. Here's what would have happened without it:

**Round 1 rejection: No app icon.** The `AppIcon.appiconset` had a `Contents.json` but no actual PNG file. Apple would reject this immediately. I would have fixed it, resubmitted, and waited another day.

**Round 2 rejection: Missing PrivacyInfo.xcprivacy.** Since 2024, Apple requires a privacy manifest for apps using "required reason APIs" like `FileManager` and `UserDefaults`. My app uses both. This would have been a separate rejection email with a vague reference to "ITMS-91053" that I'd have to Google.

**Round 3 rejection: No privacy policy.** The app reads HealthKit data and accesses the photo library. Apple requires a privacy policy URL both in App Store Connect and accessible from within the app. I had neither. Another day in the queue.

**Round 4 (maybe): Unused camera permission.** My `Info.plist` declares `NSCameraUsageDescription` but the app only uses `PhotosPicker`, which doesn't need camera access. Apple sometimes flags unused permission declarations. This one's borderline, they might catch it, they might not. But why risk it.

Four potential rejection rounds. Four separate waits. All for issues that existed simultaneously in the codebase from day one.

## The Skill File Approach

The key insight is that this isn't a linter or a build tool. It's a prompted audit that reads your actual source code, config files, entitlements, and plist, then cross-references everything against Apple's guidelines. It catches things that no single tool covers:

- Permission strings declared in `Info.plist` but the corresponding framework isn't used in code
- HealthKit entitlements without the right access values
- Photo library usage via `PhotosPicker` (which doesn't need permissions) vs `PHPhotoLibrary` (which does)
- Privacy policy requirements that only apply when you collect certain data types
- Notification authorization being requested without user-initiated context

A static analyzer can't catch "you have a camera permission string but never import AVFoundation." A build system can't tell you "Apple requires a privacy policy when you use HealthKit." These are cross-cutting concerns that live in the gap between your code and Apple's guidelines.

## How the File Works

The skill file is a markdown document with explicit instructions for Claude Code. It defines:

1. **Intake questions** to establish context (is there a login? IAP? tracking?)
2. **Evidence-first rules** prioritizing repo files over assumptions
3. **Category-by-category checks** with specific things to look for
4. **Stop-ship gates** that auto-fail on known rejection triggers
5. **A reviewer packet generator** for the App Store Connect review notes

The output is structured: a risk score, findings by severity, a copy-paste reviewer packet, and a submission checklist. Everything a human needs to make a go/no-go decision in 10 minutes.

```markdown
## Stop-Ship Gates (Auto FAIL)
If ANY of these are true, Stop-Ship = FAIL:
- Login required but no reviewer test credentials
- Digital goods sold but IAP compliance is unknown
- App crashes on clean install
- Tracking SDK present but ATT story is unknown
- Permissions prompts with missing/weak usage strings
- User-generated content without moderation path
- Metadata claims features not present in build
```

The tone of the file matters too. It tells Claude to be skeptical, not optimistic. To treat "unknown" as a risk, not an assumption that things are fine. To check the actual code, not just the config files.

## Why This Works Better Than a Checklist

I've tried static checklists. The problem is they're either too generic ("do you have a privacy policy?") or too specific to one app. They also can't read your code. A checklist can't tell you that your `Info.plist` declares four permissions but your Swift code only uses two of them.

The skill file approach works because it's a prompted investigation, not a checkbox. It reads your `Info.plist`, then greps your source files for the corresponding framework imports, then cross-references to see if the permission is actually used. It reads your entitlements file and checks if the capabilities match what your code does. It finds every `print()` statement that isn't gated behind `#if DEBUG`.

It's also reusable across apps. I run the same file against every app in my monorepo before submission. The audit adapts to each app's specific configuration, permissions, and features.

## The Bigger Picture

Apple's one-rejection-at-a-time process isn't going to change. It's been this way for 16 years. The incentive structure doesn't reward comprehensive feedback. Reviewers are measured on throughput, not on how many issues they catch per submission.

The only solution is to catch everything yourself before you submit. And the best way I've found to do that is to encode the collective knowledge of every rejection you've ever gotten (and every one you've read about on Stack Overflow) into a reusable audit that can read your actual codebase.

Four rejection rounds became zero. Two weeks of waiting became two minutes of reading an audit report. The issues were always there. Apple would have found them eventually. The difference is finding them all at once instead of one at a time.

---

*The irony of using AI to prevent rejections from a process that predates AI is not lost on me. But if Apple's going to review my app like it's 2010, I'm going to prep for that review like it's 2026.*
