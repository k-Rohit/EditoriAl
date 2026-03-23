import { useState, useEffect } from 'react';
import { Zap, X } from 'lucide-react';

interface LoadingScreenProps {
  onComplete: () => void;
  onCancel?: () => void;
}

const steps = [
  'Scanning related articles…',
  'Understanding context & entities…',
  'Building story intelligence…',
  'Generating interactive briefing…',
];

const LoadingScreen = ({ onComplete, onCancel }: LoadingScreenProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(interval);
          setTimeout(onComplete, 800);
          return prev;
        }
        return prev + 1;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [onComplete]);

  const progress = ((currentStep + 1) / steps.length) * 100;

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
          {steps.map((step, i) => (
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
              {i === currentStep && <span className="cursor-blink">{step}</span>}
              {i !== currentStep && step}
            </p>
          ))}
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-xs mx-auto h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
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
