/**
 * Tiny, safe Markdown renderer.
 *
 * Supports: headings (#..######), bold **x**, italic *x*, inline `code`,
 * links [text](url), unordered (- ) and ordered (1. ) lists, blockquotes (> ),
 * and paragraphs. No raw HTML, no images, no tables — keeps the surface
 * small and safe.
 *
 * If you'd like richer formatting (e.g. markdown-it), add it as a dependency
 * and swap this implementation. The component contract is the same: take a
 * string, return sanitized React nodes.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownProps {
  source: string | null | undefined;
  className?: string;
}

// Escape any HTML to plain text first.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Convert escaped text to React with markdown rules. Pure function.
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const remaining = text;
  let counter = 0;

  // Patterns: [text](url), `code`, **bold**, *italic*
  const inline = /\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  while ((m = inline.exec(remaining)) !== null) {
    if (m.index > lastIdx) {
      out.push(remaining.slice(lastIdx, m.index));
    }
    if (m[1] != null && m[2] != null) {
      const label = m[1];
      const url = m[2];
      const safeUrl = /^(https?:|mailto:|\/)/i.test(url) ? url : '#';
      out.push(
        <a key={`${keyPrefix}-l-${counter++}`} href={safeUrl} target="_blank" rel="noopener noreferrer" className="text-foreground underline">
          {label}
        </a>,
      );
    } else if (m[3] != null) {
      out.push(<code key={`${keyPrefix}-c-${counter++}`} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">{m[3]}</code>);
    } else if (m[4] != null) {
      out.push(<strong key={`${keyPrefix}-b-${counter++}`}>{m[4]}</strong>);
    } else if (m[5] != null) {
      out.push(<em key={`${keyPrefix}-i-${counter++}`}>{m[5]}</em>);
    }
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < remaining.length) {
    out.push(remaining.slice(lastIdx));
  }
  return out;
}

interface Block {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'quote' | 'code';
  content: string | string[];
}

function parse(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Heading
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      blocks.push({ type: level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3', content: heading[2] });
      i++;
      continue;
    }
    // Code block
    if (line.startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', content: code.join('\n') });
      i++;
      continue;
    }
    // Quote
    if (line.startsWith('> ')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quote.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ type: 'quote', content: quote.join('\n') });
      continue;
    }
    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', content: items });
      continue;
    }
    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', content: items });
      continue;
    }
    // Empty line: skip
    if (line.trim() === '') {
      i++;
      continue;
    }
    // Paragraph: collect consecutive non-empty lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith('> ') &&
      !lines[i].startsWith('```')
    ) {
      para.push(lines[i]);
      i++;
    }
    if (para.length) blocks.push({ type: 'p', content: para.join('\n') });
  }
  return blocks;
}

export function Markdown({ source, className }: MarkdownProps) {
  if (!source || !source.trim()) {
    return <p className={cn('text-sm text-muted-foreground', className)}>—</p>;
  }
  const blocks = parse(escapeHtml(source));
  let keyCounter = 0;
  return (
    <div className={cn('prose-bc space-y-2 text-sm leading-relaxed', className)}>
      {blocks.map((b) => {
        const k = `b-${keyCounter++}`;
        if (b.type === 'h1') {
          return <h1 key={k} className="text-xl font-semibold">{renderInline(b.content as string, k)}</h1>;
        }
        if (b.type === 'h2') {
          return <h2 key={k} className="text-lg font-semibold">{renderInline(b.content as string, k)}</h2>;
        }
        if (b.type === 'h3') {
          return <h3 key={k} className="text-base font-semibold">{renderInline(b.content as string, k)}</h3>;
        }
        if (b.type === 'p') {
          return <p key={k} className="leading-relaxed">{renderInline(b.content as string, k)}</p>;
        }
        if (b.type === 'ul') {
          return (
            <ul key={k} className="list-disc space-y-1 pl-5">
              {(b.content as string[]).map((it, i) => (
                <li key={`${k}-${i}`}>{renderInline(it, `${k}-${i}`)}</li>
              ))}
            </ul>
          );
        }
        if (b.type === 'ol') {
          return (
            <ol key={k} className="list-decimal space-y-1 pl-5">
              {(b.content as string[]).map((it, i) => (
                <li key={`${k}-${i}`}>{renderInline(it, `${k}-${i}`)}</li>
              ))}
            </ol>
          );
        }
        if (b.type === 'quote') {
          return (
            <blockquote key={k} className="border-l-2 border-foreground/30 pl-3 italic text-muted-foreground">
              {renderInline(b.content as string, k)}
            </blockquote>
          );
        }
        if (b.type === 'code') {
          return (
            <pre key={k} className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
              <code>{b.content as string}</code>
            </pre>
          );
        }
        return null;
      })}
    </div>
  );
}
