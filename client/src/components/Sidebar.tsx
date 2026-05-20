// =============================================
// Sidebar — Rooms, DMs, Online Users
// =============================================

import { useChat } from '../context/ChatContext';
import type { User } from '../context/ChatContext';
import '../styles/sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: () => void;
}

export default function Sidebar({ isOpen, onClose, onCreateRoom }: SidebarProps) {
  const { state, joinRoom, openDM, logout } = useChat();
  const { currentUser, rooms, activeRoom, onlineUsers, activeDMUser, chatMode, unreadDMs } = state;

  const handleRoomClick = (roomId: string, roomName: string) => {
    joinRoom(roomId, roomName);
    onClose();
  };

  const handleDMClick = (user: User) => {
    openDM(user);
    onClose();
  };

  // Filter out current user from online list
  const otherOnlineUsers = onlineUsers.filter((u) => u.id !== currentUser?.id);

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'visible' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">💬</div>
            <span className="sidebar-brand-text">PulseChat</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
            ✕
          </button>
        </div>
        <div style={{ padding: '0 20px', marginBottom: '8px' }}>
          {currentUser && (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">{currentUser.avatar}</div>
              <div>
                <div className="sidebar-user-name">{currentUser.username}</div>
                <div className="sidebar-user-status">
                  <span className="status-dot" /> Online
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="sidebar-content">
          {/* Rooms section */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>💬 Rooms</span>
              <button className="sidebar-section-btn" onClick={onCreateRoom} title="Create Room">
                ＋
              </button>
            </div>
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`sidebar-item ${chatMode === 'room' && activeRoom === room.id ? 'active' : ''}`}
                onClick={() => handleRoomClick(room.id, room.name)}
              >
                <span className="sidebar-item-icon">#</span>
                <span className="sidebar-item-name">{room.name}</span>
              </div>
            ))}
          </div>

          {/* Direct Messages section */}
          {otherOnlineUsers.length > 0 && (
            <div className="sidebar-section">
              <div className="sidebar-section-header">
                <span>✉️ Direct Messages</span>
              </div>
              {otherOnlineUsers.map((user) => (
                <div
                  key={user.id}
                  className={`sidebar-item ${chatMode === 'dm' && activeDMUser?.id === user.id ? 'active' : ''}`}
                  onClick={() => handleDMClick(user)}
                >
                  <span className="sidebar-item-icon">{user.avatar}</span>
                  <span className="sidebar-item-name">{user.username}</span>
                  {unreadDMs[user.id] > 0 && (
                    <span className="sidebar-item-badge">{unreadDMs[user.id]}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Online Users section */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>🟢 Online — {otherOnlineUsers.length}</span>
            </div>
            {otherOnlineUsers.length === 0 ? (
              <p style={{ padding: '8px 12px', fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                No other users online
              </p>
            ) : (
              otherOnlineUsers.map((user) => (
                <div key={user.id} className="online-user-item" onClick={() => handleDMClick(user)}>
                  <div className="online-user-avatar">
                    {user.avatar}
                    <span className="status-dot" />
                  </div>
                  <span className="online-user-name">{user.username}</span>
                </div>
              ))
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            Log Out
          </button>
        </div>
      </aside>
    </>
  );
}
