'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseVoiceDictationOptions {
  onFinalTranscript: (text: string) => void;
  onError?: (errorMsg: string) => void;
  lang?: string;
}

export type DictationStatus = 'idle' | 'starting' | 'listening' | 'stopping';

export interface UseVoiceDictationReturn {
  isListening: boolean;
  isSupported: boolean;
  interimTranscript: string;
  error: string | null;
  status: DictationStatus;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

export function useVoiceDictation({
  onFinalTranscript,
  onError,
  lang,
}: UseVoiceDictationOptions): UseVoiceDictationReturn {
  const [status, setStatus] = useState<DictationStatus>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isUserIntentListeningRef = useRef(false);
  const sessionCounterRef = useRef<number>(0);
  const sessionIdRef = useRef<number>(0);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const onErrorRef = useRef(onError);
  const processedFinalKeysRef = useRef<Set<string>>(new Set());
  const isMobileRef = useRef<boolean>(false);

  // Keep refs updated to prevent stale closures
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Feature detection & environment check on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = navigator.userAgent || '';
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
        (userAgent.includes('Mac') && typeof navigator.maxTouchPoints === 'number' && navigator.maxTouchPoints > 0);

      isMobileRef.current = isMobileDevice;

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  // Destructive teardown function used ONLY for unmount or replacing a broken/stale instance
  const cleanupRecognitionInstance = useCallback((instanceToClean: any) => {
    if (!instanceToClean) return;
    try {
      instanceToClean.onstart = null;
      instanceToClean.onresult = null;
      instanceToClean.onerror = null;
      instanceToClean.onend = null;
    } catch (e) {}
    try {
      instanceToClean.abort();
    } catch (e) {}
  }, []);

  // User-requested graceful Stop
  const stopListening = useCallback(() => {
    isUserIntentListeningRef.current = false;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Dictation Lifecycle] stop requested. SessionId: ${sessionIdRef.current}`);
    }

    if (recognitionRef.current) {
      setStatus('stopping');
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // If stop fails synchronously, force cleanup
        cleanupRecognitionInstance(recognitionRef.current);
        recognitionRef.current = null;
        sessionIdRef.current = 0;
        setStatus('idle');
        setIsListening(false);
        setInterimTranscript('');
      }
    } else {
      setStatus('idle');
      setIsListening(false);
      setInterimTranscript('');
    }
  }, [cleanupRecognitionInstance]);

  const startNewRecognitionSession = useCallback((targetLang?: string) => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msg = 'Voice typing is not supported on this browser.';
      setError(msg);
      setStatus('idle');
      setIsListening(false);
      isUserIntentListeningRef.current = false;
      if (onErrorRef.current) onErrorRef.current(msg);
      return;
    }

    // If an existing stale recognition instance exists, destructively abort it ONCE before starting a brand-new instance
    if (recognitionRef.current) {
      const staleInstance = recognitionRef.current;
      recognitionRef.current = null;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Dictation Lifecycle] abort requested for stale instance.`);
      }
      cleanupRecognitionInstance(staleInstance);
    }

    // Generate unique monotonic session ID
    sessionCounterRef.current += 1;
    const currentSessionId = sessionCounterRef.current;
    sessionIdRef.current = currentSessionId;
    processedFinalKeysRef.current.clear();

    setError(null);
    setInterimTranscript('');
    setStatus('starting');

    if (process.env.NODE_ENV === 'development') {
      const ctorName = (window as any).SpeechRecognition ? 'SpeechRecognition' : 'webkitSpeechRecognition';
      console.log(`[Dictation Lifecycle] start attempted. SessionId: ${currentSessionId}, Constructor: ${ctorName}`);
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = !isMobileRef.current;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang =
        targetLang || lang || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

      recognition.onstart = () => {
        // Strict ownership check
        if (sessionIdRef.current !== currentSessionId || recognitionRef.current !== recognition) return;

        if (process.env.NODE_ENV === 'development') {
          console.log(`[Dictation Lifecycle] onstart fired. SessionId: ${currentSessionId}`);
        }

        setStatus('listening');
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        // Strict ownership check
        if (sessionIdRef.current !== currentSessionId || recognitionRef.current !== recognition) return;

        let finalChunk = '';
        let interimChunk = '';

        const startIndex = Math.max(0, typeof event.resultIndex === 'number' ? event.resultIndex : 0);

        for (let i = startIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (!result) continue;

          if (result.isFinal) {
            const key = `${currentSessionId}_${i}`;
            if (!processedFinalKeysRef.current.has(key)) {
              processedFinalKeysRef.current.add(key);
              const transcript = result[0]?.transcript || '';
              if (transcript) {
                if (finalChunk && !finalChunk.endsWith(' ') && !transcript.startsWith(' ')) {
                  finalChunk += ' ';
                }
                finalChunk += transcript;
              }
              if (process.env.NODE_ENV === 'development') {
                console.log(`[Dictation Lifecycle] SessionId: ${currentSessionId}, resultIndex: ${event.resultIndex}, itemIndex: ${i}, status: committed`);
              }
            } else if (process.env.NODE_ENV === 'development') {
              console.log(`[Dictation Lifecycle] SessionId: ${currentSessionId}, resultIndex: ${event.resultIndex}, itemIndex: ${i}, status: skipped_duplicate`);
            }
          } else {
            const transcript = result[0]?.transcript || '';
            if (transcript) {
              interimChunk += transcript;
            }
          }
        }

        if (finalChunk.trim()) {
          onFinalTranscriptRef.current(finalChunk.trim());
        }

        setInterimTranscript(interimChunk);
      };

      recognition.onerror = (event: any) => {
        // Strict ownership check
        if (sessionIdRef.current !== currentSessionId || recognitionRef.current !== recognition) return;

        if (process.env.NODE_ENV === 'development') {
          console.warn(`[Dictation Lifecycle] onerror fired. SessionId: ${currentSessionId}, Error: ${event.error}`);
        }

        if (event.error === 'aborted') {
          return;
        }

        let userMessage = 'Voice typing error occurred.';
        let notifyUser = true;

        if (event.error === 'not-allowed') {
          userMessage = 'Microphone access is required for voice typing.';
        } else if (event.error === 'service-not-allowed') {
          userMessage = 'Voice recognition service is currently unavailable. Please try again.';
        } else if (event.error === 'no-speech') {
          notifyUser = false;
        } else if (event.error === 'audio-capture') {
          userMessage = 'No microphone detected.';
        } else if (event.error === 'network') {
          userMessage = 'Speech recognition network connection error.';
        }

        isUserIntentListeningRef.current = false;
        cleanupRecognitionInstance(recognition);
        recognitionRef.current = null;
        sessionIdRef.current = 0;
        setStatus('idle');
        setIsListening(false);

        if (notifyUser) {
          setError(userMessage);
          if (onErrorRef.current) {
            onErrorRef.current(userMessage);
          }
        }
      };

      recognition.onend = () => {
        // Strict ownership check
        if (sessionIdRef.current !== currentSessionId || recognitionRef.current !== recognition) return;

        if (process.env.NODE_ENV === 'development') {
          console.log(`[Dictation Lifecycle] onend fired. SessionId: ${currentSessionId}`);
        }

        setInterimTranscript('');
        setStatus('idle');
        setIsListening(false);
        isUserIntentListeningRef.current = false;
        processedFinalKeysRef.current.clear();
        cleanupRecognitionInstance(recognition);
        recognitionRef.current = null;
        sessionIdRef.current = 0;
      };

      recognitionRef.current = recognition;

      // Synchronously trigger recognition.start() within user gesture context
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      sessionIdRef.current = 0;
      isUserIntentListeningRef.current = false;
      setStatus('idle');
      setIsListening(false);
      if (recognitionRef.current) {
        cleanupRecognitionInstance(recognitionRef.current);
        recognitionRef.current = null;
      }

      let userMessage = err.message || 'Could not start voice dictation.';
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        userMessage = 'Microphone access is required for voice typing.';
      }
      setError(userMessage);
      if (onErrorRef.current) onErrorRef.current(userMessage);
    }
  }, [cleanupRecognitionInstance, lang]);

  const startListening = useCallback(() => {
    isUserIntentListeningRef.current = true;
    startNewRecognitionSession(lang);
  }, [lang, startNewRecognitionSession]);

  const toggleListening = useCallback(() => {
    if (isListening || status === 'listening' || status === 'starting' || isUserIntentListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, status, startListening, stopListening]);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      isUserIntentListeningRef.current = false;
      sessionIdRef.current = 0;
      if (recognitionRef.current) {
        const instance = recognitionRef.current;
        recognitionRef.current = null;
        cleanupRecognitionInstance(instance);
      }
    };
  }, [cleanupRecognitionInstance]);

  return {
    isListening,
    isSupported,
    interimTranscript,
    error,
    status,
    startListening,
    stopListening,
    toggleListening,
  };
}

