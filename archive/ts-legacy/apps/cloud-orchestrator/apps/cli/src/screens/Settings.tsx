import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppStore } from '../hooks/useAppState.js';
import { APP_VERSION } from '../../../../lib/version';

interface SettingsProps {
  onNavigate: (screen: 'dashboard' | 'sessions' | 'session-detail' | 'logs' | 'settings') => void;
}

export default function Settings({ onNavigate }: SettingsProps) {
  const { daemonStatus, startDaemon, stopDaemon } = useAppStore();

  useInput((input) => {
    if (input === 's') {
      if (daemonStatus?.isEnabled) {
        stopDaemon();
      } else {
        startDaemon();
      }
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text bold>Settings</Text>
      </Box>

      <Box borderStyle="single" flexDirection="column" paddingX={2} paddingY={1}>
        <Text bold>Daemon Configuration</Text>
        
        <Box marginTop={1} gap={2}>
          <Text>Status:</Text>
          <Text color={daemonStatus?.isEnabled ? 'green' : 'yellow'}>
            {daemonStatus?.isEnabled ? 'Running' : 'Stopped'}
          </Text>
        </Box>
        
        <Box marginTop={1}>
          <Text color="cyan">[S]</Text>
          <Text> {daemonStatus?.isEnabled ? 'Stop Daemon' : 'Start Daemon'}</Text>
        </Box>
      </Box>

      <Box borderStyle="single" flexDirection="column" paddingX={2} paddingY={1}>
        <Text bold>Environment</Text>
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>API URL: {process.env.JULES_API_URL || 'http://localhost:8080'}</Text>
          <Text dimColor>Version: {APP_VERSION}</Text>
        </Box>
      </Box>

      <Box borderStyle="single" flexDirection="column" paddingX={2} paddingY={1}>
        <Text bold>Help</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>Full settings configuration available in the Web UI at:</Text>
          <Text color="cyan">http://localhost:3000/dashboard/settings</Text>
        </Box>
      </Box>
    </Box>
  );
}
