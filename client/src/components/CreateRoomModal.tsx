// =============================================
// CreateRoomModal
// =============================================

import { useState } from 'react';
import { useChat } from '../context/ChatContext';
import '../styles/components.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateRoomModal({ isOpen, onClose }: Props) {
  const { createRoom } = useChat();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createRoom(trimmed, description.trim());
    setName('');
    setDescription('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Create Room</h2>
        <p className="modal-subtitle">Create a new chat room for your team</p>

        <input
          className="modal-input"
          type="text"
          placeholder="Room name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={30}
          autoFocus
        />
        <input
          className="modal-input"
          type="text"
          placeholder="Description (optional)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={100}
        />

        <div className="modal-actions">
          <button className="modal-btn secondary" onClick={onClose}>Cancel</button>
          <button className="modal-btn primary" onClick={handleCreate} disabled={!name.trim()}>
            Create Room
          </button>
        </div>
      </div>
    </div>
  );
}
