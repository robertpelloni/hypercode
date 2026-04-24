import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import { useAppStore } from '../hooks/useAppState.js';

interface DashboardProps {
  onNavigate: (screen: 'dashboard' | 'sessions' | 'logs' | 'settings') => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { stats, isConnected, daemonStatus, fetchStatus } = useAppStore();

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>System Status</Text>
      </Box>

      <Box flexDirection="row" gap={4} marginBottom={1}>
        <Box borderStyle="round" borderColor="cyan" paddingX={1} minWidth={20}>
          <Text>API Server: </Text>
          <Text color={isConnected ? 'green' : 'red'}>{isConnected ? 'ONLINE' : 'OFFLINE'}</Text>
        </Box>
        
        <Box borderStyle="round" borderColor="purple" paddingX={1} minWidth={20}>
          <Text>Daemon: </Text>
          <Text color={daemonStatus?.isEnabled ? 'green' : 'yellow'}>
            {daemonStatus?.isEnabled ? 'RUNNING' : 'STOPPED'}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" borderStyle="single" paddingX={1} marginBottom={1}>
        <Text bold color="yellow">Active Sessions</Text>
        <Text>Total: {stats.totalSessions}</Text>
        <Text>Active: {stats.activeSessions}</Text>
        <Text>Pending: {stats.awaitingApproval}</Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        <Text bold color="blue">Recent Logs</Text>
        <Box flexDirection="column" marginTop={1}>
          {!daemonStatus?.logs || daemonStatus.logs.length === 0 ? (
            <Text dimColor>No logs available.</Text>
          ) : (
            daemonStatus.logs.slice(0, 5).map((log: any, idx: number) => (
              <Box key={idx} gap={1}>
                <Text color="gray">{new Date(log.createdAt).toLocaleTimeString()}</Text>
                <Text color={log.type === 'error' ? 'red' : 'white'} bold>[{log.type.toUpperCase()}]</Text>
                <Text truncate>{log.message}</Text>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
}
