import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppStore } from '../hooks/useAppState.js';

interface LogsProps {
  onNavigate: (screen: 'dashboard' | 'sessions' | 'session-detail' | 'logs' | 'settings') => void;
}

export default function Logs({ onNavigate }: LogsProps) {
  const { logs, refreshStatus } = useAppStore();
  const [filter, setFilter] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  
  const PAGE_SIZE = 20;
  
  const filteredLogs = filter 
    ? logs.filter(l => l.type === filter)
    : logs;
  
  const visibleLogs = filteredLogs.slice(offset, offset + PAGE_SIZE);

  useInput((input, key) => {
    if (input === 'r') refreshStatus();
    if (input === 'a') setFilter(null);
    if (input === 'i') setFilter('info');
    if (input === 'e') setFilter('error');
    if (input === 'c') setFilter('action');
    
    if (key.upArrow || input === 'k') {
      setOffset(prev => Math.max(0, prev - 1));
    }
    if (key.downArrow || input === 'j') {
      setOffset(prev => Math.min(filteredLogs.length - PAGE_SIZE, prev + 1));
    }
    if (key.pageUp) {
      setOffset(prev => Math.max(0, prev - PAGE_SIZE));
    }
    if (key.pageDown) {
      setOffset(prev => Math.min(filteredLogs.length - PAGE_SIZE, prev + PAGE_SIZE));
    }
  });

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'red';
      case 'action': return 'green';
      case 'skip': return 'yellow';
      default: return 'white';
    }
  };

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text bold>Logs</Text>
        <Text dimColor> ({filteredLogs.length} entries)</Text>
        <Box flexGrow={1} />
        <Text dimColor>
          Filter: [A]ll [I]nfo [E]rror a[C]tion │ [R]efresh │ ↑↓/jk: Scroll
        </Text>
      </Box>

      <Box gap={2}>
        <Text color={!filter ? 'cyan' : 'white'}>All</Text>
        <Text color={filter === 'info' ? 'cyan' : 'white'}>Info</Text>
        <Text color={filter === 'error' ? 'cyan' : 'white'}>Error</Text>
        <Text color={filter === 'action' ? 'cyan' : 'white'}>Action</Text>
      </Box>

      <Box borderStyle="single" flexDirection="column" paddingX={1} flexGrow={1}>
        {visibleLogs.length === 0 ? (
          <Text dimColor>No logs matching filter</Text>
        ) : (
          visibleLogs.map((log, i) => (
            <Box key={log.id || i} gap={1}>
              <Text dimColor>{new Date(log.createdAt).toLocaleTimeString()}</Text>
              <Text color={getLogColor(log.type)}>
                [{log.type.toUpperCase().padEnd(6)}]
              </Text>
              <Text dimColor>[{log.sessionId.slice(0, 8)}]</Text>
              <Text>{log.message}</Text>
            </Box>
          ))
        )}
      </Box>

      <Box>
        <Text dimColor>
          Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
        </Text>
      </Box>
    </Box>
  );
}
