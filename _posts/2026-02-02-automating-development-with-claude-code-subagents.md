---
layout: post
title: "Automating Development with Claude Code Sub-Agents"
date: 2026-02-02
categories: [automation, ai, development]
tags: [claude-code, agents, github-actions, workflow]
---

# Automating Development with Claude Code Sub-Agents

Over the past several months, I've been experimenting with Claude Code as my primary development tool. What started as simple conversational coding has evolved into a fully automated development pipeline. Here's what I've learned.

## Building Six Apps with Claude Code

I've now built six applications entirely with Claude Code:

- **2 Web Apps** - Full-stack applications with modern frameworks
- **2 CLI Tools** - Command-line utilities for various workflows
- **2 Mobile Apps** - Cross-platform mobile applications

These aren't simple static sites. Here's the tech stack for each:

| App | Stack |
|-----|-------|
| Web App 1 | Next.js, Supabase, cron jobs, external API integrations |
| Web App 2 | Next.js, Supabase, edge functions, authentication |
| CLI Tool 1 | Anthropic API (Haiku & Opus), OpenAI API, ElevenLabs API |
| CLI Tool 2 | Anthropic API (Haiku & Opus), OpenAI API, ElevenLabs API |
| Mobile App 1 | React Native, Supabase, authentication |
| Mobile App 2 | React Native, Supabase, authentication |

The CLIs orchestrate multiple AI providers. The web and mobile apps handle real-time data, auth flows, and serverless functions. This is production-grade complexity, not toy projects.

Initially, I built all of these using a single Claude session. I'd open a conversation, describe what I wanted, and iterate back and forth until the feature was complete. This worked, but I noticed bottlenecks—especially when working on complex features that required implementation, testing, code review, and security considerations all at once.

## The Shift to Sub-Agents

The breakthrough came when I started experimenting with sub-agents. Instead of having one Claude session do everything sequentially, I restructured my workflow to leverage parallel execution.

I created a `CLAUDE.md` file in each project repository. This file serves as project-specific instructions that Claude Code reads automatically. The key addition was explicitly instructing Claude to use sub-agents for implementation tasks:

```markdown
## Implementation Workflow (REQUIRED)

When implementing features or fixing bugs, ALWAYS use a multi-agent
workflow with the following sub-agents:

1. **Feature Dev Agent** - Implements the feature/fix
2. **Test Dev Agent** - Writes tests for the new functionality
3. **Code Review Agent** - Reviews code for bugs and best practices
4. **Security Audit Agent** - Checks for security vulnerabilities
```

This simple change transformed my workflow. The key insight is that it's a **sequential-then-parallel** pattern:

1. **First**, the Feature Dev Agent writes the implementation
2. **Then in parallel**, the remaining agents work on the completed code:
   - Test Dev Agent writes unit and integration tests
   - Code Review Agent checks for bugs, patterns, and best practices
   - Security Audit Agent scans for vulnerabilities

You can't write tests for code that doesn't exist yet, so the implementation has to come first. But once that's done, the review agents can all run simultaneously. The main session coordinates everything and addresses feedback before creating a pull request.

## The Automated Pipeline: GitHub Actions + Dev Mode

The next evolution was removing myself from the loop entirely for routine work.

I created two components:

### 1. Dev Mode Script

A local script that watches for new GitHub issues and automatically spins up Claude Code to work on them. When an issue is assigned or labeled appropriately, the script:

- Reads the issue content
- Starts a Claude Code session
- Begins the planning phase
- Executes the implementation using the sub-agent workflow
- Runs tests
- Creates a pull request
- Updates the original issue with progress and the PR link

### 2. GitHub Actions Integration

For PR iteration, I set up a GitHub Action that listens for `@claude` mentions in PR comments. When Claude generates a PR and I spot something that needs fixing, I just comment with `@claude` followed by what needs to change. GitHub Actions picks up the comment, triggers Claude, and Claude pushes a fix to the branch.

This closes the feedback loop without me having to context-switch back into my editor. Review, comment, wait for fix, review again—all from the GitHub UI.

```
PR Created → Review → @claude comment →
GitHub Action triggers → Claude fixes → Push to branch → Review again
```

## What's Next: Agent SDK

I'm planning to experiment with the Claude Agent SDK next. While the current `CLAUDE.md` approach works well for directing Claude Code's behavior, the Agent SDK offers more programmatic control:

- Custom agent orchestration logic
- More sophisticated handoffs between agents
- Integration with external tools and APIs
- Fine-grained control over agent behavior

This would let me build even more specialized workflows—perhaps agents that understand my specific codebase patterns deeply, or agents that can coordinate across multiple repositories.

## Lessons Learned

1. **Explicit instructions matter** - The `CLAUDE.md` file is powerful. Being explicit about workflow expectations dramatically improves results.

2. **Parallelize where possible** - Not everything can run in parallel (tests need code to exist first), but review, testing, and security audits can all happen simultaneously once implementation is done.

3. **Automation compounds** - Each layer of automation (sub-agents, GitHub Actions, dev-mode scripts) multiplies the productivity gains.

4. **Start simple, iterate** - I didn't build this all at once. Started with single sessions, added sub-agents, then added automation. Each step taught me what was possible.

## Conclusion

What began as "let me try this AI coding tool" has become a legitimate development workflow. Six apps later, I'm spending less time on routine implementation and more time on architecture and product decisions.

The combination of Claude Code's sub-agent capabilities, project-specific instructions via `CLAUDE.md`, and GitHub automation has created something that feels like having a development team that never sleeps.

If you're using Claude Code for single-session work, I'd encourage you to experiment with sub-agents. The productivity difference is substantial.

---

*Have questions about this workflow? Find me on GitHub or drop a comment below.*
