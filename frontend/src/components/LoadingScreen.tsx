import { useState, useEffect } from 'react';
import { Zap, X } from 'lucide-react';
import type { StreamProgress } from '@/services/api';

interface LoadingScreenProps {
  onComplete: () => void;
  onCancel?: () => void;
  progress?: StreamProgress;
}

const STEP_MAP: Record<string, number> = {
  scraping: 0,
  embedding: 1,
  generating: 2,
};

const STEP_LABELS = [
  'Searching Economic Times…',
  'Analyzing & embedding articles…',
  'Generating intelligence briefing…',
];

const LoadingScreen = ({ onComplete, onCancel, progress }: LoadingScreenProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Drive steps purely from SSE progress events
  useEffect(() => {
    if (progress?.step && STEP_MAP[progress.step] !== undefined) {
      const sseStep = STEP_MAP[progress.step];
      setCurrentStep((prev) => Math.max(prev, sseStep));
    }
  }, [progress]);

  // Progress bar: fill based on step, but never 100% until result arrives via parent
  const progressPercent = ((currentStep + 1) / (STEP_LABELS.length + 1)) * 100;
  const displayMessage = progress?.message || STEP_LABELS[currentStep] || '';

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/[0.04] blur-[100px] animate-pulse" />
      </div>

      <div className="relative text-center max-w-md mx-auto px-8">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8 animate-pulse-glow">
          <Zap className="w-7 h-7 text-primary" />
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-10">
          {STEP_LABELS.map((step, i) => (
            <p
              key={step}
              className={`text-sm transition-all duration-500 ${
                i < currentStep
                  ? 'text-muted-foreground/40'
                  : i === currentStep
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground/20'
              }`}
            >
              {i === currentStep && <span className="cursor-blink">{displayMessage}</span>}
              {i !== currentStep && step}
            </p>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs mx-auto h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground/40 mt-4">AI synthesized from ET journalism</p>

        {/* Cancel button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-foreground px-4 py-2 rounded-full border border-border/50 hover:border-border transition-all duration-200 active:scale-[0.96]"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
