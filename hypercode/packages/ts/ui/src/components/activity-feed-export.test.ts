import type { Activity } from '@/types/jules';
import { buildActivityExportContent, buildPrintableTranscriptHtml, getActivityExportMetadata } from './activity-feed-export';

const activities: Activity[] = [
  {
    id: 'a1',
    sessionId: 's1',
    type: 'message',
    role: 'user',
    content: 'Hello **world**',
    createdAt: '2026-03-10T00:00:00.000Z',
  },
  {
    id: 'a2',
    sessionId: 's1',
    type: 'result',
    role: 'agent',
    content: '<script>alert("nope")</script>\nDone.',
    createdAt: '2026-03-10T00:01:00.000Z',
  },
];

const formatDate = (value: string) => value;

describe('activity-feed-export helpers', () => {
  it('returns format metadata with correct mime types and labels', () => {
    expect(getActivityExportMetadata('md')).toEqual({
      extension: 'md',
      mimeType: 'text/markdown',
      menuLabel: 'Markdown',
    });

    expect(getActivityExportMetadata('txt')).toEqual({
      extension: 'txt',
      mimeType: 'text/plain',
      menuLabel: 'TXT',
    });

    expect(getActivityExportMetadata('json')).toEqual({
      extension: 'json',
      mimeType: 'application/json',
      menuLabel: 'JSON',
    });
  });

  it('builds markdown transcript exports', () => {
    const content = buildActivityExportContent('md', activities, formatDate);

    expect(content).toContain('### [2026-03-10T00:00:00.000Z] USER (message)');
    expect(content).toContain('Hello **world**');
    expect(content).toContain('### [2026-03-10T00:01:00.000Z] AGENT (result)');
  });

  it('builds text transcript exports', () => {
    const content = buildActivityExportContent('txt', activities, formatDate);

    expect(content).toContain('[2026-03-10T00:00:00.000Z] USER (message)');
    expect(content).toContain('-------------------');
    expect(content).toContain('Done.');
  });

  it('builds json transcript exports', () => {
    const content = buildActivityExportContent('json', activities, formatDate);
    const parsed = JSON.parse(content) as Activity[];

    expect(parsed).toHaveLength(2);
    expect(parsed[1]?.content).toContain('Done.');
  });

  it('builds escaped printable transcript html', () => {
    const html = buildPrintableTranscriptHtml(
      { title: 'My <Session>', sourceId: 'owner/repo', branch: 'feature/export-menu' },
      activities,
      formatDate,
    );

    expect(html).toContain('<h1>My &lt;Session&gt;</h1>');
    expect(html).toContain('owner/repo • feature/export-menu');
    expect(html).toContain('&lt;script&gt;alert(&quot;nope&quot;)&lt;/script&gt;');
    expect(html).toContain('entry-header');
  });
});