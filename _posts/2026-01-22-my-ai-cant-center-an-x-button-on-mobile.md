---
layout: post
title: "My AI Can't Center an X Button on Mobile"
date: 2026-01-22 12:00:00 -0600
categories: ai mobile development
---

Your AI assistant can explain quantum computing, refactor legacy codebases, and write algorithms that would take you hours to figure out. But ask it to center a close button on mobile? You'll spend three prompts watching it guess wrong.

I've been a developer for 12 years at 8th Light, with the last 5 spent focusing on mobile across several React Native projects. This isn't a hit piece on AI coding tools—I use them constantly. But after watching my AI confidently generate the same broken mobile UI patterns over and over, I've started cataloging its blind spots.

## The Problem: AI Doesn't Have Thumbs

When you ask for a modal with a close button, AI gives you something like this:

```css
.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
}
```

Looks fine on desktop. On mobile, that button is:

- **Too small to tap reliably** - your thumb covers a ~40px area
- **Positioned where the notch lives** - iOS safe areas don't exist in AI's training data
- **Unreachable with one-handed use** - top-right is the worst spot for thumb ergonomics

## 1. Desktop-First Thinking

AI models are trained on codebases that skew heavily toward desktop. The web's history is desktop-first, and that bias shows up in every suggestion.

Here's what you actually need for mobile:

```css
.close-btn {
  position: absolute;
  top: env(safe-area-inset-top, 16px);
  right: 16px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn svg {
  width: 24px;
  height: 24px;
}
```

The AI doesn't think about `env(safe-area-inset-*)` because it can't see your iPhone's notch. It doesn't know your phone has a Dynamic Island eating into the top of your viewport.

## 2. Touch Target Blindness

Apple's Human Interface Guidelines say 44x44pt minimum. Google's Material Design says 48x48dp. AI gives you 24x24px because it looks "clean."

```jsx
// What AI generates
<button onClick={onClose}>
  <X size={16} />
</button>

// What works on actual thumbs
<button
  onClick={onClose}
  className="min-w-[44px] min-h-[44px] flex items-center justify-center"
>
  <X size={20} />
</button>
```

The visual icon can be small. The tap target cannot. These are different concerns that AI conflates because it only sees pixels, not fingertips.

## 3. The "It Works in My Browser" Problem

AI can't test its output. It generates code that passes a syntax check but fails the thumb test. When you report "it's not centered," it starts guessing:

```css
/* AI attempt 1 */
.close-btn { margin: 0 auto; }

/* AI attempt 2 */
.close-btn { text-align: center; }

/* AI attempt 3 */
.close-btn { left: 50%; transform: translateX(-50%); }

/* What you actually needed */
.close-btn {
  right: 16px; /* it was centered, the icon inside wasn't */
}
.close-btn svg {
  display: block; /* inline SVG was the actual problem */
}
```

Without seeing the rendered output, AI plays CSS whack-a-mole. It's debugging blind, and you're the eyes it doesn't have.

## 4. Platform-Specific Amnesia

AI forgets that mobile isn't one platform. It's two ecosystems with different conventions:

- **iOS**: Close buttons traditionally go top-left
- **Android**: Close buttons go top-left, or rely on the system back gesture
- **Web convention**: Top-right (which AI defaults to)

On React Native, the pattern gets worse:

```jsx
// AI-generated
<TouchableOpacity style={{ padding: 10 }}>
  <Text>×</Text>
</TouchableOpacity>

// What actually works
<Pressable
  style={{ padding: 12 }}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}
>
  <X size={24} color="#000" />
</Pressable>
```

AI doesn't remember `hitSlop` exists. Or `android_ripple`. Or that the `×` character renders differently across devices and fonts.

## 5. Context Collapse

The real problem: AI sees code as text, not as rendered UI.

When you say "center the X button," AI doesn't know if you mean:

- Center the button in its container
- Center the icon inside the button
- Center the button in the viewport
- Vertically center, horizontally center, or both

You end up in a debugging loop where you're the visual feedback system that AI lacks. You're describing pixels in words, and AI is translating words back to pixels, and something gets lost every round trip.

## What Actually Helps

After enough frustration, I've developed some workarounds:

**Be specific about dimensions:**
> "Make the close button 44x44 pixels with the icon centered inside using flexbox"

**Mention the platform:**
> "This is for mobile Safari on iOS with a notch"

**Reference the guidelines:**
> "Follow Apple HIG touch target minimums"

**Describe the failure mode:**
> "The button is there but I keep missing it with my thumb"

## The Takeaway

AI is a powerful code generator, but mobile development is a visual, tactile discipline. Until AI can render a page and tap a button with a simulated thumb, you'll need to:

1. Know the platform guidelines yourself
2. Specify exact dimensions upfront
3. Test on real devices
4. Treat AI suggestions as drafts, not solutions

The X button will get centered. Eventually. After you explain what "centered" means for the fifth time.

---

*The irony isn't lost on me that I probably used AI to help write this post. It's good at words. It's just bad at thumbs.*
