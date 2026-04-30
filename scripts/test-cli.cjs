#!/usr/bin/env node
/**
 * CLI integration test — verifies every CLI command works against a running server
 */
const { execSync } = require('child_process');
const BORG = 'node packages/cli/dist/cli/src/index.js';

let passed = 0, failed = 0;

function test(name, cmd, expectFn) {
  try {
    const out = execSync(`${BORG} ${cmd}`, { timeout: 10000, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    if (expectFn(out)) {
      console.log(`  ✓ ${name}`);
      passed++;
    } else {
      console.log(`  ✗ ${name} — assertion failed`);
      console.log(`    output: ${out.substring(0, 100).replace(/\n/g, ' ')}`);
      failed++;
    }
  } catch (e) {
    console.log(`  ✗ ${name} — ${e.message?.substring(0, 80)}`);
    failed++;
  }
}

(async () => {
  console.log(`\n  Borg CLI Integration Test (v1.0.0-alpha.40)\n`);

  test('status shows version', 'status', o => o.includes('1.0.0-alpha'));
  test('status shows server running', 'status', o => o.includes('Running'));
  test('status shows Go sidecar', 'status', o => o.includes('Go Sidecar'));

  test('about shows version', 'about', o => o.includes('1.0.0-alpha'));
  test('about shows codename', 'about', o => o.includes('AIOS'));

  test('config show', 'config show', o => o.includes('Configuration'));
  test('config get', 'config get nonexistent.key', o => o.includes('undefined'));

  test('provider list', 'provider list', o => o.includes('Provider'));

  test('mcp list', 'mcp list', o => o.includes('alpaca') || o.includes('servers'));
  test('mcp tools', 'mcp tools', o => o.includes('Tools') || o.includes('tool'));
  test('mcp search', 'mcp search github', o => o.includes('github') || o.includes('results'));
  test('mcp inspect', 'mcp inspect alpaca', o => o.includes('alpaca'));
  test('mcp traffic', 'mcp traffic', o => o.includes('Traffic'));

  test('memory list', 'memory list', o => o.includes('Memor'));
  test('memory stats', 'memory stats', o => o.includes('Memor'));

  test('tools list', 'tools list', o => o.includes('tool') || o.includes('server'));
  test('session list', 'session list', o => o.includes('ession'));
  test('agent list', 'agent list', o => o.includes('gent'));
  test('agent council', 'agent council', o => o.includes('ouncil') || o.includes('irector'));

  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
