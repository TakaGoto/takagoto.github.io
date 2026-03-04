---
layout: post
title: "Four Claude Code Features You Probably Aren't Using"
date: 2026-03-04
categories: [development, ai, tools]
tags: [claude-code, cli, developer-tools, productivity, tips]
author: Taka Goto
---

> **TL;DR**: Claude Code has a lot more surface area than most people use.
> Here are four features that changed how I work with it day-to-day: `!` shell execution, `-p` piping, `Ctrl+G` external editor, and `@` file references.

---

## Contents
- [The ! prefix](#the--prefix)
- [The -p pipeline](#the--p-pipeline)
- [Ctrl+G — external editor](#ctrlg--external-editor)
- [@ file references](#-file-references)
- [Putting it all together](#putting-it-all-together)

---

# Four Claude Code Features You Probably Aren't Using

I've been using Claude Code daily for months now — building apps, debugging builds, reviewing diffs. For most of that time, I was using it like a chat. Type a message, get a response, copy-paste things around.

Then I stumbled into a few features that aren't really advertised. They're in the docs if you look, but nobody talks about them. Each one is small on its own, but together they completely changed the way I interact with the tool.

---

## The `!` prefix

This one is embarrassingly simple. If you type `!` before anything in the Claude Code prompt, it runs as a raw shell command. No AI interpretation, no reasoning, no "let me help you with that." Just executes.

```
! npm test
! git log --oneline -5
! ls -la src/
```

The output gets added to the conversation, so Claude can see it — but it doesn't try to "help" you run the command. It just runs.

Why this matters: sometimes you just want to check something quickly. You don't need Claude to reason about `git status`. You just want to see the output. The `!` prefix skips all the overhead. It also supports tab completion for your previous `!` commands, which makes it feel like a proper embedded terminal.

I use this constantly for quick checks mid-conversation. Run the tests, glance at a file, check the git state — all without breaking the flow.

---

## The `-p` pipeline

This is the one that made me rethink what Claude Code actually is. The `-p` flag (short for `--print`) turns Claude into a Unix-style pipe. You can feed it stdin and get stdout.

```bash
# Review a diff
git diff main | claude -p "review this for bugs"

# Explain an error
cat build-error.log | claude -p "what went wrong here"

# Summarize a file
cat README.md | claude -p "summarize in 3 bullets"
```

It runs non-interactively — no chat session, no back-and-forth. One input, one output. This means you can chain it into shell scripts, CI pipelines, git hooks, or anything else that works with stdin/stdout.

A few examples from my actual workflow:

```bash
# Quick code review before pushing
git diff --cached | claude -p "any issues with this diff?"

# Explain a crash log
cat ~/Library/Logs/DiagnosticReports/latest.crash | claude -p "explain the crash"

# Generate a commit message
git diff --cached | claude -p "write a concise commit message for this diff"
```

You can also get structured output:

```bash
claude -p "list all exported functions in src/utils.ts" --output-format json
```

This returns JSON with metadata (session ID, token usage, etc.) that you can pipe into `jq`. It turns Claude into a programmable tool instead of a chat interface.

---

## Ctrl+G — external editor

When you press `Ctrl+G` in the input, Claude Code opens your current prompt in your `$EDITOR` — Vim, VS Code, Neovim, whatever you have set.

This sounds minor until you need to write a multi-line prompt. Pasting a big block of instructions into a single-line input is painful. Copy-pasting code snippets with specific formatting is worse. And if you want to reference a previous prompt and tweak it, you're out of luck in the normal input.

With `Ctrl+G`, you get your full editor. Write your prompt with proper formatting, save and close, and it gets submitted. If you use Vim, you get all your motions, macros, and muscle memory. If you use VS Code, you get autocomplete and multi-cursor.

I reach for this whenever I need to write a detailed prompt — system instructions, multi-step plans, or anything longer than two sentences. It's the difference between writing an email in a search bar vs. a proper text editor.

---

## @ file references

In any prompt, you can reference files with `@` and they get injected directly into the context:

```
explain the auth flow in @src/auth/login.ts

what's the difference between @lib/old-utils.ts and @lib/new-utils.ts

refactor @src/components/Header.tsx to use the pattern from @src/components/Footer.tsx
```

This is faster than waiting for Claude to decide to read the file, or asking "can you read src/auth/login.ts first." The file contents are right there in the prompt, immediately available.

You can also reference directories:

```
what's the structure of @src/components
```

It's a small thing, but it removes a full round-trip from the conversation. Instead of:

1. "Read this file"
2. Claude reads it
3. "Now do X with it"

You just say:

1. "Do X with @this-file"

Over a long session, that adds up.

---

## Putting it all together

These four features work well in combination. A typical flow for me:

1. `! git diff main` — quickly see what's changed
2. `@src/auth/login.ts needs input validation, similar to @src/auth/register.ts` — reference both files inline
3. `Ctrl+G` to write a detailed prompt when the instructions get complex
4. After merging, `git log --oneline -5 | claude -p "summarize today's changes for the changelog"` in the terminal

None of these are complicated. They're just not the first things you discover when you start using Claude Code. But once you know them, going back to the basic chat-only workflow feels slow.

---
