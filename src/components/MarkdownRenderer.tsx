import React, { useEffect, useMemo, useRef } from 'react';
import { Marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import { useAppStore } from '@/src/store/useAppStore';

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const markedInstance = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html({ text }) {
      // Escape raw HTML in markdown input to prevent injection
      return escapeHtml(text);
    },
    code({ text, lang }) {
      const language = lang && hljs.getLanguage(lang) ? lang : '';
      const highlighted = language
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value;
      const safeLabel = escapeHtml(language || 'text');
      return `<div class="srishti-code-block relative group my-3"><div class="flex items-center justify-between px-3 py-1.5 text-xs text-slate-400 bg-[#0b0e14] border border-b-0 border-white/10 rounded-t-xl font-mono"><span>${safeLabel}</span><button type="button" data-copy-code="true" class="text-xs text-slate-300 hover:text-amber-400 transition cursor-pointer">Copy</button></div><pre class="!mt-0 !rounded-t-none"><code class="hljs ${language ? `language-${escapeHtml(language)}` : ''}">${highlighted}</code></pre></div>`;
    },
  },
});

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const showToast = useAppStore((s) => s.showToast);

  const sanitizedHtml = useMemo(() => {
    const rawHtml = markedInstance.parse(content || '') as string;
    return DOMPurify.sanitize(rawHtml, {
      ADD_ATTR: ['data-copy-code', 'type', 'class'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    });
  }, [content]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest('button[data-copy-code="true"]');
      if (!btn) return;
      const block = btn.closest('.srishti-code-block');
      const codeEl = block?.querySelector('pre code');
      if (codeEl && codeEl.textContent) {
        navigator.clipboard?.writeText(codeEl.textContent);
        btn.textContent = 'Copied';
        showToast('Code copied to clipboard', 'success');
        setTimeout(() => {
          btn.textContent = 'Copy';
        }, 1600);
      }
    };

    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [showToast]);

  return (
    <div
      ref={containerRef}
      className={`srishti-prose ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};
