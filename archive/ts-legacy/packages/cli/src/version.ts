import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function parseVersionText(raw: string): string | null {
  const trimmed = raw.trim();
  const semverMatch = trimmed.match(/\d+\.\d+\.\d+(?:-[\w.-]+)?/);
  return semverMatch ? semverMatch[0] : null;
}

export function readCanonicalVersion(baseDir: string): string {
  const candidates = [
    resolve(baseDir, '..', '..', '..', 'VERSION'),
    resolve(baseDir, '..', '..', '..', 'VERSION.md'),
  ];

  for (const candidate of candidates) {
    try {
      const parsed = parseVersionText(readFileSync(candidate, 'utf-8'));
      if (parsed) {
        return parsed;
      }
    } catch {
      // Try next candidate.
    }
  }

  return '1.0.0-alpha.1';
}