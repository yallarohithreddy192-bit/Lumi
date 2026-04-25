import React from "react";
import Markdown from "react-markdown";
import { User, Bot, Volume2, Square } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface ChatMessageProps {
  role: "user" | "model";
  content: string;
  imageUrl?: string;
  onPlayVoice?: () => void;
  isPlaying?: boolean;
}

export function ChatMessage({ role, content, imageUrl, onPlayVoice, isPlaying }: ChatMessageProps) {
  const isModel = role === "model";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-4 w-full mb-8",
        isModel ? "flex-row" : "flex-row-reverse"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
        isModel ? "bg-brand/20 text-brand" : "bg-white/10 text-white"
      )}>
        {isModel ? <Bot size={18} /> : <User size={18} />}
      </div>
      
      <div className={cn(
        "max-w-[85%] flex flex-col group",
        isModel ? "items-start" : "items-end"
      )}>
        <div className={cn(
          "px-4 py-3 rounded-2xl overflow-hidden",
          isModel ? "bg-white/5 border border-white/10" : "bg-brand text-white"
        )}>
          {imageUrl && (
            <div className="mb-4 rounded-xl overflow-hidden border border-white/10 bg-black/40">
              <img 
                src={imageUrl} 
                alt="AI Generated" 
                className="w-full h-auto object-cover max-h-[512px]"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className="markdown-body">
            <Markdown>{content}</Markdown>
          </div>
        </div>
        
        {isModel && onPlayVoice && !imageUrl && (
          <button
            onClick={onPlayVoice}
            className="mt-2 text-white/40 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider"
          >
            {isPlaying ? (
              <>
                <Square size={12} fill="currentColor" />
                Stop
              </>
            ) : (
              <>
                <Volume2 size={14} />
                Listen
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  );
}
