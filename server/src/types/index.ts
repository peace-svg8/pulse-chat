// =============================================
// Shared Types for Chat Application
// =============================================

export interface User {
  id: string;
  email: string;
  username: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
  publicKey?: string;
}

export interface Room {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  isDefault: boolean;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
  createdAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  content: string; // Encrypted payload
  senderEncryptedKey?: string;
  receiverEncryptedKey?: string;
  iv?: string;
  type: 'text' | 'image' | 'file';
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
  read: boolean;
  createdAt: string;
}

export interface TypingData {
  userId: string;
  username: string;
  roomId?: string;
  receiverId?: string;
  isTyping: boolean;
}

export interface SignupData {
  email: string;
  username: string;
  passwordRaw: string;
  avatar: string;
  publicKey: string;
  encryptedPrivateKey: string;
}

export interface LoginData {
  email: string;
  passwordRaw: string;
}

export interface AuthResponse {
  user: User;
  encryptedPrivateKey: string;
}

export interface SendMessageData {
  roomId: string;
  content: string;
  type: 'text' | 'image' | 'file';
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
}

export interface SendDMData {
  receiverId: string;
  content: string; // Encrypted
  senderEncryptedKey?: string;
  receiverEncryptedKey?: string;
  iv?: string;
  type: 'text' | 'image' | 'file';
  fileName?: string;
  fileSize?: number;
  fileUrl?: string;
}

// Socket event payloads
export interface ServerToClientEvents {
  'user:joined': (user: User) => void;
  'user:left': (userId: string) => void;
  'user:online-list': (users: User[]) => void;
  'message:new': (message: Message) => void;
  'message:history': (messages: Message[]) => void;
  'room:list': (rooms: Room[]) => void;
  'room:created': (room: Room) => void;
  'typing:update': (data: TypingData) => void;
  'dm:new': (message: DirectMessage) => void;
  'dm:history': (data: { odm: DirectMessage[]; odm_user: string }) => void;
  'error': (message: string) => void;
}

export interface ClientToServerEvents {
  'auth:signup': (data: SignupData, callback: (response: { success: boolean; data?: AuthResponse; error?: string }) => void) => void;
  'auth:login': (data: LoginData, callback: (response: { success: boolean; data?: AuthResponse; error?: string }) => void) => void;
  'message:send': (data: SendMessageData) => void;
  'message:get-history': (roomId: string) => void;
  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;
  'room:create': (data: { name: string; description: string }) => void;
  'room:get-list': () => void;
  'typing:start': (data: { roomId?: string; receiverId?: string }) => void;
  'typing:stop': (data: { roomId?: string; receiverId?: string }) => void;
  'dm:send': (data: SendDMData) => void;
  'dm:get-history': (otherUserId: string) => void;
}
