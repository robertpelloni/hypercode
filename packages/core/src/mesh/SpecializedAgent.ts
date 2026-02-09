import { MeshService } from '../services/MeshService.js';
import { SwarmMessage, SwarmMessageType } from './SwarmProtocol.js';

export abstract class SpecializedAgent {
    protected mesh: MeshService;
    public nodeId: string;
    public role: string;
    protected capabilities: string[] = [];

    constructor(role: string, capabilities: string[] = []) {
        this.mesh = new MeshService();
        this.nodeId = this.mesh.nodeId;
        this.role = role;
        this.capabilities = capabilities;

        this.initialize();
    }

    private initialize() {
        console.log(`[${this.role}] 🤖 Initializing Specialized Agent (Node: ${this.nodeId.slice(0, 8)}...)`);

        this.mesh.on('message', async (msg: SwarmMessage) => {
            // 1. Handle Capability Queries
            if (msg.type === SwarmMessageType.CAPABILITY_QUERY) {
                console.log(`[${this.role}] ❓ Received Capability Query from ${msg.sender.slice(0, 8)}...`);
                // Use sendResponse for RPC
                this.mesh.sendResponse(msg, SwarmMessageType.CAPABILITY_RESPONSE, {
                    role: this.role,
                    capabilities: this.capabilities,
                    load: 0
                });
                return;
            }

            // 2. Handle Task Offers
            if (msg.type === SwarmMessageType.TASK_OFFER) {
                const offer = msg.payload;
                if (this.canHandle(offer)) {
                    console.log(`[${this.role}] 🤝 Accepting Task Offer: ${offer.task}`);
                    this.mesh.sendResponse(msg, SwarmMessageType.TASK_ACCEPT, { task: offer.task });

                    try {
                        const result = await this.handleTask(offer);
                        // Send Result as a Direct Message (not response, as RPC might have timed out, but usually response is better if within timeout)
                        // If the Director is waiting on `request()`, it expects a response with same ID.
                        // However, heavy tasks take time. RPC timeout is 10s.
                        // If task takes longer, Director might have timed out.
                        // Ideally, we send TASK_ACCEPT immediately (RPC resolved).
                        // Then later sending TASK_RESULT as a NEW message or via a long-running stream?

                        // For Phase 61, let's assume we send RESULT as a separate message `TASK_RESULT`.
                        // The Director should listen for `TASK_RESULT`.

                        this.mesh.sendDirect(msg.sender, SwarmMessageType.TASK_RESULT, {
                            originalTaskId: msg.id,
                            result
                        });
                    } catch (e: any) {
                        this.mesh.sendDirect(msg.sender, SwarmMessageType.TASK_RESULT, {
                            originalTaskId: msg.id,
                            error: e.message
                        });
                    }
                }
            }
        });
    }

    private canHandle(offer: any): boolean {
        if (offer.requirements) {
            return offer.requirements.every((req: string) => this.capabilities.includes(req) || this.role === req);
        }
        return true;
    }

    /**
     * Abstract method to be implemented by specific agents (Coder, Researcher)
     */
    protected abstract handleTask(offer: any): Promise<any>;

    public async destroy() {
        await this.mesh.destroy();
    }
}
