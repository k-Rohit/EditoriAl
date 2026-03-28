import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Lightbulb, Target, Loader2 } from 'lucide-react';
import { fetchDeepDive, type DeepDiveData } from '@/services/api';
import AppFooter from '@/components/AppFooter';

interface DeepDivePageProps {
  sessionId: string;
  storyTitle: string;
  onBack: () => void;
}

// ── Client-side cache: sessionId → { data, timestamp } ──
const deepDiveCache = new Map<string, { data: DeepDiveData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(sessionId: string): DeepDiveData | null {
  const entry = deepDiveCache.get(sessionId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    deepDiveCache.delete(sessionId);
    return null;
  }
  return entry.data;
}

function setCache(sessionId: string, data: DeepDiveData) {
  deepDiveCache.set(sessionId, { data, timestamp: Date.now() });
}

const SentimentGauge = ({ score, label }: { score: number; label: string }) => {
  const position = ((score + 1) / 2) * 100;

  return (
    <div className="w-full">
      <div className="h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 relative">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-background shadow-lg"
          style={{ left: `clamp(8px, calc(${position}% - 8px), calc(100% - 8px))` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground/50 uppercase tracking-wider">
        <span>Bearish</span>
        <span className="font-medium text-foreground/70 capitalize">{label}</span>
        <span>Bullish</span>
      </div>
    </div>
  );
};

const LikelihoodBadge = ({ likelihood }: { likelihood: string }) => {
  const styles: Record<string, string> = {
    likely: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    possible: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    unlikely: 'bg-red-500/15 text-red-400 border-red-500/20',
  };
  return (
    <span className={`text-[10px] uppercase tracking-wider font-medium px-2.5 py-1 rounded-full border ${styles[likelihood] || styles.possible}`}>
      {likelihood}
    </span>
  );
};

const DeepDivePage = ({ sessionId, storyTitle, onBack }: DeepDivePageProps) => {
  const [data, setData] = useState<DeepDiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check cache first
    const cached = getCached(sessionId);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchDeepDive(sessionId)
      .then((d) => {
        if (!d || !d.headline) {
          throw new Error('Deep dive returned incomplete data');
        }
        setCache(sessionId, d);
        setData(d);
      })
      .catch((e) => setError(e.message || 'Deep dive failed'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.04] blur-[120px] animate-pulse" />
        </div>
        <div className="relative text-center">
          <div className="w-16 h-16 rounded-2xl overflow-hidden mx-auto mb-6 animate-pulse-glow">
            <img src="/icon.png" alt="EditoriAI" className="w-full h-full" />
          </div>
          <p className="text-sm text-foreground font-medium mb-2">Crafting your deep dive...</p>
          <p className="text-xs text-muted-foreground mb-4">Building the full story from all sources</p>
          <Loader2 className="w-5 h-5 text-primary animate-spin mx-auto" />
          <button
            onClick={onBack}
            className="mt-8 text-xs text-muted-foreground/50 hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-400 mb-4">{error || 'Failed to generate deep dive'}</p>
          <button onClick={onBack} className="text-xs text-primary hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed back button */}
      <button
        onClick={onBack}
        className="fixed top-6 left-6 z-50 w-10 h-10 rounded-full bg-secondary/80 backdrop-blur-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-[0.95] border border-border/50"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      {/* ─── HERO ─── */}
      <section className="relative pt-20 sm:pt-24 pb-6 sm:pb-8 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] rounded-full bg-primary/[0.04] blur-[150px]" />
          <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] rounded-full bg-primary/[0.03] blur-[120px]" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-primary/60 font-medium mb-4">Deep Dive</p>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] text-foreground text-balance mb-4">
            {data.headline}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {data.subtitle}
          </p>
        </div>
      </section>

      {/* ─── NARRATIVE — The Full Story ─── */}
      {data.narrative && data.narrative.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 py-6 sm:py-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-primary/50 font-medium mb-2">The Full Story</p>
          <div className="h-px bg-gradient-to-r from-primary/30 to-transparent mb-8" />

          <div className="space-y-10">
            {data.narrative.map((section, i) => (
              <div key={i}>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3 leading-snug">
                  {section.heading}
                </h2>
                <div className="text-[15px] sm:text-base text-foreground/80 leading-[1.85] whitespace-pre-line">
                  {section.body}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── SENTIMENT PULSE ─── */}
      <section className="max-w-5xl mx-auto px-6 py-6 sm:py-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-primary/50 font-medium mb-2">Sentiment Analysis</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Market Pulse</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-lg">{data.sentiment?.summary}</p>

        <div className="glass-panel rounded-2xl p-6 sm:p-8 mb-4">
          <SentimentGauge score={data.sentiment?.score ?? 0} label={data.sentiment?.label ?? 'neutral'} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(data.sentiment?.signals || []).map((signal, i) => (
            <div key={i} className="glass-panel rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {signal.direction === 'positive' ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                ) : signal.direction === 'negative' ? (
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-yellow-400" />
                )}
                <span className="text-xs font-medium text-foreground">{signal.source}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{signal.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── BULL vs BEAR ─── */}
      <section className="max-w-5xl mx-auto px-6 py-6 sm:py-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-primary/50 font-medium mb-2">Contrasting Views</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">Two Sides of the Story</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Bull */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-emerald-400">{data.bull_bear?.bull_title}</h3>
            </div>
            <ul className="space-y-3">
              {(data.bull_bear?.bull_points || []).map((point, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-foreground/80 leading-relaxed">
                  <span className="text-emerald-500/50 mt-1 shrink-0">+</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Bear */}
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-5 h-5 text-red-400" />
              <h3 className="text-sm font-semibold text-red-400">{data.bull_bear?.bear_title}</h3>
            </div>
            <ul className="space-y-3">
              {(data.bull_bear?.bear_points || []).map((point, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-foreground/80 leading-relaxed">
                  <span className="text-red-500/50 mt-1 shrink-0">-</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Verdict */}
        <div className="glass-panel rounded-xl p-5 border-l-2 border-primary/40">
          <p className="text-xs uppercase tracking-wider text-primary/50 font-medium mb-1.5">The Verdict</p>
          <p className="text-sm text-foreground leading-relaxed">{data.bull_bear?.verdict}</p>
        </div>
      </section>

      {/* ─── KEY NUMBERS ─── */}
      <section className="max-w-5xl mx-auto px-6 py-6 sm:py-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-primary/50 font-medium mb-2">Data Points</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">Numbers That Matter</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(data.key_numbers || []).map((num, i) => (
            <div key={i} className="glass-panel rounded-2xl p-6">
              <p className="text-2xl sm:text-3xl font-bold gradient-text mb-1">{num.value}</p>
              <p className="text-xs font-medium text-foreground/70 uppercase tracking-wider mb-2">{num.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{num.context}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── ELI5 ─── */}
      <section className="max-w-5xl mx-auto px-6 py-6 sm:py-10">
        <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/[0.05] blur-[80px]" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">The Simple Version</h2>
                <p className="text-[10px] uppercase tracking-wider text-primary/50">Explain like I'm new to this</p>
              </div>
            </div>
            <p className="text-base sm:text-lg text-foreground/90 leading-relaxed">
              {data.eli5}
            </p>
          </div>
        </div>
      </section>

      {/* ─── SCENARIOS ─── */}
      <section className="max-w-5xl mx-auto px-6 py-6 sm:py-10">
        <p className="text-[10px] uppercase tracking-[0.2em] text-primary/50 font-medium mb-2">Forward Looking</p>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">What Could Happen Next</h2>

        <div className="space-y-4">
          {(data.scenarios || []).map((scenario, i) => (
            <div key={i} className="glass-panel rounded-2xl p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <Target className="w-4 h-4 text-primary/50 shrink-0" />
                  <h3 className="text-base font-semibold text-foreground">{scenario.title}</h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground/50">{scenario.timeframe}</span>
                  <LikelihoodBadge likelihood={scenario.likelihood} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed pl-7">{scenario.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <section className="max-w-5xl mx-auto px-6 pt-6 pb-2 text-center">
        <button
          onClick={onBack}
          className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Back to Briefing
        </button>
      </section>
      <AppFooter />
    </div>
  );
};

export default DeepDivePage;
