import { useState } from 'react';
import { useChat } from '../context/ChatContext';
import '../styles/auth.css';

export default function UnlockScreen() {
  const { state, unlock, logout } = useChat();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await unlock(password);
    } catch (err: any) {
      setError(err.message || 'Incorrect password or decryption failed');
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
          <div className="auth-logo-icon">🔒</div>
          <h1 className="auth-title">Welcome Back, {state.currentUser?.username}</h1>
          <p className="auth-subtitle">Unlock your private key to read and send messages</p>
        </div>

        <label className="auth-label">Password</label>
        <div className="auth-input-wrapper password-wrapper">
          <input
            className="auth-input password-input"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password..."
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            autoFocus
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
        </div>

        {error && <p className="auth-error">{error}</p>}

        <button
          className="auth-btn"
          onClick={handleSubmit}
          disabled={isLoading || !password}
        >
          {isLoading ? 'Unlocking...' : '🔓 Unlock'}
        </button>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button 
            onClick={logout} 
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}
          >
            Switch Account
          </button>
        </div>
      </div>
    </div>
  );
}
