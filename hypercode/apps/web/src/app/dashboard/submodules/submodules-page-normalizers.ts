export type NormalizedSubmoduleStatus = 'clean' | 'dirty' | 'missing' | 'error';

export interface NormalizedSubmoduleInfo {
  path: string;
  url: string;
  status: NormalizedSubmoduleStatus;
  lastCommit?: string;
  lastCommitDate?: string;
  lastCommitMessage?: string;
  version?: string;
  pkgName?: string;
}

export interface NormalizedLinkCategory {
  name: string;
  links: string[];
}

export interface NormalizedWorkspaceInventoryEntry {
  name: string;
  path: string;
  kind: 'app' | 'package' | 'submodule' | 'directory' | 'document' | 'script' | 'config';
  summary: string;
  packageName?: string;
  version?: string;
}

export interface NormalizedWorkspaceInventorySection {
  id: string;
  title: string;
  description: string;
  entries: NormalizedWorkspaceInventoryEntry[];
}

export interface SubmoduleSummaryCounts {
  clean: number;
  dirty: number;
  missing: number;
  error: number;
  resources: number;
}

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
);

const asTrimmedString = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const asOptionalTrimmedString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeStatus = (value: unknown): NormalizedSubmoduleStatus => {
  switch (value) {
    case 'clean':
    case 'dirty':
    case 'missing':
    case 'error':
      return value;
    default:
      return 'error';
  }
};

const normalizeInventoryKind = (value: unknown): NormalizedWorkspaceInventoryEntry['kind'] => {
  switch (value) {
    case 'app':
    case 'package':
    case 'submodule':
    case 'directory':
    case 'document':
    case 'script':
    case 'config':
      return value;
    default:
      return 'directory';
  }
};

export const normalizeSubmodules = (payload: unknown): NormalizedSubmoduleInfo[] => {
  if (!Array.isArray(payload)) return [];

  return payload.map((row, index) => {
    const sub = asRecord(row);
    return {
      path: asTrimmedString(sub.path, `unknown/submodule-${index + 1}`),
      url: asTrimmedString(sub.url, 'unknown-url'),
      status: normalizeStatus(sub.status),
      lastCommit: asOptionalTrimmedString(sub.lastCommit),
      lastCommitDate: asOptionalTrimmedString(sub.lastCommitDate),
      lastCommitMessage: asOptionalTrimmedString(sub.lastCommitMessage),
      version: asOptionalTrimmedString(sub.version),
      pkgName: asOptionalTrimmedString(sub.pkgName),
    };
  });
};

export const normalizeWorkspaceInventory = (payload: unknown): NormalizedWorkspaceInventorySection[] => {
  if (!Array.isArray(payload)) return [];

  return payload.map((row, index) => {
    const section = asRecord(row);
    const entries = Array.isArray(section.entries)
      ? section.entries.map((entry, entryIndex) => {
          const item = asRecord(entry);
          return {
            name: asTrimmedString(item.name, `Entry ${entryIndex + 1}`),
            path: asTrimmedString(item.path, `unknown/path-${entryIndex + 1}`),
            kind: normalizeInventoryKind(item.kind),
            summary: asTrimmedString(item.summary, 'No summary available.'),
            packageName: asOptionalTrimmedString(item.packageName),
            version: asOptionalTrimmedString(item.version),
          };
        })
      : [];

    return {
      id: asTrimmedString(section.id, `section-${index + 1}`),
      title: asTrimmedString(section.title, `Section ${index + 1}`),
      description: asTrimmedString(section.description, 'No description available.'),
      entries,
    };
  });
};

export const normalizeUserLinks = (payload: unknown): NormalizedLinkCategory[] => {
  if (!Array.isArray(payload)) return [];

  return payload.map((row, index) => {
    const category = asRecord(row);
    const links = Array.isArray(category.links)
      ? category.links
          .filter((link): link is string => typeof link === 'string')
          .map((link) => link.trim())
          .filter((link) => link.length > 0)
      : [];

    return {
      name: asTrimmedString(category.name, `Category ${index + 1}`),
      links,
    };
  });
};

export const summarizeSubmoduleCounts = (
  submodules: NormalizedSubmoduleInfo[],
  userLinks: NormalizedLinkCategory[],
): SubmoduleSummaryCounts => {
  return {
    clean: submodules.filter((s) => s.status === 'clean').length,
    dirty: submodules.filter((s) => s.status === 'dirty').length,
    missing: submodules.filter((s) => s.status === 'missing').length,
    error: submodules.filter((s) => s.status === 'error').length,
    resources: userLinks.reduce((acc, cat) => acc + cat.links.length, 0),
  };
};
