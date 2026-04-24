import { Session, Activity } from '@jules/shared';

export function exportSessionToJSON(session: Session, activities: Activity[]) {
  const data = {
    session,
    activities,
    exportedAt: new Date().toISOString(),
    version: "1.0"
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jules-session-${session.id}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportSessionToMarkdown(session: Session, activities: Activity[]) {
  let md = `# ${session.title || "Untitled Session"}\n\n`;
  md += `**ID:** ${session.id}\n`;
  md += `**Date:** ${new Date(session.createdAt).toLocaleString()}\n`;
  md += `**Status:** ${session.status}\n`;
  md += `**Source:** ${session.sourceId}\n`;
  if (session.branch) md += `**Branch:** ${session.branch}\n`;
  md += `\n`;

  md += `## Initial Prompt\n\n${session.prompt || "No prompt provided"}\n\n`;

  if (session.summary) {
    md += `## Summary\n\n${session.summary}\n\n`;
  }

  md += `## Activity Log\n\n`;

  activities.forEach((activity) => {
    const role = activity.role === 'user' ? 'User' : 'Agent';
    const date = new Date(activity.createdAt).toLocaleString();

    md += `### ${role} (${date})\n\n`;

    if (activity.type === 'plan') {
      md += `**Plan:**\n\n`;
    } else if (activity.type === 'error') {
      md += `**Error:**\n\n`;
    }

    md += `${activity.content}\n\n`;

    if (activity.bashOutput) {
      md += `**Terminal Output:**\n\`\`\`bash\n${activity.bashOutput}\n\`\`\`\n\n`;
    }

    if (activity.diff) {
      md += `**Code Diff:**\n\`\`\`diff\n${activity.diff}\n\`\`\`\n\n`;
    }

    if (activity.metadata && Object.keys(activity.metadata).length > 0) {
      md += `**Metadata:**\n\`\`\`json\n${JSON.stringify(activity.metadata, null, 2)}\n\`\`\`\n\n`;
    }

    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `jules-session-${session.id}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

