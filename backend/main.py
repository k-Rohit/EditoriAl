"""
FastAPI backend for EditoriAI.
"""

import json
import os
import uuid
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from sse_starlette.sse import EventSourceResponse

load_dotenv()

from news_scraper import search_and_extract, extract_article_content
from ai_engine import generate_briefing_rag, chat_answer_rag, generate_deep_dive
from trending import get_trending_stories, get_local_news, get_foryou_stories
from auth import get_current_user


app = FastAPI(title="EditoriAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store (maps session_id -> {story, articles, chunks, faiss_index})
sessions: dict[str, dict] = {}


def _build_article_meta(articles: list[dict]) -> list[dict]:
    """Build article metadata list for frontend."""
    meta = []
    for a in articles:
        meta.append({
            "title": a.get("title", "") or a.get("rss_title", ""),
            "url": a.get("url", ""),
            "source": a.get("source", "Economic Times"),
            "published": a.get("published", ""),
        })
    return meta


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

class DeepDiveRequest(BaseModel):
    session_id: str

class ForYouRequest(BaseModel):
    domains: list[str]


# ── Endpoints ────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.get("/api/analyze-stream")
async def analyze_stream(query: str, request: Request, url: str = "", user: dict = Depends(get_current_user)):
    """
    SSE endpoint: streams progress events during analysis,
    then sends the final result as a single JSON event.
    If `url` is provided, fetches that single article directly (skips search).
    """
    query = query.strip()
    if not query:
        raise HTTPException(400, "Query cannot be empty")

    direct_url = url.strip()

    async def event_generator():
        from rag_engine import rag_pipeline

        try:
            if direct_url:
                # Direct article mode: skip search, fetch the specific article
                yield {"event": "progress", "data": json.dumps({"step": "scraping", "message": "Fetching article..."})}

                article = await extract_article_content(direct_url)
                articles = [article] if article else []
            else:
                # Search mode: find articles matching the query
                yield {"event": "progress", "data": json.dumps({"step": "scraping", "message": "Searching Economic Times..."})}

                articles = await search_and_extract(query, max_articles=10)

            if not articles:
                yield {"event": "error", "data": json.dumps({"message": "No Economic Times articles found for this topic"})}
                return

            # Step 2: RAG pipeline (chunk, embed, retrieve)
            yield {"event": "progress", "data": json.dumps({"step": "embedding", "message": f"Reading & analyzing {len(articles)} articles..."})}

            retrieved_chunks, all_chunks, faiss_index = await rag_pipeline(query, articles, top_k=15)

            if not retrieved_chunks:
                yield {"event": "error", "data": json.dumps({"message": "Failed to process article content"})}
                return

            # Step 3: Generate briefing with LLM
            yield {"event": "progress", "data": json.dumps({"step": "generating", "message": "Generating intelligence briefing..."})}

            story = await generate_briefing_rag(query, retrieved_chunks)

            # Build metadata and store session
            article_meta = _build_article_meta(articles)
            session_id = str(uuid.uuid4())
            sessions[session_id] = {
                "story": story,
                "articles": articles,
                "all_chunks": all_chunks,
                "faiss_index": faiss_index,
            }

            yield {"event": "result", "data": json.dumps({
                "session_id": session_id,
                "story": story,
                "articleCount": len(articles),
                "articleMeta": article_meta,
            })}

        except Exception as e:
            print(f"Error in /api/analyze-stream: {e}")
            yield {"event": "error", "data": json.dumps({"message": f"Analysis failed: {str(e)}"})}

    return EventSourceResponse(event_generator())


@app.post("/api/analyze")
async def analyze(req: AnalyzeRequest, user: dict = Depends(get_current_user)):
    """
    Non-streaming fallback: takes a topic/query, scrapes ET articles,
    runs RAG pipeline, generates a full briefing via OpenAI.
    """
    from rag_engine import rag_pipeline

    query = req.query.strip()
    if not query:
        raise HTTPException(400, "Query cannot be empty")

    try:
        articles = await search_and_extract(query, max_articles=10)

        if not articles:
            raise HTTPException(404, "No Economic Times articles found for this topic")

        retrieved_chunks, all_chunks, faiss_index = await rag_pipeline(query, articles, top_k=15)

        if not retrieved_chunks:
            raise HTTPException(500, "Failed to process article content")

        story = await generate_briefing_rag(query, retrieved_chunks)

        article_meta = _build_article_meta(articles)
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "story": story,
            "articles": articles,
            "all_chunks": all_chunks,
            "faiss_index": faiss_index,
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
async def chat(req: ChatRequest, user: dict = Depends(get_current_user)):
    """
    Q&A endpoint: retrieves chunks relevant to the specific question,
    then answers grounded in those chunks.
    """
    from rag_engine import retrieve

    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(404, "Session not found. Please analyze a story first.")

    try:
        all_chunks = session.get("all_chunks", [])
        faiss_index = session.get("faiss_index")

        if all_chunks and faiss_index is not None:
            question_chunks = retrieve(req.question, all_chunks, faiss_index, top_k=10)
        else:
            question_chunks = all_chunks[:10]

        result = await chat_answer_rag(
            question=req.question,
            story_context=session["story"],
            chunks=question_chunks,
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


@app.post("/api/deep-dive")
async def deep_dive(req: DeepDiveRequest, user: dict = Depends(get_current_user)):
    """Generate a magazine-style deep dive from the session's article chunks."""
    session = sessions.get(req.session_id)
    if not session:
        raise HTTPException(404, "Session not found. Please analyze a story first.")

    try:
        all_chunks = session.get("all_chunks", [])
        story = session.get("story", {})

        if not all_chunks:
            raise HTTPException(400, "No article data available for deep dive")

        result = await generate_deep_dive(
            query=story.get("topic", ""),
            chunks=all_chunks[:20],
            story_context=story,
        )

        return {"deepDive": result}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error in /api/deep-dive: {e}")
        raise HTTPException(500, f"Deep dive generation failed: {str(e)}")


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


@app.post("/api/foryou")
async def foryou(req: ForYouRequest, user: dict = Depends(get_current_user)):
    """Fetch personalized news based on user's preferred domains."""
    if not req.domains:
        raise HTTPException(400, "No domains provided")
    try:
        stories = await get_foryou_stories(req.domains)
        return {"stories": stories}
    except Exception as e:
        print(f"Error in /api/foryou: {e}")
        raise HTTPException(500, f"Failed to fetch personalized news: {str(e)}")


@app.get("/api/config")
async def config():
    """Return client-safe config (like Deepgram key for STT)."""
    return {
        "deepgramApiKey": os.getenv("DEEPGRAM_API_KEY", ""),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
