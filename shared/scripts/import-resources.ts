import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import {
  ResourceIndexItem,
  normalizeResource,
  normalizeUrl,
  deriveSource,
  deriveKind,
  mergeCategories
} from '../packages/core/src/utils/resourceIndex';

const resourcesListPath = path.join(process.cwd(), 'scripts', 'resources-list.json');
const resourceIndexPath = path.join(process.cwd(), 'packages', 'core', 'src', 'data', 'resource-index.json');

// Ensure data directory exists
const dataDir = path.dirname(resourceIndexPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

interface ResourceCategory {
  category: string;
  path: string;
  links: string[];
}

const parseJson = (filePath: string) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
};

const resourcesList: ResourceCategory[] = parseJson(resourcesListPath);

const invalidGithubLinks: string[] = [];

let resourceIndex: ResourceIndexItem[] = [];
if (fs.existsSync(resourceIndexPath)) {
  try {
    const parsed = parseJson(resourceIndexPath);
    const list = Array.isArray(parsed) ? parsed : (parsed.resources || []);
    resourceIndex = list.map((item: ResourceIndexItem) => normalizeResource(item));
  } catch (e) {
    console.error("Error reading resource index, starting fresh.");
  }
}

const indexByNormalized = new Map<string, ResourceIndexItem>();
resourceIndex.forEach(item => {
  indexByNormalized.set(item.normalized_url || normalizeUrl(item.url), normalizeResource(item));
});

const getGitHubRepoInfo = (url: string) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'github.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      if (parts.length === 2) return { owner: parts[0], repo: parts[1] };
    }
  } catch {}
  return null;
};

const ensureShallowConfig = (submodulePath: string) => {
  const normalizedPath = submodulePath.replace(/\\/g, '/');
  execSync(`git config -f .gitmodules submodule.${normalizedPath}.shallow true`, { stdio: 'ignore' });
};

console.log("Starting submodule import...");

for (const group of resourcesList) {
  const targetDir = path.join(process.cwd(), group.path);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  for (const link of group.links) {
    const normalized = normalizeUrl(link);
    const source = deriveSource(normalized);
    const kind = deriveKind(normalized);

    let entry = indexByNormalized.get(normalized);

    const repoInfo = source === 'github' ? getGitHubRepoInfo(normalized) : null;
    const isGitHubRepo = source === 'github' && repoInfo !== null;
    const shouldSubmodule = isGitHubRepo;
    const repoName = repoInfo?.repo;
    const submodulePath = shouldSubmodule && repoName ? path.join(group.path, repoName) : undefined;
    const fullPath = submodulePath ? path.join(process.cwd(), submodulePath) : undefined;
    const homepageUrl = source !== 'github' || !isGitHubRepo ? normalized : undefined;
    const repoUrl = isGitHubRepo ? normalized : undefined;

    if (source === 'github' && !repoInfo) {
      invalidGithubLinks.push(normalized);
    }

    if (entry) {
      entry = mergeCategories(entry, group.category);
      if (!entry.path && submodulePath) {
        entry.path = submodulePath;
      }
      if (!shouldSubmodule && entry.path && entry.path.replace(/\\/g, '/').endsWith('/repo')) {
        entry.path = undefined;
        entry.submodule = false;
      }
      if (!isGitHubRepo) {
        entry.path = undefined;
        entry.submodule = false;
        if (entry.repo_url === normalized) {
          entry.repo_url = undefined;
        }
        if (!entry.homepage_url) {
          entry.homepage_url = normalized;
        }
      }
    } else {
      entry = normalizeResource({
        url: link,
        category: group.category,
        path: submodulePath,
        source,
        kind,
        submodule: false,
        repo_url: repoUrl,
        homepage_url: homepageUrl
      });
    }

    if (shouldSubmodule && submodulePath && fullPath) {
      if (fs.existsSync(fullPath)) {
        console.log(`Skipping existing submodule: ${submodulePath}`);
        entry.submodule = true;
      } else {
        try {
          console.log(`Adding submodule: ${normalized} -> ${submodulePath}`);
          execSync(`git submodule add --depth 1 --force "${normalized}" "${submodulePath}"`, { stdio: 'inherit' });
          ensureShallowConfig(submodulePath);
          entry.submodule = true;
        } catch (error) {
          console.error(`Failed to add submodule ${normalized}:`, error);
        }
      }
    }

    indexByNormalized.set(normalized, normalizeResource(entry));
  }
}

const mergedIndex = Array.from(indexByNormalized.values()).sort((a, b) => {
  if (a.category === b.category) return a.name.localeCompare(b.name);
  return a.category.localeCompare(b.category);
});

fs.writeFileSync(resourceIndexPath, JSON.stringify(mergedIndex, null, 2));
if (invalidGithubLinks.length > 0) {
  const uniqueInvalid = Array.from(new Set(invalidGithubLinks));
  console.log(`Skipped ${uniqueInvalid.length} non-repo GitHub URLs (kept in index).`);
}
console.log("Import complete. Resource index updated.");
