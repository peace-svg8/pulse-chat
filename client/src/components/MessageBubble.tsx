import { useState } from 'react';
import { useChat } from '../context/ChatContext';
import type { Message, DirectMessage } from '../context/ChatContext';

interface Props {
  message: Message | DirectMessage;
  isDM?: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export default function MessageBubble({ message, isDM = false }: Props) {
  const { state, editMessage, deleteMessage } = useChat();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isOwn = message.senderId === state.currentUser?.id;
  const isSystem = 'type' in message && (message as Message).type === 'system';

  if (isSystem) {
    return (
      <div className="message-wrapper system">
        <div className="message-bubble system-msg">
          <p className="message-content">{message.content}</p>
        </div>
      </div>
    );
  }

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      editMessage(message.id, isDM, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  return (
    <div className={`message-wrapper ${isOwn ? 'own' : ''}`}>
      {!isOwn && (
        <div className="message-avatar">{message.senderAvatar}</div>
      )}
      <div className="message-content-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        
        {isOwn && !isEditing && (
          <div className="message-actions" style={{
            marginRight: '8px',
            display: 'flex',
            gap: '4px',
            opacity: 0,
            transition: 'opacity 0.2s'
          }}>
            <button onClick={() => setIsEditing(true)} title="Edit" style={{ background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '12px' }}>✏️</button>
            <button onClick={() => deleteMessage(message.id, isDM)} title="Delete" style={{ background: 'rgba(0,0,0,0.3)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
          </div>
        )}

        <div className="message-bubble">
          {!isOwn && (
            <p className="message-sender">{message.senderName}</p>
          )}
          
          {message.type === 'image' && message.fileUrl && (
            <img
              className="message-image"
              src={`${SERVER}${message.fileUrl}`}
              alt={message.fileName || 'Image'}
              loading="lazy"
            />
          )}
          
          {message.type === 'file' && message.fileUrl && (
            <a
              className="message-file"
              href={`${SERVER}${message.fileUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="message-file-icon">📄</span>
              <div className="message-file-info">
                <p className="message-file-name">{message.fileName}</p>
                <p className="message-file-size">{formatFileSize(message.fileSize)}</p>
              </div>
              <span style={{ fontSize: '14px', color: 'var(--accent-primary)' }}>⬇</span>
            </a>
          )}
          
          {message.type !== 'image' && (
            isEditing ? (
              <div className="message-edit-mode" style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                <textarea 
                  value={editContent} 
                  onChange={(e) => setEditContent(e.target.value)}
                  className="chat-input"
                  style={{ minHeight: '60px', padding: '8px', borderRadius: '4px', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.1)' }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={handleCancelEdit} style={{ background: 'transparent', color: '#fff', border: '1px solid #555', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handleSaveEdit} style={{ background: 'var(--accent-primary)', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
                </div>
              </div>
            ) : (
              <p className="message-content">{message.content}</p>
            )
          )}

          {!isEditing && (
            <div className="message-meta">
              <span className="message-time">
                {message.edited && <span style={{ fontStyle: 'italic', marginRight: '4px', opacity: 0.8 }}>(edited)</span>}
                {formatTime(message.createdAt)}
                {isDM && isOwn && 'read' in message && (
                  <span style={{ marginLeft: '4px', color: message.read ? '#34B7F1' : '#9ca3af', fontSize: '14px', fontWeight: 'bold' }}>
                    ✓✓
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

      </div>
      {isOwn && (
        <div className="message-avatar">{message.senderAvatar}</div>
      )}
    </div>
  );
}
