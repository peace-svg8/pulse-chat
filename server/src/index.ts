// =============================================
// Express + Socket.IO Server Entry Point
// =============================================

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { initDB } from './db/database.js';
import { registerHandlers } from './socket/handlers.js';
import type { ClientToServerEvents, ServerToClientEvents } from './types/index.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.CLIENT_URL 
  ? [process.env.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173']
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

// CORS for Vite dev server
app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  })
);

app.use(express.json());

// ---- File Upload Setup ----
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    name: req.file.originalname,
    size: req.file.size,
  });
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- Socket.IO Setup ----
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 10 * 1024 * 1024, // 10MB
});

io.on('connection', (socket) => {
  registerHandlers(io, socket);
});

// ---- Initialize & Start ----
const PORT = process.env.PORT || 3001;

initDB();

httpServer.listen(PORT, () => {
  console.log(`\n🚀 Chat server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
  console.log(`📁 File uploads: ${UPLOADS_DIR}\n`);
});
