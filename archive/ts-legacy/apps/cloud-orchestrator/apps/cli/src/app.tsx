import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { useAppStore } from './hooks/useAppState.js';
import { useWebSocket } from './hooks/useWebSocket.js';
import Dashboard from './screens/Dashboard.js';
import SessionList from './screens/SessionList.js';
import SessionDetail from './screens/SessionDetail.js';
import Logs from './screens/Logs.js';
import Settings from './screens/Settings.js';

type Screen = 'dashboard' | 'sessions' | 'session-detail' | 'logs' | 'settings';

export default function App() {
  const { exit } = useApp();
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const { isConnected, error, connect } = useAppStore();
  
  const ws = useWebSocket();

  useEffect(() => {
    connect();
  }, []);

  useInput((input, key) => {
    if (input === 'q' || (input === 'c' && key.ctrl)) {
      exit();
      return;
    }

    if (key.ctrl) {
      if (input === '1') setScreen('dashboard');
      if (input === '2') setScreen('sessions');
      if (input === '3') setScreen('logs');
      if (input === '4') setScreen('settings');
    }

    if (key.escape) {
      if (screen === 'session-detail') {
        setScreen('sessions');
        setSelectedSessionId(null);
      } else if (screen !== 'dashboard') {
        setScreen('dashboard');
      }
    }
  });

  const handleSelectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setScreen('session-detail');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'dashboard':
        return <Dashboard onNavigate={setScreen} />;
      case 'sessions':
        return <SessionList onSelect={handleSelectSession} onNavigate={setScreen} />;
      case 'session-detail':
        return selectedSessionId ? (
          <SessionDetail sessionId={selectedSessionId} onBack={() => setScreen('sessions')} />
        ) : (
          <SessionList onSelect={handleSelectSession} onNavigate={setScreen} />
        );
      case 'logs':
        return <Logs onNavigate={setScreen} />;
      case 'settings':
        return <Settings onNavigate={setScreen} />;
      default:
        return <Dashboard onNavigate={setScreen} />;
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="single" paddingX={1} marginBottom={1}>
        <Text bold color="cyan">Jules Autopilot</Text>
        <Text dimColor> │ </Text>
        <Text color={screen === 'dashboard' ? 'green' : 'white'}>[^1]Dashboard</Text>
        <Text dimColor> </Text>
        <Text color={screen === 'sessions' ? 'green' : 'white'}>[^2]Sessions</Text>
        <Text dimColor> </Text>
        <Text color={screen === 'logs' ? 'green' : 'white'}>[^3]Logs</Text>
        <Text dimColor> </Text>
        <Text color={screen === 'settings' ? 'green' : 'white'}>[^4]Settings</Text>
        <Text dimColor> │ </Text>
        <Text dimColor>[Q]uit</Text>
        <Box flexGrow={1} />
        <Text color={isConnected ? 'green' : 'red'}>
          {isConnected ? '● Connected' : '○ Disconnected'}
        </Text>
      </Box>

      {error && (
        <Box borderStyle="round" borderColor="red" paddingX={1} marginBottom={1}>
          <Text color="red">⚠ {error}</Text>
        </Box>
      )}

      <Box flexGrow={1}>
        {renderScreen()}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          ↑↓: Navigate │ Enter: Select │ Esc: Back │ ^1-4: Switch Screen │ Q: Quit
        </Text>
      </Box>
    </Box>
  );
}
