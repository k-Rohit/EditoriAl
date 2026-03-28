import { useState } from 'react';
import { X, Mail, Lock, User, ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const NEWS_DOMAINS = [
  { id: 'markets', label: 'Markets & Stocks', icon: '📈' },
  { id: 'tech', label: 'Technology', icon: '💻' },
  { id: 'startups', label: 'Startups', icon: '🚀' },
  { id: 'economy', label: 'Economy & Policy', icon: '🏛️' },
  { id: 'industry', label: 'Industry', icon: '🏭' },
  { id: 'banking', label: 'Banking & Finance', icon: '🏦' },
  { id: 'real-estate', label: 'Real Estate', icon: '🏠' },
  { id: 'auto', label: 'Auto', icon: '🚗' },
  { id: 'energy', label: 'Energy & Oil', icon: '⚡' },
  { id: 'global', label: 'Global News', icon: '🌍' },
  { id: 'defence', label: 'Defence', icon: '🛡️' },
  { id: 'crypto', label: 'Crypto & Web3', icon: '🪙' },
];

type View = 'login' | 'signup-credentials' | 'signup-domains';

interface AuthModalProps {
  onClose: () => void;
  initialView?: 'login' | 'signup';
}

const AuthModal = ({ onClose, initialView = 'login' }: AuthModalProps) => {
  const [view, setView] = useState<View>(initialView === 'signup' ? 'signup-credentials' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const toggleDomain = (id: string) => {
    setSelectedDomains((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Welcome back!');
      onClose();
    }
  };

  const handleCredentialsNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setView('signup-domains');
  };

  const handleSignup = async () => {
    if (selectedDomains.length === 0) {
      toast.error('Please select at least one domain');
      return;
    }
    setLoading(true);
    const { error } = await signUp(email, password, fullName, selectedDomains);
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Welcome to EditoriAI!');
      onClose();
    }
  };

  const resetToLogin = () => {
    setView('login');
    setPassword('');
    setSelectedDomains([]);
  };

  const resetToSignup = () => {
    setView('signup-credentials');
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm glass-panel rounded-2xl p-6 shadow-2xl border border-border/50 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <img src="/icon.png" alt="EditoriAI" className="w-8 h-8 rounded-lg" />
          <span className="text-base font-semibold text-foreground">EditoriAI</span>
        </div>

        {/* ─── LOGIN ─── */}
        {view === 'login' && (
          <>
            <h2 className="text-lg font-bold text-foreground text-center mb-1">Welcome back</h2>
            <p className="text-xs text-muted-foreground text-center mb-5">Sign in to your account</p>

            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            </form>

            <p className="text-[11px] text-muted-foreground text-center mt-4">
              Don't have an account?{' '}
              <button onClick={resetToSignup} className="text-primary hover:underline">
                Sign up
              </button>
            </p>
          </>
        )}

        {/* ─── SIGNUP: CREDENTIALS ─── */}
        {view === 'signup-credentials' && (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full bg-primary`} />
              <div className={`w-6 h-px bg-border`} />
              <div className={`w-2 h-2 rounded-full bg-border`} />
            </div>

            <h2 className="text-lg font-bold text-foreground text-center mb-1">Create account</h2>
            <p className="text-xs text-muted-foreground text-center mb-5">Get personalized news intelligence</p>

            <form onSubmit={handleCredentialsNext} className="space-y-3">
              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    className="w-full pl-9 pr-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground mb-1 block">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <p className="text-[11px] text-muted-foreground text-center mt-4">
              Already have an account?{' '}
              <button onClick={resetToLogin} className="text-primary hover:underline">
                Sign in
              </button>
            </p>
          </>
        )}

        {/* ─── SIGNUP: DOMAINS ─── */}
        {view === 'signup-domains' && (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className={`w-2 h-2 rounded-full bg-primary/30`} />
              <div className={`w-6 h-px bg-primary`} />
              <div className={`w-2 h-2 rounded-full bg-primary`} />
            </div>

            <h2 className="text-lg font-bold text-foreground text-center mb-1">Your interests</h2>
            <p className="text-xs text-muted-foreground text-center mb-4">
              Select domains you'd like to follow <span className="text-muted-foreground/60">(pick at least 1)</span>
            </p>

            <div className="grid grid-cols-2 gap-1.5 mb-4 max-h-[240px] overflow-y-auto pr-1">
              {NEWS_DOMAINS.map((domain) => {
                const selected = selectedDomains.includes(domain.id);
                return (
                  <button
                    key={domain.id}
                    onClick={() => toggleDomain(domain.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs text-left transition-all duration-200 border ${
                      selected
                        ? 'bg-primary/10 border-primary/40 text-foreground'
                        : 'bg-secondary/30 border-border hover:border-border/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="text-sm">{domain.icon}</span>
                    <span className="flex-1 text-[11px]">{domain.label}</span>
                    {selected && <Check className="w-3 h-3 text-primary" />}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setView('signup-credentials')}
                className="flex items-center justify-center gap-1 px-3 py-2 border border-border rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button
                onClick={handleSignup}
                disabled={loading || selectedDomains.length === 0}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-3.5 h-3.5" /></>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
