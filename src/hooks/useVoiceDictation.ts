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
  const sessionIdRef = useRef<number>(0);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const onErrorRef = useRef(onError);
  const processedFinalKeysRef = useRef<Set<string>>(new Set());
  const isWebKitRef = useRef<boolean>(false);

  // Keep refs updated to prevent stale closures
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Feature detection & WebKit check on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSafariOrIOS =
        /^((?!chrome|android).)*safari/i.test(navigator.userAgent) ||
        (typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac') && 'ontouchend' in document);
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const isUsingWebkitPrefix =
        !(window as any).SpeechRecognition && !!(window as any).webkitSpeechRecognition;

      isWebKitRef.current = isSafariOrIOS || isUsingWebkitPrefix;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const stopListening = useCallback(() => {
    isUserIntentListeningRef.current = false;
    sessionIdRef.current = 0; // Invalidate current session callbacks
    setStatus('idle');
    setIsListening(false);
    setInterimTranscript('');
    processedFinalKeysRef.current.clear();

    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.onstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.stop();
      } catch (e) {
        // Ignore stop errors
      }
    }
  }, []);

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

    // Clean up existing recognition instance if any
    if (recognitionRef.current) {
      const oldRec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        oldRec.onstart = null;
        oldRec.onresult = null;
        oldRec.onerror = null;
        oldRec.onend = null;
        oldRec.abort();
      } catch (e) {}
    }

    const currentSessionId = Date.now();
    sessionIdRef.current = currentSessionId;
    processedFinalKeysRef.current.clear();

    setError(null);
    setInterimTranscript('');
    setStatus('starting');

    try {
      const recognition = new SpeechRecognition();
      // WebKit / Safari SpeechRecognition engine locks up if continuous = true is forced across sessions
      recognition.continuous = !isWebKitRef.current;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang =
        targetLang || lang || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

      recognition.onstart = () => {
        if (sessionIdRef.current !== currentSessionId) return;
        setStatus('listening');
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        if (sessionIdRef.current !== currentSessionId) return;

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
        if (sessionIdRef.current !== currentSessionId) return;

        console.warn('Speech recognition error event:', event.error);

        if (event.error === 'aborted') {
          return;
        }

        let userMessage = 'Voice typing error occurred.';
        let isPermissionError = false;

        if (event.error === 'not-allowed') {
          userMessage = 'Microphone access is required for voice typing.';
          isPermissionError = true;
          isUserIntentListeningRef.current = false;
          setStatus('idle');
          setIsListening(false);
        } else if (event.error === 'service-not-allowed') {
          userMessage = 'Voice recognition service is currently unavailable. Please try again.';
          isUserIntentListeningRef.current = false;
          setStatus('idle');
          setIsListening(false);
        } else if (event.error === 'no-speech') {
          // No speech detected; reset status to idle cleanly without error toast
          setStatus('idle');
          setIsListening(false);
          isUserIntentListeningRef.current = false;
          return;
        } else if (event.error === 'audio-capture') {
          userMessage = 'No microphone detected.';
          isUserIntentListeningRef.current = false;
          setStatus('idle');
          setIsListening(false);
        } else if (event.error === 'network') {
          userMessage = 'Speech recognition network connection error.';
          isUserIntentListeningRef.current = false;
          setStatus('idle');
          setIsListening(false);
        }

        setError(userMessage);
        if (onErrorRef.current && isPermissionError) {
          onErrorRef.current(userMessage);
        }
      };

      recognition.onend = () => {
        if (sessionIdRef.current !== currentSessionId) return;

        setInterimTranscript('');
        setStatus('idle');
        setIsListening(false);
        isUserIntentListeningRef.current = false;
      };

      recognitionRef.current = recognition;

      // Synchronously trigger recognition.start() within user gesture context for Safari/iOS
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      sessionIdRef.current = 0;
      isUserIntentListeningRef.current = false;
      setStatus('idle');
      setIsListening(false);

      let userMessage = err.message || 'Could not start voice dictation.';
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        userMessage = 'Microphone access is required for voice typing.';
      }
      setError(userMessage);
      if (onErrorRef.current) onErrorRef.current(userMessage);
    }
  }, [lang]);

  const startListening = useCallback(() => {
    isUserIntentListeningRef.current = true;
    startNewRecognitionSession(lang);
  }, [lang, startNewRecognitionSession]);

  const toggleListening = useCallback(() => {
    if (isListening || isUserIntentListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      isUserIntentListeningRef.current = false;
      sessionIdRef.current = 0;
      if (recognitionRef.current) {
        const oldRec = recognitionRef.current;
        recognitionRef.current = null;
        try {
          oldRec.onstart = null;
          oldRec.onresult = null;
          oldRec.onerror = null;
          oldRec.onend = null;
          oldRec.abort();
        } catch (e) {}
      }
    };
  }, []);

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

