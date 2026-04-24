
import React from 'react';
import { Box, Text } from 'ink';

export const Header = ({ version = "unknown", status = "offline" }: { version?: string, status?: string }) => {
    return (
        <Box borderStyle="round" borderColor="cyan" paddingX={1} justifyContent="space-between">
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/ui/components/Header.tsx
            <Text bold color="cyan">HYPERCODE HIVE MIND</Text>
=======
            <Text bold color="cyan">borg HIVE MIND</Text>
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/ui/components/Header.tsx
            <Text>v{version}</Text>
            <Text color={status === 'online' ? 'green' : 'red'}>● {status.toUpperCase()}</Text>
        </Box>
    );
};
