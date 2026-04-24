
export interface DiffStats {
  filesChanged: number;
  additions: number;
  deletions: number;
}

export function calculateDiffStats(diff: string): DiffStats {
  let additions = 0;
  let deletions = 0;
  let filesChanged = 0;

  const lines = diff.split('\n');
  
  for (const line of lines) {
    // Count files based on "diff --git" header
    if (line.startsWith('diff --git')) {
      filesChanged++;
    }
    // Count additions/deletions, excluding headers
    else if (line.startsWith('+++') || line.startsWith('---')) {
      continue;
    }
    else if (line.startsWith('+')) {
      additions++;
    }
    else if (line.startsWith('-')) {
      deletions++;
    }
  }

  // Fallback if no "diff --git" headers found but we have content
  if (filesChanged === 0 && (additions > 0 || deletions > 0)) {
      filesChanged = 1;
  }

  return { filesChanged, additions, deletions };
}
