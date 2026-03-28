import { useState, useEffect } from 'react';
import { MessageCircle, Menu, X, Home } from 'lucide-react';
import AppSidebar from '@/components/AppSidebar';
import BriefingPanel from '@/components/BriefingPanel';
import QADock from '@/components/QADock';
import type { StoryData, ArticleMeta } from '@/services/api';

interface AppDashboardProps {
  story: StoryData;
  sessionId: string;
  articleCount: number;
  articleMeta: ArticleMeta[];
  onNewSearch: (query: string) => void;
  onGoHome: () => void;
  onDeepDive: () => void;
}

const AppDashboard = ({ story, sessionId, articleCount, articleMeta, onNewSearch, onGoHome, onDeepDive }: AppDashboardProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingQuestion, setPendingQuestion] = useState<string | undefined>();
  const [chatOpen, setChatOpen] = useState(true);
  const [deepgramKey, setDeepgramKey] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE || ''}/api/config`)
      .then(r => r.json())
      .then(d => { if (d.deepgramApiKey) setDeepgramKey(d.deepgramApiKey); })
      .catch(() => {});
  }, []);

  const handleSelectStory = (title: string) => {
    setSearchQuery('');
    setSidebarOpen(false);
    onNewSearch(title);
  };

  const handleAskQuestion = (q: string) => {
    setPendingQuestion(q);
    setChatOpen(true);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      setSidebarOpen(false);
      onNewSearch(searchQuery.trim());
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-background/90 backdrop-blur-md border-b border-border lg:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-1.5">
            <img src="/icon.png" alt="EditoriAI" className="w-5 h-5 rounded" />
            <span className="text-sm font-semibold text-foreground">EditoriAI</span>
          </div>
        </div>
        <button
          onClick={onGoHome}
          className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute left-0 top-0 bottom-0 w-72 animate-slide-in-right" onClick={(e) => e.stopPropagation()}>
            <AppSidebar
              onSelectStory={handleSelectStory}
              searchQuery={searchQuery}
              onSearch={handleSearch}
              onSearchSubmit={handleSearchSubmit}
              onGoHome={onGoHome}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar
          onSelectStory={handleSelectStory}
          searchQuery={searchQuery}
          onSearch={handleSearch}
          onSearchSubmit={handleSearchSubmit}
          onGoHome={onGoHome}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 lg:pt-10 pb-10 px-4 sm:px-8 lg:px-14 relative">
        <BriefingPanel
          story={story}
          articleCount={articleCount}
          articleMeta={articleMeta}
          onAskQuestion={handleAskQuestion}
          deepgramApiKey={deepgramKey || undefined}
          onDeepDive={onDeepDive}
        />

        {/* Chat toggle button */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg glow-sm hover:brightness-110 active:scale-[0.95] transition-all duration-200 animate-scale-in"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        )}
      </main>

      {/* QA Dock */}
      {chatOpen && (
        <div className="w-96 shrink-0 hidden lg:flex flex-col relative animate-slide-in-right">
          <QADock
            sessionId={sessionId}
            storyTitle={story.title}
            initialQuestion={pendingQuestion}
            onClose={() => setChatOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default AppDashboard;
