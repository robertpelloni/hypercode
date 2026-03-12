'use client';

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { PlanContent } from './plan-content';

type ActivityMetadata = Record<string, unknown> | undefined;

interface ActivityContentProps {
  content: string;
  metadata?: ActivityMetadata;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstNonEmptyString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function getMetadataText(metadata?: ActivityMetadata): string | null {
  if (!metadata) {
    return null;
  }

  const directValue = firstNonEmptyString([
    metadata.original_content,
    metadata.message,
    metadata.text,
    metadata.content,
  ]);

  if (directValue) {
    return directValue;
  }

  const nestedKeys = ['agentMessaged', 'userMessage', 'userMessaged'] as const;

  for (const key of nestedKeys) {
    const nestedValue = metadata[key];
    if (!isRecord(nestedValue)) {
      continue;
    }

    const nestedText = firstNonEmptyString([
      nestedValue.agentMessage,
      nestedValue.message,
      nestedValue.content,
      nestedValue.text,
    ]);

    if (nestedText) {
      return nestedText;
    }
  }

  return null;
}

function resolveActivityTextContent(
  content: string,
  metadata?: ActivityMetadata,
  options?: { placeholderFallback?: boolean },
): string | null {
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return null;
  }

  // 1. Handle Placeholders
  if (trimmedContent === '[userMessaged]' || trimmedContent === '[agentMessaged]') {
    const realContent = getMetadataText(metadata);
    if (realContent) {
      return resolveActivityTextContent(realContent, undefined, options);
    }

    if (options?.placeholderFallback) {
      return trimmedContent === '[userMessaged]' ? 'Message sent' : 'Agent working...';
    }

    return null;
  }

  // 2. Try JSON Parsing
  if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmedContent);

      if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed) && parsed.length === 0) {
          return null;
        }

        if (!Array.isArray(parsed) && Object.keys(parsed).length === 0) {
          return null;
        }
      }

      if (isRecord(parsed)) {
        const possibleContent = firstNonEmptyString([
          parsed.message,
          parsed.content,
          parsed.text,
          parsed.response,
          parsed.msg,
          parsed.output,
          parsed.result,
          parsed.userMessage,
        ]);

        if (possibleContent) {
          return resolveActivityTextContent(possibleContent, metadata, options);
        }
      }

      return content;
    } catch {
      // Fall through to markdown/plain text
    }
  }

  return content;
}

export function getCopyableActivityContent(content: string, metadata?: ActivityMetadata): string | null {
  return resolveActivityTextContent(content, metadata);
}

export function hasVisibleActivityContent(content: string, metadata?: ActivityMetadata): boolean {
  return resolveActivityTextContent(content, metadata, { placeholderFallback: true }) !== null;
}

const formatContent = (content: string, metadata?: ActivityMetadata): React.ReactNode => {
  const resolvedContent = resolveActivityTextContent(content, metadata, { placeholderFallback: true });

  if (resolvedContent === null) {
    return null;
  }

  const trimmedContent = resolvedContent.trim();

  // 1. Try JSON Parsing
  if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmedContent);

      // Handle Empty JSON
      if (typeof parsed === 'object' && parsed !== null) {
        if (Array.isArray(parsed) && parsed.length === 0) return null;
        if (!Array.isArray(parsed) && Object.keys(parsed).length === 0) return null;
      }

      // Handle Plan Content
      if (Array.isArray(parsed) || (isRecord(parsed) && Array.isArray(parsed.steps))) {
        return <PlanContent content={parsed} />;
      }

      return <pre className="text-[11px] overflow-x-auto font-mono bg-muted/50 p-2 rounded whitespace-pre-wrap break-words">{JSON.stringify(parsed, null, 2)}</pre>;
    } catch {
      // Fall through to markdown/plain text
    }
  }

  // 2. Render as Markdown
  return (
      <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap prose-p:text-xs prose-p:leading-relaxed prose-p:break-words prose-headings:text-xs prose-headings:font-semibold prose-headings:mb-1 prose-headings:mt-2 prose-ul:text-xs prose-ol:text-xs prose-li:text-xs prose-li:my-0.5 prose-code:text-[11px] prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:break-all prose-pre:text-[11px] prose-pre:bg-muted prose-pre:p-2 prose-pre:overflow-x-auto prose-pre:whitespace-pre-wrap prose-pre:break-all prose-blockquote:text-xs prose-blockquote:border-l-primary prose-strong:font-semibold overflow-hidden">
        <ReactMarkdown>{resolvedContent}</ReactMarkdown>
      </div>
  );
};

export const ActivityContent = memo(function ActivityContent({ content, metadata }: ActivityContentProps) {
  const formatted = useMemo(() => formatContent(content, metadata), [content, metadata]);
  return <>{formatted}</>;
});
