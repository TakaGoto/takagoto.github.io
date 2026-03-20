---
layout: post
title: "CLAUDE.md Rules vs Real Guardrails"
date: 2026-03-10
categories: [ai, dev-workflow]
tags: [ai, claude-code, workflow, developer-tools]
author: Taka Goto
description: "Prompt rules are useful, but hooks, branch protections, and CI are still the real guardrails."
---

I ran into something recently while working with Claude that reminded me of an important distinction.

In our repo, I added a rule to `CLAUDE.md`:

> Always create a PR and target `staging`.

The intention was simple.  
No direct pushes to `staging`.

Since Claude helps automate parts of the workflow, I wanted that rule to guide how changes are made.

At one point though, I pushed directly to `staging` and Claude let it happen.

So I asked why.

Its response was:

> “The rule lives in CLAUDE.md where it belongs — I just didn't follow it.”

Honestly, that answer was perfect.

It highlights something important about working with AI in a codebase.

## `CLAUDE.md` rules are guidance

Files like `CLAUDE.md` are really just instructions for the model. They explain how you want things to work.

They’re helpful. They reduce ambiguity.

But they’re still **interpreted instructions**.

A model can misunderstand them.  
Or apply them inconsistently.  
Or just… not follow them.

Which is exactly what happened.

## Real guardrails are still the same ones

When it comes to protecting a repo, the things I trust are still the traditional guardrails:

- Git hooks
- Pre-commit checks
- Branch protections
- CI pipelines

Those systems don’t interpret the rules.

They enforce them.

If a branch is protected, you simply can't push.  
If CI fails, the change doesn’t go through.

There’s no ambiguity.

## AI instructions vs enforcement

AI assistants are incredibly useful. I use them constantly now.

But this was a good reminder that prompt rules and system rules serve different purposes.

Prompt rules help guide behavior.

Actual safeguards should still live in systems that **fail closed**.

If something truly matters — like protecting a branch — I’m far more comfortable trusting hooks, protections, and CI than trusting a model to remember and apply a rule every time.

## My takeaway

`CLAUDE.md` is a great place to document expectations for an AI assistant.

But if you actually care about enforcing a rule, it should live somewhere the system **physically can’t break it**.

Prompt rules are helpful.

Hard guardrails are reliable.