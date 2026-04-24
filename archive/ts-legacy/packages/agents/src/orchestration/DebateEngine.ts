import { ChatMessage } from '../../../ai/src/providers/ProviderInterface';

export interface DebateParticipant {
    id: string;
    role: string;
    model: string;
    systemPrompt: string;
}

export interface DebateTurn {
    participantId: string;
    message: string;
    timestamp: number;
}

export class DebateEngine {
    private participants: Map<string, DebateParticipant> = new Map();
    private history: DebateTurn[] = [];

    registerParticipant(participant: DebateParticipant) {
        this.participants.set(participant.id, participant);
    }

    addTurn(participantId: string, message: string) {
        if (!this.participants.has(participantId)) {
            throw new Error(`Participant ${participantId} not registered`);
        }
        this.history.push({
            participantId,
            message,
            timestamp: Date.now()
        });
    }

    getTranscript(): string {
        return this.history.map(turn => {
            const p = this.participants.get(turn.participantId)!;
            return `[${p.role} - ${p.model}]: ${turn.message}`;
        }).join('\n\n');
    }

    buildContextForParticipant(participantId: string): ChatMessage[] {
        const participant = this.participants.get(participantId);
        if (!participant) throw new Error('Participant not found');

        const messages: ChatMessage[] = [
            { role: 'system', content: participant.systemPrompt }
        ];

        for (const turn of this.history) {
            if (turn.participantId === participantId) {
                messages.push({ role: 'assistant', content: turn.message });
            } else {
                const other = this.participants.get(turn.participantId)!;
                messages.push({
                    role: 'user',
                    content: `[Message from ${other.role}]:\n${turn.message}`
                });
            }
        }

        return messages;
    }
}
