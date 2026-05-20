// =============================================
// ChatLayout — Main Shell
// =============================================

import { useState } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import CreateRoomModal from './CreateRoomModal';
import '../styles/layout.css';

export default function ChatLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  return (
    <div className="chat-layout">
      {/* Mobile menu button */}
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
        ☰
      </button>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onCreateRoom={() => setShowCreateRoom(true)}
      />

      {/* Main chat area */}
      <ChatWindow />

      {/* Create room modal */}
      <CreateRoomModal
        isOpen={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
      />
    </div>
  );
}
