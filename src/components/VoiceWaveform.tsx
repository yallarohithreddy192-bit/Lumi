import { motion } from "motion/react";

export function VoiceWaveform({ active }: { active: boolean }) {
  const bars = [0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.5, 0.7, 0.4];

  return (
    <div className="flex items-center justify-center gap-1.5 h-12">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className="w-1.5 bg-brand rounded-full"
          animate={{
            height: active ? `${height * 100}%` : "15%",
            opacity: active ? 1 : 0.3,
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatType: "mirror",
            delay: i * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
