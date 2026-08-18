// Atlas — Minimal markdown renderer. A deliberately small hand-written
// subset (headings, bold/italic/strikethrough, lists incl. task checkboxes,
// blockquotes, inline+fenced code, links) rather than full CommonMark —
// covers what real notes actually use without a dependency.
//
// HTML is escaped before anything else runs, so pasting `<script>`-like text
// into a note and switching to Preview can't execute anything.

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SAFE_SCHEMES = /^(https?:|mailto:)/i;

function safeHref(url) {
  try {
    // Allow relative URLs (no scheme) and safe schemes
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !SAFE_SCHEMES.test(url)) {
      return null; // Unsafe scheme — render as plain text
    }
  } catch {
    return null;
  }
  return url;
}

function inlineFormat(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
      const safe = safeHref(href);
      return safe
        ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`
        : label; // Render as plain text if URL is unsafe
    });
}

export function renderMarkdown(source) {
  const escaped = escapeHtml(source || '');

  // Protect fenced code blocks and inline code spans from every other
  // transform below by pulling them out into placeholders first.
  const blocks = [];
  let text = escaped.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const i = blocks.length;
    blocks.push(`<pre class="md-code-block"><code${lang ? ` class="language-${lang}"` : ''}>${code.replace(/\n$/, '')}</code></pre>`);
    return `\u0000B${i}\u0000`;
  });

  const spans = [];
  text = text.replace(/`([^`]+)`/g, (_, code) => {
    const i = spans.length;
    spans.push(`<code>${code}</code>`);
    return `\u0000S${i}\u0000`;
  });

  const lines = text.split('\n');
  const out = [];
  let listType = null; // 'ul' | 'ol' | null
  let inQuote = false;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      out.push(`<p>${paragraph.join(' ')}</p>`);
      paragraph = [];
    }
  };
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      out.push('</blockquote>');
      inQuote = false;
    }
  };

  for (const line of lines) {
    if (/^\u0000B\d+\u0000$/.test(line.trim())) {
      flushParagraph();
      closeList();
      closeQuote();
      out.push(line.trim());
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      closeQuote();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      closeQuote();
      const level = heading[1].length;
      out.push(`<h${level}>${inlineFormat(heading[2])}</h${level}>`);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeList();
      if (!inQuote) {
        out.push('<blockquote>');
        inQuote = true;
      }
      out.push(`<p>${inlineFormat(quote[1])}</p>`);
      continue;
    }
    closeQuote();

    const task = line.match(/^[-*]\s+\[( |x|X)\]\s+(.*)$/);
    if (task) {
      flushParagraph();
      if (listType !== 'ul') {
        closeList();
        out.push('<ul class="md-tasklist">');
        listType = 'ul';
      }
      const checked = task[1].toLowerCase() === 'x';
      out.push(`<li class="md-task"><input type="checkbox" disabled ${checked ? 'checked' : ''} /><span${checked ? ' class="is-done"' : ''}>${inlineFormat(task[2])}</span></li>`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushParagraph();
      if (listType !== 'ul') {
        closeList();
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${inlineFormat(bullet[1])}</li>`);
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (numbered) {
      flushParagraph();
      if (listType !== 'ol') {
        closeList();
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${inlineFormat(numbered[1])}</li>`);
      continue;
    }

    closeList();
    paragraph.push(inlineFormat(line));
  }
  flushParagraph();
  closeList();
  closeQuote();

  let html = out.join('\n');
  html = html.replace(/\u0000S(\d+)\u0000/g, (_, i) => spans[Number(i)]);
  html = html.replace(/\u0000B(\d+)\u0000/g, (_, i) => blocks[Number(i)]);
  return html;
}

// Plain-text preview for card snippets — strips markdown markers rather than
// rendering them, since a card preview shouldn't show a literal "#" or "**".
export function stripMarkdown(source, maxLength = 140) {
  const plain = (source || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/[*_~`>]/g, '')
    .replace(/^-\s+\[[ xX]\]\s+/gm, '')
    .replace(/^[-\d.]+\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength).trim()}\u2026` : plain;
}
