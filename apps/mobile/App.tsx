import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export default function App() {
  const [logs, setLogs] = useState<string[]>(['Initializing HyperCode connection...']);
  const [status, setStatus] = useState<string>('Disconnected');

  useEffect(() => {
    // Attempt connection to HyperCode Core's MCP/Telemetry WebSocket bridge
    const ws = new WebSocket('ws://localhost:3847');

    ws.onopen = () => {
      setStatus('Connected to HyperCode Core');
      setLogs((prev) => [...prev, '[System] Connected to ws://localhost:3847']);
    };

    ws.onmessage = (e) => {
      // Stream real-time telemetry and Agentic thought logs
      setLogs((prev) => [...prev, `[Telemetry] ${e.data}`].slice(-50));
    };

    ws.onerror = (e: any) => {
      setStatus('Connection Error');
      setLogs((prev) => [...prev, `[Error] ${e.message}`]);
    };

    ws.onclose = () => {
      setStatus('Disconnected');
      setLogs((prev) => [...prev, '[System] Connection closed']);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>HyperCode Mobile Control</Text>
      <Text style={[styles.status, status === 'Connected to HyperCode Core' ? styles.connected : styles.error]}>
        Status: {status}
      </Text>
      
      <ScrollView style={styles.logContainer}>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 14,
    marginBottom: 20,
  },
  connected: {
    color: '#4caf50',
  },
  error: {
    color: '#f44336',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  logText: {
    color: '#00ff00',
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 4,
  },
});
