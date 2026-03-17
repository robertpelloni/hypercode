#!/usr/bin/env node
/**
 * Council Demo Script
 * 
 * Demonstrates programmatic usage of the Multi-LLM Supervisor Council.
 * Run with: node demo.js
 * 
 * Prerequisites:
 * - Set environment variables for desired providers:
 *   OPENAI_API_KEY, ANTHROPIC_API_KEY, DEEPSEEK_API_KEY, etc.
 */

const DRY_RUN = !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY;

async function main() {
  console.log('🏛️  Multi-LLM Supervisor Council Demo\n');
  console.log('=' .repeat(50));

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No API keys detected');
    console.log('Set OPENAI_API_KEY or ANTHROPIC_API_KEY to run with real LLMs\n');
    demonstrateDryRun();
    return;
  }

  console.log('\n🔑 API keys detected - Ready for real council debates');
  console.log('See API.md for endpoint documentation');
  console.log('Run: curl http://localhost:3002/api/council/status');
}

function demonstrateDryRun() {
  console.log('📋 Example Council Flow:\n');

  const steps = [
    { step: 1, action: 'Initialize Council', desc: 'POST /api/council/init with supervisor configs' },
    { step: 2, action: 'Submit for Review', desc: 'POST /api/council/review with code/proposal' },
    { step: 3, action: 'Debate Rounds', desc: 'Supervisors analyze and discuss (N rounds)' },
    { step: 4, action: 'Voting', desc: 'Each supervisor votes: approve/reject/abstain' },
    { step: 5, action: 'Consensus', desc: 'Final decision based on threshold & weights' },
  ];

  steps.forEach(({ step, action, desc }) => {
    console.log(`  ${step}. ${action}`);
    console.log(`     └─ ${desc}\n`);
  });

  console.log('📁 Example Configurations:');
  console.log('  • council-minimal.json    - Single supervisor, auto-approve');
  console.log('  • council-standard.json   - 3 supervisors, balanced review');
  console.log('  • council-all-providers.json - All 7 providers');
  console.log('  • config.example.json     - Full production config\n');

  console.log('🔗 API Endpoints:');
  console.log('  GET  /api/council/status     - Check council status');
  console.log('  POST /api/council/init       - Initialize supervisors');
  console.log('  POST /api/council/review     - Submit code for review');
  console.log('  POST /api/council/vote       - Submit vote');
  console.log('  GET  /api/council/consensus  - Get final decision\n');

  console.log('📖 Full documentation: docs/council/API.md');
}

main().catch(console.error);
