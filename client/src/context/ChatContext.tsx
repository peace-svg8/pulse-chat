// =============================================
// Chat Context — Global State Management
// =============================================

import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useState } from 'react';
import { collection, doc, setDoc, getDoc, addDoc, onSnapshot, query, where, orderBy, updateDoc, getDocs, limit, or } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../firebase';
import {
  deriveKeyFromPassword,
  encryptPrivateKey,
  decryptPrivateKey,
  generateRSAKeyPair,
  exportPublicKey,
  encryptMessage,
  decryptMessage
} from '../utils/crypto';

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
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_ROOMS'; payload: Room[] }
  | { type: 'SET_ACTIVE_ROOM'; payload: { id: string; name: string } }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_ONLINE_USERS'; payload: User[] }
  | { type: 'SET_DM_HISTORY'; payload: { userId: string; messages: DirectMessage[] } }
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
      return { ...state, currentUser: action.payload, isAuthenticated: !!action.payload };
    case 'SET_ROOMS':
      return { ...state, rooms: action.payload };
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
    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };
    case 'SET_DM_HISTORY':
      return {
        ...state,
        dmConversations: {
          ...state.dmConversations,
          [action.payload.userId]: action.payload.messages,
        },
      };
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

interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  signup: (email: string, username: string, passwordRaw: string, avatar: string) => Promise<void>;
  login: (email: string, passwordRaw: string) => Promise<void>;
  logout: () => Promise<void>;
  sendMessage: (content: string, type?: 'text' | 'image' | 'file', fileName?: string, fileSize?: number, fileUrl?: string) => Promise<void>;
  joinRoom: (roomId: string, roomName: string) => void;
  createRoom: (name: string, description: string) => Promise<void>;
  sendDM: (receiverId: string, content: string, type?: 'text' | 'image' | 'file', fileName?: string, fileSize?: number, fileUrl?: string) => Promise<void>;
  openDM: (user: User) => void;
  startTyping: () => void;
  stopTyping: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const privateKeyRef = useRef<CryptoKey | null>(null);
  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          dispatch({ type: 'SET_USER', payload: userData });
          // Set online
          await updateDoc(doc(db, 'users', firebaseUser.uid), { isOnline: true, lastSeen: new Date().toISOString() });
        }
      } else {
        if (stateRef.current.currentUser) {
          await updateDoc(doc(db, 'users', stateRef.current.currentUser.id), { isOnline: false, lastSeen: new Date().toISOString() }).catch(() => {});
        }
        dispatch({ type: 'SET_USER', payload: null });
        privateKeyRef.current = null;
      }
    });
    return () => unsubscribe();
  }, []);

  // Set offline on window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (stateRef.current.currentUser) {
        updateDoc(doc(db, 'users', stateRef.current.currentUser.id), { isOnline: false, lastSeen: new Date().toISOString() }).catch((err) => {
          console.error('Failed to update offline status:', err);
        });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Listeners (Rooms, Online Users)
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const qRooms = query(collection(db, 'rooms'), orderBy('createdAt', 'asc'));
    const unsubRooms = onSnapshot(qRooms, (snapshot) => {
      const rooms: Room[] = [];
      snapshot.forEach(doc => rooms.push({ id: doc.id, ...doc.data() } as Room));
      
      // If no rooms exist yet, we might want to create a default one, 
      // but let's assume one is created from the console or earlier.
      dispatch({ type: 'SET_ROOMS', payload: rooms });
    });

    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const users: User[] = [];
      snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() } as User));
      dispatch({ type: 'SET_ONLINE_USERS', payload: users });
    });

    return () => {
      unsubRooms();
      unsubUsers();
    };
  }, [state.isAuthenticated]);

  // Messages Listener for Active Room
  useEffect(() => {
    if (!state.isAuthenticated || state.chatMode !== 'room' || !state.activeRoom) return;

    const qMessages = query(
      collection(db, 'messages'),
      where('roomId', '==', state.activeRoom),
      orderBy('createdAt', 'asc')
    );

    const unsubMessages = onSnapshot(qMessages, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() } as Message));
      dispatch({ type: 'SET_MESSAGES', payload: msgs });
    });

    return () => unsubMessages();
  }, [state.isAuthenticated, state.chatMode, state.activeRoom]);

  // DMs Listener
  useEffect(() => {
    if (!state.isAuthenticated || !state.currentUser || !privateKeyRef.current) return;

    const qDMs = query(
      collection(db, 'directMessages'),
      or(
        where('receiverId', '==', state.currentUser.id),
        where('senderId', '==', state.currentUser.id)
      ),
      orderBy('createdAt', 'asc')
    );

    const unsubDMs = onSnapshot(qDMs, async (snapshot) => {
      const allDMs: DirectMessage[] = [];
      snapshot.forEach(doc => allDMs.push({ id: doc.id, ...doc.data() } as DirectMessage));

      const privKey = privateKeyRef.current;
      const me = stateRef.current.currentUser?.id;
      
      const decryptedMessages = await Promise.all(allDMs.map(async (dm) => {
        let decryptedContent = dm.content;
        if (privKey && dm.senderEncryptedKey && dm.receiverEncryptedKey && dm.iv) {
          try {
            const isSender = dm.senderId === me;
            const keyToUse = isSender ? dm.senderEncryptedKey : dm.receiverEncryptedKey;
            decryptedContent = await decryptMessage(dm.content, keyToUse, dm.iv, privKey);
          } catch (err) {
            console.error("Failed to decrypt DM", err);
          }
        }
        return { ...dm, content: decryptedContent };
      }));

      const dmMap: Record<string, DirectMessage[]> = {};
      decryptedMessages.forEach(dm => {
        const otherUser = dm.senderId === me ? dm.receiverId : dm.senderId;
        if (!dmMap[otherUser]) dmMap[otherUser] = [];
        dmMap[otherUser].push(dm);
      });

      if (stateRef.current.activeDMUser) {
        dispatch({ type: 'SET_DM_HISTORY', payload: { userId: stateRef.current.activeDMUser.id, messages: dmMap[stateRef.current.activeDMUser.id] || [] } });
      }
    });

    return () => unsubDMs();
  }, [state.isAuthenticated, state.currentUser]); 

  useEffect(() => {
    if (state.chatMode === 'dm' && state.activeDMUser) {
      const fetchDMs = async () => {
        if (!state.currentUser || !privateKeyRef.current) return;
        const qDMs = query(
          collection(db, 'directMessages'),
          or(
            where('receiverId', '==', state.currentUser.id),
            where('senderId', '==', state.currentUser.id)
          ),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(qDMs);
        const allDMs: DirectMessage[] = [];
        snap.forEach(doc => allDMs.push({ id: doc.id, ...doc.data() } as DirectMessage));

        const privKey = privateKeyRef.current;
        const me = state.currentUser.id;
        
        const decryptedMessages = await Promise.all(allDMs.map(async (dm) => {
          let decryptedContent = dm.content;
          if (privKey && dm.senderEncryptedKey && dm.receiverEncryptedKey && dm.iv) {
            try {
              const isSender = dm.senderId === me;
              const keyToUse = isSender ? dm.senderEncryptedKey : dm.receiverEncryptedKey;
              decryptedContent = await decryptMessage(dm.content, keyToUse, dm.iv, privKey);
            } catch (err) {
              console.error("Failed to decrypt DM", err);
            }
          }
          return { ...dm, content: decryptedContent };
        }));

        const myDMs = decryptedMessages.filter(dm => dm.senderId === state.activeDMUser!.id || dm.receiverId === state.activeDMUser!.id);
        dispatch({ type: 'SET_DM_HISTORY', payload: { userId: state.activeDMUser!.id, messages: myDMs } });
      };
      fetchDMs();
    }
  }, [state.chatMode, state.activeDMUser, state.currentUser]);


  // Actions
  const signup = useCallback(async (email: string, username: string, passwordRaw: string, avatar: string) => {
    const keyPair = await generateRSAKeyPair();
    const publicKeyStr = await exportPublicKey(keyPair.publicKey);
    const pwdKey = await deriveKeyFromPassword(passwordRaw, email);
    const encryptedPrivKeyStr = await encryptPrivateKey(keyPair.privateKey, pwdKey);

    const userCredential = await createUserWithEmailAndPassword(auth, email, passwordRaw);
    const uid = userCredential.user.uid;

    const user: User = {
      id: uid,
      email,
      username,
      avatar,
      publicKey: publicKeyStr,
      isOnline: true,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', uid), {
      ...user,
      encryptedPrivateKey: encryptedPrivKeyStr
    });

    privateKeyRef.current = keyPair.privateKey;
    dispatch({ type: 'SET_USER', payload: user });
  }, []);

  const login = useCallback(async (email: string, passwordRaw: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, passwordRaw);
    const uid = userCredential.user.uid;

    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) throw new Error('User data not found');
    
    const userData = userDoc.data();
    
    const pwdKey = await deriveKeyFromPassword(passwordRaw, email);
    const privateKey = await decryptPrivateKey(userData.encryptedPrivateKey, pwdKey);
    privateKeyRef.current = privateKey;

    const user: User = {
      id: userData.id,
      email: userData.email,
      username: userData.username,
      avatar: userData.avatar,
      isOnline: true,
      lastSeen: new Date().toISOString(),
      createdAt: userData.createdAt,
      publicKey: userData.publicKey
    };

    await updateDoc(doc(db, 'users', uid), { isOnline: true, lastSeen: new Date().toISOString() });
    dispatch({ type: 'SET_USER', payload: user });
  }, []);

  const logout = useCallback(async () => {
    if (stateRef.current.currentUser) {
      await updateDoc(doc(db, 'users', stateRef.current.currentUser.id), { isOnline: false, lastSeen: new Date().toISOString() });
    }
    await signOut(auth);
  }, []);

  const sendMessage = useCallback(async (content: string, type: 'text' | 'image' | 'file' = 'text', fileName?: string, fileSize?: number, fileUrl?: string) => {
    const current = stateRef.current;
    if (!current.activeRoom || !current.currentUser) return;
    
    const msg: Omit<Message, 'id'> = {
      roomId: current.activeRoom,
      senderId: current.currentUser.id,
      senderName: current.currentUser.username,
      senderAvatar: current.currentUser.avatar,
      content,
      type,
      fileName,
      fileSize,
      fileUrl,
      createdAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'messages'), msg);
  }, []);

  const joinRoom = useCallback((roomId: string, roomName: string) => {
    dispatch({ type: 'SET_ACTIVE_ROOM', payload: { id: roomId, name: roomName } });
  }, []);

  const createRoom = useCallback(async (name: string, description: string) => {
    const current = stateRef.current;
    if (!current.currentUser) return;
    
    const room: Omit<Room, 'id'> = {
      name,
      description,
      createdBy: current.currentUser.id,
      createdAt: new Date().toISOString(),
      isDefault: false
    };
    
    await addDoc(collection(db, 'rooms'), room);
  }, []);

  const sendDM = useCallback(async (receiverId: string, content: string, type: 'text' | 'image' | 'file' = 'text', fileName?: string, fileSize?: number, fileUrl?: string) => {
    const current = stateRef.current;
    if (!privateKeyRef.current || !current.currentUser?.publicKey) return;
    
    const receiver = current.onlineUsers.find(u => u.id === receiverId);
    if (!receiver || !receiver.publicKey) return;
    
    try {
      const encrypted = await encryptMessage(content, receiver.publicKey, current.currentUser.publicKey);
      
      const dm: Omit<DirectMessage, 'id'> = {
        senderId: current.currentUser.id,
        senderName: current.currentUser.username,
        senderAvatar: current.currentUser.avatar,
        receiverId,
        receiverName: receiver.username,
        content: encrypted.content,
        senderEncryptedKey: encrypted.senderEncryptedKey,
        receiverEncryptedKey: encrypted.receiverEncryptedKey,
        iv: encrypted.iv,
        type,
        fileName,
        fileSize,
        fileUrl,
        read: false,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'directMessages'), dm);
    } catch (err) {
      console.error("Encryption failed", err);
    }
  }, []);

  const openDM = useCallback((user: User) => {
    dispatch({ type: 'SET_ACTIVE_DM_USER', payload: user });
    dispatch({ type: 'CLEAR_UNREAD_DM', payload: user.id });
  }, []);

  const startTyping = useCallback(() => {}, []);
  const stopTyping = useCallback(() => {}, []);

  return (
    <ChatContext.Provider
      value={{
        state, dispatch, signup, login, logout, sendMessage, joinRoom, createRoom, sendDM, openDM, startTyping, stopTyping
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
}
