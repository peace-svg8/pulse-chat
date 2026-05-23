// =============================================
// App — Root Component
// =============================================

import { ChatProvider, useChat } from './context/ChatContext';
import AuthScreen from './components/AuthScreen';
import UnlockScreen from './components/UnlockScreen';
import ChatLayout from './components/ChatLayout';
import './index.css';
import './styles/auth.css';
import './styles/layout.css';
import './styles/sidebar.css';
import './styles/chat.css';
import './styles/components.css';

function AppContent() {
  const { state } = useChat();

  if (!state.isAuthenticated) {
    return <AuthScreen />;
  }

  if (state.isLocked) {
    return <UnlockScreen />;
  }

  return <ChatLayout />;
}

function App() {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
}

export default App;
