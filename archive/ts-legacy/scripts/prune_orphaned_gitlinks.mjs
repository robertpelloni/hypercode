import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const GITMODULES_FILE = path.join(ROOT_DIR, '.gitmodules');

function parseGitmodules(content) {
	const paths = new Set();
	let currentPath = null;

	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();

		if (!line) {
			continue;
		}

		if (line.startsWith('[submodule ')) {
			currentPath = null;
			continue;
		}

		const match = line.match(/^path\s*=\s*(.+)$/);
		if (match) {
			currentPath = match[1].trim();
			paths.add(currentPath);
		}
	}

	return paths;
}

function runGit(args, options = {}) {
	const result = spawnSync('git', args, {
		cwd: ROOT_DIR,
		encoding: 'utf-8',
		input: options.input,
		maxBuffer: 64 * 1024 * 1024,
	});

	if (result.error) {
		throw result.error;
	}

	if (result.status !== 0) {
		throw new Error((result.stderr || result.stdout || `git ${args.join(' ')} failed`).trim());
	}

	return result.stdout.trim();
}

function getGitlinks() {
	const output = runGit(['ls-files', '--stage']);
	return output
		.split(/\r?\n/)
		.filter(Boolean)
		.map((line) => {
			const match = line.match(/^160000\s+([0-9a-f]+)\s+\d+\t(.+)$/);
			if (!match) {
				return null;
			}

			return { sha: match[1], path: match[2] };
		})
		.filter(Boolean);
}

function classifyOrphans(registeredPaths, gitlinks) {
	const orphaned = gitlinks
		.filter((entry) => !registeredPaths.has(entry.path))
		.sort((left, right) => left.path.localeCompare(right.path));

	const existing = orphaned.filter((entry) => fs.existsSync(path.join(ROOT_DIR, entry.path)));
	const missing = orphaned.filter((entry) => !fs.existsSync(path.join(ROOT_DIR, entry.path)));

	return { orphaned, existing, missing };
}

function printSummary({ registeredCount, gitlinkCount, orphaned, existing, missing }) {
	console.log(`Registered submodules: ${registeredCount}`);
	console.log(`Tracked gitlinks: ${gitlinkCount}`);
	console.log(`Orphaned gitlinks: ${orphaned.length}`);
	console.log(`- Missing on disk: ${missing.length}`);
	console.log(`- Still present on disk: ${existing.length}`);

	if (existing.length > 0) {
		console.log('\nExisting orphaned paths that will become untracked if removed from the index:');
		for (const entry of existing) {
			console.log(`- ${entry.path}`);
		}
	}
}

function applyRemoval(orphaned) {
	if (orphaned.length === 0) {
		return;
	}

	const input = Buffer.from(orphaned.map((entry) => entry.path).join('\0') + '\0', 'utf-8');
	runGit(['update-index', '--force-remove', '-z', '--stdin'], { input });
}

function main() {
	if (!fs.existsSync(GITMODULES_FILE)) {
		throw new Error('.gitmodules not found');
	}

	const registeredPaths = parseGitmodules(fs.readFileSync(GITMODULES_FILE, 'utf-8'));
	const gitlinks = getGitlinks();
	const { orphaned, existing, missing } = classifyOrphans(registeredPaths, gitlinks);

	printSummary({
		registeredCount: registeredPaths.size,
		gitlinkCount: gitlinks.length,
		orphaned,
		existing,
		missing,
	});

	if (!process.argv.includes('--apply')) {
		console.log('\nDry run only. Re-run with --apply to remove orphaned gitlinks from the index.');
		return;
	}

	applyRemoval(orphaned);
	console.log(`\nRemoved ${orphaned.length} orphaned gitlink entries from the index.`);
	if (existing.length > 0) {
		console.log('The existing orphaned directories remain on disk and may now appear as untracked paths.');
	}
	console.log('Re-run `git submodule status` to confirm the live registry is now clean.');
}

main();