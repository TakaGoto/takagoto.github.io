---
layout: guide
title: "RAG from Scratch"
permalink: /guides/rag/
guide_slug: rag
description: "Build a Retrieval-Augmented Generation pipeline from first principles."
---

## Introduction
{: #introduction}

So I kept hearing people say "RAG is the real product" and honestly I didn't get it at first. I thought RAG was just a fancy way of saying "use an LLM." Turns out it's way more than that.

Here's the problem: if you ask an AI about your own documents, it'll just make something up. It doesn't *know* your stuff. It only knows what it was trained on. RAG fixes this. Instead of hoping the AI memorized the right info, you look up the answer first and hand it to the AI along with the question. Like an open-book exam.

I built a RAG system from scratch to actually understand how it works, and this guide is everything I learned along the way. We'll go from the concepts all the way to working code you can run on your laptop. You don't need any AI experience to follow along.


## What RAG Is
{: #what-rag-is}

Here's the simplest way I can explain it. Imagine you just started a new job and someone asks you about the company's refund policy. You can either:

1. **Guess** based on what you've seen at other companies
2. **Look it up** in the company handbook, then answer based on what you found

Option 2 is RAG. That's literally it. The letters stand for:

- **Retrieval**: find the relevant pages in the handbook
- **Augmented**: add those pages to the question as context
- **Generation**: the AI reads the context and writes an answer based on it

In practice, the steps are:

1. **Break your documents into small pieces** (called "chunks")
2. **Convert each piece into a searchable format** (I'll explain how later)
3. **When someone asks a question, find the most relevant pieces**
4. **Give those pieces to the AI along with the question**
5. **The AI writes an answer based only on what you gave it**

The best part? You never need to retrain the AI. If your documents change, you just update your search index. That's it.

### When would you use RAG instead of fine-tuning?
{: #rag-vs-fine-tuning}

You might have heard of "fine-tuning" which is another way to teach an AI new information. Here's how I think about it:

| Approach | Think of it like... | Best for |
|----------|-------------------|----------|
| **RAG** | Giving someone a cheat sheet before an exam | Answering questions from documents that change often |
| **Fine-tuning** | Tutoring someone for weeks before an exam | Changing how the AI talks or thinks about a specific domain |
| **Both** | Tutoring someone AND giving them a cheat sheet | Getting the best possible results (but the most work) |

For most projects, like building a chatbot for your company's docs or a search tool for internal knowledge, **RAG is the place to start**. It's simpler, cheaper, and easier to update.


## RAG vs Large Context Windows
{: #rag-vs-large-context-windows}

This is a question that comes up a lot. AI models keep getting bigger context windows. Claude can handle 200,000 tokens (roughly 500 pages), Gemini can handle over a million. So why not just paste all your documents into the AI and skip the retrieval step?

Two reasons.

### It's like searching vs reading every page
{: #precision-over-brute-force}

Say you have a 1,000-page company manual and someone asks "What's our vacation policy?" You could:

**Option A**: Read all 1,000 pages and try to find the answer. You might miss it. You'll definitely be slow. And if the answer is buried on page 537, you might accidentally mix it up with something you read on page 200.

**Option B**: Use the table of contents to jump straight to the "Vacation Policy" section and read just that page.

Option A is the large context window approach. Option B is RAG. Research has actually shown that AI models get *less* accurate when you give them too much text, especially when the important part is buried in the middle. I found this surprising but it makes sense when you think about it.

### It's way cheaper
{: #cost-and-latency}

AI companies charge based on how much text you send. Here's what the difference looks like:

| Approach | Text sent per question | Relative cost |
|----------|----------------------|---------------|
| **Send everything** (100 docs) | ~150,000 words | 100x |
| **RAG** (just the relevant parts) | ~1,500 words | 1x |

If you're building something that handles thousands of questions a day, this adds up fast. RAG also gives faster responses because the AI has less text to process.

### When *should* you just send everything?

The "send everything" approach works fine when you have a small amount of text and just need a one-off answer. "Summarize this 20-page report" or "Compare these two contracts." But for anything with a lot of documents and repeated queries, RAG is the way to go.


## The Smallest RAG Architecture
{: #the-smallest-rag-architecture}

Let me zoom out and show you the full picture. A RAG system has two phases:

### Phase 1: Preparation (done once, or when documents change)
{: #phase-1-preparation}

1. **Load your documents**: PDFs, text files, markdown, web pages, whatever you have
2. **Parse them into clean text**: extract the actual content and strip out formatting noise (more on this in the next section)
3. **Split them into chunks**: break each document into smaller pieces, like paragraphs or sections
4. **Convert chunks into numbers**: each chunk gets turned into a list of numbers called an "embedding" that captures its meaning (I'll explain this later, it's actually not as complicated as it sounds)
5. **Save everything**: store the numbers in a searchable index. Think of it like building a custom search engine for your documents

### Phase 2: Answering questions (happens every time someone asks something)
{: #phase-2-answering}

1. **Convert the question into numbers**: using the same method you used for the documents
2. **Find the closest matches**: search your index for the chunks that are most similar to the question
3. **Build a prompt**: combine the instructions ("answer based on this context"), the matching chunks, and the user's question
4. **Generate the answer**: send the prompt to the AI and get back an answer grounded in your actual documents

Here's what that looks like as a diagram:

```
┌─────────────┐     ┌──────────┐     ┌──────────┐     ┌───────────┐     ┌──────────┐
│  Documents   │────▶│  Parser   │────▶│ Chunker  │────▶│ Embedder  │────▶│  Vector  │
│  (PDF, MD)   │     │           │     │          │     │           │     │   Store  │
└─────────────┘     └──────────┘     └──────────┘     └───────────┘     └────┬─────┘
                                                                              │
┌─────────────┐     ┌──────────┐     ┌───────────┐                          │
│  User Query  │────▶│ Embedder  │────▶│  Search   │◀─────────────────────────┘
└─────────────┘     └──────────┘     └─────┬─────┘
                                           │
                                    ┌──────▼──────┐     ┌──────────┐
                                    │   Prompt     │────▶│   LLM    │
                                    │  Builder     │     │ Generate │
                                    └─────────────┘     └──────────┘
```

That's the entire architecture. Everything else you'll hear about (reranking, hybrid search, caching) is just optimization on top of this basic loop.


## Why Build It Locally
{: #why-build-it-locally}

You might be wondering why I'd build this on a laptop instead of using a cloud service. Honestly, it's because **you learn so much more when you can see everything breaking.**

When you run RAG locally, you get to *feel* the tradeoffs:

- Make your chunks too big and the search gets sloppy
- Make your chunks too small and the answers are incomplete
- Use a weak embedding model and it retrieves the wrong stuff
- Send too much context to the AI and it actually gets *worse*, not better

These are things that are hard to learn from reading docs but become super obvious when you see them happen on your own machine.

Plus, no API costs while you're experimenting. You can run the same question 100 times while tweaking settings and it won't cost you a penny.

### What you'll need

- **Python 3.10 or newer**
- **A few documents to test with** (markdown, text files, or PDFs)
- **At least 8GB of RAM** (16GB is better)
- **Optional**: a GPU for faster generation, but it's not required


## Document Parsing
{: #document-parsing}

Before you can chunk and search your documents, you need to turn them into clean text. This sounds boring but it's where a lot of real-world RAG projects get stuck.

**Markdown and plain text** are easy. They're already text. Just read the file.

**PDFs are a nightmare.** Seriously. A PDF is really a set of drawing instructions ("put this character at these coordinates"), not structured text. When you try to extract text from a PDF, all sorts of things go wrong:

- Tables come out as jumbled text with columns mixed together
- Headers and footers repeat on every page and end up in your chunks
- Multi-column layouts merge into one stream of text
- Scanned PDFs are just images, so you need OCR to extract text at all

**HTML** needs cleaning too. You want the article content, not the navigation bars, cookie banners, and sidebar ads.

### Tools for parsing
{: #tools-for-parsing}

| Format | Tool | Notes |
|--------|------|-------|
| Markdown / Text | Just read the file | No special tools needed |
| PDF | `PyMuPDF` (fitz), `pdfplumber` | `pdfplumber` handles tables better |
| HTML | `BeautifulSoup`, `trafilatura` | `trafilatura` is great at extracting just the article content |
| Word docs (.docx) | `python-docx` | Handles basic text extraction well |
| Scanned PDFs / Images | `pytesseract`, cloud OCR services | Much slower, lower quality |

### A practical approach

```python
from pathlib import Path

def load_docs(folder):
    docs = []
    for f in Path(folder).iterdir():
        if f.suffix == '.md' or f.suffix == '.txt':
            docs.append({"text": f.read_text(), "source": f.name})
        elif f.suffix == '.pdf':
            docs.append({"text": extract_pdf(f), "source": f.name})
    return docs

def extract_pdf(path):
    import fitz  # PyMuPDF
    doc = fitz.open(path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    # Basic cleanup: remove repeated headers/footers, fix line breaks
    lines = text.split('\n')
    cleaned = '\n'.join(line for line in lines if line.strip())
    return cleaned
```

*In plain English: this reads all files from a folder. For text and markdown, it just reads them directly. For PDFs, it uses PyMuPDF to extract the text, then does some basic cleanup.*

### The takeaway

Don't underestimate this step. If your parsing is bad, your chunks will be bad, your search will be bad, and your answers will be bad. For a first project, just stick with markdown or text files and avoid the parsing headaches entirely. That's what I did.


## Chunking Strategies
{: #chunking-strategies}

This is the part that tripped me up the most. Chunking is how you break your documents into smaller pieces, and it sounds simple but it's actually the most important step in the whole pipeline. **If your chunks are bad, everything else will be bad too.**

Think of it this way: if you ripped a textbook into random pieces, some pieces would have complete explanations and some would be cut off mid-sentence. If someone searched for "how does photosynthesis work?" and you handed them a piece that starts with "...the chloroplast. In other news, mitosis is..." they wouldn't get a useful answer. That's what bad chunking does.

### Why overlap matters
{: #why-overlap-matters}

Before we look at specific approaches, let me show you why overlap is important. When you split text into chunks, you lose context at the edges.

Here's a concrete example. Say this is your original text:
> "The refund policy allows returns within 30 days. Items must be in original packaging. Refunds are processed within 5 business days."

If you split this into two chunks right at "packaging.", the first chunk ends with "Items must be in original packaging." and the second starts with "Refunds are processed within 5 business days." Now if someone asks "How long do refunds take and what condition do items need to be in?", neither chunk has the full answer.

With overlap, the second chunk would start with "Items must be in original packaging. Refunds are processed within 5 business days." Now the second chunk has both pieces of information. Simple fix, big difference.

### Approach 1: Fixed-size windows
{: #fixed-size-windows}

The simplest approach. Split the text every N words, with some overlap.

```python
def chunk_fixed(text, chunk_size=500, overlap=50):
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - overlap):
        chunk = ' '.join(words[i:i + chunk_size])
        if chunk:
            chunks.append(chunk)
    return chunks
```

*In plain English: splits your text into groups of 500 words, with each group overlapping by 50 words with the next one so you don't lose context at the edges.*

**Good**: simple, predictable chunk sizes.
**Bad**: doesn't care about meaning. It'll happily split in the middle of a paragraph.

One thing that confused me at first: this code counts **words**, not tokens. In AI-land, a "token" is a smaller unit (roughly 1 word = 1.3 tokens). The distinction matters later when you're thinking about context window limits, but for chunking, counting words is fine.

### Approach 2: Split by headings
{: #split-by-headings}

If your documents have structure (like markdown with headings, or HTML), you can split at natural boundaries.

```python
import re

def chunk_by_headings(markdown_text):
    sections = re.split(r'\n(?=##?\s)', markdown_text)
    chunks = []
    for section in sections:
        section = section.strip()
        if section:
            chunks.append(section)
    return chunks
```

*In plain English: looks for headings in your markdown (lines starting with # or ##) and splits at each one. Each chunk is a complete section.*

**Good**: each chunk is a complete thought or topic.
**Bad**: sections can be wildly different sizes. One might be 50 words, another might be 2,000.

### Approach 3: Recursive splitting
{: #recursive-splitting}

This is what most RAG frameworks (like LangChain) use by default, and once I understood it, it made a lot of sense. The idea is to try splitting at the most meaningful boundaries first, and only fall back to simpler splits if needed.

It works like a priority list:

1. First, try to split on double newlines (paragraph breaks)
2. If any chunk is still too big, split on single newlines
3. If still too big, split on sentences (periods)
4. Last resort: split on words

```python
def chunk_recursive(text, max_size=500, overlap=50):
    separators = ['\n\n', '\n', '. ', ' ']
    chunks = []

    def split_text(text, sep_index=0):
        if len(text.split()) <= max_size:
            if text.strip():
                chunks.append(text.strip())
            return

        sep = separators[sep_index] if sep_index < len(separators) else ' '
        parts = text.split(sep)

        current = ''
        for part in parts:
            candidate = current + sep + part if current else part
            if len(candidate.split()) > max_size and current:
                chunks.append(current.strip())
                # Keep overlap from the end of the previous chunk
                overlap_words = current.split()[-overlap:] if overlap else []
                current = ' '.join(overlap_words) + sep + part if overlap_words else part
            else:
                current = candidate

        if current.strip():
            if len(current.split()) > max_size and sep_index < len(separators) - 1:
                split_text(current, sep_index + 1)
            else:
                chunks.append(current.strip())

    split_text(text)
    return chunks
```

*In plain English: tries to split at natural break points like paragraph boundaries and sentence endings. Only splits at word boundaries as a last resort. This usually produces chunks that feel like natural sections rather than arbitrary slices.*

**Good**: respects the natural structure of the text without requiring specific formatting like headings.
**Bad**: more complex code, chunk sizes can still vary.

### Tips that apply to any approach

- **Start with 300 to 800 words per chunk.** Too short and you lose meaning. Too long and you get noise.
- **Use 10 to 20% overlap** so important context isn't lost at chunk boundaries.
- **Save where each chunk came from** (the filename, section heading, page number). You'll need this later for citations.
- **Test your search results early.** Ask a few questions and check if the right chunks come back. If they don't, fix your chunking before doing anything else. I learned this the hard way.


## Embeddings Deep Dive
{: #embeddings-deep-dive}

Alright, this is the part that sounds the most intimidating but is actually pretty intuitive once you see it.

An **embedding** is just a way to convert text into a list of numbers. Why would you want to do that? Because computers are really good at comparing numbers, but terrible at comparing the *meaning* of sentences.

Here's the thing that made it click for me: when you convert text to numbers using an embedding model, **texts that mean similar things end up with similar numbers**. It's like plotting cities on a map. New York and Boston end up close together, while New York and Tokyo end up far apart. Embeddings do the same thing, but for meaning instead of geography.

### Picking an embedding model
{: #picking-an-embedding-model}

You don't need to build your own. There are pre-trained models you can download and use for free. The embedding model space moves fast, so check the [MTEB Leaderboard](https://huggingface.co/spaces/mteb/leaderboard) for the latest rankings. But here are solid options as of early 2026:

| Model | Dimensions | Speed | Quality | Runs locally? |
|-------|-----------|-------|---------|--------------|
| `all-MiniLM-L6-v2` | 384 | Fast | Good | Yes |
| `bge-small-en-v1.5` | 384 | Fast | Better | Yes |
| `nomic-embed-text` | 768 | Fast | Great | Yes (via Ollama) |
| `text-embedding-3-small` | 1536 | Fast | Great | No (OpenAI API) |
| `voyage-3-lite` | 512 | Fast | Great | No (Voyage API) |

The "dimensions" column is how many numbers each piece of text gets converted into. More numbers means more nuance, but also more memory and slower search.

For learning, start with `all-MiniLM-L6-v2`. It's fast enough to experiment with and good enough to see real results. That's what I used.

### How to generate embeddings

```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer('all-MiniLM-L6-v2')

chunks = ["RAG is a retrieval pattern", "Fine-tuning changes model weights"]
embeddings = model.encode(chunks)

# Normalize the embeddings so we can use cosine similarity later
norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
embeddings = embeddings / norms

print(embeddings.shape)  # (2, 384)
```

*In plain English: we loaded a pre-trained model, gave it two sentences, and got back two lists of 384 numbers each. Then we normalized them (scaled them so they're on the same scale), which makes comparing them more accurate later.*

### Key concepts to know
{: #key-embedding-concepts}

- **Cosine similarity** is how you measure whether two pieces of text mean similar things. Score from 0 to 1. Near 1 = very similar, near 0 = completely unrelated. For it to work right, your embeddings need to be normalized (which is what we did above).

- **You have to use the same model for everything.** If you used Model A to convert your documents into numbers, you have to use Model A to convert the question too. Mixing models is like measuring one thing in miles and another in kilometers and comparing the raw numbers. I made this mistake early on and couldn't figure out why my results were garbage.

- **More numbers = more detail, but more cost.** A 384-dimension embedding is like a rough sketch. A 1536-dimension embedding is like a detailed portrait. The detailed version catches more nuance but uses more memory and is slower to search.


## Vector Search and Retrieval
{: #vector-search-and-retrieval}

Now that your chunks are converted into numbers, you need a way to search through them quickly. This is where vector search comes in.

The idea is simple: when someone asks a question, convert the question into numbers using the same embedding model, then find the chunks whose numbers are closest to the question's numbers. "Closest" here means "most similar in meaning."

For learning, we'll use FAISS (pronounced "face"), a free tool from Facebook that does this efficiently.

### How FAISS works
{: #how-faiss-works}

Since we normalized our embeddings earlier, we'll use FAISS's inner product search (`IndexFlatIP`), which gives us cosine similarity scores directly. Higher scores = better matches.

```python
import faiss
import numpy as np

# Build the search index using inner product (cosine similarity for normalized vectors)
dimension = 384  # must match your embedding model
index = faiss.IndexFlatIP(dimension)
index.add(np.array(embeddings).astype('float32'))

# Search for similar chunks
query_embedding = model.encode(["How does RAG work?"])
# Normalize the query too
query_embedding = query_embedding / np.linalg.norm(query_embedding, axis=1, keepdims=True)

scores, indices = index.search(
    np.array(query_embedding).astype('float32'), k=3
)

# Print the top 3 results
for i, idx in enumerate(indices[0]):
    print(f"Result {i+1}: {chunks[idx]} (similarity: {scores[0][i]:.4f})")
```

*In plain English: we built a search index, asked "How does RAG work?", and it found the 3 chunks whose meaning is most similar to that question. Higher similarity score = better match.*

### Why retrieval quality matters so much
{: #why-retrieval-quality-matters}

Here's the thing that nobody warns you about: **if the search returns the wrong chunks, the AI will confidently give you a wrong answer based on those chunks.** The AI doesn't know the chunks are irrelevant. It just reads whatever you give it and does its best.

This is why retrieval is the most important part of the system. A few ways to improve it:

- **Try a better embedding model**: upgrading from a small model to a larger one can make a big difference
- **Add a reranker**: after the initial search, use a second model to re-score the results and put the best ones on top
- **Combine with keyword search**: sometimes a simple keyword match ("refund policy") works better than meaning-based search, so you can use both
- **Filter by metadata**: if you know the question is about a specific topic or time period, filter results before searching

Start with basic vector search and only add complexity when you can actually see it helping.


## Building the Pipeline
{: #building-the-pipeline}

Let's put it all together. Here's a complete, working RAG system you can run on your laptop.

### Setting up

First, install the tools:

```bash
pip install sentence-transformers faiss-cpu PyMuPDF
# For generation, install Ollama: https://ollama.com
# Then pull a model: ollama pull llama3.2
```

*Ollama lets you run AI models on your computer for free. `llama3.2` is a good starting point. Make sure Ollama is running before you try the code below.*

### The full code
{: #the-full-code}

```python
import faiss
import numpy as np
from pathlib import Path
from sentence_transformers import SentenceTransformer
import requests
import json

# 1. Load documents
def load_docs(folder):
    texts = []
    for f in Path(folder).iterdir():
        if f.suffix in ('.md', '.txt'):
            texts.append({"text": f.read_text(), "source": f.name})
    return texts

# 2. Chunk
def chunk_text(text, size=500, overlap=50):
    words = text.split()
    chunks = []
    for i in range(0, len(words), size - overlap):
        chunk = ' '.join(words[i:i + size])
        if chunk:
            chunks.append(chunk)
    return chunks

# 3. Build index
def build_index(docs):
    model = SentenceTransformer('all-MiniLM-L6-v2')
    all_chunks = []
    all_metadata = []

    for doc in docs:
        chunks = chunk_text(doc["text"])
        for chunk in chunks:
            all_chunks.append(chunk)
            all_metadata.append(doc["source"])

    embeddings = model.encode(all_chunks)
    # Normalize for cosine similarity
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings = embeddings / norms

    index = faiss.IndexFlatIP(embeddings.shape[1])
    index.add(np.array(embeddings).astype('float32'))

    return model, index, all_chunks, all_metadata

# 4. Query
def query_rag(question, model, index, chunks, metadata, k=3):
    query_vec = model.encode([question])
    query_vec = query_vec / np.linalg.norm(query_vec, axis=1, keepdims=True)

    scores, indices = index.search(
        np.array(query_vec).astype('float32'), k=k
    )

    context_parts = []
    for idx in indices[0]:
        source = metadata[idx]
        text = chunks[idx]
        context_parts.append(f"[Source: {source}]\n{text}")

    context = "\n\n".join(context_parts)

    prompt = f"""Use the following context to answer the question.
If the answer is not in the context, say "I don't have enough information."

Context:
{context}

Question: {question}

Answer:"""

    # Generate with Ollama
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={"model": "llama3.2", "prompt": prompt, "stream": False},
            timeout=60
        )
        response.raise_for_status()
        return json.loads(response.text)["response"]
    except requests.ConnectionError:
        return "Error: Can't connect to Ollama. Make sure it's running (open the Ollama app or run 'ollama serve')."
    except requests.Timeout:
        return "Error: Ollama took too long to respond. The model might still be loading. Try again in a moment."
    except Exception as e:
        return f"Error generating answer: {e}"
```

*In plain English: this does everything we've talked about. Reads your documents, splits them into chunks, converts each chunk into numbers, builds a search index, and then when you ask a question, finds the best chunks, builds a prompt, and sends it to a local AI model. If something goes wrong with the connection, it gives you a helpful error instead of crashing.*

### Running it

```python
docs = load_docs("./my-docs")
model, index, chunks, metadata = build_index(docs)

answer = query_rag("What is chunking in RAG?", model, index, chunks, metadata)
print(answer)
```

Put some markdown files in a `my-docs` folder, run the code, and ask it questions. Even this simple setup teaches you most of what matters about RAG.

---

**The basics end here.** Everything above is enough to build a working RAG system. The sections below cover the more advanced stuff: writing better prompts, measuring quality, access control, structured data, and where RAG falls flat. Come back to these when you're ready.

---


## Prompt Engineering for RAG
{: #prompt-engineering-for-rag}

The prompt is what you send to the AI along with the retrieved chunks. I thought this was a minor detail at first, but a bad prompt can completely waste good retrieval results.

Think of it this way: you just handed a research assistant the perfect stack of reference documents. But if your instructions are vague ("just answer the question"), they might ignore the documents and answer from memory instead. Same thing happens with AI.

### Four rules for good RAG prompts
{: #four-rules-for-rag-prompts}

1. **Tell the AI exactly what the context is**: "Here are excerpts from our documentation that are relevant to the question."
2. **Tell it to stay within the context**: "Answer using only the provided context."
3. **Give it permission to say 'I don't know'**: "If the context doesn't contain enough information, say so instead of guessing."
4. **Ask for citations**: "Mention which document your answer came from."

### A prompt template that works

```
You are a helpful assistant. Answer the user's question based ONLY on
the provided context. If the context doesn't contain enough information
to answer, say "I don't have enough information to answer that."

When possible, cite the source document.

Context:
{retrieved_chunks}

Question: {user_question}

Answer:
```

### Common mistakes
{: #common-prompt-mistakes}

- **Sending too many chunks**: more context isn't always better. If you send 10 chunks and only 2 are relevant, the AI might get confused by the other 8. Better to send 3 great chunks than 10 mediocre ones.
- **Not telling the AI to stick to the context**: without this instruction, the AI will happily fill in gaps with its own training data, which might be wrong for your documents.
- **Not letting the AI say "I don't know"**: AI models are people-pleasers. They'll always try to give *some* answer. You need to explicitly tell them it's okay to say "I don't have that information."


## Evaluation and Iteration
{: #evaluation-and-iteration}

You can't improve what you can't measure. Before you start tweaking your RAG system, you need a way to tell if it's actually getting better.

There are two things to measure: **is the search finding the right chunks?** and **is the AI giving good answers from those chunks?**

### Measuring search quality
{: #measuring-search-quality}

- **Recall**: out of all the chunks that *should* have been found, how many did the search actually find? If there are 3 relevant chunks and the search found 2, recall is 67%.
- **Precision**: out of all the chunks returned, how many were actually relevant? If it returned 5 chunks but only 2 were useful, precision is 40%.
- **MRR (Mean Reciprocal Rank)**: how high up is the first relevant chunk? If the best chunk is result #1, great. If it's result #5, that's worse.

### Measuring answer quality
{: #measuring-answer-quality}

- **Faithfulness**: did the AI only use info from the chunks, or did it make stuff up?
- **Relevance**: did the AI actually answer what was asked?
- **Completeness**: did the AI use all the relevant info from the chunks, or did it miss important parts?

### A simple way to test

Create a list of questions where you already know the right answer, then check if the system gets them right. This uses the `build_index` and `query_rag` functions we built earlier:

```python
# Build the index first
docs = load_docs("./my-docs")
model, index, chunks, metadata = build_index(docs)

# Define your test cases
test_cases = [
    {
        "question": "What is chunking?",
        "expected_sources": ["rag-guide.md"],
        "expected_keywords": ["split", "pieces", "documents"]
    },
    {
        "question": "How do embeddings work?",
        "expected_sources": ["rag-guide.md"],
        "expected_keywords": ["numbers", "meaning", "similar"]
    },
]

for case in test_cases:
    # Check retrieval: search and see which sources come back
    query_vec = model.encode([case["question"]])
    query_vec = query_vec / np.linalg.norm(query_vec, axis=1, keepdims=True)
    scores, indices = index.search(np.array(query_vec).astype('float32'), k=5)

    retrieved_sources = [metadata[idx] for idx in indices[0]]
    recall = len(set(case["expected_sources"]) & set(retrieved_sources)) / len(case["expected_sources"])
    print(f"\nQuestion: {case['question']}")
    print(f"  Recall@5: {recall:.0%}")
    print(f"  Top sources: {retrieved_sources}")

    # Check generation: does the answer contain expected keywords?
    answer = query_rag(case["question"], model, index, chunks, metadata)
    keyword_hits = sum(1 for kw in case["expected_keywords"] if kw.lower() in answer.lower())
    print(f"  Keyword coverage: {keyword_hits}/{len(case['expected_keywords'])}")
    print(f"  Answer preview: {answer[:150]}...")
```

*In plain English: for each test question, we check if the search found the right documents and if the answer contains the keywords we'd expect. Not perfect, but it gives you a concrete starting point.*

Start with 10 to 20 test cases that cover your most important questions. Every time you change something (chunk size, embedding model, prompt), re-run the tests. That's how you know if things got better or worse.


## Where RAG Falls Short
{: #where-rag-falls-short}

RAG is great, but it's not the right tool for everything. Knowing these limitations upfront will save you a lot of frustration.

### Math and calculations
{: #math-and-calculations}

This is the big one. RAG retrieves text and the AI generates text. Neither step can actually *do math*.

If someone asks "What was our total revenue last quarter?" and your documents have the monthly numbers ($100K in January, $120K in February, $115K in March), the AI has to add those up itself. And AI models are surprisingly bad at arithmetic, especially with larger numbers or multi-step calculations. It might guess, or confidently give the wrong number.

**The fix**: route math questions to a database query (like SQL) that does the actual computation, then let the AI explain the result. We cover this in the [hybrid RAG section](#hybrid-rag-with-structured-data).

### Summarizing large amounts of data

RAG typically retrieves 3 to 10 chunks. Great for specific questions. But "summarize all customer complaints from the last 6 months" might have 500 relevant chunks and you can only show the AI a handful.

**The fix**: pre-compute summaries and index those. Or route to a database that can scan everything.

### Comparing across multiple documents

RAG finds the best chunks for a single question but doesn't understand relationships between documents. "How does the policy in Document A contradict Document B?" might only retrieve chunks from one of them.

**The fix**: multi-step retrieval. Retrieve once, figure out what other documents are referenced, then retrieve from those too.

### Stale information

Your RAG system can only answer based on whatever's in its index. If your documents change and you don't re-index, users get outdated answers without knowing it.

**The fix**: include timestamps in your chunks and show them in answers. Set up incremental indexing rather than rebuilding everything from scratch. FAISS doesn't support deleting individual vectors, so for production you'll probably want a vector database like Pinecone or Weaviate that handles this. For truly real-time data, query the source directly instead of the index.

### Questions about things that aren't in your documents

This one bit me. RAG is biased toward finding *something*. Even if the answer genuinely isn't in your documents, it'll still retrieve the most similar chunks it can find and try to cobble together an answer.

**The fix**: set a minimum similarity threshold. If the best match is too weak, respond with "I don't have information about that" instead of generating from irrelevant context.


## Access Control in RAG
{: #access-control-in-rag}

Once your RAG system works, you'll quickly hit a new problem: **not everyone should see everything.** A support agent shouldn't be pulling up HR documents, and an intern shouldn't be retrieving board meeting notes.

### Why this matters

By default, RAG has no concept of permissions. It finds the most relevant chunks regardless of who's asking. If a confidential document gets indexed, anyone who asks the right question can surface it.

### How to add access control
{: #how-to-add-access-control}

Tag each chunk with who's allowed to see it, then filter based on who's asking.

```python
# When you index a chunk, save who can access it
chunk_record = {
    "text": chunk_text,
    "source": "q3-financials.pdf",
    "access_groups": ["finance", "executive"],
    "classification": "confidential"
}

# When someone searches, only return chunks they're allowed to see
def retrieve_with_access(query, user_groups, index, chunks, model, k=5):
    query_vec = model.encode([query])
    query_vec = query_vec / np.linalg.norm(query_vec, axis=1, keepdims=True)

    # Over-fetch significantly to account for filtered-out results
    fetch_k = min(k * 10, len(chunks))
    scores, indices = index.search(
        np.array(query_vec).astype('float32'), k=fetch_k
    )

    results = []
    for i, idx in enumerate(indices[0]):
        chunk = chunks[idx]
        if any(g in chunk["access_groups"] for g in user_groups):
            results.append({"chunk": chunk, "score": float(scores[0][i])})
        if len(results) >= k:
            break

    if len(results) < k:
        print(f"Warning: only found {len(results)} accessible results out of {k} requested")

    return results
```

*In plain English: search for way more results than you need (10x), then filter out the ones the user isn't allowed to see. We grab extra because many might get filtered out.*

### Three approaches to filtering

| Approach | How it works | Best for |
|----------|-------------|----------|
| **Pre-filter** | Build separate search indexes for each group | Faster searches, but more storage and indexes to manage |
| **Post-filter** | Search everything, then remove restricted results | Simpler, but you might end up with too few results |
| **Built-in filtering** | Use a vector database that supports filtering natively (Pinecone, Weaviate) | Best for production because it filters during the search itself |

For learning, post-filtering is fine. For production, use a vector database with built-in metadata filtering. This is honestly one of the strongest reasons to upgrade from FAISS.

### Watch out for

- **Chunk leakage**: even if you hide the document title, the chunk text itself might reveal sensitive info
- **Permission drift**: when someone's access changes, your index needs to reflect that. Old permissions = security hole
- **Inference attacks**: retrieving public chunks from related documents might let a user guess what's in the restricted ones


## Hybrid RAG with Structured Data
{: #hybrid-rag-with-structured-data}

So far we've been searching through documents (unstructured text). But real-world questions often need data from databases, spreadsheets, or APIs too.

Example: "How many customers signed up this month and what did the latest product update include?" The first half needs a database query. The second half needs a document search. Pure RAG can only handle the second half.

### The approach

Run multiple search paths at the same time and combine everything before asking the AI:

```
User Question
     │
     ├──▶ Vector Search (documents)     ──▶ relevant text chunks
     │
     ├──▶ SQL Query (database)          ──▶ rows and numbers
     │
     └──▶ Keyword Search (optional)     ──▶ keyword matches
              │
              ▼
       Combine all results
              │
              ▼
       Build prompt with everything
              │
              ▼
       AI generates the answer
```

### The hard part: deciding which path to use
{: #question-routing}

The diagram makes it look like you always run every path. In practice, the real challenge is figuring out **which path a given question needs**:

- "What's our refund policy?" → vector search only (it's in the docs)
- "How many customers signed up this month?" → SQL only (it's in the database)
- "How many customers complained about refunds last month?" → both

You can use the AI itself to classify the question:

```python
def classify_question(question, schema_description):
    prompt = f"""Given a user question, decide which data sources are needed.

Available sources:
- DOCS: search through documentation and knowledge base articles
- SQL: query the database with these tables: {schema_description}
- BOTH: need information from both docs and database

Question: {question}

Respond with exactly one word: DOCS, SQL, or BOTH."""

    response = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": "llama3.2", "prompt": prompt, "stream": False},
        timeout=30
    )
    result = json.loads(response.text)["response"].strip().upper()
    if result not in ("DOCS", "SQL", "BOTH"):
        return "DOCS"  # default to document search
    return result
```

*In plain English: before running any search, ask the AI to look at the question and decide whether it needs documents, a database query, or both. Saves time and avoids pulling in irrelevant context.*

### Turning questions into database queries
{: #questions-to-sql}

For the database part, you can use the AI to write the SQL query:

```python
def generate_sql(question, schema_description):
    prompt = f"""Given the following database schema:
{schema_description}

Convert this question to a read-only SQL query. Return ONLY the SQL, no explanation.
Only generate SELECT statements. Never generate INSERT, UPDATE, DELETE, or DROP.

Question: {question}

SQL:"""

    response = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": "llama3.2", "prompt": prompt, "stream": False},
        timeout=30
    )
    sql = json.loads(response.text)["response"].strip()
    return sql

# Example
schema = """
Table: customers (id, name, email, plan, created_at)
Table: invoices (id, customer_id, amount, status, created_at)
"""

sql = generate_sql("How many customers are on the pro plan?", schema)
# SELECT COUNT(*) FROM customers WHERE plan = 'pro'
```

*In plain English: describe your database tables to the AI, ask a question in plain English, and it writes the SQL for you. Then you run that query against the actual database.*

**Important safety note**: never run AI-generated SQL directly against a production database without safeguards. At a minimum:
- Use a **read-only database connection**
- **Validate** it's a SELECT statement (not INSERT, UPDATE, DELETE, or DROP)
- Run against a **read replica**, not production
- Set a **query timeout** so a bad query can't lock up your database

### Combining documents and data in one prompt

Label each type of context clearly so the AI knows what's what:

```python
def build_hybrid_prompt(question, chunks, structured_results):
    doc_context = "\n\n".join(
        f"[Document: {c['source']}]\n{c['text']}" for c in chunks
    )

    table_context = ""
    if structured_results:
        table_context = "\n\nStructured Data:\n"
        for row in structured_results:
            table_context += f"  {row}\n"

    return f"""Answer the question using BOTH the document context
and structured data below.

Document Context:
{doc_context}
{table_context}

Question: {question}

Answer:"""
```

### Real-world examples

- **Customer support**: search help articles (documents) + look up account status (database)
- **Internal tools**: search the company wiki (documents) + pull live metrics (API)
- **Analytics Q&A**: search written reports (documents) + query actual numbers (data warehouse)

The database path gives the AI precise facts (exact numbers, dates, statuses) while the document path gives explanations and context. Together they produce much better answers than either alone.


## Citations and Reducing Hallucination
{: #citations-and-reducing-hallucination}

"Hallucination" is when an AI makes something up and presents it as fact. This is the biggest trust problem in AI right now, and it's especially dangerous in RAG because users expect the answers to come from their actual documents.

RAG already reduces hallucination compared to asking an AI without context. But it doesn't eliminate it completely. The AI might still blend its own knowledge with the retrieved context, or interpret the context incorrectly.

**Citations are one of the best defenses.** When the AI has to say *where* each claim came from, it's much harder for it to slip in made-up facts.

### How to get citations in your answers
{: #how-to-get-citations}

Ask for them in the prompt:

```
Answer the question using ONLY the provided context.
For each claim in your answer, cite the source in brackets like [Source: filename.md].

If the context doesn't contain enough information, say
"I don't have enough information" instead of guessing.

Context:
[Source: rag-overview.md]
RAG systems retrieve relevant documents at query time and use them
to ground LLM responses in factual content.

[Source: chunking-guide.md]
Chunk sizes between 300-800 tokens work best for most use cases.
Overlap of 10-20% helps preserve context at boundaries.

Question: What chunk size should I use?

Answer:
```

A well-prompted model will respond like:

> Chunk sizes between 300-800 tokens work best for most use cases, with 10-20% overlap to preserve context at boundaries [Source: chunking-guide.md].

Now you can go check that source document and verify. That's the whole point.

### Checking citations automatically

```python
import re

def verify_citations(answer, retrieved_sources):
    cited = re.findall(r'\[Source: (.+?)\]', answer)
    valid = [c for c in cited if c in retrieved_sources]
    invalid = [c for c in cited if c not in retrieved_sources]

    return {
        "total_citations": len(cited),
        "valid": valid,
        "invalid": invalid,
        "all_valid": len(invalid) == 0
    }

# Example
result = verify_citations(
    "RAG retrieves docs at query time [Source: rag-overview.md].",
    ["rag-overview.md", "chunking-guide.md"]
)
# {"total_citations": 1, "valid": ["rag-overview.md"], "invalid": [], "all_valid": True}
```

*In plain English: looks at the AI's answer, finds all the citations, and checks if each one matches a document that was actually retrieved. If the AI cites something that wasn't in the context, you know something's wrong.*

### Other ways to reduce hallucination
{: #other-hallucination-techniques}

- **Set temperature to 0**: temperature controls how "creative" the AI is. For factual Q&A, crank it all the way down. Temperature 0 = most likely answer every time, no creativity.
- **Use structured output**: ask the AI to respond in JSON with explicit source fields. Makes it harder to sneak in unsupported claims.
- **Set a confidence threshold**: if the retrieved chunks don't match well (low similarity scores), don't generate an answer. Just say "I don't have information about that."
- **Double-check with a second AI call**: generate an answer, then ask another prompt to verify every claim is supported by the context.

```python
def check_faithfulness(answer, context):
    prompt = f"""Given the following context and answer, identify any claims
in the answer that are NOT supported by the context.

Context:
{context}

Answer:
{answer}

Unsupported claims (or "None" if all claims are supported):"""

    response = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": "llama3.2", "prompt": prompt, "stream": False},
        timeout=60
    )
    return json.loads(response.text)["response"]
```

*In plain English: take the AI's answer and ask a second AI call to play fact checker. It looks at the context and flags any claims that aren't supported. Like having an editor review the work.*

### The tradeoff to be aware of

More safeguards = the AI says "I don't know" more often. That's actually the right behavior for factual systems, where a wrong answer is worse than no answer. But if you're building something more exploratory, you might want fewer guardrails. Depends on what you're building.


## A Complete Worked Example
{: #a-complete-worked-example}

Let me walk through a real scenario from start to finish so you can see all the pieces fit together.

### The setup

Say you have a folder with 3 markdown files about a fictional company:

**company-policies.md:**
> Our return policy allows customers to return any product within 30 days of purchase for a full refund. Items must be in original packaging and unused condition. Refunds are processed within 5 business days of receiving the returned item.

**product-faq.md:**
> The Pro plan includes unlimited projects, priority support, and custom integrations. It costs $49/month when billed annually or $59/month when billed monthly. All plans include a 14-day free trial.

**onboarding-guide.md:**
> New team members should complete the security training within their first week. Access to production systems requires manager approval and completion of the security certification. The IT helpdesk can assist with account setup.

### Step 1: Build the index
{: #example-build-index}

```python
docs = load_docs("./my-docs")
model, index, chunks, metadata = build_index(docs)

print(f"Indexed {len(chunks)} chunks from {len(docs)} documents")
# Indexed 3 chunks from 3 documents
```

With short documents like these, each one becomes a single chunk. Longer documents would give you multiple chunks.

### Step 2: Ask a question

```python
question = "How long do I have to return a product?"
answer = query_rag(question, model, index, chunks, metadata)
print(answer)
```

### What happens behind the scenes
{: #example-behind-the-scenes}

1. **The question gets embedded**: "How long do I have to return a product?" becomes a list of 384 numbers

2. **FAISS searches for similar chunks**: compares those numbers against all chunk embeddings and returns the top 3:
   - `company-policies.md` (similarity: 0.82) ← most relevant
   - `product-faq.md` (similarity: 0.31)
   - `onboarding-guide.md` (similarity: 0.18)

3. **The prompt gets built**:
   ```
   Use the following context to answer the question.
   If the answer is not in the context, say "I don't have enough information."

   Context:
   [Source: company-policies.md]
   Our return policy allows customers to return any product within 30 days...

   [Source: product-faq.md]
   The Pro plan includes unlimited projects...

   [Source: onboarding-guide.md]
   New team members should complete the security training...

   Question: How long do I have to return a product?

   Answer:
   ```

4. **The AI generates an answer**: "You have 30 days from the date of purchase to return a product for a full refund. The item must be in its original packaging and unused condition."

Even though all 3 chunks were sent, the AI correctly focused on the relevant one and ignored the other two. A good prompt makes this work.

### What a bad result looks like

Now imagine someone asks: "What's the total cost of the Pro plan for a year?"

This is a math question. The document says $49/month annually, so the answer is $49 x 12 = $588. But the AI might say "$49/month billed annually" without doing the multiplication, or worse, calculate it wrong ("The annual cost is $490").

This is exactly the kind of question where you'd want to route to a structured data path instead of relying on pure RAG. I talked about this in the [limitations section](#where-rag-falls-short).


## What's Next
{: #whats-next}

That's everything I've learned about RAG so far. You now know how to take documents, parse them into clean text, break them into searchable chunks, find the right ones when someone asks a question, and generate grounded answers. You also know the gotchas: access control, structured data, hallucination, and where RAG just doesn't work.

Here's what I'm planning to explore next:

- **Hybrid search**: combine keyword search (BM25) with meaning-based search. Keyword search catches exact matches that embeddings sometimes miss, like product names or error codes.

- **Reranking**: add a second model (cross-encoder) that re-scores your top results after initial retrieval. Apparently one of the highest-impact improvements you can make because it's cheap to run on just 10-20 results.

- **Streaming**: show the answer as it's being generated word by word instead of waiting for the full response. Makes it feel way faster.

- **Caching**: save frequent queries so you don't re-compute them every time. If 50 people ask the same question, you only need to run the pipeline once.

- **Multi-modal RAG**: search through images, tables, and code alongside text. Useful when documents have diagrams or charts.

- **Production vector databases**: move from FAISS to something like Pinecone, Weaviate, or Qdrant. They handle incremental updates, metadata filtering, scaling, and backups.

The most important thing: **build the simple version first, see how it works, then improve one thing at a time.** Don't try to build the perfect system on day one. I definitely didn't.
