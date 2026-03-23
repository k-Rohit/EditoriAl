import { useState, useMemo } from 'react';
import { ChevronDown, ExternalLink, Newspaper, Volume2, Pause, Loader2 } from 'lucide-react';
import type { StoryData, ArticleMeta } from '@/services/api';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';

const sentimentColor = (s: string) =>
  s === 'positive' ? 'bg-sentiment-positive/10 text-sentiment-positive border-sentiment-positive/20' :
  s === 'caution' ? 'bg-sentiment-caution/10 text-sentiment-caution border-sentiment-caution/20' :
  'bg-sentiment-negative/10 text-sentiment-negative border-sentiment-negative/20';

const stanceDot = (s: string) =>
  s === 'positive' ? 'bg-sentiment-positive' :
  s === 'caution' ? 'bg-sentiment-caution' :
  'bg-sentiment-negative';

interface BriefingPanelProps {
  story: StoryData;
  articleCount: number;
  articleMeta: ArticleMeta[];
  onAskQuestion: (q: string) => void;
  deepgramApiKey?: string;
}

const BriefingPanel = ({ story, articleCount, articleMeta, onAskQuestion, deepgramApiKey }: BriefingPanelProps) => {
  const [sourcesOpen, setSourcesOpen] = useState(false);

  // Build TTS text
  const ttsText = useMemo(() => {
    const parts = [story.title, story.summary];
    story.keyFacts.forEach((f, i) => parts.push(`Fact ${i + 1}: ${f}`));
    return parts.join('. ');
  }, [story.title, story.summary, story.keyFacts]);

  const { isPlaying, isLoading: ttsLoading, play, pause, stop } = useTextToSpeech({
    text: ttsText,
    deepgramApiKey,
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-up">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <p className="text-xs uppercase tracking-[0.15em] text-primary/70 font-medium">AI Briefing</p>
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            <Newspaper className="w-3 h-3" />
            {articleCount} articles analyzed
          </span>

          {/* TTS Play/Pause */}
          <button
            onClick={isPlaying ? pause : play}
            disabled={ttsLoading}
            className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full border border-primary/20 text-primary/80 hover:bg-primary/5 hover:border-primary/40 transition-all duration-200 active:scale-[0.96] disabled:opacity-40"
            title={isPlaying ? 'Pause audio' : 'Listen to briefing'}
          >
            {ttsLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : isPlaying ? <Pause className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            {ttsLoading ? 'Loading…' : isPlaying ? 'Pause' : 'Listen'}
          </button>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-tight text-balance mb-4">
          {story.title}
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">{story.summary}</p>
      </div>

      {/* Source Articles - Collapsible */}
      {articleMeta.length > 0 && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <button
            onClick={() => setSourcesOpen(!sourcesOpen)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">
                Source Articles ({articleMeta.length})
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${sourcesOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${sourcesOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
            <div className="px-5 pb-4 space-y-1.5">
              {articleMeta.map((article, i) => (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group"
                >
                  <span className="text-[10px] text-muted-foreground/50 font-mono mt-0.5 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground/80 leading-snug truncate group-hover:text-primary transition-colors">
                      {article.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground/40 mt-0.5">
                      {article.source}{article.published ? ` · ${article.published}` : ''}
                    </p>
                  </div>
                  <ExternalLink className="w-3 h-3 text-muted-foreground/30 shrink-0 mt-1 group-hover:text-primary transition-colors" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Key Facts */}
      <div>
        <h2 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-4 flex items-center gap-2">
          <span>🔑</span> Key Facts
        </h2>
        <div className="grid gap-2">
          {story.keyFacts.map((fact, i) => (
            <div
              key={i}
              className="glass-panel rounded-xl px-4 py-3 text-sm text-foreground/90 leading-relaxed"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {fact}
            </div>
          ))}
        </div>
      </div>

      {/* Impact Cards */}
      <div>
        <h2 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-4 flex items-center gap-2">
          <span>🎯</span> Impact Analysis
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {story.impactCards.map((card) => (
            <div key={card.audience} className="glass-panel-hover rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{card.icon}</span>
                <span className={`text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full border ${sentimentColor(card.sentiment)}`}>
                  {card.sentiment}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{card.audience}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{card.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Key Players */}
      <div>
        <h2 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-4 flex items-center gap-2">
          <span>👥</span> Key Players
        </h2>
        <div className="flex flex-wrap gap-3">
          {story.keyPlayers.map((player) => (
            <div key={player.name} className="glass-panel rounded-xl px-4 py-3 flex items-center gap-3 group hover:bg-glass-hover transition-colors duration-200">
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground">
                {player.initials}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{player.name}</p>
                <p className="text-xs text-muted-foreground">{player.role}</p>
              </div>
              <div className={`w-2 h-2 rounded-full ${stanceDot(player.stance)} ml-1`} />
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Questions */}
      <div>
        <h2 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium mb-4 flex items-center gap-2">
          <span>💡</span> Ask the Story
        </h2>
        <div className="flex flex-wrap gap-2">
          {story.suggestedQuestions.map((q) => (
            <button
              key={q}
              onClick={() => onAskQuestion(q)}
              className="text-xs px-4 py-2 rounded-full border border-primary/20 text-primary/80 hover:bg-primary/5 hover:text-primary hover:border-primary/40 transition-all duration-200 active:scale-[0.96]"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Sources footer */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">Sources:</span>
          {story.sources.map((s) => (
            <span key={s} className="text-[10px] text-muted-foreground/50 px-2 py-0.5 bg-secondary rounded-full">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BriefingPanel;
