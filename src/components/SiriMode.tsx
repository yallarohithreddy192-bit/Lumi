import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, MicOff, Volume2, Sparkles, Phone, Globe, ChevronDown } from 'lucide-react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { VoiceWaveform } from './VoiceWaveform';
import { useVoice } from '../hooks/useVoice';
import { generateChatResponse, generateVoiceOver, detectImageIntent, generateImage, ChatMessage, generateVoiceChatResponse } from '../services/gemini';
import { playPCM, playNotificationSound } from '../lib/audio';
import { cn } from '../lib/utils';
import { SUPPORTED_LANGUAGES } from '../constants';

interface SiriModeProps {
  onClose: () => void;
  languageCode: string;
  sessionId: string | null;
  onSendMessage: (sessionId: string, role: "user" | "model", content: string, imageUrl?: string) => Promise<any>;
  onCreateSession: (title: string) => Promise<string | null>;
  voiceType: 'male' | 'female';
  onVoiceTypeChange: (type: 'male' | 'female') => void;
}

export function SiriMode({ 
  onClose, 
  languageCode: initialLanguageCode, 
  sessionId, 
  onSendMessage, 
  onCreateSession,
  voiceType,
  onVoiceTypeChange
}: SiriModeProps) {
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES.find(l => l.code === initialLanguageCode) || SUPPORTED_LANGUAGES[0]);
  const [showLanguages, setShowLanguages] = useState(false);
  const { isListening, transcript, startListening, stopListening, setTranscript } = useVoice(selectedLanguage.code);
  const [status, setStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [response, setResponse] = useState('');
  const [currentAudio, setCurrentAudio] = useState<AudioBufferSourceNode | null>(null);
  const [hasGreeted, setHasGreeted] = useState(false);
  
  const processingRef = useRef(false);
  const historyRef = useRef<ChatMessage[]>([]);
  
  useEffect(() => {
    const fetchHistory = async () => {
      let activeSessionId = sessionId;
      if (activeSessionId) {
        const q = query(
          collection(db, `chat_sessions/${activeSessionId}/messages`),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        try {
          const snapshot = await getDocs(q);
          const fetched = snapshot.docs.reverse().map(doc => {
            const data = doc.data();
            return {
              role: data.role as "user" | "model",
              content: data.content,
              timestamp: data.createdAt || Date.now()
            };
          });
          historyRef.current = fetched;
        } catch (error) {
          console.error("Error fetching history:", error);
        }
      }
    };
    fetchHistory();
  }, [sessionId]);
  useEffect(() => {
    const greet = async () => {
      if (hasGreeted) return;
      setHasGreeted(true);

      const greetings: Record<string, string> = {
        "en-US": "How can I help you?",
        "es-ES": "¿Cómo puedo ayudarte?",
        "fr-FR": "Comment puis-je vous aider ?",
        "de-DE": "Wie kann ich Ihnen helfen?",
        "hi-IN": "मैं आपकी क्या मदद कर सकता हूँ?",
        "te-IN": "నేను మీకు ఎలా సహాయపడగలను?",
        "ta-IN": "நான் உங்களுக்கு எப்படி உதவ முடியும்?",
        "kn-IN": "ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
        "ml-IN": "ഞാൻ എങ്ങനെ സഹായിക്കാം?",
        "mr-IN": "मी तुम्हाला कशी मदत करू शकतो?",
        "gu-IN": "હું તમારી કેવી રીતે મદદ કરી શકું?",
        "zh-CN": "我能为您做些什么？",
        "ja-JP": "何かお手伝いしましょうか？",
        "ko-KR": "무엇을 도와드릴까요?",
        "ar-SA": "كيف يمكنني مساعدتك؟",
        "pt-BR": "Como posso te ajudar?",
        "it-IT": "Come posso aiutarla?",
        "ru-RU": "Чем я могу вам помочь?",
      };

      const greeting = greetings[selectedLanguage.code] || "How can I help you?";
      setResponse(greeting);
      setStatus('speaking');
      const voiceName = voiceType === 'male' ? 'Puck' : 'Kore';
      const { audioBase64, audioMimeType } = await generateVoiceOver(greeting, voiceName);
      if (audioBase64) {
        const source = await playPCM(audioBase64, 24000, audioMimeType);
        setCurrentAudio(source);
        source.onended = () => {
          setStatus('idle');
          startListening();
        };
      } else {
        setStatus('idle');
        startListening();
      }
    };

    if (!hasGreeted) {
      greet();
    }

    return () => {
      stopListening();
      currentAudio?.stop();
    };
  }, [hasGreeted, selectedLanguage.code, voiceType]);

  useEffect(() => {
    if (!isListening && transcript && !processingRef.current) {
      handleChat(transcript);
    }
  }, [isListening, transcript]);

  const handleChat = async (text: string) => {
    if (processingRef.current) return;
    if (text.includes('Network error')) {
      setTimeout(() => startListening(), 2000);
      return;
    }
    processingRef.current = true;
    setStatus('thinking');
    setResponse('');
    
    try {
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        activeSessionId = await onCreateSession(text.slice(0, 50));
      }

      historyRef.current.push({ role: 'user', content: text, timestamp: Date.now() });
      if (activeSessionId) {
        await onSendMessage(activeSessionId, "user", text);
      }

      // Detect image intent early but don't block if possible
      const isImageRequest = await detectImageIntent(text);
      
      if (isImageRequest) {
        playNotificationSound();
        const imageUrl = generateImage(text);
        const confirmText = "I've generated an HD image based on your request.";
        setResponse(confirmText);
        setStatus('speaking');
        
        if (activeSessionId) {
          await onSendMessage(activeSessionId, "model", confirmText, imageUrl);
        }

        const voiceName = voiceType === 'male' ? 'Puck' : 'Kore';
        const { audioBase64, audioMimeType } = await generateVoiceOver(confirmText, voiceName);
        if (audioBase64) {
          const source = await playPCM(audioBase64, 24000, audioMimeType);
          setCurrentAudio(source);
          source.onended = () => {
            setStatus('idle');
            setTranscript('');
            processingRef.current = false;
            setTimeout(startListening, 500);
          };
        } else {
          setTimeout(() => {
            setStatus('idle');
            setTranscript('');
            processingRef.current = false;
            setTimeout(startListening, 500);
          }, 3000);
        }
        return;
      }

      // Fast combined response
      const voiceName = voiceType === 'male' ? 'Puck' : 'Kore';
      const { text: aiResponse, audioBase64, audioMimeType } = await generateVoiceChatResponse(
        historyRef.current, 
        text, 
        voiceName,
        selectedLanguage.name
      );

      historyRef.current.push({ role: 'model', content: aiResponse, timestamp: Date.now() });
      setResponse(aiResponse);
      setStatus('speaking');

      if (activeSessionId) {
        await onSendMessage(activeSessionId, "model", aiResponse);
      }
      
      if (audioBase64) {
        const source = await playPCM(audioBase64, 24000, audioMimeType);
        setCurrentAudio(source);
        source.onended = () => {
          setStatus('idle');
          setTranscript('');
          processingRef.current = false;
          setTimeout(startListening, 500);
        };
      } else {
        setStatus('idle');
        processingRef.current = false;
        setTimeout(startListening, 500);
      }
    } catch (error) {
      console.error("Siri Chat Error:", error);
      setStatus('idle');
      processingRef.current = false;
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#0a0502]/98 backdrop-blur-3xl flex flex-col items-center justify-center p-8">
      {/* Top Bar */}
      <div className="absolute top-8 left-8 right-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Language Selector */}
          <div className="relative">
            <button 
              onClick={() => setShowLanguages(!showLanguages)}
              className="glass px-4 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all border border-white/5 active:scale-95"
            >
              <Globe size={14} className="text-brand" />
              <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">{selectedLanguage.name}</span>
              <ChevronDown size={14} className={cn("transition-transform duration-300", showLanguages && "rotate-180")} />
            </button>

            <AnimatePresence>
              {showLanguages && (
                <>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowLanguages(false)}
                    className="fixed inset-0 z-10"
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 mt-2 w-48 glass rounded-2xl border border-white/10 overflow-hidden shadow-2xl z-20 max-h-[60vh] overflow-y-auto custom-scrollbar"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLanguage(lang);
                          setShowLanguages(false);
                          setTranscript('');
                          setStatus('idle');
                          setHasGreeted(false);
                        }}
                        className={cn(
                          "w-full px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest transition-all",
                          selectedLanguage.code === lang.code ? "bg-brand text-white" : "text-white/60 hover:bg-white/10"
                        )}
                      >
                        {lang.name}
                        <span className="block text-[8px] opacity-40 font-normal mt-0.5">{lang.native}</span>
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="glass px-4 py-2.5 rounded-2xl flex items-center gap-2 border border-white/5">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Voice:</span>
            <button 
              onClick={() => {
                onVoiceTypeChange('male');
                setHasGreeted(false);
                setStatus('idle');
              }}
              className={cn(
                "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                voiceType === 'male' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              MALE
            </button>
            <button 
              onClick={() => {
                onVoiceTypeChange('female');
                setHasGreeted(false);
                setStatus('idle');
              }}
              className={cn(
                "px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
                voiceType === 'female' ? "bg-white text-black shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              FEMALE
            </button>
          </div>

          <div className="glass px-3 py-2.5 rounded-2xl flex items-center gap-2 border border-white/5">
            <span className="flex h-2 w-2 rounded-full bg-brand animate-pulse" />
            <span className="text-[10px] font-bold text-brand uppercase tracking-[0.2em] animate-pulse">HD CLARITY</span>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-3 glass rounded-full hover:bg-white/10 transition-all text-white/40 hover:text-white active:scale-90 border border-white/5"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl text-center">
        <motion.div
          animate={{
            scale: status === 'listening' ? [1, 1.05, 1] : 1,
            boxShadow: status === 'listening' ? "0 0 100px rgba(255, 78, 0, 0.4)" : "0 0 20px rgba(255, 78, 0, 0)"
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className={cn(
            "w-48 h-48 rounded-full flex items-center justify-center mb-12 transition-all duration-700 relative",
            status === 'speaking' ? 'bg-white text-black' : 'bg-brand text-white shadow-2xl shadow-brand/40'
          )}
        >
          <div className="absolute -top-4 -right-4 bg-green-500 p-3 rounded-full shadow-2xl border-4 border-black/20">
            <Phone size={20} className="text-white fill-current" />
          </div>
          
          <AnimatePresence mode="wait">
            {status === 'thinking' ? (
              <motion.div key="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Sparkles size={64} className="animate-spin-slow" />
              </motion.div>
            ) : status === 'speaking' ? (
              <motion.div key="speaking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Volume2 size={64} />
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Mic size={64} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Glowing Aura */}
          <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping opacity-20" />
        </motion.div>

        <h1 className="text-5xl font-serif italic mb-6 tracking-tight">
          <AnimatePresence mode="wait">
            <motion.span
              key={status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {status === 'idle' ? "Ready..." : 
               status === 'listening' ? "I'm listening..." :
               status === 'thinking' ? "Thinking..." :
               "VoxAI Speaking"}
            </motion.span>
          </AnimatePresence>
        </h1>

        <div className="h-24 flex items-center justify-center mb-8">
          <VoiceWaveform active={status === 'listening' || status === 'speaking'} />
        </div>

        <div className="min-h-[120px] max-w-xl mx-auto">
          <p className={cn(
            "text-2xl font-medium leading-relaxed transition-all duration-700",
            status === 'listening' ? 'text-white/90' : 'text-white/40 italic'
          )}>
            {transcript || response || `Ask me anything in ${selectedLanguage.name}...`}
          </p>
        </div>
      </div>

      <div className="w-full max-w-md p-10 border-t border-white/5 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-8 bg-white/5 px-4 py-2 rounded-full border border-white/5">
          <Sparkles size={12} className="text-brand" />
          <p className="text-[10px] text-white/30 uppercase tracking-[0.5em] font-bold">
            VoxAI HD Pro Voice • v1.1
          </p>
        </div>
        
        <div className="flex gap-8">
          <button 
            onClick={() => {
              if (isListening) stopListening();
              else startListening();
            }}
            className={cn(
              "w-20 h-20 rounded-3xl glass flex items-center justify-center transition-all duration-300 border border-white/10 active:scale-95 shadow-xl",
              isListening ? "bg-red-500/20 text-red-500 border-red-500/40 shadow-red-500/10" : "hover:bg-white/10"
            )}
          >
            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
          </button>
          
          <button 
            onClick={() => {
              currentAudio?.stop();
              onClose();
            }}
            className="w-20 h-20 rounded-3xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all active:scale-95 shadow-2xl shadow-red-500/30 border border-red-400/20"
            title="End Interaction"
          >
            <Phone size={32} className="rotate-[135deg] fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}
