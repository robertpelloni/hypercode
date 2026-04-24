type OrchestratorConfigEnv = Record<string, string | undefined>;

export function resolveConfiguredOrchestratorBase(
  env: OrchestratorConfigEnv = process.env,
): string | null {
  const configured =
<<<<<<< HEAD:archive/ts-legacy/apps/web/src/lib/orchestrator-config.ts
    env.NEXT_PUBLIC_HYPERCODE_ORCHESTRATOR_URL?.trim()
=======
    env.NEXT_PUBLIC_BORG_ORCHESTRATOR_URL?.trim()
>>>>>>> origin/dependabot/cargo/packages/zed-extension/cargo-64b2a50fd2:apps/web/src/lib/orchestrator-config.ts
    || env.NEXT_PUBLIC_AUTOPILOT_URL?.trim()
    || '';

  if (!configured) {
    return null;
  }

  return configured.replace(/\/$/, '');
}

