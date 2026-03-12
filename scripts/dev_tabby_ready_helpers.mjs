import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_DEV_PORT_MARKER = ['apps', 'web', '.borg-dev-port.json'];

const STARTUP_CHECK_LABELS = {
  mcpAggregator: 'MCP router inventory',
  configSync: 'MCP config sync',
  sessionSupervisor: 'session restore',
  browser: 'browser runtime',
  memory: 'memory initialization',
  extensionBridge: 'extension bridge listener',
};

const BROWSER_EXTENSION_ARTIFACTS = [
  {
    id: 'browser-extension-chromium',
    label: 'browser extension Chromium bundle',
    candidates: [
      ['apps', 'borg-extension', 'dist-chromium'],
      ['apps', 'borg-extension', 'dist'],
      ['apps', 'extension', 'dist'],
    ],
    requiredFiles: ['background.js', 'manifest.json'],
  },
  {
    id: 'browser-extension-firefox',
    label: 'browser extension Firefox bundle',
    candidates: [
      ['apps', 'borg-extension', 'dist-firefox'],
    ],
    requiredFiles: ['background.js', 'manifest.json'],
  },
];

function normalizePathForComparison(filePath) {
  const resolved = path.resolve(filePath);
  return process.platform === 'win32'
    ? resolved.toLowerCase()
    : resolved;
}

export function isDirectExecution(importMetaUrl, argv1 = process.argv[1]) {
  if (!argv1) {
    return false;
  }

  try {
    const importPath = normalizePathForComparison(fileURLToPath(importMetaUrl));
    const argvPath = normalizePathForComparison(argv1);
    return importPath === argvPath;
  } catch {
    return false;
  }
}

export function detectBrowserExtensionArtifacts(repoRoot) {
  return BROWSER_EXTENSION_ARTIFACTS.map((artifact) => {
    const resolvedCandidates = artifact.candidates.map((segments) => path.join(repoRoot, ...segments));
    const existingCandidate = resolvedCandidates.find((candidatePath) => fs.existsSync(candidatePath));
    const artifactPath = existingCandidate ?? resolvedCandidates[0] ?? null;
    const missingFiles = artifact.requiredFiles.filter((fileName) => !artifactPath || !fs.existsSync(path.join(artifactPath, fileName)));

    return {
      id: artifact.id,
      label: artifact.label,
      artifactPath,
      ready: missingFiles.length === 0,
      missingFiles,
      requiredFiles: [...artifact.requiredFiles],
    };
  });
}

export function getWebDevPortMarkerPath(repoRoot) {
  return path.join(repoRoot, ...WEB_DEV_PORT_MARKER);
}

export function readWebDevPortMarker(repoRoot) {
  try {
    const markerPath = getWebDevPortMarkerPath(repoRoot);
    if (!fs.existsSync(markerPath)) {
      return null;
    }

    const raw = fs.readFileSync(markerPath, 'utf8');
    const parsed = JSON.parse(raw);
    const port = Number(parsed?.port);

    if (!Number.isInteger(port) || port <= 0) {
      return null;
    }

    return {
      ...parsed,
      port,
      markerPath,
    };
  } catch {
    return null;
  }
}

export function getPreferredWebPorts(repoRoot, fallbackPorts) {
  const preferred = readWebDevPortMarker(repoRoot)?.port;
  const normalizedFallbacks = Array.isArray(fallbackPorts) ? fallbackPorts : [];

  if (!preferred) {
    return normalizedFallbacks;
  }

  return [preferred, ...normalizedFallbacks.filter((port) => Number(port) !== preferred)];
}

export function summarizeBrowserExtensionArtifacts(artifacts) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) {
    return {
      ready: false,
      items: [],
    };
  }

  return {
    ready: artifacts.every((artifact) => artifact.ready),
    items: artifacts,
  };
}

export function isHttpProbeResponsive(status) {
  if (!status || typeof status !== 'object') {
    return false;
  }

  if (status.ok === true) {
    return true;
  }

  return Number.isInteger(status.status);
}

function getMissingExtensionReasons(artifacts) {
  return artifacts
    .filter((artifact) => !artifact.ready)
    .map((artifact) => {
      const missing = artifact.missingFiles.length > 0
        ? ` (${artifact.missingFiles.join(', ')})`
        : '';

      return `${artifact.label}${missing}`;
    });
}

export function getPendingStartupChecks(startupStatusData) {
  if (!startupStatusData || typeof startupStatusData !== 'object') {
    return [];
  }

  const checks = startupStatusData.checks;
  if (!checks || typeof checks !== 'object') {
    return [];
  }

  return Object.entries(STARTUP_CHECK_LABELS)
    .filter(([key]) => {
      const check = checks[key];
      return Boolean(check) && typeof check === 'object' && check.ready === false;
    })
    .map(([, label]) => label);
}

export function getWaitingReasons(state) {
  const missing = [];

  if (!state.web) {
    missing.push('dashboard web server');
  }

  if (!state.coreBridge.ok) {
    missing.push('core extension bridge (/api/mesh/stream)');
  }

  if (!state.startupStatus.ok) {
    missing.push('startup status query');
  }

  const pendingStartupChecks = getPendingStartupChecks(state.startupStatus.data);
  if (pendingStartupChecks.length > 0) {
    missing.push(...pendingStartupChecks);
  } else {
    if (!state.startupStatus.data?.ready && !state.mcpStatus.ok) {
      missing.push('MCP status query');
    }

    if (!state.startupStatus.data?.ready && !state.memoryStatus.ok) {
      missing.push('memory status query');
    }

    if (!state.startupStatus.data?.ready && !state.browserStatus.ok) {
      missing.push('browser status query');
    }

    if (!state.startupStatus.data?.ready && !state.sessionStatus.ok) {
      missing.push('session status query');
    }
  }

  if (Array.isArray(state.extensions)) {
    missing.push(...getMissingExtensionReasons(state.extensions));
  } else if (state.extension && !state.extension.ready) {
    missing.push(`extension dist files (${state.extension.missing.join(', ')})`);
  }

  return missing;
}