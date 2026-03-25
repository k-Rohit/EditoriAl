"""
AI engine using OpenAI GPT for briefing generation, story arc creation, and Q&A.
"""

import json
import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
MODEL = "gpt-4o-mini"


def _build_chunk_context(chunks: list[dict]) -> str:
    """Build a context string from retrieved RAG chunks."""
    parts = []
    for i, c in enumerate(chunks, 1):
        parts.append(
            f"[Chunk {i}] From: \"{c.get('article_title', 'Untitled')}\" ({c.get('source', 'Economic Times')})\n"
            f"URL: {c.get('article_url', '')}\n"
            f"Content: {c['text']}\n"
        )
    return "\n---\n".join(parts)


def _extract_sources_from_chunks(chunks: list[dict]) -> tuple[list[str], list[str]]:
    """Extract deduplicated source names and URLs from chunks."""
    source_names = list({c.get("source", "Economic Times") for c in chunks if c.get("source")})
    seen_urls = set()
    article_urls = []
    for c in chunks:
        url = c.get("article_url", "")
        if url and url not in seen_urls:
            seen_urls.add(url)
            article_urls.append(url)
    return source_names, article_urls[:6]


def _build_article_context(articles: list[dict]) -> str:
    """Build a context string from extracted articles."""
    parts = []
    for i, a in enumerate(articles, 1):
        text = a.get("text", "") or a.get("summary", "")
        if len(text) > 3000:
            text = text[:3000] + "..."
        parts.append(
            f"[Article {i}] {a.get('title', 'Untitled')}\n"
            f"Source: {a.get('source', 'Economic Times')}\n"
            f"Published: {a.get('published', 'Unknown')}\n"
            f"URL: {a.get('url', '')}\n"
            f"Content: {text}\n"
        )
    return "\n---\n".join(parts)


async def generate_briefing(query: str, articles: list[dict]) -> dict:
    """
    Generate a full briefing from articles. Returns data matching the Story interface.
    Also generates a connection graph of entities/topics across articles.
    """
    context = _build_article_context(articles)
    source_names = list({a.get("source", "Economic Times") for a in articles if a.get("source")})
    article_urls = [a.get("url", "") for a in articles if a.get("url")]

    prompt = f"""You are an AI news analyst for ET Chronicle, an intelligence platform built on Economic Times journalism.

Given the following Economic Times articles about "{query}", generate a comprehensive briefing.

ARTICLES:
{context}

Return a JSON object with EXACTLY this structure (no markdown, no code fences, just raw JSON):
{{
  "title": "A compelling analytical title for this story (not just the query)",
  "topic": "{query}",
  "summary": "A 2-3 sentence executive summary synthesizing all articles into one coherent narrative",
  "keyFacts": ["fact1", "fact2", "fact3", "fact4", "fact5", "fact6"],
  "impactCards": [
    {{
      "audience": "Name of affected group 1"
      "sentiment": "positive|caution|negative",
      "text": "2-3 sentence impact description for this audience"
    }},
    {{
      "audience": "Name of affected group 2"
      "sentiment": "positive|caution|negative",
      "text": "2-3 sentence impact description"
    }},
    {{
      "audience": "Name of affected group 3"
      "sentiment": "positive|caution|negative",
      "text": "2-3 sentence impact description"
    }}
  ],
  "keyPlayers": [
    {{
      "name": "Full Name",
      "initials": "FN",
      "role": "Their role/title",
      "stance": "positive|caution|negative"
    }}
  ],
  "suggestedQuestions": ["question1?", "question2?", "question3?", "question4?", "question5?"],
  "timeline": [
    {{
      "id": "t1",
      "date": "Date or date range",
      "title": "Chapter title",
      "summary": "1-2 sentence description of what happened at this point",
      "sentiment": "positive|caution|negative"
    }}
  ],
  "sources": {json.dumps(source_names)},
  "sourceUrls": {json.dumps(article_urls[:6])},
  "whatToWatch": ["prediction1", "prediction2", "prediction3"],
  "deepDive": {{
    "sentimentBreakdown": {{
      "positive": 40,
      "neutral": 35,
      "negative": 25,
      "summary": "One sentence describing overall sentiment tone"
    }},
    "keyQuotes": [
      {{
        "quote": "Exact or closely paraphrased quote from articles",
        "speaker": "Person or organization who said it",
        "context": "Brief context (1 sentence)"
      }}
    ],
    "tldrCards": [
      {{
        "emoji": "relevant emoji",
        "title": "Short card title (3-5 words)",
        "text": "One sentence TL;DR insight"
      }}
    ]
  }}
}}

Rules:
- keyFacts: exactly 6 concise, data-driven facts from the articles
- impactCards: exactly 3 cards for different stakeholder groups
- keyPlayers: 3-5 major people/organizations involved
- timeline: 4-8 chronological events showing how the story evolved
- suggestedQuestions: 5 questions a reader might want to ask
- whatToWatch: 3 forward-looking predictions
- deepDive.sentimentBreakdown: percentages must add to 100. Analyze tone across all articles.
- deepDive.keyQuotes: 3-5 notable quotes from the articles (exact or closely paraphrased). Include who said it and brief context.
- deepDive.tldrCards: 4-6 quick-hit insight cards that summarize different angles of the story in bite-sized form.
- All information must be grounded in the provided ET articles
- sentiment values must be exactly "positive", "caution", or "negative"
"""

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=4000,
    )

    text = response.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    result = json.loads(text)
    result["id"] = "story_1"
    return result


async def chat_answer(question: str, story_context: dict, articles: list[dict], chat_history: list[dict] = None) -> dict:
    """
    Answer a user question about the story, grounded in ET articles.
    Keeps answers SHORT and conversational.
    """
    context = _build_article_context(articles)
    story_summary = story_context.get("summary", "")
    story_title = story_context.get("title", "")

    history_text = ""
    if chat_history:
        for msg in chat_history[-6:]:
            role = "User" if msg.get("role") == "user" else "AI"
            history_text += f"{role}: {msg.get('content', '')}\n"

    prompt = f"""You are the AI assistant for ET Chronicle, answering questions about: "{story_title}"

Story Summary: {story_summary}

SOURCE ARTICLES FROM ECONOMIC TIMES:
{context}

{f"CONVERSATION HISTORY:{chr(10)}{history_text}" if history_text else ""}

USER QUESTION: {question}

Instructions:
- Answer based ONLY on the provided ET articles
- Be CONCISE: 3-5 sentences max. No long paragraphs.
- Use bullet points only if listing 3+ items
- Include specific data/names/dates when available
- If articles don't cover this, say so briefly
- Do NOT add a "still developing" note unless asked

Return a JSON object (no markdown fences):
{{
  "content": "Your concise answer here",
  "sources": ["Economic Times"]
}}
"""

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=500,
    )

    text = response.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    return json.loads(text)


async def generate_briefing_rag(query: str, chunks: list[dict]) -> dict:
    """
    Generate a full briefing from RAG-retrieved chunks instead of full articles.
    Same output structure as generate_briefing.
    """
    context = _build_chunk_context(chunks)
    source_names, article_urls = _extract_sources_from_chunks(chunks)

    prompt = f"""Analyze these Economic Times excerpts about "{query}" and return a JSON briefing.

EXCERPTS:
{context}

Return JSON with these fields:
- title: compelling analytical title
- topic: "{query}"
- title: compelling analytical title
- topic: "{query}"
- summary: 2-3 sentence executive summary
- keyFacts: 6 concise facts (1 sentence each)
- impactCards: 3 {{audience, sentiment, text}} (sentiment: "positive"|"caution"|"negative", text: 1 sentence)
- suggestedQuestions: 5 questions
- timeline: 4 {{id, date, title, summary, sentiment}} (summary: 1 sentence)
- sources: {json.dumps(source_names)}
- sourceUrls: {json.dumps(article_urls)}
- whatToWatch: 3 short predictions
- deepDive: {{sentimentBreakdown: {{positive, neutral, negative (sum=100), summary}}, keyQuotes: 3 {{quote, speaker, context}}, tldrCards: 3 {{emoji, title, text}}}}

All data must be grounded in the provided excerpts."""

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=2000,
        response_format={"type": "json_object"},
    )

    result = json.loads(response.choices[0].message.content)
    result["id"] = "story_1"
    return result


async def chat_answer_rag(question: str, story_context: dict, chunks: list[dict], chat_history: list[dict] = None) -> dict:
    """
    Answer a user question using RAG-retrieved chunks relevant to the specific question.
    """
    context = _build_chunk_context(chunks)
    story_summary = story_context.get("summary", "")
    story_title = story_context.get("title", "")

    history_text = ""
    if chat_history:
        for msg in chat_history[-6:]:
            role = "User" if msg.get("role") == "user" else "AI"
            history_text += f"{role}: {msg.get('content', '')}\n"

    prompt = f"""You are the AI assistant for ET Chronicle, answering questions about: "{story_title}"

Story Summary: {story_summary}

RELEVANT EXCERPTS FROM ECONOMIC TIMES (retrieved via semantic search for this question):
{context}

{f"CONVERSATION HISTORY:{chr(10)}{history_text}" if history_text else ""}

USER QUESTION: {question}

Instructions:
- Answer based ONLY on the provided ET article excerpts
- Be CONCISE: 3-5 sentences max. No long paragraphs.
- Use bullet points only if listing 3+ items
- Include specific data/names/dates when available
- If excerpts don't cover this, say so briefly
- Do NOT add a "still developing" note unless asked

Return a JSON object (no markdown fences):
{{
  "content": "Your concise answer here",
  "sources": ["Economic Times"]
}}
"""

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=500,
    )

    text = response.choices[0].message.content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    return json.loads(text)
