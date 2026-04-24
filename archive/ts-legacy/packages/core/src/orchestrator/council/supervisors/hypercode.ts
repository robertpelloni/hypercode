import { getLLMService } from '../../../lib/trpc-core.js';
import type { Supervisor, SupervisorConfig, Message } from './types.js';

<<<<<<<< HEAD:archive/ts-legacy/packages/core/src/orchestrator/council/supervisors/hypercode.ts
export class HyperCodeSupervisor implements Supervisor {
========
export class BorgSupervisor implements Supervisor {
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/packages/core/src/orchestrator/council/supervisors/borg.ts
  name: string;
  provider: string;
  config: SupervisorConfig;

  constructor(config: SupervisorConfig) {
    this.name = config.name;
    this.provider = config.provider;
    this.config = config;
  }

  async isAvailable(): Promise<boolean> {
    const llm = getLLMService();
<<<<<<<< HEAD:archive/ts-legacy/packages/core/src/orchestrator/council/supervisors/hypercode.ts
    // In HyperCode, availability is checked via ProviderTruth
========
    // In borg, availability is checked via ProviderTruth
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/packages/core/src/orchestrator/council/supervisors/borg.ts
    const quotaService = (llm.modelSelector as any)?.getQuotaService?.();
    const quota = quotaService?.getQuota?.(this.config.provider);
    return !!quota && quota.authTruth === 'VALID';
  }

  async chat(messages: Message[]): Promise<string> {
    const llm = getLLMService();
    
<<<<<<<< HEAD:archive/ts-legacy/packages/core/src/orchestrator/council/supervisors/hypercode.ts
    // Convert council messages to HyperCode format if needed
    // (Assuming HyperCode generate accepts prompt string or similar)
========
    // Convert council messages to borg format if needed
    // (Assuming borg generate accepts prompt string or similar)
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:archive/ts-legacy/packages/core/src/orchestrator/council/supervisors/borg.ts
    const prompt = messages.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n\n');
    
    const response = await (llm as any).generateText(
      this.config.provider,
      this.config.model || 'default',
      '', // System prompt handled in council logic or here
      prompt,
      {
        temperature: this.config.temperature,
        taskComplexity: 'high',
      }
    );

    return response.content;
  }
}
