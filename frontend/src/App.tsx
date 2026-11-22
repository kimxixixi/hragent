import React, { useState } from 'react';
import { ChatView } from './components/ChatView';
import { Login } from './components/Login';
import { clearAuth, getStoredIdentity } from './services/api';
import type { Identity } from './types/chat';

const App: React.FC = () => {
  const [identity, setIdentity] = useState<Identity | null>(() => getStoredIdentity());

  if (!identity) {
    return <Login onLogin={setIdentity} />;
  }

  return (
    <ChatView
      identity={identity}
      onLogout={() => {
        clearAuth();
        setIdentity(null);
      }}
    />
  );
};

export default App;
