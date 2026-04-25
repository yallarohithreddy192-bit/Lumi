import { useState, useEffect, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc,
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ChatSession, Message } from '../types';

export function useFirebaseChat(userId: string | undefined) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load sessions
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, 'chat_sessions'),
      where('userId', '==', userId),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatSession[];
      setSessions(sessionData);
    });

    return unsubscribe;
  }, [userId]);

  // Load messages for current session
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chat_sessions', currentSessionId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messageData);
    });

    return unsubscribe;
  }, [currentSessionId]);

  const createSession = useCallback(async (title: string) => {
    if (!userId) return null;
    
    setIsLoading(true);
    try {
      const docRef = await addDoc(collection(db, 'chat_sessions'), {
        userId,
        title,
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
      });
      setCurrentSessionId(docRef.id);
      return docRef.id;
    } catch (error) {
      console.error("Error creating session:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const sendMessage = useCallback(async (sessionId: string, role: "user" | "model", content: string, imageUrl?: string) => {
    try {
      const messageData: any = {
        sessionId,
        role,
        content,
        createdAt: serverTimestamp(),
      };
      if (imageUrl) messageData.imageUrl = imageUrl;

      const docRef = await addDoc(collection(db, 'chat_sessions', sessionId, 'messages'), messageData);

      await updateDoc(doc(db, 'chat_sessions', sessionId), {
        lastMessageAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error sending message:", error);
      return null;
    }
  }, []);

  const updateMessage = useCallback(async (sessionId: string, messageId: string, content: string) => {
    try {
      await updateDoc(doc(db, 'chat_sessions', sessionId, 'messages', messageId), {
        content,
      });
    } catch (error) {
      console.error("Error updating message:", error);
    }
  }, []);

  return {
    sessions,
    currentSessionId,
    setCurrentSessionId,
    messages,
    isLoading,
    createSession,
    sendMessage,
    updateMessage
  };
}
