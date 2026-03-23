import { useState, useRef, useEffect } from 'react';
import { Send, X, Mic, MicOff } from 'lucide-react';
import { chatWithStory } from '@/services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  sources?: string[];
}
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface QADockProps {
  sessionId: string;
  storyTitle: string;
  initialQuestion?: string;
  onClose: () => void;
}

const QADock = ({ sessionId, storyTitle, initialQuestion, onClose }: QADockProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [deepgramKey, setDeepgramKey] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const processedQuestions = useRef<Set<string>>(new Set());

  // Fetch Deepgram key from backend config
  useEffect(() => {
    fetch('http://localhost:8000/api/config')
      .then(r => r.json())
      .then(d => { if (d.deepgramApiKey) setDeepgramKey(d.deepgramApiKey); })
      .catch(() => {});
  }, []);

  const { isListening, toggleListening } = useVoiceInput({
    onResult: (transcript) => {
      setInput(transcript);
      // Auto-send after a short delay so user sees the transcript
      setTimeout(() => {
        handleSendText(transcript);
      }, 300);
    },
    onError: (err) => {
      console.warn('Voice input error:', err);
    },
    deepgramApiKey: deepgramKey || undefined,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (initialQuestion && !processedQuestions.current.has(initialQuestion)) {
      processedQuestions.current.add(initialQuestion);
      handleSendText(initialQuestion);
    }
  }, [initialQuestion]);

  const handleSendText = async (text: string) => {
    const msg = text.trim();
    if (!msg || isTyping) return;

    const userMsg: ChatMessage = { id: `u${Date.now()}`, role: 'user', content: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const aiResponse = await chatWithStory(sessionId, msg, history);

      const aiMsg: ChatMessage = {
        id: aiResponse.id,
        role: 'ai',
        content: aiResponse.content,
        sources: aiResponse.sources,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `e${Date.now()}`,
        role: 'ai',
        content: `Sorry, I couldn't process that question. ${err.message || 'Please try again.'}`,
        sources: [],
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => {
    handleSendText(input);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  return (
    <div className="flex flex-col h-full border-l border-border bg-[hsl(var(--sidebar-background))]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            💬 <span>Ask the Story</span>
          </h3>
          <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">
            {storyTitle ? `About: ${storyTitle}` : "Ask anything — don't Google"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 mt-0.5 w-7 h-7 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors active:scale-[0.95]"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground/40 text-center">
              Ask any question about this story.<br />
              Answers are grounded in ET articles.<br />
              <span className="mt-1 inline-block">🎙️ Tap the mic to ask with voice</span>
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}>
            <div className={`max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-primary/10 text-foreground rounded-2xl rounded-br-md'
                : 'glass-panel rounded-2xl rounded-bl-md'
            } px-4 py-3`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {msg.sources.map((s) => (
                    <span key={s} className="text-[9px] px-2 py-0.5 bg-secondary rounded-full text-muted-foreground">{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-fade-up">
            <div className="glass-panel rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
          {/* Voice button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-[0.95] shrink-0 ${
              isListening
                ? 'bg-red-500/20 text-red-400 animate-pulse'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}
            title={isListening ? 'Stop listening' : 'Voice input'}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? 'Listening…' : 'Ask anything about this story…'}
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none flex-1"
            disabled={isListening}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 disabled:opacity-30 transition-all active:scale-[0.95]"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        {isListening && (
          <p className="text-[10px] text-red-400/70 mt-1.5 text-center animate-pulse">
            🎙️ Listening... speak your question
          </p>
        )}
      </form>
    </div>
  );
};

export default QADock;
