import type { Activity, Session } from '@/types/jules';

export type ActivityExportFormat = 'json' | 'txt' | 'md';

export interface ActivityExportMetadata {
  extension: ActivityExportFormat;
  mimeType: string;
  menuLabel: string;
}

export function getActivityExportMetadata(format: ActivityExportFormat): ActivityExportMetadata {
  switch (format) {
    case 'json':
      return {
        extension: 'json',
        mimeType: 'application/json',
        menuLabel: 'JSON',
      };
    case 'md':
      return {
        extension: 'md',
        mimeType: 'text/markdown',
        menuLabel: 'Markdown',
      };
    case 'txt':
      return {
        extension: 'txt',
        mimeType: 'text/plain',
        menuLabel: 'TXT',
      };
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildActivityHeader(activity: Activity, formatDate: (dateString: string) => string): string {
  return `[${formatDate(activity.createdAt)}] ${activity.role.toUpperCase()} (${activity.type})`;
}

export function buildActivityExportContent(
  format: ActivityExportFormat,
  activities: Activity[],
  formatDate: (dateString: string) => string,
): string {
  if (format === 'json') {
    return JSON.stringify(activities, null, 2);
  }

  return activities.map((activity) => {
    const header = buildActivityHeader(activity, formatDate);
    return format === 'md'
      ? `### ${header}\n\n${activity.content}\n\n`
      : `${header}\n${activity.content}\n\n-------------------\n\n`;
  }).join('');
}

export function buildPrintableTranscriptHtml(
  session: Pick<Session, 'title' | 'sourceId' | 'branch'>,
  activities: Activity[],
  formatDate: (dateString: string) => string,
): string {
  const transcriptHtml = activities.map((activity) => {
    const header = buildActivityHeader(activity, formatDate);
    return `
      <section class="entry">
        <div class="entry-header">${escapeHtml(header)}</div>
        <pre class="entry-body">${escapeHtml(activity.content ?? '')}</pre>
      </section>
    `;
  }).join('');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(session.title || 'Session Transcript')}</title>
        <style>
          body {
            font-family: Inter, Arial, sans-serif;
            margin: 24px;
            color: #111827;
            background: #ffffff;
          }

          h1 {
            font-size: 20px;
            margin: 0 0 8px;
          }

          .meta {
            color: #6b7280;
            font-size: 12px;
            margin-bottom: 24px;
          }

          .entry {
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 12px;
            break-inside: avoid;
          }

          .entry-header {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #4b5563;
            margin-bottom: 8px;
          }

          .entry-body {
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
            font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(session.title || 'Session Transcript')}</h1>
        <div class="meta">${escapeHtml(session.sourceId || 'Unknown source')} • ${escapeHtml(session.branch || 'main')}</div>
        ${transcriptHtml}
      </body>
    </html>
  `;
}