// =============================================
// Chat Context — Global State Management
// =============================================

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import socket from '../socket';
import {
  deriveKeyFromPassword,
  encryptPrivateKey,
  decryptPrivateKey,
  generateRSAKeyPair,
  exportPublicKey,
  encryptMessage,
  decryptMessage
} from '../utils/crypto';

// ---- Types ----
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
  content: string;
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

export interface TypingUser {
  userId: string;
  username: string;
}

interface ChatState {
  currentUser: User | null;
  isAuthenticated: boolean;
  rooms: Room[];
  activeRoom: string | null;
  activeRoomName: string;
  messages: Message[];
  onlineUsers: User[];
  typingUsers: TypingUser[];
  dmConversations: Record<string, DirectMessage[]>;
  activeDMUser: User | null;
  chatMode: 'room' | 'dm';
  unreadDMs: Record<string, number>;
}

type ChatAction =
  | { type: 'SET_USER'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_ROOMS'; payload: Room[] }
  | { type: 'ADD_ROOM'; payload: Room }
  | { type: 'SET_ACTIVE_ROOM'; payload: { id: string; name: string } }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_ONLINE_USERS'; payload: User[] }
  | { type: 'ADD_TYPING_USER'; payload: TypingUser }
  | { type: 'REMOVE_TYPING_USER'; payload: string }
  | { type: 'SET_DM_HISTORY'; payload: { userId: string; messages: DirectMessage[] } }
  | { type: 'ADD_DM'; payload: DirectMessage }
  | { type: 'SET_ACTIVE_DM_USER'; payload: User | null }
  | { type: 'SET_CHAT_MODE'; payload: 'room' | 'dm' }
  | { type: 'INCREMENT_UNREAD_DM'; payload: string }
  | { type: 'CLEAR_UNREAD_DM'; payload: string };

const initialState: ChatState = {
  currentUser: null,
  isAuthenticated: false,
  rooms: [],
  activeRoom: 'room-general',
  activeRoomName: 'General',
  messages: [],
  onlineUsers: [],
  typingUsers: [],
  dmConversations: {},
  activeDMUser: null,
  chatMode: 'room',
  unreadDMs: {},
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload, isAuthenticated: true };
    case 'LOGOUT':
      return { ...initialState };
    case 'SET_ROOMS':
      return { ...state, rooms: action.payload };
    case 'ADD_ROOM':
      if (state.rooms.find(r => r.id === action.payload.id)) return state;
      return { ...state, rooms: [...state.rooms, action.payload] };
    case 'SET_ACTIVE_ROOM':
      return {
        ...state,
        activeRoom: action.payload.id,
        activeRoomName: action.payload.name,
        messages: [],
        typingUsers: [],
        chatMode: 'room',
        activeDMUser: null,
      };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };
    case 'ADD_TYPING_USER':
      if (state.typingUsers.find((u) => u.userId === action.payload.userId)) return state;
      return { ...state, typingUsers: [...state.typingUsers, action.payload] };
    case 'REMOVE_TYPING_USER':
      return {
        ...state,
        typingUsers: state.typingUsers.filter((u) => u.userId !== action.payload),
      };
    case 'SET_DM_HISTORY':
      return {
        ...state,
        dmConversations: {
          ...state.dmConversations,
          [action.payload.userId]: action.payload.messages,
        },
      };
    case 'ADD_DM': {
      const dm = action.payload;
      const otherUser =
        dm.senderId === state.currentUser?.id ? dm.receiverId : dm.senderId;
      const existing = state.dmConversations[otherUser] || [];
      // Avoid duplicates
      if (existing.find(m => m.id === dm.id)) return state;
      return {
        ...state,
        dmConversations: {
          ...state.dmConversations,
          [otherUser]: [...existing, dm],
        },
      };
    }
    case 'SET_ACTIVE_DM_USER':
      return {
        ...state,
        activeDMUser: action.payload,
        chatMode: action.payload ? 'dm' : 'room',
        typingUsers: [],
      };
    case 'SET_CHAT_MODE':
      return { ...state, chatMode: action.payload };
    case 'INCREMENT_UNREAD_DM':
      return {
        ...state,
        unreadDMs: {
          ...state.unreadDMs,
          [action.payload]: (state.unreadDMs[action.payload] || 0) + 1,
        },
      };
    case 'CLEAR_UNREAD_DM':
      return {
        ...state,
        unreadDMs: { ...state.unreadDMs, [action.payload]: 0 },
      };
    default:
      return state;
  }
}

// ---- Context ----
interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  signup: (email: string, username: string, passwordRaw: string, avatar: string) => Promise<void>;
  login: (email: string, passwordRaw: string) => Promise<void>;
  logout: () => void;
  sendMessage: (content: string, type?: 'text' | 'image' | 'file', fileName?: string, fileSize?: number, fileUrl?: string) => void;
  joinRoom: (roomId: string, roomName: string) => void;
  createRoom: (name: string, description: string) => void;
  sendDM: (receiverId: string, content: string, type?: 'text' | 'image' | 'file', fileName?: string, fileSize?: number, fileUrl?: string) => Promise<void>;
  openDM: (user: User) => void;
  startTyping: () => void;
  stopTyping: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  const privateKeyRef = useRef<CryptoKey | null>(null);

  // Keep stateRef in sync so event handlers always see latest state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ---- Register ALL socket listeners once on mount ----
  useEffect(() => {
    const handleOnlineList = (users: User[]) => {
      dispatch({ type: 'SET_ONLINE_USERS', payload: users });
    };

    const handleUserJoined = (_user: User) => {
      // We get the full list via user:online-list, so no need to manually add
    };

    const handleUserLeft = (userId: string) => {
      const current = stateRef.current;
      dispatch({
        type: 'SET_ONLINE_USERS',
        payload: current.onlineUsers.filter((u) => u.id !== userId),
      });
    };

    const handleNewMessage = (message: Message) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    };

    const handleMessageHistory = (messages: Message[]) => {
      dispatch({ type: 'SET_MESSAGES', payload: messages });
    };

    const handleRoomList = (rooms: Room[]) => {
      dispatch({ type: 'SET_ROOMS', payload: rooms });
    };

    const handleRoomCreated = (room: Room) => {
      dispatch({ type: 'ADD_ROOM', payload: room });
    };

    const handleTypingUpdate = (data: { userId: string; username: string; roomId?: string; receiverId?: string; isTyping: boolean }) => {
      const current = stateRef.current;
      if (data.userId === current.currentUser?.id) return;
      if (data.isTyping) {
        dispatch({ type: 'ADD_TYPING_USER', payload: { userId: data.userId, username: data.username } });
        setTimeout(() => {
          dispatch({ type: 'REMOVE_TYPING_USER', payload: data.userId });
        }, 3000);
      } else {
        dispatch({ type: 'REMOVE_TYPING_USER', payload: data.userId });
      }
    };

    const handleNewDM = async (dm: DirectMessage) => {
      const current = stateRef.current;
      const privKey = privateKeyRef.current;
      let decryptedContent = dm.content;

      // Try E2EE decryption
      if (privKey && dm.senderEncryptedKey && dm.receiverEncryptedKey && dm.iv) {
        try {
          const isSender = dm.senderId === current.currentUser?.id;
          const keyToUse = isSender ? dm.senderEncryptedKey : dm.receiverEncryptedKey;
          decryptedContent = await decryptMessage(dm.content, keyToUse, dm.iv, privKey);
        } catch (err) {
          console.error("Failed to decrypt incoming DM", err);
        }
      }

      const decryptedDM = { ...dm, content: decryptedContent };
      dispatch({ type: 'ADD_DM', payload: decryptedDM });
      
      const otherUser = decryptedDM.senderId === current.currentUser?.id ? decryptedDM.receiverId : decryptedDM.senderId;
      if (current.activeDMUser?.id !== otherUser && decryptedDM.senderId !== current.currentUser?.id) {
        dispatch({ type: 'INCREMENT_UNREAD_DM', payload: otherUser });
      }
    };

    const handleDMHistory = async (data: { odm: DirectMessage[]; odm_user: string }) => {
      const current = stateRef.current;
      const privKey = privateKeyRef.current;
      
      const decryptedMessages = await Promise.all(data.odm.map(async (dm) => {
        let decryptedContent = dm.content;
        if (privKey && dm.senderEncryptedKey && dm.receiverEncryptedKey && dm.iv) {
          try {
            const isSender = dm.senderId === current.currentUser?.id;
            const keyToUse = isSender ? dm.senderEncryptedKey : dm.receiverEncryptedKey;
            decryptedContent = await decryptMessage(dm.content, keyToUse, dm.iv, privKey);
          } catch (err) {
            console.error("Failed to decrypt historic DM", err);
          }
        }
        return { ...dm, content: decryptedContent };
      }));

      dispatch({ type: 'SET_DM_HISTORY', payload: { userId: data.odm_user, messages: decryptedMessages } });
    };

    socket.on('user:online-list', handleOnlineList);
    socket.on('user:joined', handleUserJoined);
    socket.on('user:left', handleUserLeft);
    socket.on('message:new', handleNewMessage);
    socket.on('message:history', handleMessageHistory);
    socket.on('room:list', handleRoomList);
    socket.on('room:created', handleRoomCreated);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('dm:new', handleNewDM);
    socket.on('dm:history', handleDMHistory);

    return () => {
      socket.off('user:online-list', handleOnlineList);
      socket.off('user:joined', handleUserJoined);
      socket.off('user:left', handleUserLeft);
      socket.off('message:new', handleNewMessage);
      socket.off('message:history', handleMessageHistory);
      socket.off('room:list', handleRoomList);
      socket.off('room:created', handleRoomCreated);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('dm:new', handleNewDM);
      socket.off('dm:history', handleDMHistory);
    };
  }, []); // Register ONCE on mount — no dependencies

  // ---- Actions ----
  const signup = useCallback(async (email: string, username: string, passwordRaw: string, avatar: string) => {
    try {
      const keyPair = await generateRSAKeyPair();
      const publicKeyStr = await exportPublicKey(keyPair.publicKey);
      
      const pwdKey = await deriveKeyFromPassword(passwordRaw, email);
      const encryptedPrivKeyStr = await encryptPrivateKey(keyPair.privateKey, pwdKey);
      
      socket.connect();
      return new Promise<void>((resolve, reject) => {
        socket.emit('auth:signup', { email, username, passwordRaw, avatar, publicKey: publicKeyStr, encryptedPrivateKey: encryptedPrivKeyStr }, (res: any) => {
          if (res.success && res.data) {
            privateKeyRef.current = keyPair.privateKey;
            dispatch({ type: 'SET_USER', payload: res.data.user });
            resolve();
          } else {
            socket.disconnect();
            reject(new Error(res.error || 'Signup failed'));
          }
        });
      });
    } catch (err) {
      console.error(err);
      throw new Error('Encryption failed during signup');
    }
  }, []);

  const login = useCallback(async (email: string, passwordRaw: string) => {
    socket.connect();
    return new Promise<void>((resolve, reject) => {
      socket.emit('auth:login', { email, passwordRaw }, async (res: any) => {
        if (res.success && res.data) {
          try {
            const pwdKey = await deriveKeyFromPassword(passwordRaw, email);
            const privateKey = await decryptPrivateKey(res.data.encryptedPrivateKey, pwdKey);
            privateKeyRef.current = privateKey;
            dispatch({ type: 'SET_USER', payload: res.data.user });
            resolve();
          } catch (err) {
            console.error(err);
            socket.disconnect();
            reject(new Error('Failed to decrypt keys. Incorrect password?'));
          }
        } else {
          socket.disconnect();
          reject(new Error(res.error || 'Login failed'));
        }
      });
    });
  }, []);

  const logout = useCallback(() => {
    socket.disconnect();
    dispatch({ type: 'LOGOUT' });
    privateKeyRef.current = null;
  }, []);

  const sendMessage = useCallback(
    (content: string, type: 'text' | 'image' | 'file' = 'text', fileName?: string, fileSize?: number, fileUrl?: string) => {
      const current = stateRef.current;
      if (!current.activeRoom) return;
      socket.emit('message:send', {
        roomId: current.activeRoom,
        content,
        type,
        fileName,
        fileSize,
        fileUrl,
      });
    },
    []
  );

  const joinRoom = useCallback((roomId: string, roomName: string) => {
    dispatch({ type: 'SET_ACTIVE_ROOM', payload: { id: roomId, name: roomName } });
    socket.emit('room:join', roomId);
  }, []);

  const createRoom = useCallback((name: string, description: string) => {
    socket.emit('room:create', { name, description });
  }, []);

  const sendDM = useCallback(
    async (receiverId: string, content: string, type: 'text' | 'image' | 'file' = 'text', fileName?: string, fileSize?: number, fileUrl?: string) => {
      const current = stateRef.current;
      if (!privateKeyRef.current || !current.currentUser?.publicKey) {
        console.error("Missing keys for E2EE");
        return;
      }
      
      const receiver = current.onlineUsers.find(u => u.id === receiverId);
      if (!receiver || !receiver.publicKey) {
        console.error("Cannot find receiver public key");
        return;
      }
      
      try {
        const encrypted = await encryptMessage(content, receiver.publicKey, current.currentUser.publicKey);
        socket.emit('dm:send', { 
          receiverId, 
          content: encrypted.content, 
          senderEncryptedKey: encrypted.senderEncryptedKey,
          receiverEncryptedKey: encrypted.receiverEncryptedKey,
          iv: encrypted.iv,
          type, 
          fileName, 
          fileSize, 
          fileUrl 
        });
      } catch (err) {
        console.error("Encryption failed", err);
      }
    },
    []
  );

  const openDM = useCallback((user: User) => {
    dispatch({ type: 'SET_ACTIVE_DM_USER', payload: user });
    dispatch({ type: 'CLEAR_UNREAD_DM', payload: user.id });
    socket.emit('dm:get-history', user.id);
  }, []);

  const startTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    const current = stateRef.current;

    if (current.chatMode === 'room' && current.activeRoom) {
      socket.emit('typing:start', { roomId: current.activeRoom });
    } else if (current.chatMode === 'dm' && current.activeDMUser) {
      socket.emit('typing:start', { receiverId: current.activeDMUser.id });
    }

    typingTimeoutRef.current = setTimeout(() => {
      const latest = stateRef.current;
      if (latest.chatMode === 'room' && latest.activeRoom) {
        socket.emit('typing:stop', { roomId: latest.activeRoom });
      } else if (latest.chatMode === 'dm' && latest.activeDMUser) {
        socket.emit('typing:stop', { receiverId: latest.activeDMUser.id });
      }
    }, 2000);
  }, []);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    const current = stateRef.current;

    if (current.chatMode === 'room' && current.activeRoom) {
      socket.emit('typing:stop', { roomId: current.activeRoom });
    } else if (current.chatMode === 'dm' && current.activeDMUser) {
      socket.emit('typing:stop', { receiverId: current.activeDMUser.id });
    }
  }, []);

  return (
    <ChatContext.Provider
      value={{
        state,
        dispatch,
        signup,
        login,
        logout,
        sendMessage,
        joinRoom,
        createRoom,
        sendDM,
        openDM,
        startTyping,
        stopTyping,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
