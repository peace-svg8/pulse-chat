// =============================================
// JSON File-based Database (zero native deps)
// =============================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import type { User, Room, Message, DirectMessage } from '../types/index.js';

export interface DBUser extends User {
  passwordHash: string;
  salt: string;
  encryptedPrivateKey: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_DIR = path.join(__dirname, '..', '..', 'data');
const DB_PATH = path.join(DB_DIR, 'chat.json');

interface Database {
  users: DBUser[];
  rooms: Room[];
  messages: Message[];
  directMessages: DirectMessage[];
}

const DEFAULT_ROOMS: Room[] = [
  {
    id: 'room-general',
    name: 'General',
    description: 'General discussion for everyone',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    isDefault: true,
  },
  {
    id: 'room-random',
    name: 'Random',
    description: 'Off-topic conversations and fun stuff',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    isDefault: true,
  },
  {
    id: 'room-tech',
    name: 'Tech Talk',
    description: 'Discuss programming, tech news, and more',
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    isDefault: true,
  },
];

let db: Database = {
  users: [],
  rooms: [...DEFAULT_ROOMS],
  messages: [],
  directMessages: [],
};

function save(): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

function load(): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      db = JSON.parse(raw);
    } else {
      save();
    }
  } catch (err) {
    console.error('Failed to load database, using defaults:', err);
    save();
  }
}

// Initialize
export function initDB(): void {
  load();
  console.log(
    `📦 Database loaded: ${db.users.length} users, ${db.rooms.length} rooms, ${db.messages.length} messages`
  );
}

// ---- Users ----
function stripUser(user: DBUser): User {
  const { passwordHash, salt, encryptedPrivateKey, ...publicUser } = user;
  return publicUser;
}

export function createUser(
  email: string,
  username: string,
  passwordRaw: string,
  avatar: string,
  publicKey: string,
  encryptedPrivateKey: string
): DBUser | null {
  if (db.users.find((u) => u.username === username || u.email === email)) return null;

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.scryptSync(passwordRaw, salt, 64).toString('hex');

  const user: DBUser = {
    id: uuidv4(),
    email,
    username,
    avatar,
    isOnline: true,
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    publicKey,
    passwordHash,
    salt,
    encryptedPrivateKey,
  };
  db.users.push(user);
  save();
  return user;
}

export function verifyUser(email: string, passwordRaw: string): DBUser | null {
  const user = db.users.find((u) => u.email === email);
  if (!user) return null;

  const hash = crypto.scryptSync(passwordRaw, user.salt, 64).toString('hex');
  if (hash === user.passwordHash) {
    return user;
  }
  return null;
}

export function getUser(id: string): User | undefined {
  const user = db.users.find((u) => u.id === id);
  return user ? stripUser(user) : undefined;
}

export function setUserOnline(id: string, online: boolean): void {
  const user = db.users.find((u) => u.id === id);
  if (user) {
    user.isOnline = online;
    user.lastSeen = new Date().toISOString();
    save();
  }
}

export function getOnlineUsers(): User[] {
  return db.users.filter((u) => u.isOnline).map(stripUser);
}

export function getAllUsers(): User[] {
  return db.users.map(stripUser);
}

// ---- Rooms ----
export function getRooms(): Room[] {
  return db.rooms;
}

export function getRoom(id: string): Room | undefined {
  return db.rooms.find((r) => r.id === id);
}

export function createRoom(name: string, description: string, createdBy: string): Room {
  const room: Room = {
    id: `room-${uuidv4().slice(0, 8)}`,
    name,
    description,
    createdBy,
    createdAt: new Date().toISOString(),
    isDefault: false,
  };
  db.rooms.push(room);
  save();
  return room;
}

// ---- Messages ----
export function createMessage(
  roomId: string,
  senderId: string,
  senderName: string,
  senderAvatar: string,
  content: string,
  type: 'text' | 'image' | 'file' | 'system' = 'text',
  fileName?: string,
  fileSize?: number,
  fileUrl?: string
): Message {
  const message: Message = {
    id: uuidv4(),
    roomId,
    senderId,
    senderName,
    senderAvatar,
    content,
    type,
    fileName,
    fileSize,
    fileUrl,
    createdAt: new Date().toISOString(),
  };
  db.messages.push(message);
  save();
  return message;
}

export function getMessages(roomId: string, limit = 50): Message[] {
  const roomMessages = db.messages.filter((m) => m.roomId === roomId);
  return roomMessages.slice(-limit);
}

// ---- Direct Messages ----
export function createDM(
  senderId: string,
  senderName: string,
  senderAvatar: string,
  receiverId: string,
  receiverName: string,
  content: string, // encrypted content
  senderEncryptedKey?: string,
  receiverEncryptedKey?: string,
  iv?: string,
  type: 'text' | 'image' | 'file' = 'text',
  fileName?: string,
  fileSize?: number,
  fileUrl?: string
): DirectMessage {
  const dm: DirectMessage = {
    id: uuidv4(),
    senderId,
    senderName,
    senderAvatar,
    receiverId,
    receiverName,
    content,
    senderEncryptedKey,
    receiverEncryptedKey,
    iv,
    type,
    fileName,
    fileSize,
    fileUrl,
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.directMessages.push(dm);
  save();
  return dm;
}

export function getDMs(userId1: string, userId2: string, limit = 50): DirectMessage[] {
  const conversation = db.directMessages.filter(
    (dm) =>
      (dm.senderId === userId1 && dm.receiverId === userId2) ||
      (dm.senderId === userId2 && dm.receiverId === userId1)
  );
  return conversation.slice(-limit);
}

export function markDMsRead(senderId: string, receiverId: string): void {
  db.directMessages.forEach((dm) => {
    if (dm.senderId === senderId && dm.receiverId === receiverId) {
      dm.read = true;
    }
  });
  save();
}
