/**
 * Adapter Plugins Export Module
 *
<<<<<<<< HEAD:archive/ts-legacy/apps/hypercode-extension/pages/content/src/plugins/adapters/index.ts
 * This file exports all available adapter plugins for the HyperCode-Extension.
========
 * This file exports all available adapter plugins for the borg-Extension.
>>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/borg-extension/pages/content/src/plugins/adapters/index.ts
 */

export { BaseAdapterPlugin } from './base.adapter';
export { DefaultAdapter } from './default.adapter';
export { ExampleForumAdapter } from './example-forum.adapter';
export { GeminiAdapter } from './gemini.adapter';
export { GrokAdapter } from './grok.adapter';
export { PerplexityAdapter } from './perplexity.adapter';
export { AIStudioAdapter } from './aistudio.adapter';
export { OpenRouterAdapter } from './openrouter.adapter';
export { DeepSeekAdapter } from './deepseek.adapter';
export { T3ChatAdapter } from './t3chat.adapter';
export { MistralAdapter } from './mistral.adapter';
export { GitHubCopilotAdapter } from './ghcopilot.adapter';

// Export types
export type {
  AdapterPlugin,
  AdapterConfig,
  PluginRegistration,
  AdapterCapability,
  PluginContext,
} from '../plugin-types';
