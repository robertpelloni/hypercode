import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppStore } from '../hooks/useAppState.js';

interface SessionListProps {
  onSelect: (sessionId: string) => void;
  onNavigate: (screen: 'dashboard' | 'sessions' | 'session-detail' | 'logs' | 'settings') => void;
}

export default function SessionList({ onSelect, onNavigate }: SessionListProps) {
  const { sessions, refreshSessions } = useAppStore();
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow) {
      setSelectedIndex(prev => Math.min(sessions.length - 1, prev + 1));
    }
    if (key.return && sessions.length > 0) {
      onSelect(sessions[selectedIndex].id);
    }
    if (input === 'r') {
      refreshSessions();
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'paused': return 'yellow';
      case 'completed': return 'cyan';
      case 'failed': return 'red';
      case 'awaiting_approval': return 'magenta';
      default: return 'white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '●';
      case 'paused': return '◐';
      case 'completed': return '✓';
      case 'failed': return '✗';
      case 'awaiting_approval': return '⏳';
      default: return '○';
    }
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text bold>Sessions</Text>
        <Text dimColor> ({sessions.length} total)</Text>
        <Box flexGrow={1} />
        <Text dimColor>[R]efresh │ [Enter]Select</Text>
      </Box>

      <Box borderStyle="single" flexDirection="column" paddingX={1}>
        {sessions.length === 0 ? (
          <Text dimColor>No sessions found. Sessions will appear when the daemon monitors Jules.</Text>
        ) : (
          sessions.map((session, index) => (
            <Box key={session.id} gap={2}>
              <Text color={index === selectedIndex ? 'cyan' : 'white'}>
                {index === selectedIndex ? '→' : ' '}
              </Text>
              <Text color={getStatusColor(session.status)}>
                {getStatusIcon(session.status)}
              </Text>
              <Text color={index === selectedIndex ? 'cyan' : 'white'} bold={index === selectedIndex}>
                {session.title || 'Untitled'}
              </Text>
              <Text dimColor>
                {session.sourceId}
              </Text>
              <Box flexGrow={1} />
              <Text dimColor>
                {new Date(session.updatedAt).toLocaleString()}
              </Text>
            </Box>
          ))
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Status: 
          <Text color="green"> ●Active</Text>
          <Text color="yellow"> ◐Paused</Text>
          <Text color="cyan"> ✓Done</Text>
          <Text color="red"> ✗Failed</Text>
          <Text color="magenta"> ⏳Awaiting</Text>
        </Text>
      </Box>
    </Box>
  );
}
