---
layout: post
title: "Announcing RAG Academy, My First Open Source Project"
date: 2026-03-21
author: Taka Goto
categories: [ai, open-source, learning]
tags: [rag, ai, open-source, education, learning]
description: "I'm building RAG Academy, an open source, interactive way to learn RAG by actually building it. Here's why."
---

I've been thinking a lot about how we learn with AI. Not *from* AI, but *with* it.

Most tutorials out there dump a wall of theory on you, maybe show some code, and call it a day. You copy-paste, it works (sometimes), and you move on without really understanding what just happened. I've been there. I did it with RAG itself. Followed a tutorial, got it running, and still couldn't explain why my retrieval was garbage.

So I'm building something different.

## What is RAG Academy?

RAG Academy is an open source project that teaches you Retrieval-Augmented Generation by having you actually build it. Step by step. Piece by piece. No hand-waving.

Think of it like a hands-on course where every concept comes with something you can run, break, and fix yourself. Embeddings? You'll generate them. Vector search? You'll watch it find (and miss) the right chunks. Prompt engineering? You'll see exactly how bad prompts create bad answers.

The goal isn't to make you a RAG expert overnight. It's to give you the kind of understanding where you can look at a broken pipeline and *know* where to start debugging.

## The Problem with RAG Tutorials Today

If you've tried to learn RAG, you've probably noticed the same thing I did. Most of the content out there has an expiration date.

Half the tutorials use some specific vendor's API that's already changed since the post was written. The other half are thinly veiled marketing for a paid platform. "Learn RAG! (But only if you use our $200/month vector database.)" You follow along, hit a deprecated endpoint, and now you're debugging their SDK instead of learning retrieval.

And even the good ones go stale. RAG moves fast. A tutorial from six months ago might reference models that have been superseded, libraries that've had breaking changes, or best practices that nobody follows anymore.

That's one of the things I'm most excited about with RAG Academy. Because the teaching is AI-guided, the material can stay current. The LLM isn't frozen in a blog post from 2024. It knows about the latest models, the current best practices, the tools people are actually using right now. When the ecosystem moves forward, the learning experience moves with it. No waiting for someone to rewrite a tutorial. No outdated code samples that silently break.

It's also vendor-agnostic. No paid service lock-in. You learn the concepts, not someone's proprietary wrapper around the concepts.

## Why Open Source?

This is my first open source project, and honestly it feels like the only way this should exist.

I learned most of what I know about RAG from free resources. Blog posts, docs, random GitHub repos. It'd feel wrong to take that knowledge and lock it behind something. Plus, the best way to make sure the content is actually good is to let people poke holes in it.

If someone finds a better way to explain embeddings, or a cleaner code example, or catches me saying something dumb, that makes the whole thing better for everyone.

## Why AI + Learning is What Excites Me Right Now

I wrote a post recently about [slowing down to actually learn](/blog/stop-sprinting-start-learning/) instead of just shipping. That idea has been stuck in my head.

AI is incredible at generating answers. But it's even better as a learning partner. When I was building my [local RAG system](/blog/building-rag-locally-to-actually-understand-it/), the moments where I learned the most weren't when the code worked. They were when I asked "why did you do it that way?" and actually listened to the answer.

RAG Academy is me trying to bottle that experience. Instead of just reading about how vector search works, you build it. And when something doesn't make sense, you have an AI right there to ask. Not to give you the answer, but to help you find it.

## What's in It?

The plan right now:

- **Interactive lessons** that each focus on a single concept (chunking, embeddings, retrieval, generation)
- **Hands-on exercises** with real code you run yourself, not just reading
- **Build-your-own pipeline** so by the end you'll have a working RAG system you actually understand
- **Progress tracking** so you can pick up where you left off

It's still early. I'm building this in public like everything else I do. Things will change, stuff will break, and I'll probably rewrite the chunking lesson three times.

## This Feels Different

I've shipped a bunch of apps at this point. Some live, some still cooking. But this one feels different. It's not a product. It's not trying to make money. It's just me trying to make something useful for people who want to understand this stuff as much as I do.

If you're curious about RAG but every explanation you've found either assumes you have a PhD or skips the parts that actually matter, this is for you.

More updates coming soon. I'll be building this in the open and writing about the process along the way.
