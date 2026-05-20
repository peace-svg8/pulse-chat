// =============================================
// Socket.IO Client Instance
// =============================================

import { io, Socket } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
});

// Debug logging
socket.on('connect', () => {
  console.log('✅ Connected to server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('🔥 Connection error:', error.message);
});

export default socket;
