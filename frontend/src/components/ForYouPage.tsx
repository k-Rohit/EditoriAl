import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Sparkles, MapPin } from 'lucide-react';
import { fetchForYou, type TrendingStory } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

const DOMAIN_LABELS: Record<string, { label: string; icon: string }> = {
  markets: { label: 'Markets & Stocks', icon: '📈' },
  tech: { label: 'Technology', icon: '💻' },
  startups: { label: 'Startups', icon: '🚀' },
  economy: { label: 'Economy & Policy', icon: '🏛️' },
  industry: { label: 'Industry', icon: '🏭' },
  banking: { label: 'Banking & Finance', icon: '🏦' },
  'real-estate': { label: 'Real Estate', icon: '🏠' },
  auto: { label: 'Auto', icon: '🚗' },
  energy: { label: 'Energy & Oil', icon: '⚡' },
  global: { label: 'Global News', icon: '🌍' },
  defence: { label: 'Defence', icon: '🛡️' },
  crypto: { label: 'Crypto & Web3', icon: '🪙' },
};

interface ForYouPageProps {
  onBack: () => void;
  onAnalyze: (query: string, articleUrl?: string) => void;
}

const ForYouPage = ({ onBack, onAnalyze }: ForYouPageProps) => {
  const { profile } = useAuth();
  const [stories, setStories] = useState<TrendingStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  const domains = profile?.preferred_domains || [];

  useEffect(() => {
    if (domains.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchForYou(domains)
      .then(setStories)
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        requestAnimationFrame(() => setVisible(true));
      });
  }, [domains.join(',')]);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full bg-primary/[0.02] blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-5 sm:py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors active:scale-[0.95]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <img src="/icon.png" alt="EditoriAI" className="w-8 h-8 rounded-lg" />
            <span className="text-base sm:text-lg font-semibold tracking-tight text-foreground">EditoriAI</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-primary">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs sm:text-sm font-medium">For You</span>
        </div>
      </nav>

      {/* Header */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 pt-4 sm:pt-8 pb-6 sm:pb-10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Your Personalized Feed</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Stories curated from your interests
        </p>

        {/* Domain tags */}
        <div className="flex flex-wrap gap-2">
          {domains.map((d) => {
            const info = DOMAIN_LABELS[d];
            return (
              <span
                key={d}
                className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {info?.icon} {info?.label || d}
              </span>
            );
          })}
        </div>
      </section>

      {/* Content */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 pb-16 sm:pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 animate-pulse">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">Curating your feed...</p>
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : stories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Sparkles className="w-10 h-10 text-muted-foreground/30 mb-4" />
            <h3 className="text-base font-semibold text-foreground mb-2">No stories found</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              We couldn't find stories for your selected domains right now. Try again later or update your preferences.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stories.map((story, i) => (
              <button
                key={story.id}
                onClick={() => onAnalyze(story.title, story.url)}
                className={`text-left glass-panel-hover rounded-2xl overflow-hidden group active:scale-[0.98] transition-all duration-500 ${
                  visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
                style={{ transitionDelay: visible ? `${i * 60}ms` : '0ms' }}
              >
                <div className="aspect-[16/9] bg-secondary overflow-hidden">
                  {story.image ? (
                    <img
                      src={story.image}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-secondary/50">
                      <Sparkles className="w-8 h-8 text-muted-foreground/20" />
                    </div>
                  )}
                </div>
                <div className="p-3.5 sm:p-4">
                  <span className="text-[10px] uppercase tracking-wider font-medium text-primary/70 mb-1.5 sm:mb-2 block">
                    {story.tag}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
                    {story.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground/50 mt-1.5 sm:mt-2">
                    Click to analyze with AI
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-6 sm:py-8 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <img src="/icon.png" alt="EditoriAI" className="w-4 h-4 rounded" />
            EditoriAI
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground/50">Personalized for you</p>
        </div>
      </footer>
    </div>
  );
};

export default ForYouPage;
