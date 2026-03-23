"""
News scraping layer: Direct Economic Times scraping.
Uses ET's search page for article discovery, then extracts content via JSON-LD.
Uses OpenAI to extract smart search keywords from user queries.
"""

import json
import os
import httpx
from bs4 import BeautifulSoup
from urllib.parse import quote
import asyncio
from typing import Optional
import re
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

_ai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.google.com/",
}

ET_BASE = "https://economictimes.indiatimes.com"


async def _ai_extract_keywords(query: str) -> list[str]:
    """
    Use OpenAI to extract 2-4 focused search keyword phrases from a user query.
    Handles article titles, casual questions, vague topics, etc.
    """
    try:
        resp = await _ai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": f"""Extract 2-4 short search queries (2-4 words each) that would find relevant Economic Times articles for this user input. The user might paste an article title, ask a casual question, or type a vague topic.

User input: "{query}"

Return ONLY a JSON array of strings, no explanation. Example: ["gold prices India", "gold market crash"]"""}],
            temperature=0,
            max_tokens=150,
        )
        text = resp.choices[0].message.content.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
        keywords = json.loads(text)
        if isinstance(keywords, list) and keywords:
            return [str(k) for k in keywords[:4]]
    except Exception as e:
        print(f"AI keyword extraction failed: {e}")

    # Fallback: basic keyword extraction
    return [_basic_simplify(query)]


def _basic_simplify(query: str) -> str:
    """Basic fallback: extract key words from query."""
    stop = {"a","an","the","is","are","was","were","be","in","on","at","to","for",
            "of","with","by","from","as","and","but","or","not","it","its","he",
            "she","they","his","her","this","that","has","have","had","do","does",
            "get","gets","got","how","why","what","when","where","who","which",
            "up","out","about","very","just","also","now","says","said","vows",
            "into","through","may","might","can","could","would","should","will"}
    cleaned = re.sub(r"['''\"""''`]", "", query)
    words = re.split(r'\W+', cleaned)
    keywords = [w for w in words if w.lower() not in stop and len(w) >= 2]
    # Prioritize proper nouns
    proper = [w for w in keywords if w[0].isupper()]
    rest = [w for w in keywords if w not in proper]
    selected = proper[:4] + rest[:2]
    return " ".join(selected[:5]) if selected else query


def _relevance_score(keywords: list[str], title: str, text: str = "") -> float:
    """Score how relevant an article is to the search keywords (0-1)."""
    title_lower = title.lower()
    text_lower = text.lower()[:3000] if text else ""
    combined = title_lower + " " + text_lower

    if not keywords:
        return 0.5

    # Flatten keywords into individual terms
    all_terms = set()
    for kw in keywords:
        for word in re.split(r'\W+', kw.lower()):
            if len(word) >= 3:
                all_terms.add(word)

    if not all_terms:
        return 0.5

    # Check how many key terms appear in title vs text
    title_hits = sum(1 for t in all_terms if t in title_lower)
    text_hits = sum(1 for t in all_terms if t in combined)

    title_ratio = title_hits / len(all_terms)
    text_ratio = text_hits / len(all_terms)

    # Title matches are worth more
    return min(1.0, title_ratio * 0.6 + text_ratio * 0.4)


async def fetch_et_search(query: str, num_results: int = 12) -> list[dict]:
    """Search ET via their search page and extract article links."""
    encoded_query = quote(query)
    search_url = f"{ET_BASE}/searchresult.cms?query={encoded_query}"

    articles = []
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=HEADERS) as client:
            resp = await client.get(search_url)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        seen_urls = set()
        for link in soup.find_all("a", href=True):
            href = link["href"]
            title = link.get_text(strip=True)

            if not title or len(title) < 20:
                continue
            if "/articleshow/" not in href:
                continue
            if not href.startswith("http"):
                href = ET_BASE + href
            if "economictimes.indiatimes.com" not in href:
                continue
            if href in seen_urls:
                continue
            seen_urls.add(href)

            articles.append({
                "title": title,
                "link": href,
                "published": "",
                "source": "Economic Times",
            })

            if len(articles) >= num_results:
                break

    except Exception as e:
        print(f"ET search failed for '{query}': {e}")

    return articles


async def extract_article_content(url: str) -> Optional[dict]:
    """Extract article content from ET using JSON-LD structured data."""
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=HEADERS) as client:
            resp = await client.get(url)
            resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        article_body = ""
        title = ""
        publish_date = ""
        description = ""

        for script in soup.find_all("script", type="application/ld+json"):
            try:
                data = json.loads(script.string)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if isinstance(item, dict):
                        if item.get("articleBody"):
                            article_body = item["articleBody"]
                            title = title or item.get("headline", "")
                            publish_date = publish_date or item.get("datePublished", "")
                            description = description or item.get("description", "")
            except (json.JSONDecodeError, TypeError):
                continue

        # Fallback: try HTML selectors
        if not article_body:
            for selector in ["div.artText", "div.article_content", "div.Normal", "article"]:
                container = soup.select_one(selector)
                if container:
                    for tag in container.find_all(["script", "style", "aside", "iframe"]):
                        tag.decompose()
                    paragraphs = container.find_all("p")
                    if paragraphs:
                        article_body = "\n\n".join(
                            p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 20
                        )
                    if len(article_body) > 100:
                        break

        if not title:
            h1 = soup.find("h1")
            if h1:
                title = h1.get_text(strip=True)
            if not title:
                og = soup.find("meta", property="og:title")
                title = og["content"] if og and og.get("content") else ""

        if not publish_date:
            meta = soup.find("meta", property="article:published_time")
            if meta:
                publish_date = meta.get("content", "")

        if not description:
            meta = soup.find("meta", property="og:description") or soup.find("meta", attrs={"name": "description"})
            if meta:
                description = meta.get("content", "")

        summary = description or (article_body[:300] + "..." if len(article_body) > 300 else article_body)

        return {
            "url": url,
            "title": title,
            "text": article_body,
            "publish_date": publish_date,
            "summary": summary,
            "source": "Economic Times",
        }
    except Exception as e:
        print(f"Failed to extract article from {url}: {e}")
        return None


async def search_and_extract(query: str, max_articles: int = 8) -> list[dict]:
    """
    Full pipeline:
    1. Use AI to extract smart search keywords from user input
    2. Search ET with multiple keyword variants
    3. Filter by relevance
    4. Extract content from relevant articles only
    """
    # Step 1: AI extracts focused search terms
    search_keywords = await _ai_extract_keywords(query)
    print(f"AI search keywords for '{query[:50]}': {search_keywords}")

    # Step 2: Search ET with each keyword variant, collect unique results
    all_results = []
    seen_urls = set()
    for kw in search_keywords:
        results = await fetch_et_search(kw, num_results=10)
        for r in results:
            if r["link"] not in seen_urls:
                seen_urls.add(r["link"])
                all_results.append(r)
        if len(all_results) >= 20:
            break

    print(f"Total search results: {len(all_results)}")

    if not all_results:
        return []

    # Step 3: Score and filter by relevance BEFORE fetching full content
    for r in all_results:
        r["_score"] = _relevance_score(search_keywords, r["title"])

    # Sort by relevance, take top candidates
    all_results.sort(key=lambda r: r["_score"], reverse=True)

    # Only fetch articles with meaningful relevance (at least 1 keyword match)
    relevant = [r for r in all_results if r["_score"] >= 0.15]

    # Log what we're keeping/dropping
    for r in all_results[:5]:
        status = "KEEP" if r["_score"] >= 0.15 else "DROP"
        print(f"  [{status} {r['_score']:.2f}] {r['title'][:60]}")

    if not relevant:
        # If nothing passes, take the best we have
        relevant = all_results[:max_articles]

    # Step 4: Extract content from top relevant articles
    to_fetch = relevant[:max_articles + 2]
    tasks = [extract_article_content(r["link"]) for r in to_fetch]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    articles = []
    for i, result in enumerate(results):
        if isinstance(result, dict) and result.get("text") and len(result["text"]) > 50:
            result["rss_title"] = to_fetch[i]["title"]
            result["published"] = to_fetch[i].get("published", "") or result.get("publish_date", "")
            # Re-score with full text for final ranking
            result["_relevance"] = _relevance_score(
                search_keywords, result.get("title", ""), result.get("text", "")
            )
            articles.append(result)

    # Final sort by relevance
    articles.sort(key=lambda a: a.get("_relevance", 0), reverse=True)

    print(f"Final articles: {len(articles[:max_articles])}")
    return articles[:max_articles]
