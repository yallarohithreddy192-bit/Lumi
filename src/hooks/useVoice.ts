import { useState, useCallback, useEffect, useRef } from 'react';

export function useVoice(lang: string = 'en-US') {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = lang;

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
          setIsListening(false);
          recognitionRef.current.stop();
        } else if (interimTranscript) {
          setTranscript(interimTranscript);
        }
      };

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        isStartingRef.current = false;
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'aborted') {
          console.log('Speech recognition aborted.');
        } else {
          console.error('Speech recognition error:', event.error);
        }
        
        if (event.error === 'network') {
          setTranscript('Network error... checking connection.');
        }
        setIsListening(false);
        isStartingRef.current = false;
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        isStartingRef.current = false;
      };
    }
  }, [lang]);

  const isStartingRef = useRef(false);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening && !isStartingRef.current) {
      try {
        setTranscript('');
        isStartingRef.current = true;
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Speech recognition start failed:', err);
        isStartingRef.current = false;
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (err) {
        console.warn('Speech recognition stop error:', err);
        setIsListening(false);
      }
    }
  }, []);

  return { isListening, transcript, startListening, stopListening, setTranscript };
}
