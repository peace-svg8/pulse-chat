// =============================================
// Socket.IO Event Constants
// =============================================

export const EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  // User events
  USER_JOIN: 'user:join',
  USER_JOINED: 'user:joined',
  USER_LEFT: 'user:left',
  USER_ONLINE_LIST: 'user:online-list',

  // Message events
  MESSAGE_SEND: 'message:send',
  MESSAGE_NEW: 'message:new',
  MESSAGE_HISTORY: 'message:history',
  MESSAGE_GET_HISTORY: 'message:get-history',

  // Room events
  ROOM_JOIN: 'room:join',
  ROOM_LEAVE: 'room:leave',
  ROOM_CREATE: 'room:create',
  ROOM_CREATED: 'room:created',
  ROOM_LIST: 'room:list',
  ROOM_GET_LIST: 'room:get-list',

  // Typing events
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  TYPING_UPDATE: 'typing:update',

  // Direct message events
  DM_SEND: 'dm:send',
  DM_NEW: 'dm:new',
  DM_HISTORY: 'dm:history',
  DM_GET_HISTORY: 'dm:get-history',

  // Error
  ERROR: 'error',
} as const;
