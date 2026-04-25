export interface UserProfile {
  userId: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: number;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  lastMessageAt: number;
}

export interface Message {
  id: string;
  sessionId: string;
  role: "user" | "model";
  content: string;
  imageUrl?: string;
  createdAt: number;
}
