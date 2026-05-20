// =============================================
// AuthScreen — Signup / Login
// =============================================

import { useState } from 'react';
import { useChat } from '../context/ChatContext';
import '../styles/auth.css';

const AVATARS = ['😎', '🦊', '🐱', '🦁', '🐸', '🐼', '🦄', '🐲', '🦅', '🐺'];

export default function AuthScreen() {
  const { signup, login } = useChat();
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedUser = username.trim();
    
    if (!trimmedEmail || !password) {
      setError('Please enter email and password');
      return;
    }
    
    if (!isLogin) {
      if (!trimmedUser) {
        setError('Please enter a username');
        return;
      }
      if (trimmedUser.length < 2 || trimmedUser.length > 20) {
        setError('Username must be between 2 and 20 characters');
        return;
      }
      if (!selectedAvatar) {
        setError('Please pick an avatar');
        return;
      }
    }

    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(trimmedEmail, password);
      } else {
        await signup(trimmedEmail, trimmedUser, password, selectedAvatar);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">💬</div>
          <h1 className="auth-title">PulseChat</h1>
          <p className="auth-subtitle">Real-time messaging, end-to-end encrypted</p>
        </div>        <div className="auth-tabs">
          <button className={`auth-tab ${!isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(false); setError(''); }}>Sign Up</button>
          <button className={`auth-tab ${isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(true); setError(''); }}>Log In</button>
        </div>

        <label className="auth-label">Email</label>
        <div className="auth-input-wrapper">
          <input
            className="auth-input"
            type="email"
            placeholder="Enter your email..."
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        {!isLogin && (
          <>
            <label className="auth-label">Username</label>
            <div className="auth-input-wrapper">
              <input
                className="auth-input"
                type="text"
                placeholder="Enter your username..."
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                maxLength={20}
              />
            </div>
          </>
        )}

        <label className="auth-label">Password</label>
        <div className="auth-input-wrapper password-wrapper">
          <input
            className="auth-input password-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password..."
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            style={{ fontSize: '12px', fontWeight: 'bold' }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>        {!isLogin && (
          <div className="avatar-section">
            <label className="auth-label">Pick an avatar</label>
            <div className="avatar-grid">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  className={`avatar-option ${selectedAvatar === avatar ? 'selected' : ''}`}
                  onClick={() => { setSelectedAvatar(avatar); setError(''); }}
                  type="button"
                >
                  {avatar}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button
          className="auth-btn"
          onClick={handleSubmit}
          disabled={isLoading || !email.trim() || !password || (!isLogin && (!username.trim() || !selectedAvatar))}
        >
          {isLoading ? 'Processing...' : isLogin ? '🔓 Log In' : '🚀 Join Chat'}
        </button>
      </div>
    </div>
  );
}
