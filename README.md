<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4o--mini-412991?style=for-the-badge&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Deepgram-Voice_AI-13EF93?style=for-the-badge&logo=deepgram&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-Auth-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/FAISS-Vector_Search-blue?style=for-the-badge" />
</p>

<h1 align="center">EditoriaAl</h1>
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

**ET Chronicle** scrapes Economic Times articles in real-time, runs them through a **RAG pipeline** (chunk, embed, retrieve), and delivers structured intelligence via GPT-4o-mini that you can *interact* with — personalized feeds, AI briefings, and voice-powered Q&A, all grounded in ET journalism.

---

## Features

### AI Briefings
> All articles condensed into one structured story

- Executive summary synthesizing multiple articles
- Data-driven key facts extracted from coverage
- Impact analysis across stakeholder groups with sentiment indicators
- Timeline of events with sentiment tracking
- Suggested follow-up questions to ask the story

### For You
> Personalized news feed based on your interests

- Select preferred domains during signup (Markets, Tech, Startups, Economy, etc.)
- Curated stories fetched from ET sections matching your interests
- Accessible via a floating sparkle button on the landing page
- Smooth page transition animations between views

### Voice Q&A
> Ask questions by voice or text — get cited answers

- Real-time voice input powered by Deepgram Nova-2 STT
- Falls back to Web Speech API when Deepgram is unavailable
- Concise, grounded answers with source citations
- Per-question RAG retrieval for focused, relevant answers

### Live Trending & Local News
> Always know what's breaking on Economic Times

- Real-time trending stories scraped from ET homepage with images
- Location-based local news using geolocation
- One-click analysis of any story
- 5-minute intelligent cache for performance

### Authentication
> Secure, personalized experience with Supabase

- Email/password signup and login via modal overlays
- Domain preference selection during signup (12 news categories)
- Protected analyze/chat endpoints with JWT verification
- Personalized time-based greetings on the landing page

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                       React Frontend                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐          │
│  │ Landing   │  │ Briefing │  │ For You  │  │ Q&A  │          │
│  │ Page      │  │ Panel    │  │ Page     │  │ Dock │          │
│  └────┬──┬──┘  └────┬─────┘  └────┬─────┘  └──┬───┘          │
│       │  │          │              │            │              │
│       │  │   ┌──────┴──────────────┴────────────┘              │
│       │  │   │     API Layer (api.ts + authHeaders)            │
│       │  └───┤                                                 │
│       │      │  ┌─────────────────────┐                        │
│       │      │  │ Supabase Auth       │                        │
│       │      │  │ (AuthContext.tsx)    │                        │
│       └──────┤  └─────────────────────┘                        │
└──────────────┼─────────────────────────────────────────────────┘
               │  HTTP + SSE
┌──────────────┼─────────────────────────────────────────────────┐
│              │         FastAPI Backend                          │
│  ┌───────────▼──────────────────────────────────────────────┐  │
│  │                   REST API (main.py)                      │  │
│  │  /analyze-stream  /analyze  /chat  /foryou  /trending     │  │
│  │  (SSE progress)   (auth)    (auth) (auth)   (public)      │  │
│  └────┬──────────────┬─────────┬──────┬─────────┬───────────┘  │
│       │              │         │      │         │              │
│  ┌────▼────┐   ┌─────▼───┐  ┌─▼──────▼──┐  ┌──▼──────────┐  │
│  │  RAG    │   │   AI    │  │ Trending  │  │ Supabase    │  │
│  │ Engine  │   │ Engine  │  │ + ForYou  │  │ Auth Verify │  │
│  │ (FAISS) │   │ (GPT-4o)│  │ Scraper   │  │ (auth.py)   │  │
│  └────┬────┘   └────┬────┘  └───────────┘  └─────────────┘  │
│       │              │                                        │
│  ┌────▼──────────────▼────┐    ┌─────────────────────┐       │
│  │ sentence-transformers  │    │   ET News Scraper   │       │
│  │ (all-MiniLM-L6-v2)    │    │   (JSON-LD + HTML)  │       │
│  │ + FAISS IndexFlatIP    │    │   + Semantic Rank   │       │
│  └────────────────────────┘    └─────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Query
  │
  ├──► ET Search (parallel queries) ──► Extract Article URLs
  │                                          │
  │                                    ┌─────▼──────┐
  │                                    │ Fetch each │  (concurrent, up to 10)
  │                                    │ article    │
  │                                    │ via JSON-LD│
  │                                    └─────┬──────┘
  │                                          │
  │                              ┌───────────▼───────────┐
  │                              │    RAG Pipeline        │
  │                              │ 1. Chunk (250 words)   │
  │                              │ 2. Embed (MiniLM-L6)   │
  │                              │ 3. FAISS Index          │
  │                              │ 4. Retrieve top-k       │
  │                              └───────────┬────────────┘
  │                                          │
  │                                    Top-k chunks (~4K tokens)
  │                                          │
  ├──► SSE Progress Events ◄─────────────────┤
  │                                          │
  ├──► OpenAI GPT-4o-mini ◄─────────────────┘
  │         │
  │    Structured Briefing
  │    + Session stored (with FAISS index)
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
| Supabase Project | Required (auth + profiles) |
| Deepgram API Key | Optional (voice input) |

### 1. Clone the repository

```bash
git clone https://github.com/k-Rohit/ET_Chronicles.git
cd ET_Chronicles
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration:

```sql
-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null default '',
  full_name text not null default '',
  preferred_domains text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  domains text[];
begin
  select coalesce(
    array(select jsonb_array_elements_text(new.raw_user_meta_data->'preferred_domains')),
    '{}'
  ) into domains;
  insert into public.profiles (id, email, full_name, preferred_domains)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''), domains)
  on conflict (id) do update set
    email = excluded.email, full_name = excluded.full_name, preferred_domains = excluded.preferred_domains;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

3. Go to **Authentication → Providers → Email** and disable "Confirm email" (for hackathon)

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add:
#   OPENAI_API_KEY = "sk-..."
#   DEEPGRAM_API_KEY = "..."           (optional)
#   SUPABASE_URL = "https://xxx.supabase.co"
#   SUPABASE_ANON_KEY = "eyJ..."

# Start server
python main.py
```

> Backend runs at **http://localhost:8000**

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
# Create .env.local with:
#   VITE_API_BASE=http://localhost:8000
#   VITE_SUPABASE_URL=https://xxx.supabase.co
#   VITE_SUPABASE_ANON_KEY=eyJ...

# Start dev server
npm run dev
```

> Frontend runs at **http://localhost:8080**

---

## API Reference

### `GET /api/analyze-stream` (Auth Required)
SSE endpoint — streams progress events during analysis, then sends the final result.

**Query params:** `?query=RBI+monetary+policy`

**SSE Events:**
```
event: progress
data: {"step": "scraping", "message": "Searching Economic Times..."}

event: progress
data: {"step": "embedding", "message": "Analyzing 9 articles with AI..."}

event: progress
data: {"step": "generating", "message": "Generating intelligence briefing..."}

event: result
data: {"session_id": "uuid", "story": {...}, "articleCount": 9, "articleMeta": [...]}
```

### `POST /api/analyze` (Auth Required)
Non-streaming fallback for analysis.

**Request:**
```json
{ "query": "RBI monetary policy" }
```

### `POST /api/chat` (Auth Required)
Ask follow-up questions with per-question RAG retrieval.

**Request:**
```json
{
  "session_id": "uuid",
  "question": "What did the RBI governor say about inflation?",
  "chat_history": []
}
```

### `POST /api/foryou` (Auth Required)
Fetch personalized stories based on user's preferred domains.

**Request:**
```json
{ "domains": ["tech", "markets", "startups"] }
```

### `GET /api/trending` (Public)
Fetch live trending stories from ET homepage with images.

### `POST /api/local-news` (Public)
Fetch location-based news from ET city editions.

### `GET /api/health`
Health check — returns `{ "status": "ok" }`.

---

## Tech Stack

### Backend

| Technology | Purpose |
|-----------|---------|
| **FastAPI** | Async REST API framework with SSE support |
| **OpenAI GPT-4o-mini** | Briefing generation & conversational Q&A |
| **sentence-transformers** | Local text embeddings (all-MiniLM-L6-v2) |
| **FAISS** | In-memory vector search for RAG retrieval |
| **Supabase** | Auth verification via `/auth/v1/user` |
| **httpx** | Async HTTP client for web scraping |
| **BeautifulSoup4** | HTML parsing & content extraction |
| **sse-starlette** | Server-Sent Events for streaming progress |
| **Pydantic** | Request/response validation |
| **Uvicorn** | High-performance ASGI server |

### Frontend

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type-safe development |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling with custom dark design system |
| **Supabase JS** | Auth client (email/password, session management) |
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
│   ├── main.py              # FastAPI app, REST + SSE endpoints, auth middleware
│   ├── ai_engine.py         # OpenAI briefing (RAG-aware) & chat logic
│   ├── rag_engine.py        # RAG pipeline: chunk, embed, FAISS index, retrieve
│   ├── news_scraper.py      # ET article scraping + semantic ranking
│   ├── trending.py          # Trending, local news, and For You scrapers
│   ├── auth.py              # Supabase JWT verification dependency
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment variable template
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.tsx      # Hero + search + trending + local + auth modal
│   │   │   ├── AppDashboard.tsx     # Dashboard layout (sidebar + briefing + Q&A)
│   │   │   ├── AppSidebar.tsx       # Navigation sidebar with trending/local lists
│   │   │   ├── BriefingPanel.tsx    # AI briefing view (facts, impact, timeline)
│   │   │   ├── ForYouPage.tsx       # Personalized news feed by domain
│   │   │   ├── AuthModal.tsx        # Login/signup modal overlay with domain picker
│   │   │   ├── QADock.tsx           # Voice/text Q&A chat panel
│   │   │   └── LoadingScreen.tsx    # SSE-driven loading animation
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx      # Supabase auth state provider
│   │   ├── hooks/
│   │   │   └── useVoiceInput.ts     # Deepgram WebSocket + Web Speech fallback
│   │   ├── lib/
│   │   │   └── supabase.ts          # Supabase client initialization
│   │   ├── services/
│   │   │   └── api.ts               # API client with auth headers & SSE streaming
│   │   └── pages/
│   │       └── Index.tsx            # Main page state machine (landing/loading/dashboard/foryou)
│   ├── .env.local                   # Frontend env vars (Supabase + API base)
│   ├── package.json
│   └── tailwind.config.ts           # Custom design system (glass, sentiment colors)
│
├── supabase_migration.sql           # Profiles table + RLS + trigger
└── README.md
```

---

## How It Works

### RAG Pipeline

Instead of sending all article text directly to the LLM (~20K+ tokens), ET Chronicle uses a **Retrieval-Augmented Generation** pipeline:

1. **Chunk** — Each article split into ~250-word overlapping chunks with metadata
2. **Embed** — All chunks encoded locally using `all-MiniLM-L6-v2` (384-dim vectors)
3. **Index** — FAISS `IndexFlatIP` for cosine similarity search (instant for <200 chunks)
4. **Retrieve** — Top-k chunks most relevant to the query (~4K tokens vs ~20K+)
5. **Generate** — GPT-4o-mini produces structured briefing from focused context

**Result:** ~60% fewer LLM input tokens, better relevance, and faster responses.

### Semantic Search Ranking

Article search results are ranked using **embedding-based cosine similarity** on titles (not keyword matching), with a **recency boost** (0-0.15 score) favoring articles published within the last 6 hours. Articles scoring below 50% of the top result are dropped.

### Scraping Strategy

Economic Times is a Next.js SPA. ET Chronicle extracts article text from **JSON-LD structured data** (`<script type="application/ld+json">`) embedded in each page, which contains the full `articleBody`. Search queries run in parallel via `asyncio.gather` for 2-4x speedup.

### Voice Input Pipeline

1. **Primary: Deepgram Nova-2** — WebSocket-based real-time STT with high accuracy
2. **Fallback: Web Speech API** — Browser-native speech recognition when Deepgram is unavailable

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for GPT-4o-mini |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `DEEPGRAM_API_KEY` | No | Deepgram API key for voice-to-text |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE` | Yes | Backend URL (e.g. `http://localhost:8000`) |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |

---

<p align="center">
  Built for the <strong>ET Hackathon</strong><br/>
  <sub>From breaking news to full narrative</sub>
</p>
