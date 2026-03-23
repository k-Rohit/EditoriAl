import { useState, useRef, useCallback, useEffect } from 'react';

interface UseTextToSpeechOptions {
  text: string;
  deepgramApiKey?: string;
}

interface UseTextToSpeechReturn {
  isPlaying: boolean;
  isLoading: boolean;
  play: () => void;
  pause: () => void;
  stop: () => void;
}

export function useTextToSpeech({ text, deepgramApiKey }: UseTextToSpeechOptions): UseTextToSpeechReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cacheRef = useRef<{ text: string; url: string } | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const usingBrowserTTS = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (usingBrowserTTS.current) {
        speechSynthesis.cancel();
      }
      if (cacheRef.current?.url) {
        URL.revokeObjectURL(cacheRef.current.url);
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (usingBrowserTTS.current) {
      speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }, []);

  const playWithDeepgram = useCallback(async () => {
    // Check cache
    if (cacheRef.current && cacheRef.current.text === text) {
      const audio = new Audio(cacheRef.current.url);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
      setIsPlaying(true);
      return true;
    }

    try {
      const resp = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${deepgramApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!resp.ok) throw new Error(`Deepgram TTS failed: ${resp.status}`);

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);

      // Revoke old cache
      if (cacheRef.current?.url) {
        URL.revokeObjectURL(cacheRef.current.url);
      }
      cacheRef.current = { text, url };

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      await audio.play();
      setIsPlaying(true);
      return true;
    } catch (err) {
      console.warn('Deepgram TTS failed, falling back to browser:', err);
      return false;
    }
  }, [text, deepgramApiKey]);

  const playWithBrowser = useCallback(() => {
    if (!('speechSynthesis' in window)) {
      console.warn('Browser TTS not supported');
      return false;
    }

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => {
      setIsPlaying(false);
      usingBrowserTTS.current = false;
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      usingBrowserTTS.current = false;
    };

    utteranceRef.current = utterance;
    usingBrowserTTS.current = true;
    speechSynthesis.speak(utterance);
    setIsPlaying(true);
    return true;
  }, [text]);

  const play = useCallback(async () => {
    if (isPlaying) return;
    if (!text) return;

    setIsLoading(true);
    try {
      let success = false;
      if (deepgramApiKey) {
        success = await playWithDeepgram();
      }
      if (!success) {
        success = playWithBrowser();
      }
      if (!success) {
        console.warn('No TTS method available');
      }
    } finally {
      setIsLoading(false);
    }
  }, [text, deepgramApiKey, isPlaying, playWithDeepgram, playWithBrowser]);

  const pause = useCallback(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    if (usingBrowserTTS.current && isPlaying) {
      speechSynthesis.pause();
      setIsPlaying(false);
    }
  }, [isPlaying]);

  return { isPlaying, isLoading, play, pause, stop };
}
