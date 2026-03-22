<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=for-the-badge&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Deepgram-Voice_AI-13EF93?style=for-the-badge&logo=deepgram&logoColor=white" />
</p>

<h1 align="center">ET Chronicle</h1>
<p align="center">
  <strong>Stop reading news. Start interacting with it.</strong><br/>
  AI-powered news intelligence built on Economic Times journalism.
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#api-reference">API Reference</a> &bull;
  <a href="#tech-stack">Tech Stack</a>
</p>

---

## The Problem

Reading 10 articles on the same topic to piece together the full picture is exhausting. News consumers waste time scrolling through repetitive coverage when they just need the signal.

## The Solution

**ET Chronicle** scrapes Economic Times articles in real-time, feeds them through GPT-4o-mini, and delivers structured intelligence you can *interact* with — briefings, sentiment analysis, key quotes, and voice-powered Q&A, all grounded in ET journalism.

---

## Features

### AI Briefings
> All articles condensed into one structured story

- Executive summary synthesizing multiple articles
- 6 data-driven key facts extracted from coverage
- Impact analysis across 3 stakeholder groups with sentiment indicators
- Key players identified with their roles and stances
- 5 suggested follow-up questions to ask the story

### Deep Dive
> Sentiment, quotes, and quick insights at a glance

- **Sentiment Meter** — Visual breakdown of positive, neutral, and negative tone across all source articles
- **Key Quotes** — Notable quotes from articles with speaker attribution and context
- **TL;DR Flashcards** — Bite-sized insight cards summarizing different angles of the story
- **What to Watch** — Forward-looking predictions based on the coverage

### Voice Q&A
> Ask questions by voice or text — get cited answers

- Real-time voice input powered by Deepgram Nova-2 STT
- Falls back to Web Speech API when Deepgram is unavailable
- Concise, grounded answers (3-5 sentences) with source citations
- Full conversation history maintained per session

### Live Trending
> Always know what's breaking on Economic Times

- Real-time trending stories scraped from ET homepage
- Story images and category tags
- One-click analysis of any trending story
- 5-minute intelligent cache for performance

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐ │
│  │ Landing   │  │ Briefing │  │ Deep Dive │  │  Q&A   │ │
│  │ Page      │  │ Panel    │  │ Panel     │  │  Dock  │ │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  └───┬────┘ │
│       │              │              │             │      │
│       └──────────────┴──────────────┴─────────────┘      │
│                          │  API Layer (api.ts)           │
└──────────────────────────┼───────────────────────────────┘
                           │  HTTP
┌──────────────────────────┼───────────────────────────────┐
│                    FastAPI Backend                        │
│                          │                               │
│  ┌───────────────────────▼────────────────────────────┐  │
│  │              REST API (main.py)                     │  │
│  │   /analyze  /chat  /trending  /config  /health     │  │
│  └──────┬─────────┬────────┬──────────────────────────┘  │
│         │         │        │                             │
│  ┌──────▼──┐ ┌────▼────┐ ┌▼──────────┐                  │
│  │   AI    │ │  Chat   │ │ Trending  │                  │
│  │ Engine  │ │ Engine  │ │ Scraper   │                  │
│  └────┬────┘ └────┬────┘ └───────────┘                  │
│       │           │                                      │
│  ┌────▼───────────▼────┐    ┌─────────────────────┐     │
│  │   OpenAI GPT-4o     │    │   ET News Scraper   │     │
│  │   (Briefings + QA)  │    │   (JSON-LD + HTML)  │     │
│  └─────────────────────┘    └─────────────────────┘     │
└──────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Query
  │
  ├──► ET Search Page ──► Extract Article URLs
  │                           │
  │                     ┌─────▼──────┐
  │                     │ Fetch each │  (concurrent, up to 8)
  │                     │ article    │
  │                     │ via        │
  │                     │ JSON-LD    │
  │                     └─────┬──────┘
  │                           │
  │                     Article texts (5K-9K chars each)
  │                           │
  ├──► OpenAI GPT-4o-mini ◄───┘
  │         │
  │    Structured Briefing
  │    + Deep Dive Data
  │    + Session stored
  │         │
  └──► Frontend renders dashboard
```

---

## Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.10+ |
| Node.js | 16+ |
| OpenAI API Key | Required |
| Deepgram API Key | Optional (voice input) |

### 1. Clone the repository

```bash
git clone https://github.com/k-Rohit/ET_Chronicles.git
cd ET_Chronicles
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys:
#   OPENAI_API_KEY = "sk-..."
#   DEEPGRAM_API_KEY = "..."    (optional)

# Start server
python main.py
```

> Backend runs at **http://localhost:8000**

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

> Frontend runs at **http://localhost:8080**

---

## API Reference

### `POST /api/analyze`
Scrape ET articles and generate an AI briefing.

**Request:**
```json
{
  "query": "RBI monetary policy"
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "story": {
    "title": "RBI Holds Rates Steady Amid Global Uncertainty",
    "summary": "...",
    "keyFacts": ["...", "..."],
    "impactCards": [{ "audience": "...", "sentiment": "positive", "text": "..." }],
    "keyPlayers": [{ "name": "...", "role": "...", "stance": "caution" }],
    "deepDive": {
      "sentimentBreakdown": { "positive": 45, "neutral": 30, "negative": 25, "summary": "..." },
      "keyQuotes": [{ "quote": "...", "speaker": "...", "context": "..." }],
      "tldrCards": [{ "emoji": "...", "title": "...", "text": "..." }]
    }
  },
  "articleCount": 6,
  "articleMeta": [{ "title": "...", "url": "...", "source": "Economic Times" }]
}
```

### `POST /api/chat`
Ask follow-up questions grounded in article context.

**Request:**
```json
{
  "session_id": "uuid",
  "question": "What did the RBI governor say about inflation?",
  "chat_history": []
}
```

**Response:**
```json
{
  "id": "a1b2c3d4",
  "role": "ai",
  "content": "RBI Governor Shaktikanta Das noted that...",
  "sources": ["Economic Times"]
}
```

### `GET /api/trending`
Fetch live trending stories from Economic Times homepage.

### `GET /api/config`
Returns client-safe configuration (Deepgram key for voice input).

### `GET /api/health`
Health check — returns `{ "status": "ok" }`.

---

## Tech Stack

### Backend

| Technology | Purpose |
|-----------|---------|
| **FastAPI** | Async REST API framework |
| **OpenAI GPT-4o-mini** | Briefing generation & conversational Q&A |
| **httpx** | Async HTTP client for web scraping |
| **BeautifulSoup4** | HTML parsing & content extraction |
| **newspaper3k** | Article text extraction |
| **Pydantic** | Request/response validation |
| **Uvicorn** | High-performance ASGI server |

### Frontend

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type-safe development |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling with custom design system |
| **shadcn/ui** | Radix-based component library |
| **Deepgram SDK** | Real-time voice-to-text transcription |
| **TanStack Query** | Server state management |
| **Lucide** | Icon library |

---

## Project Structure

```
ET_Chronicles/
│
├── backend/
│   ├── main.py              # FastAPI app & REST endpoints
│   ├── ai_engine.py         # OpenAI briefing & chat logic
│   ├── news_scraper.py      # ET article scraping (JSON-LD extraction)
│   ├── trending.py          # ET homepage trending scraper (with image extraction)
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variable template
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.tsx      # Hero section + search + trending cards
│   │   │   ├── AppDashboard.tsx     # Two-panel dashboard layout
│   │   │   ├── AppSidebar.tsx       # Navigation sidebar with trending list
│   │   │   ├── BriefingPanel.tsx    # AI briefing view (facts, impact, players)
│   │   │   ├── DeepDivePanel.tsx    # Sentiment meter + quotes + TL;DR cards
│   │   │   ├── QADock.tsx           # Voice/text Q&A chat panel
│   │   │   └── LoadingScreen.tsx    # Multi-step analysis loading animation
│   │   ├── hooks/
│   │   │   └── useVoiceInput.ts     # Deepgram WebSocket + Web Speech fallback
│   │   ├── services/
│   │   │   └── api.ts               # API client & TypeScript interfaces
│   │   └── pages/
│   │       └── Index.tsx            # Main page state machine
│   ├── package.json
│   └── tailwind.config.ts           # Custom design system (glass, sentiment colors)
│
└── README.md
```

---

## How It Works

### Scraping Strategy

Economic Times is a Next.js SPA, which means traditional HTML scraping returns minimal content. ET Chronicle solves this by extracting article text from **JSON-LD structured data** (`<script type="application/ld+json">`) embedded in each page, which contains the full `articleBody` (5,000-9,000 characters per article).

```
ET Search URL → Parse result links → Fetch each article page
→ Extract JSON-LD → Pull articleBody → Return structured article data
```

### Voice Input Pipeline

The voice system uses a dual-provider approach for maximum compatibility:

1. **Primary: Deepgram Nova-2** — WebSocket-based real-time STT with high accuracy. Audio captured via `MediaRecorder`, chunked every 250ms, and streamed for transcription.
2. **Fallback: Web Speech API** — Browser-native speech recognition when Deepgram key is unavailable.

The transcript auto-submits to the Q&A engine after a short delay so the user can see what was captured.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o-mini |
| `DEEPGRAM_API_KEY` | No | Deepgram API key for voice-to-text input |

---

<p align="center">
  Built for the <strong>ET Hackathon</strong><br/>
  <sub>From breaking news to full narrative</sub>
</p>
