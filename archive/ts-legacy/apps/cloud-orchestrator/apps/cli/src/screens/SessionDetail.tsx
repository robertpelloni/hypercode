import React from 'react';
import { Box, Text, useInput } from 'ink';

interface SessionDetailProps {
  sessionId: string;
  onBack: () => void;
}

export default function SessionDetail({ sessionId, onBack }: SessionDetailProps) {
  useInput((input, key) => {
    if (key.escape || input === 'b') {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" gap={1}>
      <Box>
        <Text bold>Session Detail</Text>
        <Box flexGrow={1} />
        <Text dimColor>[B]ack │ [Esc]</Text>
      </Box>

      <Box borderStyle="single" flexDirection="column" paddingX={2} paddingY={1}>
        <Text>Session ID: <Text color="cyan">{sessionId}</Text></Text>
        <Text dimColor>
          Detailed session view coming soon. This will show activities, artifacts, and allow interaction.
        </Text>
      </Box>
    </Box>
  );
}
