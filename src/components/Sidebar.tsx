import React from 'react';
import { Plus, MessageSquare, LogOut, Trash2, Image as ImageIcon, Mic, LayoutGrid, Settings, Phone, GraduationCap } from 'lucide-react';
import { ChatSession } from '../types';
import { auth, db } from '../lib/firebase';
import { deleteDoc, doc } from 'firebase/firestore';

interface SidebarProps {
  sessions: ChatSession[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onViewGallery: () => void;
  onStartSiri: () => void;
  onViewLessons: () => void;
  activeView: 'chat' | 'gallery' | 'siri' | 'lessons';
}

export function Sidebar({ sessions, currentId, onSelect, onNew, onViewGallery, onStartSiri, onViewLessons, activeView }: SidebarProps) {
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this session?')) {
      await deleteDoc(doc(db, 'chat_sessions', id));
    }
  };

  return (
    <aside className="w-80 flex flex-col glass border-r-0 rounded-r-3xl overflow-hidden h-full z-10">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-serif italic text-lg leading-none">V</div>
          <h2 className="text-xl font-serif italic">VoxAI</h2>
        </div>
        
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 bg-white text-black py-3 rounded-xl font-medium hover:bg-white/90 transition-all shadow-lg shadow-white/5"
        >
          <Plus size={18} />
          New Chat
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onViewGallery}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border ${activeView === 'gallery' ? 'bg-brand/20 border-brand/40 text-brand' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
          >
            <LayoutGrid size={14} />
            Gallery
          </button>
          <button
            onClick={onStartSiri}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all border ${activeView === 'siri' ? 'bg-brand/20 border-brand/40 text-brand' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
          >
            <Phone size={14} />
            Siri
          </button>
        </div>

        <button
          onClick={onViewLessons}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all border ${activeView === 'lessons' ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
        >
          <GraduationCap size={18} />
          Lessons & Courses
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
        <p className="px-4 py-2 text-[10px] font-bold text-white/20 uppercase tracking-widest">Recent Chats</p>
        {sessions.map(session => (
          <div
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={`
              group relative p-3 rounded-xl cursor-pointer transition-all flex items-center gap-3
              ${currentId === session.id && activeView === 'chat' ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5 border border-transparent'}
            `}
          >
            <MessageSquare size={14} className={currentId === session.id && activeView === 'chat' ? 'text-brand' : 'text-white/40'} />
            <span className={`flex-1 truncate text-xs font-medium pr-6 ${currentId === session.id && activeView === 'chat' ? 'text-white' : 'text-white/60'}`}>
              {session.title || 'Empty Session'}
            </span>
            <button
              onClick={(e) => handleDelete(e, session.id)}
              className="absolute right-3 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all p-1"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="p-6 mt-auto border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <img 
            src={auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser?.uid}`} 
            alt="Avatar" 
            className="w-8 h-8 rounded-full bg-white/10 shrink-0 border border-white/10"
          />
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-bold text-white/80 truncate uppercase tracking-tighter">
              {auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0]}
            </span>
            <span className="text-[9px] text-white/30 truncate uppercase tracking-widest">Pro Member</span>
          </div>
        </div>
        <button 
          onClick={() => auth.signOut()}
          className="text-white/40 hover:text-white transition-colors p-2"
          title="Sign Out"
        >
          <LogOut size={14} />
        </button>
      </div>
    </aside>
  );
}
