import { useState, useEffect } from 'react';
import { Search, Flame, BarChart3, Zap, Loader2, Home, MapPin } from 'lucide-react';
import { fetchTrending, fetchLocalNews, type TrendingStory } from '@/services/api';
import { useGeolocation } from '@/hooks/useGeolocation';

interface AppSidebarProps {
  onSelectStory: (title: string) => void;
  activeMode: 'briefing' | 'deepdive';
  onModeChange: (mode: 'briefing' | 'deepdive') => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  onSearchSubmit?: () => void;
  onGoHome?: () => void;
}

const AppSidebar = ({ onSelectStory, activeMode, onModeChange, searchQuery, onSearch, onSearchSubmit, onGoHome }: AppSidebarProps) => {
  const [trending, setTrending] = useState<TrendingStory[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [feedTab, setFeedTab] = useState<'trending' | 'local'>('trending');
  const [localStories, setLocalStories] = useState<TrendingStory[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [localCity, setLocalCity] = useState('');
  const { location, loading: geoLoading, error: geoError, requestLocation } = useGeolocation();

  useEffect(() => {
    fetchTrending()
      .then(setTrending)
      .catch(() => {})
      .finally(() => setLoadingTrending(false));
  }, []);

  // Fetch local news when location is available
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearchSubmit) {
      onSearchSubmit();
    } else if (searchQuery.trim()) {
      onSelectStory(searchQuery.trim());
    }
  };

  return (
    <aside className="w-72 shrink-0 h-screen bg-[hsl(var(--sidebar-background))] border-r border-sidebar-border flex flex-col overflow-hidden">
      {/* Logo + Home */}
      <div className="px-5 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">ET Chronicle</span>
        </div>
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="w-8 h-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors active:scale-[0.95]"
            title="Back to Home"
          >
            <Home className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-5 pb-4">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2.5 focus-within:ring-1 focus-within:ring-primary/30 transition-all">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search a new topic…"
              className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none w-full"
            />
          </div>
        </form>
      </div>

      {/* Mode Toggle */}
      <div className="px-5 pb-4">
        <div className="flex gap-1 p-1 bg-secondary rounded-xl">
          <button
            onClick={() => onModeChange('briefing')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg transition-all duration-200 ${
              activeMode === 'briefing'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Briefing
          </button>
          <button
            onClick={() => onModeChange('deepdive')}
            className={`flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg transition-all duration-200 ${
              activeMode === 'deepdive'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Deep Dive
          </button>
        </div>
      </div>

      {/* Feed Tabs: Trending / Local */}
      <div className="px-5 pb-2">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setFeedTab('trending')}
            className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
              feedTab === 'trending' ? 'text-sentiment-caution' : 'text-muted-foreground/50 hover:text-muted-foreground'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Trending
          </button>
          <button
            onClick={() => {
              setFeedTab('local');
              if (!location && !geoLoading) requestLocation();
            }}
            className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
              feedTab === 'local' ? 'text-primary' : 'text-muted-foreground/50 hover:text-muted-foreground'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Local
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {feedTab === 'trending' ? (
          // Trending feed
          loadingTrending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            </div>
          ) : (
            <div className="space-y-0.5">
              {trending.map((story) => (
                <button
                  key={story.id}
                  onClick={() => onSelectStory(story.title)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground transition-all duration-200 group active:scale-[0.98] flex items-center justify-between gap-2"
                >
                  <span className="truncate">{story.title}</span>
                  <span className="text-[10px] text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground transition-colors">
                    {story.tag}
                  </span>
                </button>
              ))}
              {trending.length === 0 && (
                <p className="text-xs text-muted-foreground/40 text-center py-4">No trending stories available</p>
              )}
            </div>
          )
        ) : (
          // Local feed
          !location && !geoLoading && !geoError ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <MapPin className="w-6 h-6 text-primary/40 mb-3" />
              <p className="text-xs text-muted-foreground mb-3">Allow location access to see news from your city</p>
              <button
                onClick={requestLocation}
                className="text-xs px-4 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                Enable Location
              </button>
            </div>
          ) : geoLoading || loadingLocal ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin mb-2" />
              <p className="text-[10px] text-muted-foreground/50">
                {geoLoading ? 'Getting location…' : `Loading ${localCity || 'local'} news…`}
              </p>
            </div>
          ) : geoError ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <p className="text-xs text-muted-foreground/60 mb-3">{geoError}</p>
              <button
                onClick={requestLocation}
                className="text-xs px-4 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <div className="space-y-0.5">
              {localCity && (
                <div className="flex items-center gap-1.5 px-3 py-2 mb-1">
                  <MapPin className="w-3 h-3 text-primary/60" />
                  <span className="text-[10px] text-primary/60 font-medium uppercase tracking-wider">{localCity}</span>
                </div>
              )}
              {localStories.map((story) => (
                <button
                  key={story.id}
                  onClick={() => onSelectStory(story.title)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground transition-all duration-200 group active:scale-[0.98] flex items-center justify-between gap-2"
                >
                  <span className="truncate">{story.title}</span>
                  <span className="text-[10px] text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground transition-colors">
                    {story.tag}
                  </span>
                </button>
              ))}
              {localStories.length === 0 && (
                <p className="text-xs text-muted-foreground/40 text-center py-4">No local stories found</p>
              )}
            </div>
          )
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sidebar-border">
        <p className="text-[10px] text-muted-foreground/40">AI synthesized from ET journalism</p>
      </div>
    </aside>
  );
};

export default AppSidebar;
