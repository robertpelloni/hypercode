'use client';

import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PlanContent } from './plan-content';

interface ActivityContentProps {
  content: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const formatContent = (content: string, metadata?: Record<string, any>): React.ReactNode => {
  const trimmedContent = content.trim();

  // 1. Handle Placeholders
  if (trimmedContent === '[userMessaged]' || trimmedContent === '[agentMessaged]') {
      // Try to recover content from metadata if available
      const realContent = metadata?.original_content || metadata?.message || metadata?.text;
      if (realContent && typeof realContent === 'string') {
           // If we found real content, recursively format it
           return formatContent(realContent, undefined);
      }

      if (trimmedContent === '[userMessaged]') return <span className="text-muted-foreground italic">Message sent</span>;
      if (trimmedContent === '[agentMessaged]') return <span className="text-muted-foreground italic">Agent working...</span>;
  }

  // 2. Try JSON Parsing
  if (trimmedContent.startsWith('{') || trimmedContent.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmedContent);

        // Handle Empty JSON
        if (typeof parsed === 'object' && parsed !== null) {
           if (Array.isArray(parsed) && parsed.length === 0) return null;
           if (!Array.isArray(parsed) && Object.keys(parsed).length === 0) return null;
        }

        // Handle Plan Content
        if (Array.isArray(parsed) || (parsed.steps && Array.isArray(parsed.steps))) {
          return <PlanContent content={parsed} />;
        }

        // Handle Wrapped Messages (e.g. { "message": "..." } or { "content": "..." })
        if (!Array.isArray(parsed) && typeof parsed === 'object') {
           const possibleContent = parsed.message || parsed.content || parsed.text || parsed.response || parsed.msg || parsed.output || parsed.result || parsed.userMessage;
           if (possibleContent && typeof possibleContent === 'string') {
               // Recursively format the extracted content
               return formatContent(possibleContent, metadata);
           }
        }

        return <pre className="text-[11px] overflow-x-auto font-mono bg-muted/50 p-2 rounded whitespace-pre-wrap break-words">{JSON.stringify(parsed, null, 2)}</pre>;
      } catch {
        // Fall through to markdown
      }
  }

  // 3. Render as Markdown
  return (
      <div className="prose prose-sm dark:prose-invert max-w-none break-words whitespace-pre-wrap 
        prose-p:text-base prose-p:leading-relaxed prose-p:text-zinc-100 
        prose-headings:text-base prose-headings:font-bold prose-headings:text-white prose-headings:mt-6 prose-headings:mb-3
        prose-ul:text-base prose-ul:text-zinc-200 prose-ol:text-base prose-ol:text-zinc-200
        prose-li:my-2 prose-li:leading-relaxed
        prose-code:text-[13px] prose-code:bg-black prose-code:text-purple-300 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
        prose-pre:text-[13px] prose-pre:bg-zinc-950 prose-pre:p-4 prose-pre:rounded-xl prose-pre:border prose-pre:border-white/10 prose-pre:overflow-x-auto
        prose-blockquote:text-base prose-blockquote:border-l-purple-500 prose-blockquote:text-zinc-400 prose-blockquote:italic
        prose-strong:font-bold prose-strong:text-white
        overflow-hidden">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
  );
};

export const ActivityContent = memo(function ActivityContent({ content, metadata }: ActivityContentProps) {
  const formatted = useMemo(() => formatContent(content, metadata), [content, metadata]);
  return <>{formatted}</>;
});
