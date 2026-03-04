---
layout: post
title: "Building RAG Locally to Actually Understand It"
date: 2026-02-12 12:30:00 -0600
categories: [ai, llm, rag]
tags: [rag, embeddings, vector-db, ollama, local, retrieval]
author: Taka Goto
description: "Building a small RAG system from scratch on a laptop to understand the ingest-chunk-embed-retrieve-generate pipeline from first principles."
---

I recently read through Databricks' tutorial on Retrieval-Augmented Generation (RAG) and it finally *clicked* why people keep saying "RAG is the real product." It's not just "use an LLM." It's a pipeline: **ingest → chunk → embed → retrieve → prompt → generate**.

So I'm building a small RAG system locally—not to ship it, but to understand the mechanics and the limits (CPU, GPU, memory, latency) from first principles.

This post is my "learn-by-building" plan and a simple baseline implementation you can run on a laptop.

---

## What RAG is (in one paragraph)

RAG = **give the model relevant context at query time**. Instead of hoping the LLM "knows" your docs, you:
1) convert docs into searchable vectors (**embeddings**),
2) fetch the most relevant chunks (**retrieval**),
3) stuff those chunks into the prompt (**augmentation**),
4) generate an answer grounded in that context.

No fine-tuning required. If your docs change, you re-index, not retrain.

---

## The smallest RAG architecture that teaches you everything

**Offline (index build):**
1. Load documents (PDF/text/markdown)
2. Chunk them (split into small passages)
3. Embed each chunk (turn text → vector)
4. Store vectors + metadata (a "vector DB", even if it's just a local file)

**Online (query):**
1. Embed the user query
2. Search vectors for nearest neighbors (top-k chunks)
3. Build a prompt with:
   - instructions,
   - retrieved chunks,
   - user question
4. Ask the LLM to answer **using only the provided context** (or to cite it)

That's it. Everything else (reranking, hybrid search, caching, evals) is "RAG v2."

---

## Why I'm doing this locally

Local RAG is great for learning because you *feel* the tradeoffs:

- Chunk size too big → retrieval gets fuzzy + context fills up fast
- Chunk size too small → you lose meaning + answers get fragmented
- Embeddings too weak → "it retrieves the wrong stuff"
- Context too long → latency spikes + answers get worse, not better
- CPU-only → embeddings might be fine, generation can be slow
- GPU → fast generation, but VRAM becomes the hard ceiling

---

## The "gotchas" that make or break a RAG system

### 1) Chunking matters more than you think
Most failures are chunking failures.

Common approaches:
- **Fixed token/char windows + overlap** (simple and solid)
- **Markdown/heading-aware splitting** (better for docs)
- **Semantic splitting** (fancier; not needed for v1)

Rules of thumb:
- Start with ~300–800 tokens per chunk
- Use overlap (~10–20%) so important context isn't split away
- Store metadata: filename, section heading, page, etc.

### 2) Retrieval quality is the real product
If retrieval returns junk, the LLM will confidently summarize junk.

You'll eventually want:
- better embeddings,
- **reranking** (a second model that re-orders results),
- or hybrid search (keyword + vectors).

But first: build the baseline.

### 3) Context limits are a *budget*
Even with long-context models, you should treat context as expensive:
- More context != better
- Irrelevant context actively harms answers

---

## A minimal local RAG baseline

For my baseline I'm keeping the stack simple:
- **FAISS** for local vector search
- **sentence-transformers** for embeddings
- Any local LLM for generation (e.g. via Ollama)

> You can swap components later. The point is to make the pipeline real.

The flow is straightforward: load your docs, split them into chunks, embed each chunk with a sentence-transformer model, and store the vectors in a FAISS index. At query time, embed the question, find the top-k nearest chunks, pack them into a prompt, and send it to the LLM with instructions to answer using only the provided context.

Even this bare-bones setup teaches you most of what matters—chunking tradeoffs, retrieval quality, and how context length affects answers.
