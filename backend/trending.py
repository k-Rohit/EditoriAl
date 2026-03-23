"""
Fetch trending topics from Economic Times homepage and trending sections.
Includes article images scraped from ET.
"""

import httpx
from bs4 import BeautifulSoup
import time

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

ET_BASE = "https://economictimes.indiatimes.com"

SECTION_TAGS = {
    "markets": "Markets", "tech": "Tech", "startups": "Startups",
    "industry": "Industry", "economy": "Economy", "policy": "Policy",
    "banking": "Banking", "finance": "Finance", "auto": "Auto",
    "energy": "Energy", "telecom": "Telecom", "realestate": "Real Estate",
    "infrastructure": "Infrastructure", "healthcare": "Healthcare",
    "ipo": "IPO", "mutual-funds": "Mutual Funds", "commodities": "Commodities",
    "cryptocurrency": "Crypto", "politics": "Politics", "defence": "Defence",
    "environment": "Environment", "jobs": "Jobs", "small-biz": "SME", "nri": "NRI",
}


def _extract_tag_from_url(url: str) -> str:
    url_lower = url.lower()
    for key, tag in SECTION_TAGS.items():
        if f"/{key}/" in url_lower:
            return tag
    return "News"


async def _fetch_og_image(client: httpx.AsyncClient, url: str) -> str:
    """Fetch the Open Graph image from an article page."""
    try:
        resp = await client.get(url, timeout=8.0)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            return og["content"]
    except Exception:
        pass
    return ""


async def fetch_trending_from_et() -> list[dict]:
    """Scrape ET homepage for trending/top stories with images."""
    stories = []
    seen_titles = set()

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=HEADERS) as client:
        try:
            resp = await client.get(ET_BASE)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")

            for link in soup.find_all("a", href=True):
                href = link["href"]
                title = link.get_text(strip=True)

                if "/articleshow/" not in href:
                    continue
                if not title or len(title) < 15 or len(title) > 120:
                    continue

                title_key = title.lower().strip()
                if title_key in seen_titles:
                    continue
                seen_titles.add(title_key)

                if not href.startswith("http"):
                    href = ET_BASE + href

                tag = _extract_tag_from_url(href)
                stories.append({
                    "id": str(len(stories) + 1),
                    "title": title,
                    "tag": tag,
                    "url": href,
                    "image": "",
                })

                if len(stories) >= 15:
                    break

        except Exception as e:
            print(f"Failed to fetch ET homepage: {e}")

        # Fallback to latest news page
        if len(stories) < 8:
            try:
                resp = await client.get(f"{ET_BASE}/news/latest-news")
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")

                for link in soup.find_all("a", href=True):
                    href = link["href"]
                    title = link.get_text(strip=True)

                    if "/articleshow/" not in href:
                        continue
                    if not title or len(title) < 15 or len(title) > 120:
                        continue

                    title_key = title.lower().strip()
                    if title_key in seen_titles:
                        continue
                    seen_titles.add(title_key)

                    if not href.startswith("http"):
                        href = ET_BASE + href

                    tag = _extract_tag_from_url(href)

                    stories.append({
                        "id": str(len(stories) + 1),
                        "title": title,
                        "tag": tag,
                        "url": href,
                        "image": "",
                    })

                    if len(stories) >= 15:
                        break
            except Exception as e:
                print(f"Failed to fetch ET latest news: {e}")

    # Fetch OG images from each article page (reliable per-article images)
    import asyncio
    final = stories[:12]
    if final:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers=HEADERS) as img_client:
            tasks = [_fetch_og_image(img_client, s["url"]) for s in final]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for s, img in zip(final, results):
                if isinstance(img, str) and img:
                    s["image"] = img

    return final


# Cache
_cache: dict = {"stories": [], "timestamp": 0}
CACHE_TTL = 300  # 5 minutes


async def get_trending_stories() -> list[dict]:
    """Get trending stories with 5-minute cache."""
    now = time.time()

    if _cache["stories"] and (now - _cache["timestamp"]) < CACHE_TTL:
        return _cache["stories"]

    stories = await fetch_trending_from_et()

    if stories:
        _cache["stories"] = stories
        _cache["timestamp"] = now

    return stories


# ── Local / Regional News ─────────────────────────────────────

# ET city edition URL patterns
ET_CITY_SLUGS = {
    "mumbai": "mumbai", "delhi": "delhi", "bangalore": "bangalore",
    "bengaluru": "bangalore", "hyderabad": "hyderabad", "chennai": "chennai",
    "kolkata": "kolkata", "pune": "pune", "ahmedabad": "ahmedabad",
    "lucknow": "lucknow", "jaipur": "jaipur", "chandigarh": "chandigarh",
    "kochi": "kochi", "patna": "patna", "bhopal": "bhopal",
    "thiruvananthapuram": "thiruvananthapuram", "guwahati": "guwahati",
    "noida": "delhi", "gurgaon": "delhi", "gurugram": "delhi",
    "navi mumbai": "mumbai", "thane": "mumbai",
    "new delhi": "delhi", "faridabad": "delhi", "ghaziabad": "delhi",
}

# Broader state/region fallback
ET_STATE_SLUGS = {
    "maharashtra": "mumbai", "karnataka": "bangalore", "tamil nadu": "chennai",
    "telangana": "hyderabad", "west bengal": "kolkata", "kerala": "kochi",
    "uttar pradesh": "lucknow", "rajasthan": "jaipur", "gujarat": "ahmedabad",
    "madhya pradesh": "bhopal", "bihar": "patna", "punjab": "chandigarh",
    "haryana": "chandigarh", "assam": "guwahati",
}


# Keywords that indicate LOCAL relevance for each city slug
_CITY_LOCAL_KEYWORDS: dict[str, list[str]] = {
    "mumbai": ["mumbai", "bmc", "maharashtra", "thane", "navi mumbai", "bse", "sensex", "dalal street", "marine drive", "mumbai metro"],
    "delhi": ["delhi", "ncr", "noida", "gurgaon", "gurugram", "ghaziabad", "faridabad", "aap", "mcd", "delhi metro", "dwarka"],
    "bangalore": ["bangalore", "bengaluru", "karnataka", "bbmp", "namma metro", "electronic city", "whitefield", "hsr"],
    "hyderabad": ["hyderabad", "telangana", "secunderabad", "cyberabad", "ghmc", "hitec city"],
    "chennai": ["chennai", "tamil nadu", "tn ", "dmk", "aiadmk", "coimbatore", "madurai", "trichy", "thiruvananthapuram", "kollywood", "tvk", "vijay"],
    "kolkata": ["kolkata", "west bengal", "bengal", "howrah", "tmc", "mamata", "kolkata metro"],
    "pune": ["pune", "pimpri", "chinchwad", "maharashtra", "pcmc", "hinjewadi"],
    "ahmedabad": ["ahmedabad", "gujarat", "gandhinagar", "surat", "vadodara", "amc"],
    "lucknow": ["lucknow", "uttar pradesh", " up ", "noida", "agra", "varanasi", "kanpur", "prayagraj"],
    "jaipur": ["jaipur", "rajasthan", "jodhpur", "udaipur"],
    "chandigarh": ["chandigarh", "punjab", "haryana", "mohali", "panchkula"],
    "kochi": ["kochi", "kerala", "ernakulam", "trivandrum", "thiruvananthapuram", "kozhikode"],
    "patna": ["patna", "bihar", "muzaffarpur", "gaya"],
    "bhopal": ["bhopal", "madhya pradesh", "indore", "jabalpur"],
    "guwahati": ["guwahati", "assam", "northeast", "north east", "meghalaya", "manipur"],
}


def _local_relevance(title: str, url: str, city_slug: str) -> float:
    """Score 0-1 for how locally relevant an article is to the city."""
    text = (title + " " + url).lower()
    keywords = _CITY_LOCAL_KEYWORDS.get(city_slug, [city_slug])
    matches = sum(1 for kw in keywords if kw in text)
    if matches >= 2:
        return 1.0
    if matches == 1:
        return 0.7
    # Check if the URL itself is under a city section
    if f"/{city_slug}/" in url.lower() or f"/city/" in url.lower():
        return 0.5
    return 0.0


def _resolve_et_city(city: str, state: str = "") -> str | None:
    """Map a city/state name to an ET city slug."""
    city_lower = city.lower().strip()
    if city_lower in ET_CITY_SLUGS:
        return ET_CITY_SLUGS[city_lower]
    state_lower = state.lower().strip()
    if state_lower in ET_STATE_SLUGS:
        return ET_STATE_SLUGS[state_lower]
    return None


async def fetch_local_news(city_slug: str) -> list[dict]:
    """Scrape ET city edition page for local news, filtered for relevance."""
    candidates = []
    seen_titles = set()
    city_url = f"{ET_BASE}/news/city/news/{city_slug}"

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=HEADERS) as client:
        # Try city news pages — collect more candidates than needed for filtering
        for url in [city_url, f"{ET_BASE}/news/{city_slug}"]:
            try:
                resp = await client.get(url)
                if resp.status_code != 200:
                    continue
                soup = BeautifulSoup(resp.text, "html.parser")

                for link in soup.find_all("a", href=True):
                    href = link["href"]
                    title = link.get_text(strip=True)

                    if "/articleshow/" not in href:
                        continue
                    if not title or len(title) < 15 or len(title) > 120:
                        continue

                    title_key = title.lower().strip()
                    if title_key in seen_titles:
                        continue
                    seen_titles.add(title_key)

                    if not href.startswith("http"):
                        href = ET_BASE + href

                    score = _local_relevance(title, href, city_slug)
                    candidates.append({
                        "title": title,
                        "tag": city_slug.title(),
                        "url": href,
                        "image": "",
                        "_score": score,
                    })

                    if len(candidates) >= 30:
                        break

            except Exception as e:
                print(f"Failed to fetch ET city page {url}: {e}")

        # If city page didn't yield results, search ET for city news
        if not candidates:
            from urllib.parse import quote
            search_url = f"{ET_BASE}/searchresult.cms?query={quote(city_slug + ' news')}"
            try:
                resp = await client.get(search_url)
                resp.raise_for_status()
                soup = BeautifulSoup(resp.text, "html.parser")

                for link in soup.find_all("a", href=True):
                    href = link["href"]
                    title = link.get_text(strip=True)

                    if "/articleshow/" not in href:
                        continue
                    if not title or len(title) < 15 or len(title) > 120:
                        continue

                    title_key = title.lower().strip()
                    if title_key in seen_titles:
                        continue
                    seen_titles.add(title_key)

                    if not href.startswith("http"):
                        href = ET_BASE + href

                    score = _local_relevance(title, href, city_slug)
                    candidates.append({
                        "title": title,
                        "tag": city_slug.title(),
                        "url": href,
                        "image": "",
                        "_score": score,
                    })

                    if len(candidates) >= 20:
                        break
            except Exception as e:
                print(f"ET city search failed: {e}")

    # Sort by relevance score (highest first), then take top results
    candidates.sort(key=lambda x: x["_score"], reverse=True)

    # Only keep articles with some local relevance (score > 0)
    relevant = [c for c in candidates if c["_score"] > 0]

    # If very few relevant articles, include some from the page anyway (they're from the city section)
    if len(relevant) < 4:
        relevant = candidates[:12]

    # Clean up internal score field and assign IDs
    stories = []
    for i, c in enumerate(relevant[:12]):
        c.pop("_score", None)
        c["id"] = str(i + 1)
        stories.append(c)

    # Fetch OG images
    import asyncio
    final = stories[:10]
    if final:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, headers=HEADERS) as img_client:
            tasks = [_fetch_og_image(img_client, s["url"]) for s in final]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for s, img in zip(final, results):
                if isinstance(img, str) and img:
                    s["image"] = img

    return final


# Local news cache: keyed by city slug
_local_cache: dict[str, dict] = {}


async def get_local_news(city: str, state: str = "") -> dict:
    """Get local news for a city with caching. Returns {city, stories}."""
    city_slug = _resolve_et_city(city, state)
    display_city = city.title()

    if not city_slug:
        # Fallback: use the city name directly as search
        city_slug = city.lower().replace(" ", "-")

    now = time.time()
    cached = _local_cache.get(city_slug)
    if cached and (now - cached["timestamp"]) < CACHE_TTL:
        return {"city": display_city, "etCity": city_slug, "stories": cached["stories"]}

    stories = await fetch_local_news(city_slug)

    if stories:
        _local_cache[city_slug] = {"stories": stories, "timestamp": now}

    return {"city": display_city, "etCity": city_slug, "stories": stories}
