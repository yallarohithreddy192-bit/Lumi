import { useState, useEffect, useRef } from "react";
import { Send, Mic, MicOff, Settings, Sparkles, ChevronRight, Bot, Globe, Image as ImageIcon, Wand2, Menu, UserPlus, History, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "./lib/firebase";
import { AuthOverlay } from "./components/AuthOverlay";
import { Sidebar } from "./components/Sidebar";
import { ChatMessage } from "./components/ChatMessage";
import { VoiceWaveform } from "./components/VoiceWaveform";
import { Gallery } from "./components/Gallery";
import { SiriMode } from "./components/SiriMode";
import { NewChatHero } from "./components/NewChatHero";
import { CoursesView } from "./components/CoursesView";
import { useFirebaseChat } from "./hooks/useFirebaseChat";
import { useVoice } from "./hooks/useVoice";
import { generateChatResponse, generateVoiceOver, detectImageIntent, generateImage, generateChatResponseStream } from "./services/gemini";
import { playPCM, playNotificationSound } from "./lib/audio";
import { cn } from "./lib/utils";
import { SUPPORTED_LANGUAGES } from "./constants";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<AudioBufferSourceNode | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [voiceType, setVoiceType] = useState<'male' | 'female'>('female');
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[0]);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<'chat' | 'gallery' | 'siri' | 'lessons'>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { 
    sessions, 
    currentSessionId, 
    setCurrentSessionId, 
    messages, 
    sendMessage, 
    updateMessage,
    createSession 
  } = useFirebaseChat(user?.uid);
  
  const { isListening, transcript, startListening, stopListening, setTranscript } = useVoice(selectedLanguage.code);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  const prevIsListeningRef = useRef(isListening);
  useEffect(() => {
    if (prevIsListeningRef.current && !isListening && transcript) {
      handleSend();
    }
    prevIsListeningRef.current = isListening;
  }, [isListening, transcript]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isGenerating, activeView]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (e?: React.FormEvent, forceImage: boolean = false) => {
    e?.preventDefault();
    const text = input.trim();
    if ((!text && !selectedImage) || isGenerating) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createSession(text.slice(0, 50) || "Image Analysis");
      if (!sessionId) return;
    }

    const currentImage = selectedImage;
    setInput("");
    setSelectedImage(null);
    setTranscript("");
    setIsGenerating(true);
    setActiveView('chat');

    try {
      // 1. Save User Message
      await sendMessage(sessionId, "user", text, currentImage || undefined);

      // 2. Detect Intent (only if no image provided, or if specifically forced)
      const isImageRequest = !currentImage && (forceImage || (await detectImageIntent(text)));

      if (isImageRequest) {
        const imageUrl = generateImage(text);
        playNotificationSound();
        if (sessionId) {
          await sendMessage(sessionId, "model", `I've generated an HD image based on your request: "${text}"`, imageUrl);
        }
      } else {
        // 3. Format history for Gemini
        const history = messages.map(m => ({
          role: m.role,
          content: m.content,
          imageUrl: m.imageUrl || undefined,
          timestamp: m.createdAt
        }));

        // 4. Generate AI Response via Stream
        let fullResponse = "";
        let modelMessageId: string | null = null;

        const stream = generateChatResponseStream(history, text, selectedLanguage.name, currentImage || undefined);
        
        for await (const chunk of stream) {
          fullResponse += chunk;
          
          if (!modelMessageId) {
            // First chunk: Create the message
            modelMessageId = await sendMessage(sessionId, "model", fullResponse);
          } else if (sessionId && modelMessageId) {
            // Successive chunks: Update the message
            await updateMessage(sessionId, modelMessageId, fullResponse);
          }
        }
      }
    } catch (error) {
      console.error("Operation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const startLesson = (courseTitle: string) => {
    setInput(`Let's start the ${courseTitle} lesson. Please give me an introduction and the first topic to learn.`);
    setActiveView('chat');
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleVoiceOver = async (msgId: string, text: string) => {
    if (playingMessageId === msgId) {
      currentAudio?.stop();
      setPlayingMessageId(null);
      setCurrentAudio(null);
      return;
    }

    if (currentAudio) {
      currentAudio.stop();
    }

    setPlayingMessageId(msgId);
    const voiceName = voiceType === 'male' ? 'Puck' : 'Kore';
    const { audioBase64, audioMimeType } = await generateVoiceOver(text, voiceName);
    if (audioBase64) {
      const source = await playPCM(audioBase64, 24000, audioMimeType);
      setCurrentAudio(source);
      source.onended = () => {
        setPlayingMessageId(null);
        setCurrentAudio(null);
      };
    } else {
      setPlayingMessageId(null);
    }
  };

  if (!user) return <AuthOverlay />;

  return (
    <main className="flex h-screen w-full relative overflow-hidden bg-[#0A0A0A] text-white font-sans">
      <div className="atmosphere" />
      
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 z-[101]"
            >
              <Sidebar 
                sessions={sessions} 
                currentId={currentSessionId} 
                onSelect={(id) => {
                  setCurrentSessionId(id);
                  setActiveView('chat');
                  setIsSidebarOpen(false);
                }} 
                onNew={() => {
                  setCurrentSessionId(null);
                  setActiveView('chat');
                  setIsSidebarOpen(false);
                }}
                onViewGallery={() => {
                  setActiveView('gallery');
                  setIsSidebarOpen(false);
                }}
                onStartSiri={() => {
                  setActiveView('siri');
                  setIsSidebarOpen(false);
                }}
                onViewLessons={() => {
                  setActiveView('lessons');
                  setIsSidebarOpen(false);
                }}
                activeView={activeView}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <section className="flex-1 flex flex-col h-full overflow-hidden">
        {/* New Header */}
        <header className="h-14 flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Menu size={20} className="text-white/60" />
            </button>

          </div>

          <div className="flex items-center gap-1">
            <div className="hidden sm:flex items-center gap-1 glass px-1 py-1 rounded-full border border-white/5 mr-2">
              <button 
                onClick={() => setVoiceType('male')}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
                  voiceType === 'male' ? "bg-brand text-white shadow-lg" : "text-white/40 hover:text-white"
                )}
              >
                MALE
              </button>
              <button 
                onClick={() => setVoiceType('female')}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
                  voiceType === 'female' ? "bg-brand text-white shadow-lg" : "text-white/40 hover:text-white"
                )}
              >
                FEMALE
              </button>
            </div>
             <button className="p-2 text-white/40 hover:text-white transition-colors">
              <UserPlus size={20} />
            </button>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-white/40 hover:text-white transition-colors"
            >
              <History size={20} />
            </button>
          </div>
        </header>

        {activeView === 'gallery' ? (
          <Gallery userId={user.uid} />
        ) : activeView === 'lessons' ? (
          <CoursesView onStartCourse={startLesson} />
        ) : activeView === 'siri' ? (
          <SiriMode 
            onClose={() => setActiveView('chat')} 
            languageCode={selectedLanguage.code}
            sessionId={currentSessionId}
            onSendMessage={sendMessage}
            onCreateSession={createSession}
            voiceType={voiceType}
            onVoiceTypeChange={setVoiceType}
          />
        ) : (
          <>
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar scroll-smooth"
            >
              <div className="max-w-3xl mx-auto w-full">
                {messages.length === 0 && !isGenerating && (
                  <NewChatHero onAction={(text) => {
                    setInput(text);
                    // Focus input if desired, but just setting text is enough for now
                  }} />
                )}
                
                {messages.map((msg) => (
                  <ChatMessage 
                    key={msg.id} 
                    {...msg} 
                    onPlayVoice={() => toggleVoiceOver(msg.id, msg.content)}
                    isPlaying={playingMessageId === msg.id}
                  />
                ))}
                
                {isGenerating && (
                  <div className="flex gap-4 w-full mb-6 italic opacity-50">
                    <div className="w-8 h-8 rounded-full bg-brand/20 text-brand flex items-center justify-center shrink-0">
                      <Bot size={18} className="animate-pulse" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-4 w-48 bg-white/10 rounded animate-pulse" />
                      <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <footer className="p-4 pb-8">
              <div className="max-w-3xl mx-auto relative">
                <AnimatePresence>
                  {selectedImage && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full left-0 mb-4"
                    >
                      <div className="relative group p-1 bg-white/5 rounded-xl border border-white/10 glass">
                        <img 
                          src={selectedImage} 
                          alt="Selected" 
                          className="h-20 w-20 object-cover rounded-lg"
                        />
                        <button 
                          onClick={() => setSelectedImage(null)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs shadow-lg hover:bg-red-600 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form 
                  onSubmit={handleSend}
                  className="bg-[#1A1A1A] px-2 py-1.5 rounded-full flex items-center border border-white/5 focus-within:border-white/20 transition-all shadow-xl"
                >
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all"
                  >
                    <Plus size={20} />
                  </button>

                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask ChatGPT"
                    className="flex-1 bg-transparent border-none outline-none text-white text-base placeholder:text-white/20 px-3 py-2"
                  />
                  
                  <div className="flex items-center gap-1">
                    {!input.trim() && !selectedImage && (
                      <>
                        <button
                          type="button"
                          onClick={handleVoiceToggle}
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                            isListening ? "bg-red-500 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                          )}
                        >
                          {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveView('siri')}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <div className="flex flex-col gap-0.5 items-center">
                            <div className="w-1 h-3 bg-white/60 rounded-full" />
                            <div className="w-1 h-2 bg-white/60 rounded-full" />
                            <div className="w-1 h-3 bg-white/60 rounded-full" />
                          </div>
                        </button>
                      </>
                    )}
                    
                    {input.trim() && (
                      <button 
                        type="submit"
                        disabled={isGenerating}
                        className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/90 active:scale-95 disabled:opacity-50 transition-all"
                      >
                        <Send size={18} fill="currentColor" />
                      </button>
                    )}
                  </div>
                </form>
                
                <AnimatePresence>
                  {isListening && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-0 right-0 mb-4 flex justify-center"
                    >
                      <div className="glass px-6 py-2 rounded-2xl flex items-center gap-4">
                        <span className="text-xs font-bold text-brand uppercase tracking-widest flex items-center gap-2">
                           Listening
                        </span>
                        <VoiceWaveform active={true} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <p className="text-center text-[10px] text-white/20 mt-6 uppercase tracking-widest font-medium">
                VoxAI Core v1.0.5 • Powered by Gemini Flash
              </p>
            </footer>
          </>
        )}
      </section>

      <AnimatePresence>
        {activeView === 'siri' && (
          <SiriMode 
            onClose={() => setActiveView('chat')} 
            languageCode={selectedLanguage.code}
            sessionId={currentSessionId}
            onSendMessage={sendMessage}
            onCreateSession={createSession}
            voiceType={voiceType}
            onVoiceTypeChange={setVoiceType}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
