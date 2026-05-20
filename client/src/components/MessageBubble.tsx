// =============================================
// MessageBubble — Individual Message Display
// =============================================

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

export default function MessageBubble({ message, isDM }: Props) {
  const { state } = useChat();
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

  return (
    <div className={`message-wrapper ${isOwn ? 'own' : ''}`}>
      {!isOwn && (
        <div className="message-avatar">{message.senderAvatar}</div>
      )}
      <div>
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
          {message.content && message.type !== 'image' && (
            <p className="message-content">{message.content}</p>
          )}
          <div className="message-meta">
            <span className="message-time">{formatTime(message.createdAt)}</span>
          </div>
        </div>
      </div>
      {isOwn && (
        <div className="message-avatar">{message.senderAvatar}</div>
      )}
    </div>
  );
}
