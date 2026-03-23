"""
FastAPI backend for ET Chronicle.
"""

import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from news_scraper import search_and_extract
from ai_engine import generate_briefing, chat_answer
from trending import get_trending_stories, get_local_news

app = FastAPI(title="ET Chronicle API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store (maps session_id -> {story, articles})
sessions: dict[str, dict] = {}


# ── Request / Response models ────────────────────────────────────

class AnalyzeRequest(BaseModel):
    query: str

class ChatRequest(BaseModel):
    session_id: str
    question: str
    chat_history: list[dict] = []

class LocalNewsRequest(BaseModel):
    city: str
    state: str = ""


# ── Endpoints ────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest):
    """
    Main endpoint: takes a topic/query, scrapes ET articles,
    generates a full briefing + story arc via OpenAI.
    """
    query = req.query.strip()
    if not query:
        raise HTTPException(400, "Query cannot be empty")

    try:
        # 1. Scrape ET articles
        articles = await search_and_extract(query, max_articles=8)

        if not articles:
            raise HTTPException(404, "No Economic Times articles found for this topic")

        # 2. Generate briefing via AI
        story = await generate_briefing(query, articles)

        # 3. Build article metadata for frontend
        article_meta = []
        for a in articles:
            article_meta.append({
                "title": a.get("title", "") or a.get("rss_title", ""),
                "url": a.get("url", ""),
                "source": a.get("source", "Economic Times"),
                "published": a.get("published", ""),
            })

        # 4. Store session
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "story": story,
            "articles": articles,
        }

        return {
            "session_id": session_id,
            "story": story,
            "articleCount": len(articles),
            "articleMeta": article_meta,
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in /api/analyze: {e}")
        raise HTTPException(500, f"Analysis failed: {str(e)}")


@app.post("/api/chat")
async def chat(req: ChatRequest):
    """
    Q&A endpoint: answers questions about a story, grounded in ET articles.
    """
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(404, "Session not found. Please analyze a story first.")

    try:
        result = await chat_answer(
            question=req.question,
            story_context=session["story"],
            articles=session["articles"],
            chat_history=req.chat_history,
        )

        return {
            "id": f"a{uuid.uuid4().hex[:8]}",
            "role": "ai",
            "content": result.get("content", ""),
            "sources": result.get("sources", ["Economic Times"]),
        }

    except Exception as e:
        print(f"Error in /api/chat: {e}")
        raise HTTPException(500, f"Chat failed: {str(e)}")


@app.get("/api/trending")
async def trending():
    """Fetch live trending stories from Economic Times."""
    try:
        stories = await get_trending_stories()
        if not stories:
            raise HTTPException(503, "Could not fetch trending stories")
        return {"stories": stories}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in /api/trending: {e}")
        raise HTTPException(500, f"Failed to fetch trending: {str(e)}")


@app.post("/api/local-news")
async def local_news(req: LocalNewsRequest):
    """Fetch local/regional news for a city from Economic Times."""
    city = req.city.strip()
    if not city:
        raise HTTPException(400, "City cannot be empty")

    try:
        result = await get_local_news(city, req.state)
        return result
    except Exception as e:
        print(f"Error in /api/local-news: {e}")
        raise HTTPException(500, f"Failed to fetch local news: {str(e)}")


@app.get("/api/config")
async def config():
    """Return client-safe config (like Deepgram key for STT)."""
    import os
    return {
        "deepgramApiKey": os.getenv("DEEPGRAM_API_KEY", ""),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
