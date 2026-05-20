// =============================================
// Socket.IO Event Handlers
// =============================================

import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SendMessageData,
  SendDMData,
  SignupData,
  LoginData,
} from '../types/index.js';
import {
  createUser,
  getUser,
  setUserOnline,
  getOnlineUsers,
  getAllUsers,
  getRooms,
  createRoom,
  createMessage,
  getMessages,
  createDM,
  getDMs,
  verifyUser,
} from '../db/database.js';

type ChatSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type ChatServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Map socket.id -> userId
const socketToUser = new Map<string, string>();

export function registerHandlers(io: ChatServer, socket: ChatSocket): void {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ---- Auth & Join ----
  socket.on('auth:signup', (data: SignupData, callback) => {
    const dbUser = createUser(data.email, data.username, data.passwordRaw, data.avatar, data.publicKey, data.encryptedPrivateKey);
    if (!dbUser) {
      return callback({ success: false, error: 'Email or Username already taken.' });
    }
    
    socketToUser.set(socket.id, dbUser.id);
    
    const publicUser = getUser(dbUser.id);
    if (!publicUser) return callback({ success: false, error: 'Internal error' });

    socket.broadcast.emit('user:joined', publicUser);
    io.emit('user:online-list', getOnlineUsers());
    socket.emit('room:list', getRooms());
    socket.join('room-general');
    socket.emit('message:history', getMessages('room-general'));

    const sysMsg = createMessage('room-general', 'system', 'System', '', `${publicUser.username} joined the chat`, 'system');
    io.to('room-general').emit('message:new', sysMsg);

    callback({
      success: true,
      data: {
        user: publicUser,
        encryptedPrivateKey: dbUser.encryptedPrivateKey
      }
    });
  });

  socket.on('auth:login', (data: LoginData, callback) => {
    const dbUser = verifyUser(data.email, data.passwordRaw);
    if (!dbUser) {
      return callback({ success: false, error: 'Invalid email or password' });
    }
    
    socketToUser.set(socket.id, dbUser.id);
    setUserOnline(dbUser.id, true);

    const publicUser = getUser(dbUser.id);
    if (!publicUser) return callback({ success: false, error: 'Internal error' });

    socket.broadcast.emit('user:joined', publicUser);
    io.emit('user:online-list', getOnlineUsers());
    socket.emit('room:list', getRooms());
    socket.join('room-general');
    socket.emit('message:history', getMessages('room-general'));

    const sysMsg = createMessage('room-general', 'system', 'System', '', `${publicUser.username} joined the chat`, 'system');
    io.to('room-general').emit('message:new', sysMsg);

    callback({
      success: true,
      data: {
        user: publicUser,
        encryptedPrivateKey: dbUser.encryptedPrivateKey
      }
    });
  });

  // ---- Room Events ----
  socket.on('room:join', (roomId: string) => {
    // Leave all rooms except default socket room
    const rooms = Array.from(socket.rooms);
    rooms.forEach((r) => {
      if (r !== socket.id) {
        socket.leave(r);
      }
    });

    socket.join(roomId);
    socket.emit('message:history', getMessages(roomId));
  });

  socket.on('room:leave', (roomId: string) => {
    socket.leave(roomId);
  });

  socket.on('room:create', (data: { name: string; description: string }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const room = createRoom(data.name, data.description, userId);
    io.emit('room:created', room);
    io.emit('room:list', getRooms());
  });

  socket.on('room:get-list', () => {
    socket.emit('room:list', getRooms());
  });

  // ---- Message Events ----
  socket.on('message:send', (data: SendMessageData) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const user = getUser(userId);
    if (!user) return;

    const message = createMessage(
      data.roomId,
      user.id,
      user.username,
      user.avatar,
      data.content,
      data.type,
      data.fileName,
      data.fileSize,
      data.fileUrl
    );

    io.to(data.roomId).emit('message:new', message);
  });

  socket.on('message:get-history', (roomId: string) => {
    socket.emit('message:history', getMessages(roomId));
  });

  // ---- Typing Events ----
  socket.on('typing:start', (data) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;
    const user = getUser(userId);
    if (!user) return;

    if (data.roomId) {
      socket.to(data.roomId).emit('typing:update', {
        userId: user.id,
        username: user.username,
        roomId: data.roomId,
        isTyping: true,
      });
    } else if (data.receiverId) {
      // Find the receiver's socket
      for (const [sid, uid] of socketToUser.entries()) {
        if (uid === data.receiverId) {
          io.to(sid).emit('typing:update', {
            userId: user.id,
            username: user.username,
            receiverId: data.receiverId,
            isTyping: true,
          });
        }
      }
    }
  });

  socket.on('typing:stop', (data) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;
    const user = getUser(userId);
    if (!user) return;

    if (data.roomId) {
      socket.to(data.roomId).emit('typing:update', {
        userId: user.id,
        username: user.username,
        roomId: data.roomId,
        isTyping: false,
      });
    } else if (data.receiverId) {
      for (const [sid, uid] of socketToUser.entries()) {
        if (uid === data.receiverId) {
          io.to(sid).emit('typing:update', {
            userId: user.id,
            username: user.username,
            receiverId: data.receiverId,
            isTyping: false,
          });
        }
      }
    }
  });

  // ---- Direct Message Events ----
  socket.on('dm:send', (data: SendDMData) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;
    const user = getUser(userId);
    if (!user) return;

    const receiver = getUser(data.receiverId);
    if (!receiver) return;

    const dm = createDM(
      user.id,
      user.username,
      user.avatar,
      data.receiverId,
      receiver.username,
      data.content,
      data.senderEncryptedKey,
      data.receiverEncryptedKey,
      data.iv,
      data.type,
      data.fileName,
      data.fileSize,
      data.fileUrl
    );

    // Send to sender
    socket.emit('dm:new', dm);

    // Send to receiver
    for (const [sid, uid] of socketToUser.entries()) {
      if (uid === data.receiverId) {
        io.to(sid).emit('dm:new', dm);
      }
    }
  });

  socket.on('dm:get-history', (otherUserId: string) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const history = getDMs(userId, otherUserId);
    socket.emit('dm:history', { odm: history, odm_user: otherUserId });
  });

  // ---- Disconnect ----
  socket.on('disconnect', () => {
    const userId = socketToUser.get(socket.id);
    if (userId) {
      const user = getUser(userId);
      setUserOnline(userId, false);
      socketToUser.delete(socket.id);

      socket.broadcast.emit('user:left', userId);
      io.emit('user:online-list', getOnlineUsers());

      if (user) {
        // System message to General
        const sysMsg = createMessage(
          'room-general',
          'system',
          'System',
          '',
          `${user.username} left the chat`,
          'system'
        );
        io.to('room-general').emit('message:new', sysMsg);
      }
    }
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
}
