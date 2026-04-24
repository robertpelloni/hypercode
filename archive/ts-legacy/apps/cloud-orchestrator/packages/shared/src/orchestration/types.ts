export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}

export interface Participant {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  provider: 'openai' | 'anthropic' | 'gemini';
  model: string;
  apiKey?: string;
}

export interface DebateConfig {
  topic: string;
  rounds: number;
  participants: Participant[];
}

export interface CompletionParams {
  messages: Message[];
  model: string;
  apiKey?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface CompletionResult {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ProviderInterface {
  id: string;
  complete(params: CompletionParams): Promise<CompletionResult>;
  listModels(apiKey?: string): Promise<string[]>;
}

export type LLMProvider = ProviderInterface;

export interface DebateTurn {
  participantId: string;
  participantName: string;
  role: string;
  content: string;
  timestamp: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DebateRound {
  roundNumber: number;
  turns: DebateTurn[];
}

export interface DebateResult {
  topic?: string;
  rounds: DebateRound[];
  summary?: string;
  history: Message[];
  metadata?: unknown;
  totalUsage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  riskScore?: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'flagged';
  durationMs?: number;
}

export type DebateProgressEvent =
  | { type: 'start'; topic?: string; rounds: number }
  | { type: 'round_start'; roundNumber: number }
  | { type: 'turn_start'; participantId: string; participantName: string; role: string }
  | { type: 'turn_complete'; participantId: string; content: string }
  | { type: 'round_complete'; roundNumber: number; turns: DebateTurn[] }
  | { type: 'summary_start' }
  | { type: 'summary_complete'; summary: string }
  | { type: 'complete'; result: DebateResult }
  | { type: 'error'; error: string };
