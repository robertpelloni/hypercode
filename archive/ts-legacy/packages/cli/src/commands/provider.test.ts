import { afterEach, describe, expect, it, vi } from 'vitest';
import { Command } from 'commander';

const queryTrpcMock = vi.fn();
const resolveControlPlaneLocationMock = vi.fn(() => ({
  source: 'default',
  baseUrl: 'http://127.0.0.1:4000/trpc',
  host: '127.0.0.1',
  port: 4000,
}));

vi.mock('../control-plane.js', () => ({
  queryTrpc: (...args: unknown[]) => queryTrpcMock(...args),
  resolveControlPlaneLocation: () => resolveControlPlaneLocationMock(),
}));

import { registerProviderCommand } from './provider.js';

const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

afterEach(() => {
  queryTrpcMock.mockReset();
  resolveControlPlaneLocationMock.mockClear();
  logSpy.mockClear();
  errorSpy.mockClear();
  process.exitCode = 0;
});

function createProgram(): Command {
  const program = new Command();
  registerProviderCommand(program);
  return program;
}

describe('registerProviderCommand', () => {
  it('adds an API-key-backed provider through the live settings route', async () => {
    queryTrpcMock
      .mockResolvedValueOnce([
        {
          id: 'openai',
          name: 'OpenAI',
          envVar: 'OPENAI_API_KEY',
          configured: false,
          keyPreview: null,
        },
      ])
      .mockResolvedValueOnce({
        success: true,
        updatedKey: 'OPENAI_API_KEY',
      });

    const program = createProgram();
    await program.parseAsync(['provider', 'add', 'openai', '--api-key', 'sk-live-1234', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenNthCalledWith(1, 'settings.getProviders');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(2, 'settings.updateProviderKey', {
      provider: 'openai',
      key: 'sk-live-1234',
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      ok: true,
      provider: 'openai',
      envVar: 'OPENAI_API_KEY',
    }, null, 2));
  });

  it('removes a provider through the live settings route', async () => {
    queryTrpcMock
      .mockResolvedValueOnce([
        {
          id: 'openai',
          name: 'OpenAI',
          envVar: 'OPENAI_API_KEY',
          configured: true,
          keyPreview: 'sk-a...1234',
        },
      ])
      .mockResolvedValueOnce({
        success: true,
        removedKey: 'OPENAI_API_KEY',
        removedAny: true,
      });

    const program = createProgram();
    await program.parseAsync(['provider', 'remove', 'openai', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenNthCalledWith(1, 'settings.getProviders');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(2, 'settings.removeProviderKey', {
      provider: 'openai',
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      ok: true,
      provider: 'openai',
      envVar: 'OPENAI_API_KEY',
      removedAny: true,
    }, null, 2));
  });

  it('rejects unsupported OAuth provider add explicitly', async () => {
    const program = createProgram();
    await program.parseAsync(['provider', 'add', 'openai', '--oauth', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: 'Live provider add does not yet support OAuth flows.',
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('lists providers as JSON from live control-plane data', async () => {
    queryTrpcMock
      .mockResolvedValueOnce([
        {
          id: 'openai',
          name: 'OpenAI',
          envVar: 'OPENAI_API_KEY',
          configured: true,
          keyPreview: 'sk-a...1234',
        },
      ])
      .mockResolvedValueOnce([
        {
          provider: 'openai',
          name: 'OpenAI',
          configured: true,
          authenticated: true,
          authMethod: 'api_key',
          used: 10,
          remaining: 90,
        },
      ]);

    const program = createProgram();
    await program.parseAsync(['provider', 'list', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenNthCalledWith(1, 'settings.getProviders');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(2, 'billing.getProviderQuotas');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      providers: [
        {
          id: 'openai',
          name: 'OpenAI',
          envVar: 'OPENAI_API_KEY',
          configured: true,
          keyPreview: 'sk-a...1234',
          quota: {
            provider: 'openai',
            name: 'OpenAI',
            configured: true,
            authenticated: true,
            authMethod: 'api_key',
            used: 10,
            remaining: 90,
          },
        },
      ],
    }, null, 2));
  });

  it('shows provider quotas as JSON from the billing router', async () => {
    queryTrpcMock.mockResolvedValue([
      {
        provider: 'openai',
        name: 'OpenAI',
        configured: true,
        authenticated: true,
        authMethod: 'api_key',
        tier: 'paid',
        limit: 100,
        used: 10,
        remaining: 90,
        availability: 'available',
      },
    ]);

    const program = createProgram();
    await program.parseAsync(['provider', 'quota', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('billing.getProviderQuotas');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      providers: [
        {
          provider: 'openai',
          name: 'OpenAI',
          configured: true,
          authenticated: true,
          authMethod: 'api_key',
          tier: 'paid',
          limit: 100,
          used: 10,
          remaining: 90,
          availability: 'available',
        },
      ],
    }, null, 2));
  });

  it('shows the live fallback chain as JSON from the billing router', async () => {
    queryTrpcMock.mockResolvedValue({
      selectedTaskType: 'planning',
      chain: [
        {
          priority: 1,
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          reason: 'TASK_TYPE_PLANNING',
        },
      ],
    });

    const program = createProgram();
    await program.parseAsync(['provider', 'fallback', '--show', '--task-type', 'planning', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('billing.getFallbackChain', { taskType: 'planning' });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      selectedTaskType: 'planning',
      chain: [
        {
          priority: 1,
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          reason: 'TASK_TYPE_PLANNING',
        },
      ],
    }, null, 2));
  });

  it('shows the live fallback chain by default as JSON', async () => {
    queryTrpcMock.mockResolvedValue({
      selectedTaskType: null,
      chain: [
        {
          priority: 1,
          provider: 'openai',
          model: 'gpt-5.2',
          reason: 'GLOBAL_DEFAULT',
        },
      ],
    });

    const program = createProgram();
    await program.parseAsync(['provider', 'fallback', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('billing.getFallbackChain', undefined);
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      selectedTaskType: null,
      chain: [
        {
          priority: 1,
          provider: 'openai',
          model: 'gpt-5.2',
          reason: 'GLOBAL_DEFAULT',
        },
      ],
    }, null, 2));
  });

  it('sets the live routing strategy through the billing router', async () => {
    queryTrpcMock.mockResolvedValue({
      ok: true,
      strategy: 'cheapest',
    });

    const program = createProgram();
    await program.parseAsync(['provider', 'fallback', '--strategy', 'cheapest', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('billing.setRoutingStrategy', {
      strategy: 'cheapest',
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      ok: true,
      strategy: 'cheapest',
    }, null, 2));
  });

  it('sets the live task-specific routing strategy through the billing router', async () => {
    queryTrpcMock.mockResolvedValue({
      ok: true,
      taskType: 'planning',
      strategy: 'best',
    });

    const program = createProgram();
    await program.parseAsync(['provider', 'fallback', '--task-type', 'planning', '--strategy', 'best', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('billing.setTaskRoutingRule', {
      taskType: 'planning',
      strategy: 'best',
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      ok: true,
      taskType: 'planning',
      strategy: 'best',
    }, null, 2));
  });

  it('rejects unsupported fallback strategy names explicitly', async () => {
    const program = createProgram();
    await program.parseAsync(['provider', 'fallback', '--strategy', 'quota-aware', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: "Unsupported fallback strategy 'quota-aware'. Supported strategies: cheapest, best, round-robin.",
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('fails fallback chain mutation explicitly instead of pretending --set works', async () => {
    const program = createProgram();
    await program.parseAsync(['provider', 'fallback', '--set', 'claude-opus-4', 'gpt-5.2', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: 'Live provider fallback --set is unavailable: the control plane does not expose a fallback-chain mutation route yet.',
    }, null, 2));
    expect(process.exitCode).toBe(1);
  });

  it('shows live provider readiness as JSON from control-plane data', async () => {
    queryTrpcMock
      .mockResolvedValueOnce([
        {
          id: 'openai',
          name: 'OpenAI',
          envVar: 'OPENAI_API_KEY',
          configured: true,
          keyPreview: 'sk-a...1234',
        },
      ])
      .mockResolvedValueOnce([
        {
          provider: 'openai',
          name: 'OpenAI',
          configured: true,
          authenticated: true,
          authMethod: 'api_key',
          availability: 'available',
          tier: 'paid',
          remaining: 90,
          lastError: null,
        },
      ]);

    const program = createProgram();
    await program.parseAsync(['provider', 'test', 'openai', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenNthCalledWith(1, 'settings.getProviders');
    expect(queryTrpcMock).toHaveBeenNthCalledWith(2, 'billing.getProviderQuotas');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      provider: {
        id: 'openai',
        name: 'OpenAI',
        envVar: 'OPENAI_API_KEY',
        configured: true,
        keyPreview: 'sk-a...1234',
      },
      quota: {
        provider: 'openai',
        name: 'OpenAI',
        configured: true,
        authenticated: true,
        authMethod: 'api_key',
        availability: 'available',
        tier: 'paid',
        remaining: 90,
        lastError: null,
      },
      reachable: true,
      authenticated: true,
    }, null, 2));
  });

  it('reports control-plane failures without throwing out of the command', async () => {
    queryTrpcMock.mockRejectedValue(new Error('control plane unavailable'));

    const program = createProgram();
    await program.parseAsync(['provider', 'list'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
