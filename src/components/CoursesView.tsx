import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Code, Brain, Coffee, ChevronRight, GraduationCap } from 'lucide-react';
import { COURSES } from '../constants';
import { cn } from '../lib/utils';

interface CoursesViewProps {
  onStartCourse: (courseTitle: string) => void;
}

export const CoursesView: React.FC<CoursesViewProps> = ({ onStartCourse }) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'javascript': return <Code className="text-yellow-400" />;
      case 'python': return <Code className="text-blue-400" />;
      case 'brain': return <Brain className="text-purple-400" />;
      case 'coffee': return <Coffee className="text-orange-400" />;
      default: return <BookOpen className="text-gray-400" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="space-y-4">
          <div className="flex items-center gap-3 text-white/40">
            <GraduationCap size={24} />
            <span className="text-sm font-medium tracking-widest uppercase">Learning Center</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Knowledge <span className="text-white/40">Base.</span>
          </h1>
          <p className="text-lg text-white/60 max-w-2xl">
            Interactive AI-powered courses designed to take you from a beginner to an expert in development and machine learning.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {COURSES.map((course, index) => (
            <motion.button
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => onStartCourse(course.title)}
              className="group text-left p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/10 transition-all glass relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 group-hover:scale-110 transition-transform">
                  {getIcon(course.icon)}
                </div>
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border",
                  course.level === 'Beginner' ? 'text-green-400 border-green-400/20' :
                  course.level === 'Intermediate' ? 'text-blue-400 border-blue-400/20' :
                  'text-purple-400 border-purple-400/20'
                )}>
                  {course.level}
                </span>
              </div>

              <div className="mt-6 space-y-2">
                <h3 className="text-xl font-bold text-white">{course.title}</h3>
                <p className="text-sm text-white/50 line-clamp-2">{course.description}</p>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {course.topics.slice(0, 3).map(topic => (
                  <span key={topic} className="text-[10px] text-white/40 bg-white/5 px-2 py-1 rounded-md border border-white/10">
                    {topic}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-2 text-sm font-medium text-white/60 group-hover:text-white transition-colors">
                Start Learning
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          ))}
        </div>

        <section className="p-8 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex flex-col md:flex-row items-center gap-8">
          <div className="space-y-4 flex-1">
            <h2 className="text-2xl font-bold text-white">Custom Learning Path?</h2>
            <p className="text-white/60">
              Ask VoxAI anything! Our AI is pre-trained on advanced JavaScript, Python, Django, React, and Machine Learning concepts.
            </p>
            <button 
              onClick={() => onStartCourse("Help me create a custom learning path for full-stack development")}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-sm font-medium transition-colors"
            >
              Consult AI Tutor
            </button>
          </div>
          <div className="w-32 h-32 flex items-center justify-center bg-blue-500/20 rounded-full">
            <Brain size={64} className="text-blue-400 animate-pulse" />
          </div>
        </section>
      </div>
    </div>
  );
};
