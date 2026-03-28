import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, ArrowLeft, Loader2, Check } from 'lucide-react';
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

type Step = 'credentials' | 'domains';

const Signup = () => {
  const [step, setStep] = useState<Step>('credentials');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const toggleDomain = (id: string) => {
    setSelectedDomains((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const handleCredentialsNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return;
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setStep('domains');
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
      toast.success('Account created! You can now sign in.');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[120px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src="/icon.png" alt="EditoriAI" className="w-10 h-10 rounded-xl" />
          <span className="text-xl font-semibold text-foreground">EditoriAI</span>
        </div>

        <div className="glass-panel rounded-2xl p-8">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-2 h-2 rounded-full transition-colors ${step === 'credentials' ? 'bg-primary' : 'bg-primary/30'}`} />
            <div className={`w-8 h-px ${step === 'domains' ? 'bg-primary' : 'bg-border'}`} />
            <div className={`w-2 h-2 rounded-full transition-colors ${step === 'domains' ? 'bg-primary' : 'bg-border'}`} />
          </div>

          {step === 'credentials' && (
            <>
              <h1 className="text-2xl font-bold text-foreground text-center mb-2">Create account</h1>
              <p className="text-sm text-muted-foreground text-center mb-8">Get personalized news intelligence</p>

              <form onSubmit={handleCredentialsNext} className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full pl-10 pr-4 py-2.5 bg-secondary/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

          {step === 'domains' && (
            <>
              <h1 className="text-2xl font-bold text-foreground text-center mb-2">Your interests</h1>
              <p className="text-sm text-muted-foreground text-center mb-6">
                Select domains you'd like to follow <span className="text-muted-foreground/60">(pick at least 1)</span>
              </p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {NEWS_DOMAINS.map((domain) => {
                  const selected = selectedDomains.includes(domain.id);
                  return (
                    <button
                      key={domain.id}
                      onClick={() => toggleDomain(domain.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-left transition-all duration-200 border ${
                        selected
                          ? 'bg-primary/10 border-primary/40 text-foreground'
                          : 'bg-secondary/30 border-border hover:border-border/80 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="text-base">{domain.icon}</span>
                      <span className="flex-1 text-xs">{domain.label}</span>
                      {selected && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('credentials')}
                  className="flex items-center justify-center gap-1 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={handleSignup}
                  disabled={loading || selectedDomains.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
