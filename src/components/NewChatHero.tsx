import React from 'react';
import { motion } from 'motion/react';
import { Image as ImageIcon, PenLine, FileText, Lightbulb, GraduationCap } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeroActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
}

function HeroAction({ icon, label, onClick, color }: HeroActionProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-5 py-4 rounded-2xl border border-white/5 bg-white/[0.02] transition-all text-left group",
        "hover:border-white/20 shadow-sm"
      )}
    >
      <div className={cn("p-2 rounded-xl text-white", color)}>
        {icon}
      </div>
      <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{label}</span>
    </motion.button>
  );
}

export function NewChatHero({ onAction }: { onAction: (text: string) => void }) {
  const actions = [
    { icon: <ImageIcon size={18} />, label: "Create image", text: "Create an image of ", color: "bg-emerald-500/20" },
    { icon: <GraduationCap size={18} />, label: "Try a course", text: "Show me the available JavaScript and Python courses", color: "bg-blue-500/20" },
    { icon: <FileText size={18} />, label: "Summarize text", text: "Summarize the following text: ", color: "bg-orange-500/20" },
    { icon: <Lightbulb size={18} />, label: "Get advice", text: "Give me some advice on ", color: "bg-purple-500/20" },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <motion.h2 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-semibold mb-10 text-white tracking-tight"
      >
        What can I help with?
      </motion.h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {actions.map((action, idx) => (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
          >
            <HeroAction
              icon={action.icon}
              label={action.label}
              color={action.color}
              onClick={() => onAction(action.text)}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
