import { useState, useEffect, useRef } from 'react';
import { Search, ArrowRight, Brain, Zap, Flame, Loader2, Mic, MapPin, LogOut, UserCircle } from 'lucide-react';
import { fetchTrending, fetchLocalNews, type TrendingStory } from '@/services/api';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';

interface LandingPageProps {
  onAnalyze: (query: string) => void;
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const firstName = name.split(' ')[0];
  if (hour < 5) return `Burning the midnight oil, ${firstName}?`;
  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 17) return `Good afternoon, ${firstName}`;
  if (hour < 21) return `Good evening, ${firstName}`;
  return `Hello, night owl ${firstName}`;
}

const LandingPage = ({ onAnalyze }: LandingPageProps) => {
  const { user, profile, signOut } = useAuth();
  const [authModal, setAuthModal] = useState<'login' | 'signup' | null>(null);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [trending, setTrending] = useState<TrendingStory[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [visible, setVisible] = useState(false);

  // Gate analyze behind auth
  const tryAnalyze = (q: string) => {
    if (user) {
      onAnalyze(q);
    } else {
      setPendingQuery(q);
      setAuthModal('login');
    }
  };

  // After login, close modal and fire pending query
  useEffect(() => {
    if (user) {
      setAuthModal(null);
      if (pendingQuery) {
        onAnalyze(pendingQuery);
        setPendingQuery(null);
      }
    }
  }, [user]);
  const trendingRef = useRef<HTMLDivElement>(null);
  const [trendingVisible, setTrendingVisible] = useState(false);
  const localRef = useRef<HTMLDivElement>(null);
  const [localVisible, setLocalVisible] = useState(false);
  const [localStories, setLocalStories] = useState<TrendingStory[]>([]);
  const [localCity, setLocalCity] = useState('');
  const [loadingLocal, setLoadingLocal] = useState(false);
  const { location, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    fetchTrending()
      .then(setTrending)
      .catch(() => {})
      .finally(() => setLoadingTrending(false));
  }, []);

  useEffect(() => {
    if (!trendingRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setTrendingVisible(true); },
      { threshold: 0.01 }
    );
    observer.observe(trendingRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!localRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setLocalVisible(true); },
      { threshold: 0.01 }
    );
    observer.observe(localRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!location?.city) return;
    setLoadingLocal(true);
    fetchLocalNews(location.city, location.state)
      .then((data) => {
        setLocalStories(data.stories);
        setLocalCity(data.city);
      })
      .catch(() => {})
      .finally(() => setLoadingLocal(false));
  }, [location?.city]);

  const quickTopics = trending.slice(0, 4).map((s) => s.title);
  const cardStories = trending.slice(0, 6);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) tryAnalyze(query.trim());
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[400px] md:w-[600px] h-[400px] md:h-[600px] rounded-full bg-primary/[0.03] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full bg-primary/[0.02] blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-5 sm:py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="text-base sm:text-lg font-semibold tracking-tight text-foreground">ET Chronicle</span>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-xs text-muted-foreground hidden sm:block">
                <UserCircle className="w-4 h-4 inline mr-1" />
                {profile?.full_name || user.email}
              </span>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:border-border/80 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setAuthModal('login')}
                className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:border-border/80 transition-all"
              >
                Sign In
              </button>
              <button
                onClick={() => setAuthModal('signup')}
                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:bg-primary/90 transition-all"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 pt-12 sm:pt-24 pb-12 sm:pb-20 text-center">
        <p className={`text-[10px] sm:text-xs uppercase tracking-[0.2em] text-primary/70 mb-4 sm:mb-6 font-medium transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          From breaking news to full narrative
        </p>

        {user && profile?.full_name ? (
          <>
            <h1 className={`text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1] sm:leading-[0.95] text-foreground text-balance mb-4 sm:mb-6 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              {getGreeting(profile.full_name)}{' '}
              <span className="gradient-text">What would you like to know?</span>
            </h1>
            <p className={`text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Your AI-powered news intelligence is ready. Ask any topic.
            </p>
          </>
        ) : (
          <>
            <h1 className={`text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1] sm:leading-[0.95] text-foreground text-balance mb-4 sm:mb-6 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              Stop reading news.{' '}
              <span className="gradient-text">Start interacting</span> with it.
            </h1>
            <p className={`text-sm sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              AI-powered intelligence built on Economic Times journalism.
              Ask the story — don't read 10 articles.
            </p>
          </>
        )}

        {/* Search Input */}
        <form onSubmit={handleSubmit}
              className={`max-w-2xl mx-auto transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="glass-panel rounded-2xl p-2 glow-sm group focus-within:glow-md transition-shadow duration-500">
            <div className="flex items-center gap-2 sm:gap-3">
              <Search className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground ml-3 sm:ml-4 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a topic to analyze…"
                className="flex-1 min-w-0 bg-transparent text-foreground placeholder:text-muted-foreground/60 text-sm sm:text-base py-2.5 sm:py-3 outline-none"
              />
              <button
                type="submit"
                className="bg-primary text-primary-foreground px-3 sm:px-6 py-2.5 sm:py-3 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 hover:brightness-110 active:scale-[0.97] transition-all duration-200 shrink-0"
              >
                <span className="hidden sm:inline">Analyze Story</span>
                <span className="sm:hidden">Analyze</span>
                <ArrowRight className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>
            </div>
          </div>
        </form>

        {/* Quick topics */}
        <div className={`flex flex-wrap justify-center gap-2 mt-4 sm:mt-6 transition-all duration-700 delay-[400ms] ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {quickTopics.map((t) => (
            <button
              key={t}
              onClick={() => tryAnalyze(t)}
              className="text-[11px] sm:text-xs px-3 sm:px-4 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-200 active:scale-[0.96] text-left leading-snug"
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 pb-16 sm:pb-24">
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 transition-all duration-700 delay-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {[
            { icon: Brain, title: 'AI Briefings', desc: 'All articles condensed into one structured story with key facts, impact analysis, and key players.', accent: 'text-primary' },
            { icon: Zap, title: 'Deep Dive', desc: 'Key quotes, sentiment breakdown, and TL;DR flashcards — understand the full picture in seconds.', accent: 'text-sentiment-positive' },
            { icon: Mic, title: 'Voice Q&A', desc: 'Ask questions by voice or text. Get concise, cited answers grounded in ET journalism.', accent: 'text-sentiment-caution' },
          ].map((f) => (
            <div
              key={f.title}
              className="glass-panel-hover rounded-2xl p-5 sm:p-7 group"
            >
              <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center mb-4 sm:mb-5 ${f.accent} group-hover:scale-[1.05] transition-transform duration-300`}>
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1.5 sm:mb-2">{f.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trending News Cards */}
      <section ref={trendingRef} className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 pb-16 sm:pb-24">
        <div className={`flex items-center gap-2 mb-6 sm:mb-8 transition-all duration-700 ${trendingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Flame className="w-5 h-5 text-sentiment-caution" />
          <h2 className="text-base sm:text-lg font-semibold text-foreground">Trending on Economic Times</h2>
        </div>

        {loadingTrending ? (
          <div className="flex items-center justify-center py-12 sm:py-16">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cardStories.map((story, i) => (
              <button
                key={story.id}
                onClick={() => tryAnalyze(story.title)}
                className={`text-left glass-panel-hover rounded-2xl overflow-hidden group active:scale-[0.98] transition-all duration-500 ${
                  trendingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
                style={{ transitionDelay: trendingVisible ? `${i * 100}ms` : '0ms' }}
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
                      <Zap className="w-8 h-8 text-muted-foreground/20" />
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

      {/* Local News */}
      <section ref={localRef} className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 pb-16 sm:pb-24">
        <div className={`flex items-center gap-2 mb-6 sm:mb-8 transition-all duration-700 ${localVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <MapPin className="w-5 h-5 text-primary" />
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            {localCity ? `News from ${localCity}` : 'Local News'}
          </h2>
        </div>

        {!location && !geoLoading ? (
          <div className={`glass-panel rounded-2xl p-6 sm:p-8 text-center transition-all duration-700 ${localVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <MapPin className="w-8 sm:w-10 h-8 sm:h-10 text-primary/30 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-sm sm:text-base font-semibold text-foreground mb-2">Get news from your city</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-5 max-w-md mx-auto">
              Allow location access to see local and regional news from Economic Times, personalized for your city.
            </p>
            <button
              onClick={requestLocation}
              className="bg-primary text-primary-foreground px-5 sm:px-6 py-2 sm:py-2.5 rounded-xl font-medium text-xs sm:text-sm hover:brightness-110 active:scale-[0.97] transition-all duration-200 inline-flex items-center gap-2"
            >
              <MapPin className="w-4 h-4" />
              Enable Location
            </button>
            {geoError && (
              <p className="text-xs text-sentiment-negative mt-3">{geoError}</p>
            )}
          </div>
        ) : geoLoading || loadingLocal ? (
          <div className="flex items-center justify-center py-12 sm:py-16">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : localStories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {localStories.slice(0, 6).map((story, i) => (
              <button
                key={story.id}
                onClick={() => tryAnalyze(story.title)}
                className={`text-left glass-panel-hover rounded-2xl overflow-hidden group active:scale-[0.98] transition-all duration-500 ${
                  localVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
                style={{ transitionDelay: localVisible ? `${i * 100}ms` : '0ms' }}
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
                      <MapPin className="w-8 h-8 text-muted-foreground/20" />
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
        ) : (
          <div className="glass-panel rounded-2xl p-6 sm:p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {localCity ? `No local stories found for ${localCity}` : 'No local stories found'}
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-6 sm:py-8 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Zap className="w-3.5 h-3.5 text-primary/50" />
            ET Chronicle
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground/50">From breaking news to full narrative</p>
        </div>
      </footer>

      {/* Auth Modal */}
      {authModal && (
        <AuthModal
          initialView={authModal}
          onClose={() => {
            setAuthModal(null);
            if (!user) setPendingQuery(null);
          }}
        />
      )}
    </div>
  );
};

export default LandingPage;
