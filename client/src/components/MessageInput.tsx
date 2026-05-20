// =============================================
// MessageInput — Text + File + Emoji
// =============================================

import { useState, useRef, useCallback } from 'react';
import { useChat } from '../context/ChatContext';

const SERVER = 'http://localhost:3001';

interface Props {
  onEmojiToggle: () => void;
  showEmoji: boolean;
}

export default function MessageInput({ onEmojiToggle, showEmoji }: Props) {
  const { state, sendMessage, sendDM, startTyping, stopTyping } = useChat();
  const [text, setText] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();

    // Upload file if pending
    if (pendingFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', pendingFile);
        const res = await fetch(`${SERVER}/upload`, { method: 'POST', body: formData });
        const data = await res.json();

        const isImage = pendingFile.type.startsWith('image/');
        const type = isImage ? 'image' as const : 'file' as const;

        if (state.chatMode === 'dm' && state.activeDMUser) {
          sendDM(state.activeDMUser.id, trimmed || pendingFile.name, type, data.name, data.size, data.url);
        } else {
          sendMessage(trimmed || pendingFile.name, type, data.name, data.size, data.url);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      }
      setUploading(false);
      setPendingFile(null);
      setText('');
      stopTyping();
      return;
    }

    if (!trimmed) return;

    if (state.chatMode === 'dm' && state.activeDMUser) {
      sendDM(state.activeDMUser.id, trimmed);
    } else {
      sendMessage(trimmed);
    }
    setText('');
    stopTyping();
  }, [text, pendingFile, state.chatMode, state.activeDMUser, sendMessage, sendDM, stopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    startTyping();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('File must be under 10MB');
        return;
      }
      setPendingFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePendingFile = () => setPendingFile(null);

  // Insert emoji into text
  const insertEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
  };

  // Expose insertEmoji globally for emoji picker
  (window as any).__insertEmoji = insertEmoji;

  const placeholder = state.chatMode === 'dm' && state.activeDMUser
    ? `Message ${state.activeDMUser.username}...`
    : `Message #${state.activeRoomName}...`;

  return (
    <div className="chat-input-area">
      {pendingFile && (
        <div className="file-preview">
          <span>{pendingFile.type.startsWith('image/') ? '🖼️' : '📄'}</span>
          <span className="file-preview-name">{pendingFile.name}</span>
          <button className="file-preview-remove" onClick={removePendingFile}>✕</button>
        </div>
      )}
      <div className="chat-input-wrapper">
        <textarea
          className="chat-input"
          placeholder={placeholder}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={uploading}
        />
        <div className="input-actions">
          <button className="input-action-btn" onClick={handleFileClick} title="Attach file">
            📎
          </button>
          <button
            className={`input-action-btn ${showEmoji ? 'active' : ''}`}
            onClick={onEmojiToggle}
            title="Emoji"
          >
            😀
          </button>
          <button
            className="send-btn"
            onClick={handleSend}
            disabled={(!text.trim() && !pendingFile) || uploading}
            title="Send"
          >
            {uploading ? '⏳' : '➤'}
          </button>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
      />
    </div>
  );
}
