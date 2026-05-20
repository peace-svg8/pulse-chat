// =============================================
// ChatWindow — Messages Area + Input
// =============================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { useChat } from '../context/ChatContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import type { Message, DirectMessage } from '../context/ChatContext';
import '../styles/chat.css';

function getDateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function ChatWindow() {
  const { state } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showEmoji, setShowEmoji] = useState(false);

  const isDM = state.chatMode === 'dm';
  const messages: (Message | DirectMessage)[] = isDM && state.activeDMUser
    ? (state.dmConversations[state.activeDMUser.id] || [])
    : state.messages;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleEmojiToggle = useCallback(() => {
    setShowEmoji((prev) => !prev);
  }, []);

  const handleEmojiSelect = useCallback((emojiData: any) => {
    if ((window as any).__insertEmoji) {
      (window as any).__insertEmoji(emojiData.native);
    }
    setShowEmoji(false);
  }, []);

  // Group messages by date
  const renderMessages = () => {
    let lastDate = '';
    const elements: React.ReactNode[] = [];

    messages.forEach((msg, index) => {
      const dateLabel = getDateLabel(msg.createdAt);
      if (dateLabel !== lastDate) {
        lastDate = dateLabel;
        elements.push(
          <div className="date-separator" key={`date-${index}`}>
            <span>{dateLabel}</span>
          </div>
        );
      }
      elements.push(
        <MessageBubble key={msg.id} message={msg} isDM={isDM} />
      );
    });

    return elements;
  };

  const headerInfo = isDM && state.activeDMUser
    ? { icon: state.activeDMUser.avatar, title: state.activeDMUser.username, subtitle: 'Direct Message' }
    : { icon: '#', title: state.activeRoomName, subtitle: `${state.onlineUsers.length} online` };

  return (
    <div className="chat-main">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-header-icon">{headerInfo.icon}</div>
          <div className="chat-header-text">
            <h2>{headerInfo.title}</h2>
            <p>{headerInfo.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="chat-empty-icon">💬</div>
            <h3>No messages yet</h3>
            <p>Be the first to send a message{isDM ? ` to ${state.activeDMUser?.username}` : ` in #${state.activeRoomName}`}!</p>
          </div>
        ) : (
          renderMessages()
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing indicator */}
      <div className="typing-indicator">
        {state.typingUsers.length > 0 && (
          <div className="typing-text">
            <span className="typing-dots">
              <span /><span /><span />
            </span>
            {state.typingUsers.map((u) => u.username).join(', ')} {state.typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{ position: 'relative' }}>
        {showEmoji && (
          <div className="emoji-picker-wrapper">
            <EmojiPicker onSelect={handleEmojiSelect} />
          </div>
        )}
        <MessageInput onEmojiToggle={handleEmojiToggle} showEmoji={showEmoji} />
      </div>
    </div>
  );
}

// Simple emoji grid (fallback - no external dependency needed)
function EmojiPicker({ onSelect }: { onSelect: (data: { native: string }) => void }) {
  const emojis = [
    '😀','😂','🤣','😍','🥰','😎','🤩','😜','🤔','🤗',
    '😭','😤','🥺','😴','🤮','🥳','😇','🤯','🫡','😈',
    '👍','👎','👏','🙌','💪','🤝','✌️','🤞','❤️','🔥',
    '⭐','🎉','🎊','💯','✅','❌','⚡','💡','🚀','🎯',
    '🌟','💎','🏆','🎵','📸','💻','🎮','☕','🍕','🌈',
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(10, 1fr)',
      gap: '2px',
      padding: '12px',
      background: 'rgba(15, 15, 50, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)',
      maxWidth: '340px',
      boxShadow: 'var(--shadow-lg)',
    }}>
      {emojis.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect({ native: emoji })}
          style={{
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            borderRadius: '4px',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
