const API_BASE = import.meta.env.VITE_API_BASE || "";

export interface ArticleMeta {
  title: string;
  url: string;
  source: string;
  published: string;
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
  summary: string;
}

export interface KeyQuote {
  quote: string;
  speaker: string;
  context: string;
}

export interface TldrCard {
  emoji: string;
  title: string;
  text: string;
}

export interface DeepDive {
  sentimentBreakdown: SentimentBreakdown;
  keyQuotes: KeyQuote[];
  tldrCards: TldrCard[];
}

export interface StoryData {
  id: string;
  title: string;
  topic: string;
  summary: string;
  keyFacts: string[];
  impactCards: { audience: string; icon: string; sentiment: "positive" | "caution" | "negative"; text: string }[];
  keyPlayers: { name: string; initials: string; role: string; stance: "positive" | "caution" | "negative" }[];
  suggestedQuestions: string[];
  timeline: { id: string; date: string; title: string; summary: string; sentiment: "positive" | "caution" | "negative" }[];
  sources: string[];
  sourceUrls?: string[];
  whatToWatch?: string[];
  deepDive?: DeepDive;
}

export interface AnalyzeResponse {
  session_id: string;
  story: StoryData;
  articleCount: number;
  articleMeta: ArticleMeta[];
}

export interface ChatResponse {
  id: string;
  role: "ai";
  content: string;
  sources: string[];
}

export async function analyzeStory(query: string, signal?: AbortSignal): Promise<AnalyzeResponse> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Analysis failed" }));
    throw new Error(err.detail || "Analysis failed");
  }
  return res.json();
}

export interface TrendingStory {
  id: string;
  title: string;
  tag: string;
  url?: string;
  image?: string;
}

export async function fetchTrending(): Promise<TrendingStory[]> {
  const res = await fetch(`${API_BASE}/api/trending`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.stories || [];
}

export async function chatWithStory(
  sessionId: string,
  question: string,
  chatHistory: { role: string; content: string }[] = []
): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      question,
      chat_history: chatHistory,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Chat failed" }));
    throw new Error(err.detail || "Chat failed");
  }
  return res.json();
}

export interface LocalNewsResponse {
  city: string;
  etCity: string;
  stories: TrendingStory[];
}

export async function fetchLocalNews(city: string, state: string = ""): Promise<LocalNewsResponse> {
  const res = await fetch(`${API_BASE}/api/local-news`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city, state }),
  });
  if (!res.ok) return { city, etCity: "", stories: [] };
  return res.json();
}

