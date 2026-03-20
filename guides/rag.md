---
layout: guide
title: "RAG from Scratch"
permalink: /guides/rag/
guide_slug: rag
description: "Build a Retrieval-Augmented Generation pipeline from first principles."
---

## Introduction
{: #introduction}

Have you ever asked ChatGPT a question about your own documents and gotten a completely made-up answer? That's because the AI doesn't actually *know* your stuff. It only knows what it was trained on.

RAG (Retrieval-Augmented Generation) solves this. Instead of hoping the AI has the right information memorized, you **look up the answer first** and then hand it to the AI along with the question. Think of it like an open-book exam: the AI doesn't need to memorize everything, it just needs to know where to look.

This guide walks you through building a RAG system from scratch. We'll start with the concepts, then build a working version you can run on your laptop. No prior AI experience needed.


## What RAG Is
{: #what-rag-is}

Imagine you're a new employee at a company. Someone asks you a question about the company's refund policy. You have two options:

1. **Guess** based on what you've seen at other companies
2. **Look it up** in the company handbook, then answer based on what you found

Option 2 is RAG. Here's what each letter stands for:

- **Retrieval**: find the relevant pages in the handbook
- **Augmented**: add those pages to the question as context
- **Generation**: the AI reads the context and writes an answer based on it

The actual steps look like this:

1. **Break your documents into small pieces** (called "chunks")
2. **Convert each piece into a searchable format** (we'll explain how later)
3. **When someone asks a question, find the most relevant pieces**
4. **Give those pieces to the AI along with the question**
5. **The AI writes an answer based only on what you gave it**

The beauty of this approach is that you never need to retrain the AI. If your documents change, you just update your search index. That's it.

### When would you use RAG instead of fine-tuning?
{: #rag-vs-fine-tuning}

You might have heard of "fine-tuning," which is another way to teach an AI new information. Here's the difference:

| Approach | Think of it like... | Best for |
|----------|-------------------|----------|
| **RAG** | Giving someone a cheat sheet before an exam | Answering questions from documents that change often |
| **Fine-tuning** | Tutoring someone for weeks before an exam | Changing how the AI talks or thinks about a specific domain |
| **Both** | Tutoring someone AND giving them a cheat sheet | Getting the best possible results (but the most work) |

For most projects, like building a chatbot for your company's docs or a search tool for internal knowledge, **RAG is the place to start**. It's simpler, cheaper, and easier to update.


## RAG vs Large Context Windows
{: #rag-vs-large-context-windows}

AI models keep getting smarter. Claude can handle 200,000 tokens of text (roughly 500 pages), and Gemini can handle over a million. So a fair question is: why not just paste all your documents directly into the AI and skip the retrieval step entirely?

Two big reasons.

### It's like searching vs reading every page
{: #precision-over-brute-force}

Imagine you have a 1,000-page company manual and someone asks, "What's our vacation policy?" You could:

**Option A**: Read all 1,000 pages and try to find the answer. You might miss it. You'll definitely be slow. And if the answer is buried on page 537, you might accidentally mix it up with something you read on page 200.

**Option B**: Use the table of contents to jump straight to the "Vacation Policy" section and read just that page.

Option A is the large context window approach. Option B is RAG. RAG gives the AI *only* the relevant information, so it's more likely to give you an accurate answer. Research has shown that AI models actually get *less* accurate when you give them too much text, especially when the important part is buried in the middle.

### It's way cheaper
{: #cost-and-latency}

AI companies charge you based on how much text you send. Here's a rough comparison:

| Approach | Text sent per question | Relative cost |
|----------|----------------------|---------------|
| **Send everything** (100 docs) | ~150,000 words | 100x |
| **RAG** (just the relevant parts) | ~1,500 words | 1x |

If you're building something that handles thousands of questions a day, this difference adds up fast. RAG also gives faster responses because the AI has less text to process.

### When *should* you just send everything?

The "send everything" approach works fine when you have a small amount of text and just need a one-off answer. For example, "Summarize this 20-page report" or "Compare these two contracts." But for anything with a lot of documents and repeated queries, RAG is the way to go.


## The Smallest RAG Architecture
{: #the-smallest-rag-architecture}

Let's zoom out and look at the full picture. A RAG system has two phases:

### Phase 1: Preparation (done once, or when documents change)
{: #phase-1-preparation}

1. **Load your documents**: these could be PDFs, text files, markdown files, web pages, whatever you have
2. **Parse them into clean text**: extract the actual content and strip out formatting noise (more on this in the next section)
3. **Split them into chunks**: break each document into smaller pieces (like paragraphs or sections)
4. **Convert chunks into numbers**: each chunk gets turned into a list of numbers called an "embedding" that captures its meaning (more on this later)
5. **Save everything**: store the numbers in a searchable index, kind of like building a custom search engine for your documents

### Phase 2: Answering questions (happens every time someone asks something)
{: #phase-2-answering}

1. **Convert the question into numbers**: using the same method you used for the documents
2. **Find the closest matches**: search your index for the chunks that are most similar to the question
3. **Build a prompt**: combine the instructions ("answer based on this context"), the matching chunks, and the user's question
4. **Generate the answer**: send the prompt to the AI and get back an answer that's grounded in your actual documents

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

You might be wondering why we'd build this on a laptop instead of using a cloud service. The answer is simple: **you learn better when you can see everything breaking.**

When you run RAG locally, you get to *feel* the tradeoffs firsthand:

- Make your chunks too big and the search gets sloppy
- Make your chunks too small and the answers are incomplete
- Use a weak embedding model and it retrieves the wrong stuff
- Send too much context to the AI and it actually gets *worse*, not better

These are lessons that are hard to learn from reading docs but obvious when you see them happen on your own machine.

Plus, there's a practical benefit: no API costs while you're experimenting. You can run the same question 100 times while tweaking settings and it won't cost you a penny.

### What you'll need

- **Python 3.10 or newer** (the programming language we'll use)
- **A few documents to test with** (markdown, text files, or PDFs)
- **At least 8GB of RAM** (16GB is better)
- **Optional**: a GPU for faster generation, but it's not required


## Document Parsing
{: #document-parsing}

Before you can chunk and search your documents, you need to turn them into clean text. This step sounds boring, but it's where a lot of real-world RAG projects run into trouble.

**Markdown and plain text** are easy. They're already text. You just read the file.

**PDFs are hard.** A PDF is really a set of drawing instructions ("put this character at these coordinates"), not structured text. When you extract text from a PDF, you can run into all kinds of problems:

- Tables come out as jumbled text with columns mixed together
- Headers and footers repeat on every page and end up in your chunks
- Multi-column layouts merge into one stream of text
- Scanned PDFs are just images, so you need OCR (optical character recognition) to extract text at all

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

*In plain English: this code reads all files from a folder. For text and markdown files, it just reads them directly. For PDFs, it uses PyMuPDF to extract the text, then does some basic cleanup to remove blank lines.*

### The takeaway

Don't underestimate this step. If your parsing is bad, your chunks will be bad, your search will be bad, and your answers will be bad. It's worth spending time getting clean text before moving on. For a first project, stick with markdown or text files to avoid the parsing headaches entirely.


## Chunking Strategies
{: #chunking-strategies}

Chunking is how you break your documents into smaller pieces. This might sound simple, but it's actually the most important step in the whole pipeline. **If your chunks are bad, everything else will be bad too.**

Think of it this way: if you ripped a textbook into random pieces, some pieces would have complete explanations and some would be cut off mid-sentence. If someone searched for "how does photosynthesis work?" and you handed them a piece that starts with "...the chloroplast. In other news, mitosis is..." they wouldn't get a useful answer.

### Why overlap matters
{: #why-overlap-matters}

Before we look at specific approaches, let's talk about overlap. When you split text into chunks, you lose context at the edges. Here's a concrete example:

Imagine this is your original text:
> "The refund policy allows returns within 30 days. Items must be in original packaging. Refunds are processed within 5 business days."

If you split this into two chunks right at "packaging.", the first chunk ends with "Items must be in original packaging." and the second starts with "Refunds are processed within 5 business days." Now if someone asks "How long do refunds take and what condition do items need to be in?", neither chunk has the full answer.

With overlap, the second chunk would start with "Items must be in original packaging. Refunds are processed within 5 business days." Now the second chunk has both pieces of information.

### Approach 1: Fixed-size windows
{: #fixed-size-windows}

The simplest approach is to split the text every N words, with some overlap between chunks.

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

*In plain English: this takes your text, splits it into groups of 500 words, and makes each group overlap by 50 words with the next one. The overlap means you won't accidentally lose context between two chunks.*

**Good**: simple, predictable chunk sizes.
**Bad**: doesn't care about meaning. It'll happily split in the middle of a paragraph.

A note about words vs tokens: this code counts **words**, not tokens. In AI-land, a "token" is a smaller unit (roughly 1 word = 1.3 tokens). The distinction matters when you're thinking about context window limits later, but for chunking, counting words is fine and much simpler.

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

*In plain English: this looks for headings in your markdown document (lines starting with # or ##) and splits the document at each heading. Each chunk is a complete section.*

**Good**: each chunk is a complete thought or topic.
**Bad**: sections can be very different sizes (one might be 50 words, another might be 2,000).

### Approach 3: Recursive splitting
{: #recursive-splitting}

This is what most RAG frameworks (like LangChain) use by default. The idea is to try splitting at the most meaningful boundaries first, and only fall back to simpler splits if needed.

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

*In plain English: this tries to split your text at natural break points like paragraph boundaries and sentence endings. It only splits at word boundaries as a last resort. This usually produces chunks that feel like natural sections rather than arbitrary slices.*

**Good**: respects the natural structure of the text without requiring specific formatting like headings.
**Bad**: more complex code, chunk sizes can still vary.

### Tips that apply to any approach

- **Start with 300 to 800 words per chunk.** Too short and you lose meaning. Too long and you get noise.
- **Use 10 to 20% overlap** so important context isn't lost at chunk boundaries.
- **Save where each chunk came from** (the filename, section heading, page number). You'll need this later for citations.
- **Test your search results early.** Ask a few questions and check if the right chunks come back. If they don't, fix your chunking before doing anything else.


## Embeddings Deep Dive
{: #embeddings-deep-dive}

This is the part that sounds the most intimidating but is actually pretty intuitive once you see it.

An **embedding** is just a way to convert text into a list of numbers. Why would you want to do that? Because computers are really good at comparing numbers, but not great at comparing the *meaning* of sentences.

Here's the key insight: when you convert text to numbers using an embedding model, **texts that mean similar things end up with similar numbers**. It's like plotting cities on a map. New York and Boston end up close together, while New York and Tokyo end up far apart. Embeddings do the same thing, but for meaning instead of geography.

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

The "dimensions" column is how many numbers each piece of text gets converted into. More numbers can capture more nuance, but use more memory and are slower to search.

For learning, start with `all-MiniLM-L6-v2`. It's fast enough to experiment with and good enough to see real results.

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

*In plain English: we loaded a pre-trained model, gave it two sentences, and it gave us back two lists of 384 numbers each. Then we "normalized" the numbers (scaled them so they're all on the same scale), which makes comparing them more accurate later. Those numbers represent the "meaning" of each sentence in a way that a computer can compare.*

### Key concepts to know
{: #key-embedding-concepts}

- **Cosine similarity** is how we measure whether two pieces of text mean similar things. It gives a score from 0 to 1. A score near 1 means "very similar meaning" and near 0 means "completely unrelated." For cosine similarity to work correctly, your embeddings need to be normalized (which is what we did above).

- **You must use the same model for everything.** If you used Model A to convert your documents into numbers, you have to use Model A to convert the question too. Mixing models is like measuring one thing in miles and another in kilometers and comparing the raw numbers.

- **More numbers = more detail, but more cost.** A 384-dimension embedding is like a rough sketch. A 1536-dimension embedding is like a detailed portrait. The detailed version catches more nuance but uses more memory and is slower to search.


## Vector Search and Retrieval
{: #vector-search-and-retrieval}

Now that your chunks are converted into numbers (embeddings), you need a way to search through them quickly. This is where vector search comes in.

The idea is simple: when someone asks a question, convert the question into numbers using the same embedding model, then find the chunks whose numbers are closest to the question's numbers. "Closest" here means "most similar in meaning."

For learning, we'll use FAISS (pronounced "face"), a free tool from Facebook that does this efficiently.

### How FAISS works
{: #how-faiss-works}

Since we normalized our embeddings earlier, we'll use FAISS's inner product search (`IndexFlatIP`), which gives us cosine similarity scores directly. Higher scores mean better matches.

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

*In plain English: we built a search index from our chunk embeddings, then asked "How does RAG work?" The system found the 3 chunks whose meaning is most similar to that question. The higher the similarity score, the better the match (1.0 would be a perfect match).*

### Why retrieval quality matters so much
{: #why-retrieval-quality-matters}

Here's something that trips people up: **if the search returns the wrong chunks, the AI will confidently give you a wrong answer based on those chunks.** The AI doesn't know the chunks are irrelevant. It just reads whatever you give it and does its best.

This is why retrieval is the most important part of the system. A few ways to improve it:

- **Try a better embedding model**: upgrading from a small model to a larger one can make a big difference
- **Add a reranker**: after the initial search, use a second model to re-score the results and put the best ones on top
- **Combine with keyword search**: sometimes a simple keyword match ("refund policy") works better than meaning-based search, so you can use both
- **Filter by metadata**: if you know the question is about a specific topic or time period, filter results before searching

Start with basic vector search and only add complexity when you can see it's actually helping.


## Building the Pipeline
{: #building-the-pipeline}

Let's put it all together. Here's a complete, working RAG system you can run on your laptop.

### Setting up

First, install the tools we need:

```bash
pip install sentence-transformers faiss-cpu PyMuPDF
# For generation, install Ollama: https://ollama.com
# Then pull a model: ollama pull llama3.2
```

*Ollama lets you run AI models on your computer for free. The `llama3.2` model is a good starting point. Make sure Ollama is running before you try the code below.*

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

*In plain English: this code does everything we've talked about. It reads your documents, splits them into chunks, converts each chunk into numbers (and normalizes them), builds a search index, and then when you ask a question, it finds the best matching chunks, puts them into a prompt, and sends it to a locally running AI model for an answer. If something goes wrong with the AI connection, it gives you a helpful error message instead of crashing.*

### Running it

```python
docs = load_docs("./my-docs")
model, index, chunks, metadata = build_index(docs)

answer = query_rag("What is chunking in RAG?", model, index, chunks, metadata)
print(answer)
```

Put some markdown files in a `my-docs` folder, run the code, and ask it questions. Even this simple setup will teach you most of what matters about RAG.

---

**The basics end here.** Everything above is enough to build a working RAG system. The sections below cover more advanced topics: writing better prompts, measuring quality, handling real-world complications like access control and structured data, and understanding where RAG struggles. Read them when you're ready to level up.

---


## Prompt Engineering for RAG
{: #prompt-engineering-for-rag}

The prompt is the instruction you send to the AI along with the retrieved chunks. You might think this is a minor detail, but a bad prompt can completely waste good retrieval results.

Think of it this way: you just handed a research assistant the perfect stack of reference documents. But if your instructions are vague ("just answer the question"), they might ignore the documents and answer from memory instead.

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

- **Sending too many chunks**: more context isn't always better. If you send 10 chunks and only 2 are relevant, the AI might get confused by the other 8. It's better to send 3 great chunks than 10 mediocre ones.
- **Not telling the AI to stick to the context**: without this instruction, the AI will happily fill in gaps with its own training data, which might be wrong for your specific documents.
- **Not letting the AI say "I don't know"**: AI models are people-pleasers. They'll always try to give *some* answer. You need to explicitly tell them it's okay to say "I don't have that information."


## Evaluation and Iteration
{: #evaluation-and-iteration}

You can't improve what you can't measure. Before you start tweaking your RAG system, you need a way to tell if it's actually getting better.

There are two things to measure: **is the search finding the right chunks?** and **is the AI giving good answers from those chunks?**

### Measuring search quality
{: #measuring-search-quality}

- **Recall**: out of all the chunks that *should* have been found, how many did the search actually find? If there are 3 relevant chunks in your index and the search found 2 of them, recall is 67%.
- **Precision**: out of all the chunks the search returned, how many were actually relevant? If it returned 5 chunks but only 2 were useful, precision is 40%.
- **MRR (Mean Reciprocal Rank)**: how high up in the results is the first relevant chunk? If the best chunk is the very first result, great. If it's the fifth result, that's worse.

### Measuring answer quality
{: #measuring-answer-quality}

- **Faithfulness**: did the AI only use information from the chunks you gave it, or did it make stuff up?
- **Relevance**: did the AI actually answer the question that was asked?
- **Completeness**: did the AI use all the relevant information from the chunks, or did it miss important parts?

### A simple way to test

Create a list of questions where you already know what the right answer looks like, then check if the system gets them right. This uses the `build_index` and `query_rag` functions we built earlier:

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

*In plain English: for each test question, we check two things. First, did the search find the right documents? Second, does the AI's answer contain the keywords we'd expect? It's not perfect, but it gives you a concrete starting point to measure improvements.*

Start with 10 to 20 test cases that cover your most important questions. This gives you a baseline. Every time you change something (chunk size, embedding model, prompt), re-run the tests to see if things got better or worse.


## Where RAG Falls Short
{: #where-rag-falls-short}

RAG is a great tool, but it's not the right tool for every job. Knowing its weaknesses upfront will save you from frustration later.

### Math and calculations
{: #math-and-calculations}

This is the big one. RAG retrieves text and the AI generates text. Neither step can actually *do math*.

If someone asks "What was our total revenue last quarter?" and your documents have the monthly numbers ($100K in January, $120K in February, $115K in March), the AI has to add those up itself. And AI models are surprisingly bad at arithmetic, especially with larger numbers or multi-step calculations.

Questions like these are especially problematic:
- "What's the average deal size across 200 accounts?"
- "How much did costs increase year over year as a percentage?"
- "Which region had the highest growth rate?"

The AI might guess, or confidently give you the wrong number. It doesn't have a calculator built in.

**The fix**: for questions involving math, don't rely on RAG alone. Route them to a database query (like SQL) that can do the actual computation, then let the AI explain the result in plain language. We cover this in the [hybrid RAG section](#hybrid-rag-with-structured-data).

### Summarizing large amounts of data

RAG typically retrieves 3 to 10 chunks. That works great for specific questions. But if someone asks "Summarize all customer complaints from the last 6 months," you might have 500 relevant chunks and you can only show the AI a handful of them.

**The fix**: for broad summary questions, pre-compute summaries and index those. Or route the question to a database that can scan everything.

### Comparing across multiple documents

RAG finds the best chunks for a single question, but it doesn't understand relationships between documents. If someone asks "How does the policy in Document A contradict what's in Document B?", basic RAG might only retrieve chunks from one of the two documents.

**The fix**: use multi-step retrieval. Retrieve once, figure out what other documents are referenced, then retrieve from those too.

### Stale information

Your RAG system can only answer based on whatever's in its index. If your documents change frequently and you don't re-index, users will get outdated answers without knowing it.

**The fix**: include timestamps in your chunks and show them in answers. For frequently changing sources, set up incremental indexing (adding, updating, or deleting individual documents) rather than rebuilding the entire index from scratch each time. Note that FAISS doesn't natively support deleting individual vectors, so for production systems you'll likely want a vector database like Pinecone or Weaviate that handles this for you. For truly real-time data, query the source directly instead of the index.

### Questions about things that aren't in your documents

RAG is biased toward finding *something*. Even if the answer genuinely isn't in your documents, it'll still retrieve the most similar chunks it can find and try to cobble together an answer. This is one of the most common sources of bad answers.

**The fix**: set a minimum similarity threshold. If the best match scores below that threshold, respond with "I don't have information about that" instead of generating from irrelevant context.


## Access Control in RAG
{: #access-control-in-rag}

Once your RAG system works, you'll quickly hit a new problem: **not everyone should see everything.** A customer support agent shouldn't be able to pull up HR documents, and an intern shouldn't be retrieving board meeting notes.

### Why this matters

By default, RAG has no concept of permissions. It finds the most relevant chunks regardless of who's asking. If a confidential document gets indexed, anyone who asks the right question can surface it.

### How to add access control
{: #how-to-add-access-control}

The most common approach is simple: tag each chunk with who's allowed to see it, then filter the results based on who's asking.

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

*In plain English: we search for way more results than we need (10x), then filter out the ones the user isn't allowed to see. We grab a lot extra because many might get filtered out. If we still can't find enough accessible results, we log a warning so you know there might be a problem.*

### Three approaches to filtering

| Approach | How it works | Best for |
|----------|-------------|----------|
| **Pre-filter** | Build separate search indexes for each group | Faster searches, but more storage and more indexes to manage |
| **Post-filter** | Search everything, then remove restricted results | Simpler to set up, but you might end up with too few results if most get filtered |
| **Built-in filtering** | Use a vector database that supports filtering natively (like Pinecone or Weaviate) | Best option for production because it filters during the search itself, so you always get the right number of results |

For learning and small projects, post-filtering is fine. For production, use a vector database with built-in metadata filtering. This is one of the strongest reasons to upgrade from FAISS to a managed vector database.

### Watch out for

- **Chunk leakage**: even if you hide the document title, the chunk text itself might reveal sensitive information
- **Permission drift**: when someone's access changes, your index needs to reflect that. Old permissions in the index are a security hole
- **Inference attacks**: sometimes retrieving public chunks from related documents lets a user guess what's in the restricted ones


## Hybrid RAG with Structured Data
{: #hybrid-rag-with-structured-data}

So far, we've been searching through documents (unstructured text). But many real-world questions also need data from databases, spreadsheets, or APIs (structured data).

For example: "How many customers signed up this month and what did the latest product update include?" The first half needs a database query. The second half needs a document search. Pure RAG can only handle the second half.

### The approach

Run multiple search paths at the same time and combine everything before asking the AI to answer:

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

The diagram above makes it look like you always run every path. In practice, the real challenge is figuring out **which path a given question needs**:

- "What's our refund policy?" → vector search only (it's in the docs)
- "How many customers signed up this month?" → SQL only (it's in the database)
- "How many customers complained about refunds last month?" → both (count from database, context from docs)

A simple approach is to use the AI itself to classify the question first:

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

*In plain English: before running any search, we ask the AI to look at the question and decide whether it needs documents, a database query, or both. This saves time and avoids pulling in irrelevant context.*

### Turning questions into database queries
{: #questions-to-sql}

For the database part, you can use the AI itself to write the SQL query. You give it a description of your database tables and it generates the query.

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

*In plain English: we describe our database tables to the AI, ask it a question in plain English, and it writes the SQL query for us. Then we can run that query against the actual database to get precise numbers.*

**Important safety note**: never run AI-generated SQL directly against a production database without safeguards. At a minimum:
- Use a **read-only database connection** so the AI can't accidentally modify or delete data
- **Validate the SQL** to make sure it's a SELECT statement (not INSERT, UPDATE, DELETE, or DROP)
- Consider running against a **read replica** or a copy of the database, not the production instance
- Set a **query timeout** so a badly generated query can't lock up your database

### Combining documents and data in one prompt

The trick is clearly labeling each type of context so the AI knows what's what:

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

- **Customer support**: search help articles (documents) + look up the customer's account status (database)
- **Internal tools**: search the company wiki (documents) + pull live metrics (API)
- **Analytics Q&A**: search written reports (documents) + query the actual numbers (data warehouse)

The database path gives the AI precise facts (exact numbers, dates, statuses) while the document path gives it explanations and context. Together they produce much better answers than either one alone.


## Citations and Reducing Hallucination
{: #citations-and-reducing-hallucination}

"Hallucination" is when an AI makes something up and presents it as fact. This is the biggest trust problem in AI right now, and it's especially dangerous in RAG systems because users expect the answers to come from their actual documents.

The good news is that RAG already reduces hallucination compared to asking an AI without any context. But it doesn't eliminate it completely. The AI might still blend its own knowledge with the retrieved context, or interpret the context incorrectly.

**Citations are one of the best defenses.** When the AI has to say *where* each piece of its answer came from, it's much harder for it to slip in made-up facts.

### How to get citations in your answers
{: #how-to-get-citations}

The simplest way is to ask for them in your prompt:

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

A well-prompted model will respond like this:

> Chunk sizes between 300-800 tokens work best for most use cases, with 10-20% overlap to preserve context at boundaries [Source: chunking-guide.md].

Now you (or your users) can go check that source document and verify the answer is accurate.

### Checking citations automatically

You can write code that verifies whether the AI actually cited sources that were in the retrieved context:

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

*In plain English: this code looks at the AI's answer, finds all the citations, and checks if each one actually matches a document that was retrieved. If the AI cites a document that wasn't in the context, something is wrong.*

### Other ways to reduce hallucination
{: #other-hallucination-techniques}

- **Set temperature to 0**: temperature controls how "creative" the AI is. For factual Q&A, you want it as low as possible. A temperature of 0 means the AI picks the most likely answer every time instead of being creative.
- **Use structured output**: ask the AI to respond in JSON with explicit source fields. This makes it harder to sneak in unsupported claims.
- **Set a confidence threshold**: if the retrieved chunks don't match the question well (low similarity scores), don't generate an answer at all. Just say "I don't have information about that."
- **Double-check with a second AI call**: generate an answer, then ask a second prompt to verify that every claim in the answer is actually supported by the context.

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

*In plain English: we take the AI's answer and ask a second AI call to play "fact checker." It looks at the context and identifies any claims that aren't supported. Think of it as having an editor review the AI's work.*

### The tradeoff to be aware of

The more safeguards you add, the more often the AI will say "I don't know." That's actually the right behavior for factual systems, where a wrong answer is worse than no answer. But if you're building something more exploratory (like a brainstorming tool), you might want fewer guardrails. It depends on what kind of system you're building.


## A Complete Worked Example
{: #a-complete-worked-example}

Let's walk through a real scenario from start to finish so you can see how all the pieces fit together.

### The setup

Imagine you have a folder with 3 markdown files about a fictional company:

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

With short documents like these, each one becomes a single chunk. With longer documents, you'd get multiple chunks per document.

### Step 2: Ask a question

```python
question = "How long do I have to return a product?"
answer = query_rag(question, model, index, chunks, metadata)
print(answer)
```

### What happens behind the scenes
{: #example-behind-the-scenes}

1. **The question gets embedded**: "How long do I have to return a product?" becomes a list of 384 numbers

2. **FAISS searches for similar chunks**: it compares those numbers against all chunk embeddings and returns the top 3 matches:
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

Notice that even though all 3 chunks were sent, the AI correctly focused on the relevant one (company-policies.md) and ignored the other two. A good prompt makes this work.

### What a bad result looks like

Now imagine someone asks: "What's the total cost of the Pro plan for a year?"

This is a math question. The document says $49/month annually, so the answer is $49 x 12 = $588. But the AI might say "$49/month billed annually" without doing the multiplication, or worse, calculate it wrong ("The annual cost is $490").

This is exactly the kind of question where you'd want to route to a structured data path (or at minimum, prompt the AI to show its math) rather than relying on pure RAG.


## What's Next
{: #whats-next}

This guide covered the fundamentals of RAG. You now understand how to take documents, parse them into clean text, break them into searchable chunks, find the right ones when someone asks a question, and generate grounded answers. You also know the gotchas: access control, handling structured data, reducing hallucination, and where RAG struggles.

Once you have the basics running, here are some areas to explore next:

- **Hybrid search**: combine keyword search (BM25) with meaning-based search for better retrieval. Keyword search catches exact matches that embedding search sometimes misses, like product names or error codes.

- **Reranking**: add a second, more powerful model (like a cross-encoder) that re-scores your top results after initial retrieval. This is one of the highest-impact improvements you can make because it's cheap to run on just 10-20 results.

- **Streaming**: show the AI's answer as it's being generated word by word (like ChatGPT does) instead of waiting for the full response. This makes the system feel much faster even when generation takes a few seconds.

- **Caching**: save the results of frequent queries so you don't re-compute them every time. If 50 people ask the same question today, you only need to run the full pipeline once.

- **Multi-modal RAG**: search through images, tables, and code alongside text. Useful when your documents have diagrams, charts, or code examples that are important for answering questions.

- **Production vector databases**: move from FAISS (which runs in memory on one machine) to a hosted vector database like Pinecone, Weaviate, or Qdrant. These handle incremental updates, metadata filtering, scaling, and backups for you.

The most important thing: **build the simple version first, see how it works, then improve one thing at a time.** Don't try to build the perfect system on day one.
