---
layout: post
title: "What AI Won't Tell You About Building a Mobile App With It"
date: 2026-01-26 12:00:00 -0600
categories: ai mobile development
---

I recently built a mobile app that uses Claude's vision API to pre-grade trading cards. Think PSA or BGS, but instant and on your phone. The tech stack is React Native (Expo), Supabase, and the Anthropic API.

I used AI heavily throughout development. It was genuinely useful — but it also led me into problems that cost real debugging time. Here's what I learned.

## The blob that was secretly empty

The first major issue was invisible. Image uploads to Supabase Storage were succeeding with **zero bytes**. The Edge Function would download the images and log `Decoding JPEG: 0 bytes`. No error. No warning. Just silence.

The AI-suggested upload code looked perfectly reasonable:

```typescript
const response = await fetch(imageUri);
const blob = await response.blob();
await supabase.storage.from('bucket').upload(path, blob);
```

The problem? In React Native, `fetch()` with a local `file://` URI produces an empty blob. This isn't a bug — it's a platform difference that doesn't exist on web. The AI had no way to know this from context alone, and the code looks correct.

The fix was to use `expo-image-manipulator` with `base64: true` and the `base64-arraybuffer` library to decode it into an ArrayBuffer for upload. A second AI suggestion — using `expo-file-system` to read the file — also failed because it required a native module rebuild we hadn't run. Two wrong turns before the right one.

**Lesson:** AI writes code for the common case. React Native's runtime quirks around local file I/O are not the common case.

## The grading pipeline that graded nothing

The original plan was a deterministic computer vision pipeline running in a Supabase Edge Function (Deno). The AI built a full pipeline: border detection for centering, corner whitening analysis, edge wear scoring, blur detection — all from raw pixel data, no OpenCV, running in a serverless function.

It shipped. It ran. It was useless.

Every single image was flagged as "blurry." Cards with visible corner whitening got a perfect 10. The centering math worked on paper but couldn't handle real-world photos with uneven lighting. The AI had produced a technically functional pipeline that had no practical accuracy.

Tuning thresholds helped with the blur false positives, but the fundamental problem was deeper: writing accurate CV heuristics for card grading is a genuinely hard domain problem. The AI treated it like a straightforward algorithmic task and produced confident, well-structured code that simply didn't work in practice.

We eventually replaced the entire pipeline with a single Claude Vision API call. The irony of using AI to replace AI-written code isn't lost on me.

## The 546 that taught me about cold math

Before we scrapped the deterministic pipeline, we hit a 546: shutdown error — the Edge Function exceeded its CPU time limit. The AI had structured the pipeline so that each grading step independently decoded the JPEG from raw bytes. For six images, that meant thirteen separate JPEG decodes of the same data. Each decode was expensive, and the cumulative cost blew past Deno's CPU budget.

The AI never considered execution cost. It wrote each function as a clean, isolated unit — good software engineering in theory, catastrophic in a serverless function with a 2-second CPU ceiling.

## The camera that couldn't focus

A more subtle issue: the AI suggested `expo-camera` with a `CameraView` component for capturing card photos. It worked, but the zoom was digital-only and the autofocus was noticeably worse than the phone's native camera app. For an app where image quality directly determines grading accuracy, this mattered.

The fix was simple — `ImagePicker.launchCameraAsync()` opens the native camera app instead. Better focus, better zoom, optical stabilization, the full native experience. But the AI never suggested this because it defaulted to the more "integrated" solution. Sometimes the less clever answer is the right one.

## The base64 that blew the stack

When we switched to the Claude Vision API, the Edge Function needed to base64-encode downloaded images. The AI wrote:

```javascript
const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
```

This works for small payloads. For a 1MB+ card photo, the spread operator exceeds the maximum call stack size. We had to chunk the encoding:

```javascript
let binary = "";
const chunkSize = 8192;
for (let i = 0; i < bytes.length; i += chunkSize) {
  binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
}
const base64 = btoa(binary);
```

A classic case of code that works in development and explodes in production with real data sizes.

## What I actually learned

AI is an incredible accelerator for boilerplate, architecture, and getting from zero to something. But it has consistent blind spots:

- **Platform-specific runtime behavior.** AI knows APIs but not their edge cases on specific runtimes. React Native is not a browser.
- **Performance constraints.** AI writes clean code, not efficient code. It doesn't think about CPU budgets, memory limits, or the cost of repeated operations.
- **Domain accuracy.** AI can build a card grading pipeline that looks right. Making it grade correctly is a different problem entirely.
- **The "good enough" trap.** AI defaults to the most common solution, not the best one for your specific context. `expo-camera` is the standard answer; `ImagePicker.launchCameraAsync()` was the right answer.

The app works well now. Claude's vision API does a legitimately good job at card grading. But getting here meant debugging problems that the AI created with confidence and I solved with `console.log`.

Build with AI. But keep your debugger close.
