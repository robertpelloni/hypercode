/**
 * remarkFileLinks - A remark plugin that transforms file path references into clickable links.
 *
 * Supports multiple patterns:
 * 1. Path-style references: `Folder/Subfolder/File` or `README.md`
 * 2. Wiki-style references (Obsidian): `[[Note Name]]` or `[[Folder/Note]]`
 * 3. Wiki-style with alias: `[[Folder/Note|Display Text]]` - links to Note but shows "Display Text"
 * 4. Absolute paths: `/Users/name/Project/file.md` (converted to relative if within projectRoot)
 * 5. Image embeds (Obsidian): `![[image.png]]` - renders image inline
 * 6. Standard markdown links: `[Display Text](file.md)` - converted to internal links if file exists
 *
 * Links are validated against the provided fileTree before conversion.
 * Uses `maestro-file://` protocol for internal file preview handling.
 */

import type { Root, Text, Link, Image } from 'mdast';
import type { FileNode } from '../types/fileTree';
import { buildFileIndex as buildFileIndexShared, type FilePathEntry } from '../../shared/treeUtils';

/**
 * Pre-built indices for file tree lookups.
 * Build these once with buildFileTreeIndices() and reuse across renders.
 */
export interface FileTreeIndices {
	/** Set of all relative paths in the tree */
	allPaths: Set<string>;
	/** Map from filename to array of paths containing that filename */
	filenameIndex: Map<string, string[]>;
}

export interface RemarkFileLinksOptions {
	/** The file tree to validate paths against (used if indices not provided) */
	fileTree?: FileNode[];
	/** Pre-built indices for O(1) lookups - pass this to avoid rebuilding on every render */
	indices?: FileTreeIndices;
	/** Current working directory for proximity-based matching (relative path) */
	cwd: string;
	/** Project root absolute path - used to convert absolute paths to relative */
	projectRoot?: string;
}

/**
 * Build file tree indices for use with remarkFileLinks.
 * Call this once when fileTree changes and pass the result to remarkFileLinks.
 * This avoids O(n) tree traversal on every markdown render.
 */
export function buildFileTreeIndices(fileTree: FileNode[]): FileTreeIndices {
	const fileEntries = buildFileIndex(fileTree);
	const allPaths = new Set(fileEntries.map((e) => e.relativePath));
	const filenameIndex = buildFilenameIndex(fileEntries);
	return { allPaths, filenameIndex };
}

/**
 * Build a flat index of all files in the tree for quick lookup
 * @see {@link buildFileIndexShared} from shared/treeUtils for the underlying implementation
 */
function buildFileIndex(nodes: FileNode[], currentPath = ''): FilePathEntry[] {
	return buildFileIndexShared(nodes, currentPath);
}

/**
 * Build a filename -> paths map for quick wiki-link lookup
 */
function buildFilenameIndex(entries: FilePathEntry[]): Map<string, string[]> {
	const index = new Map<string, string[]>();

	for (const entry of entries) {
		// Index by filename (with and without .md extension)
		const paths = index.get(entry.filename) || [];
		paths.push(entry.relativePath);
		index.set(entry.filename, paths);

		// Also index without .md extension for convenience
		if (entry.filename.endsWith('.md')) {
			const withoutExt = entry.filename.slice(0, -3);
			const pathsNoExt = index.get(withoutExt) || [];
			pathsNoExt.push(entry.relativePath);
			index.set(withoutExt, pathsNoExt);
		}
	}

	return index;
}

/**
 * Calculate path proximity - how "close" a file path is to the cwd
 * Lower score = closer
 */
function calculateProximity(filePath: string, cwd: string): number {
	const fileSegments = filePath.split('/');
	const cwdSegments = cwd.split('/').filter(Boolean);

	// Find common prefix length
	let commonLength = 0;
	for (let i = 0; i < Math.min(fileSegments.length, cwdSegments.length); i++) {
		if (fileSegments[i] === cwdSegments[i]) {
			commonLength++;
		} else {
			break;
		}
	}

	// Score = steps up from cwd + steps down to file
	const stepsUp = cwdSegments.length - commonLength;
	const stepsDown = fileSegments.length - commonLength;

	return stepsUp + stepsDown;
}

/**
 * Find the closest matching path for a wiki-style reference
 */
function findClosestMatch(
	reference: string,
	filenameIndex: Map<string, string[]>,
	allPaths: Set<string>,
	cwd: string
): string | null {
	// First, try exact path match
	if (allPaths.has(reference)) {
		return reference;
	}

	// Try with .md extension
	if (allPaths.has(`${reference}.md`)) {
		return `${reference}.md`;
	}

	// Extract filename from reference (in case it includes a partial path)
	const refParts = reference.split('/');
	const filename = refParts[refParts.length - 1];

	// Look up by filename
	let candidates = filenameIndex.get(filename) || [];

	// Also try with .md appended
	if (candidates.length === 0 && !filename.endsWith('.md')) {
		candidates = filenameIndex.get(`${filename}.md`) || [];
	}

	if (candidates.length === 0) {
		return null;
	}

	if (candidates.length === 1) {
		return candidates[0];
	}

	// Multiple matches - filter by partial path if provided
	if (refParts.length > 1) {
		const partialPath = reference;
		const filtered = candidates.filter(
			(c) => c.endsWith(partialPath) || c.endsWith(`${partialPath}.md`)
		);
		if (filtered.length === 1) {
			return filtered[0];
		}
		if (filtered.length > 1) {
			candidates = filtered;
		}
	}

	// Pick closest to cwd
	let closest = candidates[0];
	let closestScore = calculateProximity(candidates[0], cwd);

	for (let i = 1; i < candidates.length; i++) {
		const score = calculateProximity(candidates[i], cwd);
		if (score < closestScore) {
			closestScore = score;
			closest = candidates[i];
		}
	}

	return closest;
}

/**
 * Check if a path-style reference is valid
 */
function validatePathReference(reference: string, allPaths: Set<string>): string | null {
	// Try exact match
	if (allPaths.has(reference)) {
		return reference;
	}

	// Try with .md extension
	if (allPaths.has(`${reference}.md`)) {
		return `${reference}.md`;
	}

	return null;
}

// Regex patterns
// Image embed: ![[image.png]] or ![[folder/image.png]] or ![[image.png|300]] (with width)
// Must have image extension (png, jpg, jpeg, gif, webp, svg, bmp, ico)
// Optional |width syntax for sizing (e.g., |300 means 300px width)
const IMAGE_EMBED_PATTERN =
	/!\[\[([^\]|]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp|ico))(?:\|(\d+))?\]\]/gi;

// Wiki-style: [[Note Name]] or [[Folder/Note]] or [[Folder/Note|Display Text]]
// The pipe syntax allows custom display text: [[path|display]]
const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// Path-style: Must contain a slash OR end with common file extensions
// Avoid matching URLs (no :// prefix)
const PATH_PATTERN =
	/(?<![:\w])(?:(?:[A-Za-z0-9_-]+\/)+[A-Za-z0-9_.-]+|[A-Za-z0-9_-]+\.(?:md|txt|json|yaml|yml|toml|ts|tsx|js|jsx|py|rb|go|rs|java|c|cpp|h|hpp|css|scss|html|xml|sh|bash|zsh))(?![:\w/])/g;

// Absolute path pattern: Starts with / and contains path segments
// Matches paths like /Users/pedram/Project/file.md or /home/user/docs/note.txt
// Must end with a file extension to avoid matching arbitrary paths
// Supports spaces, unicode, emoji, and special characters in path segments
// Lookahead allows: whitespace, end of string, or common punctuation (including period, backtick)
const ABSOLUTE_PATH_PATTERN =
	/\/(?:[^/\n]+\/)+[^/\n]+\.(?:md|txt|json|yaml|yml|toml|ts|tsx|js|jsx|py|rb|go|rs|java|c|cpp|h|hpp|css|scss|html|xml|sh|bash|zsh)(?=\s|$|[.,;:!?`'")\]}>])/g;

/**
 * The remark plugin
 */
export function remarkFileLinks(options: RemarkFileLinksOptions) {
	const { fileTree, indices, cwd, projectRoot } = options;

	// Use pre-built indices if provided, otherwise build them (fallback for backwards compatibility)
	let allPaths: Set<string>;
	let filenameIndex: Map<string, string[]>;

	if (indices) {
		// Use pre-built indices - O(1) access
		allPaths = indices.allPaths;
		filenameIndex = indices.filenameIndex;
	} else if (fileTree) {
		// Fallback: build indices from fileTree - O(n) traversal
		const fileEntries = buildFileIndex(fileTree);
		allPaths = new Set(fileEntries.map((e) => e.relativePath));
		filenameIndex = buildFilenameIndex(fileEntries);
	} else {
		// No file tree data provided - use empty indices
		allPaths = new Set();
		filenameIndex = new Map();
	}

	// Helper to convert absolute path to relative path
	const toRelativePath = (absPath: string): string | null => {
		if (!projectRoot) return null;
		// Normalize projectRoot to not have trailing slash
		const root = projectRoot.endsWith('/') ? projectRoot.slice(0, -1) : projectRoot;
		if (absPath.startsWith(root + '/')) {
			return absPath.slice(root.length + 1);
		}
		return null;
	};

	// Helper function to recursively walk the tree and visit nodes
	const walk = (node: any, parent?: any, index?: number) => {
		// Process text nodes
		if (node.type === 'text' && parent && index !== undefined) {
			const text = node.value;
			const replacements: (Text | Link | Image)[] = [];
			let lastIndex = 0;

			// Combined processing - collect all matches with their positions
			interface Match {
				start: number;
				end: number;
				display: string;
				resolvedPath: string;
				type: 'link' | 'image';
				isRelativeToCwd?: boolean;
				isFromFileTree?: boolean;
				imageWidth?: number;
			}
			const matches: Match[] = [];

			// Find image embeds first
			let imageMatch;
			IMAGE_EMBED_PATTERN.lastIndex = 0;
			while ((imageMatch = IMAGE_EMBED_PATTERN.exec(text)) !== null) {
				const imagePath = imageMatch[1];
				const widthStr = imageMatch[2];
				const imageWidth = widthStr ? parseInt(widthStr, 10) : undefined;
				const foundPath = findClosestMatch(imagePath, filenameIndex, allPaths, cwd);
				let resolvedPath: string;
				let isRelativeToCwd = false;
				let isFromFileTree = false;

				if (foundPath) {
					resolvedPath = foundPath;
					isFromFileTree = true;
				} else {
					resolvedPath = `_attachments/${imagePath}`;
					isRelativeToCwd = true;
				}

				matches.push({
					start: imageMatch.index,
					end: imageMatch.index + imageMatch[0].length,
					display: imagePath,
					resolvedPath,
					type: 'image',
					isRelativeToCwd,
					isFromFileTree,
					imageWidth,
				});
			}

			// Find wiki-style links
			let wikiMatch;
			WIKI_LINK_PATTERN.lastIndex = 0;
			while ((wikiMatch = WIKI_LINK_PATTERN.exec(text)) !== null) {
				const reference = wikiMatch[1];
				const displayText = wikiMatch[2];
				const isInsideExisting = matches.some(
					(m) => wikiMatch!.index >= m.start && wikiMatch!.index < m.end
				);
				if (isInsideExisting) continue;
				const resolvedPath = findClosestMatch(reference, filenameIndex, allPaths, cwd);
				if (resolvedPath) {
					matches.push({
						start: wikiMatch.index,
						end: wikiMatch.index + wikiMatch[0].length,
						display: displayText || reference,
						resolvedPath,
						type: 'link',
					});
				}
			}

			// Find absolute path references
			if (projectRoot) {
				let absMatch;
				ABSOLUTE_PATH_PATTERN.lastIndex = 0;
				while ((absMatch = ABSOLUTE_PATH_PATTERN.exec(text)) !== null) {
					const absolutePath = absMatch[0];
					const isInsideExisting = matches.some(
						(m) => absMatch!.index >= m.start && absMatch!.index < m.end
					);
					if (isInsideExisting) continue;
					const relativePath = toRelativePath(absolutePath);
					if (relativePath) {
						matches.push({
							start: absMatch.index,
							end: absMatch.index + absMatch[0].length,
							display: absolutePath,
							resolvedPath: relativePath,
							type: 'link',
						});
					}
				}
			}

			// Find path-style references
			let pathMatch;
			PATH_PATTERN.lastIndex = 0;
			while ((pathMatch = PATH_PATTERN.exec(text)) !== null) {
				const reference = pathMatch[0];
				const isInsideExisting = matches.some(
					(m) => pathMatch!.index >= m.start && pathMatch!.index < m.end
				);
				if (isInsideExisting) continue;
				const resolvedPath = validatePathReference(reference, allPaths);
				if (resolvedPath) {
					matches.push({
						start: pathMatch.index,
						end: pathMatch.index + pathMatch[0].length,
						display: reference,
						resolvedPath,
						type: 'link',
					});
				}
			}

			matches.sort((a, b) => a.start - b.start);

			if (matches.length > 0) {
				for (const match of matches) {
					if (match.start > lastIndex) {
						replacements.push({
							type: 'text',
							value: text.slice(lastIndex, match.start),
						});
					}

					if (match.type === 'image') {
						let imageSrc: string;
						if (projectRoot) {
							let fullPath: string;
							if (match.isRelativeToCwd && cwd) {
								fullPath = `${projectRoot}/${cwd}/${match.resolvedPath}`;
							} else {
								fullPath = `${projectRoot}/${match.resolvedPath}`;
							}
							imageSrc = `file://${fullPath}`;
						} else {
							imageSrc = match.resolvedPath;
						}
						const imageStyle = match.imageWidth
							? `width: ${match.imageWidth}px; height: auto;`
							: 'max-width: 100%; height: auto;';

						replacements.push({
							type: 'image',
							url: imageSrc,
							alt: match.display,
							data: {
								hProperties: {
									'data-maestro-image': match.resolvedPath,
									'data-maestro-width': match.imageWidth?.toString(),
									'data-maestro-from-tree': match.isFromFileTree ? 'true' : undefined,
									style: imageStyle,
								},
							},
						} as Image);
					} else {
						replacements.push({
							type: 'link',
							url: `maestro-file://${match.resolvedPath}`,
							data: {
								hProperties: {
									'data-maestro-file': match.resolvedPath,
								},
							},
							children: [{ type: 'text', value: match.display }],
						});
					}
					lastIndex = match.end;
				}

				if (lastIndex < text.length) {
					replacements.push({
						type: 'text',
						value: text.slice(lastIndex),
					});
				}

				parent.children.splice(index, 1, ...replacements);
				return index + replacements.length;
			}
		}

		// Process inlineCode nodes
		if (node.type === 'inlineCode' && parent && index !== undefined) {
			const code = node.value;
			const wikiMatch = code.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
			if (wikiMatch) {
				const reference = wikiMatch[1];
				const displayText = wikiMatch[2];
				const resolvedPath = findClosestMatch(reference, filenameIndex, allPaths, cwd);
				if (resolvedPath) {
					const link: Link = {
						type: 'link',
						url: `maestro-file://${resolvedPath}`,
						data: {
							hProperties: {
								'data-maestro-file': resolvedPath,
							},
						},
						children: [{ type: 'text', value: displayText || reference }],
					};
					parent.children.splice(index, 1, link);
					return index + 1;
				}
			}

			if (projectRoot && code.startsWith('/')) {
				const extMatch = code.match(
					/\.(?:md|txt|json|yaml|yml|toml|ts|tsx|js|jsx|py|rb|go|rs|java|c|cpp|h|hpp|css|scss|html|xml|sh|bash|zsh)$/i
				);
				if (extMatch) {
					const relativePath = toRelativePath(code);
					if (relativePath) {
						const filename = code.split('/').pop() || code;
						const link: Link = {
							type: 'link',
							url: `maestro-file://${relativePath}`,
							data: {
								hProperties: {
									'data-maestro-file': relativePath,
								},
							},
							children: [{ type: 'text', value: filename }],
						};
						parent.children.splice(index, 1, link);
						return index + 1;
					}
				}
			}

			const hasSlash = code.includes('/') && !code.includes('://');
			const hasValidExt =
				/\.(?:md|txt|json|yaml|yml|toml|ts|tsx|js|jsx|py|rb|go|rs|java|c|cpp|h|hpp|css|scss|html|xml|sh|bash|zsh)$/i.test(
					code
				);
			if ((hasSlash || hasValidExt) && allPaths.has(code)) {
				const filename = code.split('/').pop() || code;
				const link: Link = {
					type: 'link',
					url: `maestro-file://${code}`,
					data: {
						hProperties: {
							'data-maestro-file': code,
						},
					},
					children: [{ type: 'text', value: filename }],
				};
				parent.children.splice(index, 1, link);
				return index + 1;
			}
		}

		// Process existing link nodes
		if (node.type === 'link') {
			const href = node.url;
			if (
				href &&
				!href.startsWith('maestro-file://') &&
				!href.startsWith('http://') &&
				!href.startsWith('https://') &&
				!href.startsWith('mailto:') &&
				!href.startsWith('#') &&
				!href.startsWith('file://')
			) {
				const decodedHref = decodeURIComponent(href);
				const resolvedPath = findClosestMatch(decodedHref, filenameIndex, allPaths, cwd);
				if (resolvedPath) {
					node.url = `maestro-file://${resolvedPath}`;
					node.data = node.data || {};
					(node.data as any).hProperties = {
						...((node.data as any).hProperties || {}),
						'data-maestro-file': resolvedPath,
					};
				}
			}
		}

		// Recursively visit children
		if (node.children && Array.isArray(node.children)) {
			for (let i = 0; i < node.children.length; i++) {
				const nextIndex = walk(node.children[i], node, i);
				if (nextIndex !== undefined) {
					i = nextIndex - 1;
				}
			}
		}
	};

	return (tree: Root) => {
		walk(tree);
	};
}

export default remarkFileLinks;
