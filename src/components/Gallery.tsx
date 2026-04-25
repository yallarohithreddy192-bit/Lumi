import React, { useState, useEffect } from 'react';
import { collectionGroup, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Message } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Share2, Maximize2, X, LayoutGrid } from 'lucide-react';

export function Gallery({ userId }: { userId: string }) {
  const [images, setImages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Message | null>(null);

  const handleShare = async (img: Message) => {
    if (!img.imageUrl) return;
    
    // Try Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this AI Art from VoxAI',
          text: img.content,
          url: img.imageUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(img.imageUrl);
      alert('Image link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  useEffect(() => {
    async function fetchImages() {
      // Note: CollectionGroup queries need an index. For now, we'll try a simpler approach if possible
      // or assume the index is being created. Alternatively, we could fetch all sessions and then messages.
      // For speed and simplicity in this demo, let's try collectionGroup.
      try {
        const q = query(
          collectionGroup(db, 'messages'),
          where('imageUrl', '!=', null),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const imageData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        setImages(imageData);
      } catch (error) {
        console.error("Error fetching gallery:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchImages();
  }, [userId]);

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 custom-scrollbar bg-black/40 backdrop-blur-md">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h2 className="text-4xl font-serif italic mb-2">Visual Gallery</h2>
          <p className="text-white/40 uppercase text-[10px] tracking-[0.3em] font-bold">Your HD Generated Creations</p>
        </header>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-white/5 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 opacity-20">
            <LayoutGrid size={48} className="mb-4" />
            <p className="text-xl font-serif">No images generated yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.map((img) => (
              <motion.div
                key={img.id}
                layoutId={img.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedImage(img)}
                className="group relative aspect-square rounded-3xl overflow-hidden glass border-white/5 cursor-pointer hover:border-brand/40 transition-all"
              >
                <img 
                  src={img.imageUrl} 
                  alt={img.content} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-[10px] text-white/60 truncate uppercase tracking-wider mb-2">{img.content}</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(img);
                      }}
                      className="p-2 bg-white/10 rounded-lg hover:bg-brand transition-colors"
                    >
                      <Maximize2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShare(img);
                      }}
                      className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <Share2 size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImage(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
            />
            <motion.div
              layoutId={selectedImage.id}
              className="relative max-w-4xl w-full aspect-square rounded-3xl overflow-hidden glass shadow-2xl border-white/10"
            >
              <img 
                src={selectedImage.imageUrl} 
                alt={selectedImage.content} 
                className="w-full h-full object-contain bg-black/40"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-lg font-serif italic mb-4 leading-relaxed line-clamp-2">{selectedImage.content}</p>
                <div className="flex gap-4">
                  <a 
                    href={selectedImage.imageUrl} 
                    download 
                    target="_blank"
                    className="flex-1 bg-white text-black py-4 rounded-2xl font-bold text-center hover:bg-white/90 transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={18} /> Download HD
                  </a>
                  <button 
                    onClick={() => handleShare(selectedImage)}
                    className="p-4 glass rounded-2xl hover:bg-white/10 transition-all"
                  >
                    <Share2 size={20} />
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-6 right-6 p-3 glass rounded-full hover:bg-red-500 transition-all"
              >
                <X size={20} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
