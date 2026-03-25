import { useState, useCallback, useRef } from 'react';
import LandingPage from '@/components/LandingPage';
import LoadingScreen from '@/components/LoadingScreen';
import AppDashboard from '@/components/AppDashboard';
import { analyzeStoryStream, type AnalyzeResponse, type ArticleMeta, type StreamProgress } from '@/services/api';
import { toast } from 'sonner';

type AppState = 'landing' | 'loading' | 'dashboard';

const Index = () => {
  const [state, setState] = useState<AppState>('landing');
  const [sessionId, setSessionId] = useState('');
  const [storyData, setStoryData] = useState<AnalyzeResponse['story'] | null>(null);
  const [articleCount, setArticleCount] = useState(0);
  const [articleMeta, setArticleMeta] = useState<ArticleMeta[]>([]);
  const [loadingProgress, setLoadingProgress] = useState<StreamProgress | undefined>();
  const abortRef = useRef<AbortController | null>(null);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState('landing');
  }, []);

  const handleAnalyze = useCallback((query: string) => {
    setState('loading');
    setLoadingProgress(undefined);
    abortRef.current?.abort();

    abortRef.current = analyzeStoryStream(
      query,
      (progress) => {
        setLoadingProgress(progress);
      },
      (data) => {
        setSessionId(data.session_id);
        setStoryData(data.story);
        setArticleCount(data.articleCount || 0);
        setArticleMeta(data.articleMeta || []);
        setState('dashboard');
      },
      (error) => {
        toast.error(error || 'Failed to analyze story');
        setState('landing');
      },
    );
  }, []);

  if (state === 'loading') {
    return <LoadingScreen onComplete={() => {}} onCancel={handleCancel} progress={loadingProgress} />;
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
