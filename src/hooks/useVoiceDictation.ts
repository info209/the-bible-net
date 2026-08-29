'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseVoiceDictationOptions {
  onFinalTranscript: (text: string) => void;
  onError?: (errorMsg: string) => void;
  lang?: string;
}

export interface UseVoiceDictationReturn {
  isListening: boolean;
  isSupported: boolean;
  interimTranscript: string;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => Promise<void>;
}

export function useVoiceDictation({
  onFinalTranscript,
  onError,
  lang,
}: UseVoiceDictationOptions): UseVoiceDictationReturn {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const onErrorRef = useRef(onError);

  // Keep refs updated
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Feature detection on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SpeechRecognition);
    }
  }, []);

  const stopListening = useCallback(() => {
    isListeningRef.current = false;
    setIsListening(false);
    setInterimTranscript('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore stop errors if already stopped
      }
      recognitionRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const msg = 'Voice typing is not supported on this browser.';
      setError(msg);
      if (onErrorRef.current) onErrorRef.current(msg);
      return;
    }

    // Stop existing instance if running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    setError(null);
    setInterimTranscript('');

    // Step 1: Explicitly request microphone permission via getUserMedia
    // This forces the browser to open the native microphone permission dialog box!
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop temporary tracks so SpeechRecognition can take control of the microphone
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        console.warn('Microphone permission request failed:', err);
        let userMsg = 'Microphone access is required for voice typing.';
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          userMsg = 'Microphone is blocked by your browser. Please allow microphone access in your site settings (lock icon in address bar).';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          userMsg = 'No microphone device was found on your system.';
        }
        setError(userMsg);
        setIsListening(false);
        isListeningRef.current = false;
        if (onErrorRef.current) onErrorRef.current(userMsg);
        return;
      }
    }

    // Step 2: Initialize SpeechRecognition
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Set language: priority passed lang -> navigator language -> en-US fallback
      recognition.lang =
        lang || (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          if (result.isFinal) {
            finalChunk += result[0].transcript;
          } else {
            interimChunk += result[0].transcript;
          }
        }

        if (finalChunk.trim()) {
          onFinalTranscriptRef.current(finalChunk);
        }

        setInterimTranscript(interimChunk);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error event:', event.error);
        let userMessage = 'Voice typing error occurred.';

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          userMessage = 'Microphone access is required for voice typing.';
          stopListening();
        } else if (event.error === 'no-speech') {
          return;
        } else if (event.error === 'audio-capture') {
          userMessage = 'No microphone detected.';
          stopListening();
        } else if (event.error === 'network') {
          userMessage = 'Speech recognition network connection error.';
          stopListening();
        }

        setError(userMessage);
        if (onErrorRef.current) {
          onErrorRef.current(userMessage);
        }
      };

      recognition.onend = () => {
        setInterimTranscript('');
        if (isListeningRef.current) {
          setIsListening(false);
          isListeningRef.current = false;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      const userMessage = err.message || 'Could not start voice dictation.';
      setError(userMessage);
      setIsListening(false);
      isListeningRef.current = false;
      if (onErrorRef.current) onErrorRef.current(userMessage);
    }
  }, [lang, stopListening]);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      stopListening();
    } else {
      await startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
}
