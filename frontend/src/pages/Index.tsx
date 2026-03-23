import { useState, useCallback, useRef } from 'react';
import LandingPage from '@/components/LandingPage';
import LoadingScreen from '@/components/LoadingScreen';
import AppDashboard from '@/components/AppDashboard';
import { analyzeStory, type AnalyzeResponse, type ArticleMeta } from '@/services/api';
import { toast } from 'sonner';

type AppState = 'landing' | 'loading' | 'dashboard';

const Index = () => {
  const [state, setState] = useState<AppState>('landing');
  const [sessionId, setSessionId] = useState('');
  const [storyData, setStoryData] = useState<AnalyzeResponse['story'] | null>(null);
  const [articleCount, setArticleCount] = useState(0);
  const [articleMeta, setArticleMeta] = useState<ArticleMeta[]>([]);
  const apiDone = useRef(false);
  const loadingAnimDone = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const tryTransitionToDashboard = useCallback(() => {
    if (apiDone.current && loadingAnimDone.current) {
      setState('dashboard');
    }
  }, []);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState('landing');
  }, []);

  const handleAnalyze = useCallback(async (query: string) => {
    setState('loading');
    apiDone.current = false;
    loadingAnimDone.current = false;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const data = await analyzeStory(query, abortRef.current.signal);
      setSessionId(data.session_id);
      setStoryData(data.story);
      setArticleCount(data.articleCount || 0);
      setArticleMeta(data.articleMeta || []);
      apiDone.current = true;
      tryTransitionToDashboard();
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      toast.error(err.message || 'Failed to analyze story');
      setState('landing');
    }
  }, [tryTransitionToDashboard]);

  const handleLoadingComplete = useCallback(() => {
    loadingAnimDone.current = true;
    tryTransitionToDashboard();
  }, [tryTransitionToDashboard]);

  if (state === 'loading') {
    return <LoadingScreen onComplete={handleLoadingComplete} onCancel={handleCancel} />;
  }

  if (state === 'dashboard' && storyData) {
    return (
      <AppDashboard
        story={storyData}
        sessionId={sessionId}
        articleCount={articleCount}
        articleMeta={articleMeta}
        onNewSearch={(query) => handleAnalyze(query)}
        onGoHome={() => setState('landing')}
      />
    );
  }

  return <LandingPage onAnalyze={handleAnalyze} />;
};

export default Index;
