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

vi.mock('../version.js', () => ({
  readCanonicalVersion: () => '1.0.15',
}));

import { registerConfigCommand } from './config.js';

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
  registerConfigCommand(program);
  return program;
}

describe('registerConfigCommand', () => {
  it('shows live config as JSON', async () => {
    queryTrpcMock.mockResolvedValue([
      { key: 'server.port', value: '4000' },
      { key: 'mcp.progressiveDisclosure', value: 'true' },
    ]);

    const program = createProgram();
    await program.parseAsync(['config', 'show', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('config.list');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      version: '1.0.15',
      server: { port: 4000 },
      mcp: { progressiveDisclosure: true },
    }, null, 2));
  });

  it('gets a live config value as JSON', async () => {
    queryTrpcMock.mockResolvedValue('4000');

    const program = createProgram();
    await program.parseAsync(['config', 'get', 'server.port', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('config.get', { key: 'server.port' });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      key: 'server.port',
      value: '4000',
    }, null, 2));
  });

  it('sets a live config value as JSON', async () => {
    queryTrpcMock.mockResolvedValue('debug');

    const program = createProgram();
    await program.parseAsync(['config', 'set', 'logLevel', 'debug', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('config.update', { key: 'logLevel', value: 'debug' });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      ok: true,
      key: 'logLevel',
      value: 'debug',
    }, null, 2));
  });

  it('resets config through the live control plane as JSON', async () => {
    queryTrpcMock.mockResolvedValue({
      success: true,
      section: 'server',
      removed: 2,
      keys: ['server.port', 'server.host'],
    });

    const program = createProgram();
    await program.parseAsync(['config', 'reset', '--section', 'server', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('config.reset', {
      section: 'server',
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      success: true,
      section: 'server',
      removed: 2,
      keys: ['server.port', 'server.host'],
    }, null, 2));
  });

  it('initializes config through the live control plane as JSON', async () => {
    queryTrpcMock.mockResolvedValue({
      success: true,
      scope: 'global',
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/config.test.ts
      path: 'C:\\Users\\hyper\\.hypercode',
=======
      path: 'C:\\Users\\hyper\\.borg',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/config.test.ts
    });

    const program = createProgram();
    await program.parseAsync(['config', 'init', '--global', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('config.init', {
      scope: 'global',
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      success: true,
      scope: 'global',
<<<<<<< HEAD:archive/ts-legacy/packages/cli/src/commands/config.test.ts
      path: 'C:\\Users\\hyper\\.hypercode',
=======
      path: 'C:\\Users\\hyper\\.borg',
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:packages/cli/src/commands/config.test.ts
    }, null, 2));
  });

  it('lists live secrets from the control plane as JSON', async () => {
    queryTrpcMock.mockResolvedValue([
      {
        key: 'OPENAI_API_KEY',
        created_at: '2026-04-02T09:00:00.000Z',
        updated_at: '2026-04-02T09:05:00.000Z',
      },
    ]);

    const program = createProgram();
    await program.parseAsync(['config', 'secrets', '--list', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('secrets.list');
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify([
      {
        key: 'OPENAI_API_KEY',
        created_at: '2026-04-02T09:00:00.000Z',
        updated_at: '2026-04-02T09:05:00.000Z',
      },
    ], null, 2));
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('sets a live secret as JSON', async () => {
    queryTrpcMock.mockResolvedValue({ success: true });

    const program = createProgram();
    await program.parseAsync(['config', 'secrets', '--set', 'OPENAI_API_KEY', '--value', 'sk-live', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('secrets.set', {
      key: 'OPENAI_API_KEY',
      value: 'sk-live',
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      ok: true,
      key: 'OPENAI_API_KEY',
    }, null, 2));
  });

  it('deletes a live secret as JSON', async () => {
    queryTrpcMock.mockResolvedValue({ success: true });

    const program = createProgram();
    await program.parseAsync(['config', 'secrets', '--delete', 'OPENAI_API_KEY', '--json'], { from: 'user' });

    expect(queryTrpcMock).toHaveBeenCalledWith('secrets.delete', {
      key: 'OPENAI_API_KEY',
    });
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      ok: true,
      key: 'OPENAI_API_KEY',
    }, null, 2));
  });

  it('fails secret set without --value in non-interactive mode', async () => {
    const stdinIsTty = process.stdin.isTTY;
    const stdoutIsTty = process.stdout.isTTY;
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true });

    const program = createProgram();
    await program.parseAsync(['config', 'secrets', '--set', 'OPENAI_API_KEY', '--json'], { from: 'user' });

    expect(queryTrpcMock).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({
      error: "Secret 'OPENAI_API_KEY' requires --value when stdin/stdout is not interactive",
    }, null, 2));
    expect(process.exitCode).toBe(1);

    Object.defineProperty(process.stdin, 'isTTY', { value: stdinIsTty, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: stdoutIsTty, configurable: true });
  });

  it('reports control-plane failures without throwing out of the command', async () => {
    queryTrpcMock.mockRejectedValue(new Error('control plane unavailable'));

    const program = createProgram();
    await program.parseAsync(['config', 'show'], { from: 'user' });

    expect(errorSpy).toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
  });
});
