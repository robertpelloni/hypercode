
export interface SwarmMessage {
    id: string;
    type: SwarmMessageType;
    sender: string;
    target?: string; // If null, broadcast
    payload: any;
    timestamp: number;
    signature?: string; // Ed25519 signature
}

export enum SwarmMessageType {
    HEARTBEAT = 'HEARTBEAT',
    TASK_OFFER = 'TASK_OFFER',
    TASK_ACCEPT = 'TASK_ACCEPT',
    TASK_RESULT = 'TASK_RESULT',
    CAPABILITY_QUERY = 'CAPABILITY_QUERY',
    CAPABILITY_RESPONSE = 'CAPABILITY_RESPONSE'
}

export interface NodeCapability {
    role: string; // e.g., 'Director', 'Worker', 'Specialist'
    skills: string[];
    load: number; // 0-100
}
