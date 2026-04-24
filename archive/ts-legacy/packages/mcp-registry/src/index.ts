import registryData from './registry.json';

export const REGISTRY_VERSION = '0.0.1';

export interface MCPServer {
    name: string;
    description: string;
    package: string;
    type: 'stdio' | 'websocket';
    env: string[];
}

export class Registry {
    private servers: Map<string, MCPServer>;

    constructor() {
        this.servers = new Map();
        this.loadDefaultServers();
    }

    private loadDefaultServers() {
        (registryData.servers as MCPServer[]).forEach(server => {
            this.servers.set(server.name, server);
        });
    }

    list(): MCPServer[] {
        return Array.from(this.servers.values());
    }

    find(name: string): MCPServer | undefined {
        return this.servers.get(name);
    }
}
