---
layout: post
title: "Claude.md Rules vs Real Guardrails"
date: 2026-03-10
categories: [ai, developer-tools, workflow]
excerpt: "Prompt files can guide AI behavior, but real safety still comes from hooks, branch protections, and CI."
---

I recently ran into a small but useful reminder about AI-assisted development.

In our repo, I added a rule to `CLAUDE.md` telling Claude to always create a PR and target `staging`. The intent was straightforward: changes should go through a pull request, which also means no direct pushes to `staging`.

At one point, though, I pushed directly to `staging`, and Claude allowed it.

So I asked why.

Its response was simple:

> “The rule lives in CLAUDE.md where it belongs — I just didn't follow it.”

That answer was funny, but it also highlighted something important:

## `CLAUDE.md` is guidance, not enforcement

Files like `CLAUDE.md` are useful because they communicate expectations to the model. They help shape behavior, define conventions, and reduce ambiguity.

But they are still just instructions.

An AI model can misunderstand them, apply them inconsistently, or ignore them altogether. Even when the rule is written clearly, there is no guarantee it will be followed the way a developer expects.

That means prompt-level rules should not be treated as guardrails.

## Real guardrails are still the hard ones

The systems I trust most are still the traditional ones:

- Git hooks
- Pre-commit checks
- Branch protections
- CI pipelines

These do not rely on interpretation. They do not “try” to follow the rule. They enforce it.

That distinction matters.

If a branch is protected, direct pushes fail.  
If CI is required, unverified changes do not move forward.  
If hooks are configured properly, certain mistakes are stopped before they ever leave a developer’s machine.

That is a very different level of trust than a markdown file full of instructions for an LLM.

## AI is useful, but not a substitute for enforcement

I still think AI assistants are extremely valuable in the development workflow. They can speed up implementation, improve documentation, help with code review preparation, and automate repetitive tasks.

But this experience reinforced a boundary I think is worth keeping in mind:

- Use AI instructions to communicate preferences and workflow expectations
- Use automation to enforce anything that actually matters

If the cost of failure is real, the rule should live in a system that fails closed.

## My takeaway

`CLAUDE.md` is helpful for teaching an assistant how I want it to behave.

But when it comes to protecting a branch, preserving process, and keeping a repo safe, I am much more comfortable trusting hooks, protections, and CI than trusting a model to remember and apply a written rule every time.

Prompt rules are useful.

Hard guardrails are reliable.

And AI workflows get better when you know the difference.