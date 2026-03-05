// ============================================================
// AI Writing Assistant — Content Script
// Handles text selection detection, floating UI (Shadow DOM),
// streaming communication, and result rendering.
// ============================================================

(() => {
  'use strict';

  if (window.__aiWritingAssistantLoaded) return;
  window.__aiWritingAssistantLoaded = true;

  const MAX_TEXT_LENGTH = 5000;
  const MENU_OFFSET = 10;
  const STREAM_PORT_NAME = 'ai_stream';
  const SelectionUtils = window.AWASelectionUtils || {
    clampText: (value, maxLength) => {
      const normalized = String(value || '').trim();
      return normalized.length > maxLength ? normalized.substring(0, maxLength) : normalized;
    },
    getInputSelection: () => null,
    rectFromPoint: (x, y) => ({
      top: y,
      bottom: y,
      left: x,
      right: x,
      width: 0,
      height: 0,
      x,
      y,
      toJSON: () => ({}),
    }),
    isZeroRect: (rect) => !rect || (!rect.width && !rect.height),
  };

  const ICONS = {
    grammar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
    style: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`,
    synonyms: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
    stop: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>`,
    sparkle: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/></svg>`,
  };

  const hostEl = document.createElement('div');
  hostEl.id = 'ai-writing-assistant-host';
  hostEl.style.cssText = 'position:absolute;top:0;left:0;z-index:2147483647;pointer-events:none;';
  document.documentElement.appendChild(hostEl);

  const shadow = hostEl.attachShadow({ mode: 'closed' });

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    :host { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #1a1a1a; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    .ai-menu { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; position: fixed; display: none; align-items: center; gap: 2px; padding: 4px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.10), 0 1px 3px rgba(0, 0, 0, 0.06); z-index: 2147483647; pointer-events: auto; animation: aiMenuFadeIn 0.15s ease-out; }
    @keyframes aiMenuFadeIn { from { opacity: 0; transform: translateY(4px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .ai-menu.visible { display: flex; }
    .ai-menu-btn { all: unset; display: flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 7px; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 500; color: #374151; white-space: nowrap; transition: background 0.15s, color 0.15s; pointer-events: auto; }
    .ai-menu-btn:hover { background: #f1f5f9; color: #0f172a; }
    .ai-menu-btn:active { background: #e2e8f0; }
    .ai-menu-btn .icon { display: flex; align-items: center; flex-shrink: 0; }
    .ai-menu-separator { width: 1px; height: 22px; background: #e2e8f0; flex-shrink: 0; }
    .ai-results { all: initial; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; position: fixed; display: none; flex-direction: column; width: 420px; max-width: calc(100vw - 24px); max-height: 60vh; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06); z-index: 2147483647; pointer-events: auto; animation: aiPanelSlideIn 0.2s ease-out; overflow: hidden; }
    @keyframes aiPanelSlideIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    .ai-results.visible { display: flex; }
    .ai-results-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #f1f5f9; flex-shrink: 0; }
    .ai-results-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #374151; }
    .ai-results-title .icon { display: flex; color: #6366f1; }
    .ai-results-actions { display: flex; align-items: center; gap: 4px; }
    .ai-icon-btn { all: unset; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; color: #64748b; transition: background 0.15s, color 0.15s; }
    .ai-icon-btn:hover { background: #f1f5f9; color: #1e293b; }
    .ai-results-body { padding: 14px; overflow-y: auto; flex: 1; font-size: 13.5px; line-height: 1.65; color: #1e293b; }
    .ai-results-body p { margin-bottom: 10px; }
    .ai-results-body strong, .ai-results-body b { font-weight: 600; color: #0f172a; }
    .ai-results-body em, .ai-results-body i { font-style: italic; }
    .ai-results-body ul, .ai-results-body ol { margin: 6px 0 10px 20px; }
    .ai-results-body li { margin-bottom: 4px; }
    .ai-results-body code { font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace; font-size: 12.5px; background: #f1f5f9; padding: 1px 5px; border-radius: 4px; color: #6366f1; }
    .ai-results-body pre { font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace; font-size: 12px; background: #0f172a; color: #e2e8f0; padding: 10px 12px; border-radius: 8px; margin: 8px 0 12px 0; overflow-x: auto; }
    .ai-results-body pre code { background: transparent; color: inherit; padding: 0; border-radius: 0; }
    .ai-results-body .token-keyword { color: #93c5fd; }
    .ai-results-body .token-string { color: #86efac; }
    .ai-results-body .token-number { color: #fca5a5; }
    .ai-results-body blockquote { border-left: 3px solid #6366f1; padding-left: 12px; margin: 8px 0; color: #475569; }
    .ai-results-body h1, .ai-results-body h2, .ai-results-body h3, .ai-results-body h4, .ai-results-body h5, .ai-results-body h6 { font-weight: 600; margin: 12px 0 6px 0; color: #0f172a; }
    .ai-results-body h1 { font-size: 16px; } .ai-results-body h2 { font-size: 15px; } .ai-results-body h3 { font-size: 14px; }
    .ai-results-body hr { border: none; border-top: 1px solid #e2e8f0; margin: 12px 0; }
    .ai-results-body table { width: 100%; border-collapse: collapse; margin: 10px 0 14px 0; font-size: 12.8px; }
    .ai-results-body th, .ai-results-body td { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
    .ai-results-body th { background: #f8fafc; font-weight: 600; }
    .ai-results-body a { color: #6366f1; text-decoration: underline; }
    .ai-loading { display: flex; align-items: center; gap: 10px; padding: 20px 0; color: #64748b; font-size: 13px; }
    .ai-loading-dots { display: flex; gap: 4px; }
    .ai-loading-dots span { width: 6px; height: 6px; border-radius: 50%; background: #6366f1; animation: aiDotPulse 1.2s ease-in-out infinite; }
    .ai-loading-dots span:nth-child(2) { animation-delay: 0.15s; } .ai-loading-dots span:nth-child(3) { animation-delay: 0.3s; }
    @keyframes aiDotPulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }
    .ai-error { color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 10px 12px; font-size: 13px; line-height: 1.5; }
    .ai-copy-toast { position: absolute; top: 8px; right: 50px; background: #10b981; color: white; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 5px; opacity: 0; transition: opacity 0.2s; pointer-events: none; }
    .ai-copy-toast.show { opacity: 1; }
    .ai-menu-btn.disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }

    @media (prefers-color-scheme: dark) {
      .ai-menu { background: #1e1e2e; border-color: #313244; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.2); }
      .ai-menu-btn { color: #cdd6f4; } .ai-menu-btn:hover { background: #313244; color: #ffffff; } .ai-menu-btn:active { background: #45475a; }
      .ai-menu-separator, .ai-results-header { border-color: #313244; }
      .ai-results { background: #1e1e2e; border-color: #313244; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.25); }
      .ai-results-title { color: #cdd6f4; } .ai-results-title .icon { color: #a5b4fc; }
      .ai-icon-btn { color: #a6adc8; } .ai-icon-btn:hover { background: #313244; color: #ffffff; }
      .ai-results-body { color: #cdd6f4; } .ai-results-body strong, .ai-results-body b { color: #ffffff; }
      .ai-results-body code { background: #313244; color: #a5b4fc; }
      .ai-results-body blockquote { border-left-color: #a5b4fc; color: #a6adc8; }
      .ai-results-body h1, .ai-results-body h2, .ai-results-body h3, .ai-results-body h4, .ai-results-body h5, .ai-results-body h6 { color: #ffffff; }
      .ai-results-body hr, .ai-results-body th, .ai-results-body td { border-top-color: #313244; border-color: #313244; }
      .ai-results-body th { background: #2a2a3a; }
      .ai-results-body a { color: #a5b4fc; }
      .ai-error { color: #f87171; background: #2d1b1b; border-color: #5c2020; }
    }
  `;
  shadow.appendChild(styleEl);

  const menu = document.createElement('div');
  menu.className = 'ai-menu';

  const results = document.createElement('div');
  results.className = 'ai-results';
  results.innerHTML = `
    <div class="ai-results-header">
      <div class="ai-results-title"><span class="icon">${ICONS.sparkle}</span><span class="ai-results-title-text">AI Suggestion</span></div>
      <div class="ai-results-actions">
        <div class="ai-copy-toast">Copied!</div>
        <button class="ai-icon-btn" data-role="stop" title="Stop" style="display:none;">${ICONS.stop}</button>
        <button class="ai-icon-btn" data-role="copy" title="Copy result">${ICONS.copy}</button>
        <button class="ai-icon-btn" data-role="close" title="Close">${ICONS.close}</button>
      </div>
    </div>
    <div class="ai-results-body"></div>
  `;

  shadow.appendChild(menu);
  shadow.appendChild(results);

  const resultsBody = results.querySelector('.ai-results-body');
  const resultsTitleText = results.querySelector('.ai-results-title-text');
  const copyToast = results.querySelector('.ai-copy-toast');
  const stopBtn = results.querySelector('[data-role="stop"]');

  let loadedCustomActions = [];
  let selectedText = '';
  let isLoading = false;
  let suppressUiUntil = 0;
  let streamPort = null;
  let activeRequestId = null;
  let activeResponseText = '';
  let lastAnchorRect = null;
  let lastMousePoint = { x: Math.round(window.innerWidth / 2), y: Math.max(48, Math.round(window.innerHeight * 0.12)) };

  function buildMenuButtons() {
    const defaultButtons = [
      { action: 'grammar', icon: ICONS.grammar, label: 'Grammar' },
      { action: 'style', icon: ICONS.style, label: 'Style' },
      { action: 'synonyms', icon: ICONS.synonyms, label: 'Synonyms' },
    ];

    let html = defaultButtons.map((btn) =>
      `<button class="ai-menu-btn" data-action="${btn.action}"><span class="icon">${btn.icon}</span>${btn.label}</button>`
    ).join('<div class="ai-menu-separator"></div>');

    if (loadedCustomActions.length > 0) {
      html += '<div class="ai-menu-separator"></div>';
      html += loadedCustomActions.map((ca) =>
        `<button class="ai-menu-btn" data-action="${ca.id}"><span class="icon" style="font-style:normal;">${ca.icon || '✏️'}</span>${escapeHtml(ca.name)}</button>`
      ).join('<div class="ai-menu-separator"></div>');
    }

    menu.innerHTML = html;
  }

  chrome.storage.local.get('customActions', ({ customActions }) => {
    loadedCustomActions = customActions || [];
    buildMenuButtons();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.customActions) {
      loadedCustomActions = changes.customActions.newValue || [];
      buildMenuButtons();
    }
  });

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function sanitizeRenderedHtml(inputHtml) {
    const template = document.createElement('template');
    template.innerHTML = inputHtml;

    const allowedTags = new Set([
      'P', 'BR', 'STRONG', 'EM', 'B', 'I', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
      'HR', 'CODE', 'PRE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'A', 'SPAN',
    ]);

    const allowedAttrs = {
      A: new Set(['href', 'target', 'rel']),
      CODE: new Set(['class']),
      SPAN: new Set(['class']),
      TH: new Set(['style']),
      TD: new Set(['style']),
    };

    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      if (!allowedTags.has(node.tagName)) {
        const text = document.createTextNode(node.textContent || '');
        node.replaceWith(text);
        return;
      }

      Array.from(node.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value || '';

        if (name.startsWith('on')) {
          node.removeAttribute(attr.name);
          return;
        }

        const allow = allowedAttrs[node.tagName];
        if (!allow || !allow.has(attr.name)) {
          node.removeAttribute(attr.name);
          return;
        }

        if (node.tagName === 'A' && name === 'href') {
          const normalized = value.trim().toLowerCase();
          if (normalized.startsWith('javascript:')) {
            node.removeAttribute('href');
          } else {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
          }
        }

        if ((node.tagName === 'TH' || node.tagName === 'TD') && name === 'style' && !/^text-align:\s*(left|right|center);?$/i.test(value)) {
          node.removeAttribute('style');
        }
      });
    });

    return template.innerHTML;
  }

  function highlightCode(code, language) {
    const escaped = escapeHtml(code);
    const lang = (language || '').toLowerCase();

    if (!['js', 'javascript', 'ts', 'typescript', 'json'].includes(lang)) {
      return escaped;
    }

    return escaped
      .replace(/\b(const|let|var|function|return|if|else|for|while|class|new|async|await|try|catch|throw|import|from|export|default|true|false|null|undefined)\b/g, '<span class="token-keyword">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, '<span class="token-string">$1</span>')
      .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token-number">$1</span>');
  }

  function inlineMarkdown(text) {
    return text
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  }

  function parseTable(lines, startIndex) {
    const headerLine = lines[startIndex];
    const alignLine = lines[startIndex + 1] || '';

    if (!headerLine?.includes('|')) return null;
    if (!/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(alignLine)) return null;

    const parseRow = (row) => {
      let raw = row.trim();
      if (raw.startsWith('|')) raw = raw.slice(1);
      if (raw.endsWith('|')) raw = raw.slice(0, -1);
      return raw.split('|').map((cell) => inlineMarkdown(escapeHtml(cell.trim())));
    };

    const parseAlign = (row) => {
      let raw = row.trim();
      if (raw.startsWith('|')) raw = raw.slice(1);
      if (raw.endsWith('|')) raw = raw.slice(0, -1);
      return raw.split('|').map((cell) => {
        const t = cell.trim();
        if (t.startsWith(':') && t.endsWith(':')) return 'center';
        if (t.endsWith(':')) return 'right';
        return 'left';
      });
    };

    const headers = parseRow(headerLine);
    const aligns = parseAlign(alignLine);

    let index = startIndex + 2;
    const rows = [];
    while (index < lines.length && lines[index].includes('|') && lines[index].trim() !== '') {
      rows.push(parseRow(lines[index]));
      index += 1;
    }

    const thead = `<thead><tr>${headers.map((h, i) => `<th style="text-align:${aligns[i] || 'left'};">${h}</th>`).join('')}</tr></thead>`;
    const tbody = rows.length
      ? `<tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td style="text-align:${aligns[i] || 'left'};">${c}</td>`).join('')}</tr>`).join('')}</tbody>`
      : '<tbody></tbody>';

    return { html: `<table>${thead}${tbody}</table>`, nextIndex: index - 1 };
  }

  function renderMarkdown(text) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const output = [];

    let inCode = false;
    let codeLang = '';
    let codeLines = [];
    let listType = null;
    let paragraph = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      output.push(`<p>${inlineMarkdown(paragraph.join('<br>'))}</p>`);
      paragraph = [];
    };

    const closeList = () => {
      if (!listType) return;
      output.push(listType === 'ol' ? '</ol>' : '</ul>');
      listType = null;
    };

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];

      const codeFenceMatch = line.match(/^```\s*([\w-]+)?\s*$/);
      if (codeFenceMatch) {
        flushParagraph();
        closeList();

        if (!inCode) {
          inCode = true;
          codeLang = codeFenceMatch[1] || '';
          codeLines = [];
        } else {
          const codeHtml = highlightCode(codeLines.join('\n'), codeLang);
          output.push(`<pre><code class="language-${escapeHtml(codeLang)}">${codeHtml}</code></pre>`);
          inCode = false;
          codeLang = '';
          codeLines = [];
        }
        continue;
      }

      if (inCode) {
        codeLines.push(line);
        continue;
      }

      if (!line.trim()) {
        flushParagraph();
        closeList();
        continue;
      }

      const tableBlock = parseTable(lines, index);
      if (tableBlock) {
        flushParagraph();
        closeList();
        output.push(tableBlock.html);
        index = tableBlock.nextIndex;
        continue;
      }

      const heading = line.match(/^(#{1,6})\s+(.+)$/);
      if (heading) {
        flushParagraph();
        closeList();
        const level = heading[1].length;
        output.push(`<h${level}>${inlineMarkdown(escapeHtml(heading[2]))}</h${level}>`);
        continue;
      }

      if (/^---+$/.test(line.trim())) {
        flushParagraph();
        closeList();
        output.push('<hr>');
        continue;
      }

      const quote = line.match(/^>\s+(.+)$/);
      if (quote) {
        flushParagraph();
        closeList();
        output.push(`<blockquote>${inlineMarkdown(escapeHtml(quote[1]))}</blockquote>`);
        continue;
      }

      const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
      if (ordered) {
        flushParagraph();
        if (listType !== 'ol') {
          closeList();
          output.push('<ol>');
          listType = 'ol';
        }
        output.push(`<li>${inlineMarkdown(escapeHtml(ordered[1]))}</li>`);
        continue;
      }

      const unordered = line.match(/^\s*[-*]\s+(.+)$/);
      if (unordered) {
        flushParagraph();
        if (listType !== 'ul') {
          closeList();
          output.push('<ul>');
          listType = 'ul';
        }
        output.push(`<li>${inlineMarkdown(escapeHtml(unordered[1]))}</li>`);
        continue;
      }

      closeList();
      paragraph.push(escapeHtml(line.trim()));
    }

    if (inCode) {
      output.push(`<pre><code>${highlightCode(codeLines.join('\n'), codeLang)}</code></pre>`);
    }

    flushParagraph();
    closeList();

    return output.join('\n');
  }

  function positionElement(el, anchorRect, offsetY = MENU_OFFSET) {
    el.style.left = '0px';
    el.style.top = '-9999px';
    el.style.maxHeight = '';
    el.style.display = 'flex';

    const elRect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 12;

    let top = anchorRect.bottom + offsetY;
    let left = anchorRect.left + (anchorRect.width / 2) - (elRect.width / 2);

    if (left + elRect.width > vw - pad) left = vw - elRect.width - pad;
    if (left < pad) left = pad;

    const spaceBelow = vh - anchorRect.bottom - offsetY - pad;
    const spaceAbove = anchorRect.top - offsetY - pad;

    if (elRect.height > spaceBelow && elRect.height <= spaceAbove) {
      top = anchorRect.top - elRect.height - offsetY;
    } else if (elRect.height > spaceBelow && elRect.height > spaceAbove) {
      if (spaceBelow >= spaceAbove) {
        el.style.maxHeight = `${Math.max(spaceBelow, 120)}px`;
      } else {
        top = pad;
        el.style.maxHeight = `${Math.max(spaceAbove, 120)}px`;
      }
    }

    if (top < pad) top = pad;

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  function syntheticAnchorRect() {
    const top = Math.max(48, Math.round(window.innerHeight * 0.12));
    const left = Math.round(window.innerWidth / 2) - 1;
    return {
      top,
      bottom: top,
      left,
      right: left + 2,
      width: 2,
      height: 0,
      x: left,
      y: top,
      toJSON: () => ({}),
    };
  }

  function getSelectionPayload() {
    const selection = window.getSelection();
    const windowText = SelectionUtils.clampText(selection?.toString() || '', MAX_TEXT_LENGTH);

    if (windowText && selection?.rangeCount) {
      let rect = null;
      try {
        rect = selection.getRangeAt(0).getBoundingClientRect();
      } catch {
        rect = null;
      }

      if (!SelectionUtils.isZeroRect(rect)) {
        return { text: windowText, rect };
      }

      return { text: windowText, rect: SelectionUtils.rectFromPoint(lastMousePoint.x, lastMousePoint.y) };
    }

    const inputSelection = SelectionUtils.getInputSelection(document.activeElement, MAX_TEXT_LENGTH);
    if (inputSelection?.text) {
      return inputSelection;
    }

    return { text: '', rect: null };
  }

  function hasActiveSelectionText() {
    return getSelectionPayload().text.length > 1;
  }

  function showMenu(rect) {
    // Never wipe the results panel if a response is active.
    if (!isLoading && !results.classList.contains('visible')) {
      hideResults();
    }
    menu.classList.add('visible');
    positionElement(menu, rect);
  }

  function hideMenu() {
    menu.classList.remove('visible');
  }

  function hideResults() {
    results.classList.remove('visible');
    resultsBody.innerHTML = '';
  }

  function clearSelectionUi() {
    selectedText = '';

    // While loading or results are on screen, only close the floating menu.
    // Never wipe the results panel or cancel the stream from a background event.
    if (isLoading || results.classList.contains('visible')) {
      hideMenu();
      return;
    }

    hideAll();
  }

  function hideAll() {
    cancelActiveStream();
    hideMenu();
    hideResults();
    isLoading = false;
    setButtonsDisabled(false);
    stopBtn.style.display = 'none';
    lastAnchorRect = null;
  }

  function setButtonsDisabled(disabled) {
    menu.querySelectorAll('.ai-menu-btn').forEach((btn) => {
      btn.classList.toggle('disabled', disabled);
    });
  }

  function getClickedButton(event, selector) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    const fromPath = path.find((node) => node instanceof Element && node.matches?.(selector));
    if (fromPath) return fromPath;
    return event.target instanceof Element ? event.target.closest(selector) : null;
  }

  function renderSafeMarkdown(text) {
    const html = renderMarkdown(text);
    return sanitizeRenderedHtml(html);
  }

  function showLoading(action) {
    const labels = {
      grammar: 'Checking grammar',
      style: 'Analyzing style',
      synonyms: 'Finding synonyms',
    };

    let label = labels[action];
    if (!label && action.startsWith('custom_')) {
      const customAction = loadedCustomActions.find((a) => a.id === action);
      label = customAction ? customAction.name : 'Processing';
    }

    resultsTitleText.textContent = label || 'AI Suggestion';
    resultsBody.innerHTML = `<div class="ai-loading"><div class="ai-loading-dots"><span></span><span></span><span></span></div>${label || 'Thinking'}…</div>`;
  }

  function showError(message) {
    resultsBody.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'ai-error';
    errorDiv.textContent = message;
    resultsBody.appendChild(errorDiv);
    repositionResults();
  }

  function showResultContent(action, content) {
    const titles = {
      grammar: 'Grammar Check',
      style: 'Style Suggestions',
      synonyms: 'Synonyms',
    };

    let title = titles[action];
    if (!title && action.startsWith('custom_')) {
      const customAction = loadedCustomActions.find((a) => a.id === action);
      title = customAction ? customAction.name : 'Custom Action';
    }

    resultsTitleText.textContent = title || 'AI Suggestion';
    resultsBody.innerHTML = renderSafeMarkdown(content);
    repositionResults();
  }

  function repositionResults() {
    if (!results.classList.contains('visible')) return;
    // Use the saved anchor from when the request started; fall back to
    // the menu rect if visible, or a synthetic anchor as last resort.
    const anchor =
      lastAnchorRect ||
      (menu.classList.contains('visible') ? menu.getBoundingClientRect() : syntheticAnchorRect());
    positionElement(results, anchor, 6);
  }

  function generateRequestId() {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function ensureStreamPort() {
    if (streamPort) return streamPort;

    streamPort = chrome.runtime.connect({ name: STREAM_PORT_NAME });
    streamPort.onMessage.addListener((message) => {
      console.log('[AWA] port message', JSON.stringify(message).slice(0, 200));
      if (message?.type !== 'AI_STREAM_EVENT') return;

      // Ignore stale events that arrive after cancel/complete.
      if (!activeRequestId) return;

      if (message.requestId !== activeRequestId) {
        return;
      }

      if (message.phase === 'delta') {
        activeResponseText += message.delta || '';
        resultsBody.innerHTML = renderSafeMarkdown(activeResponseText);
        return;
      }

      if (message.phase === 'end') {
        console.log('[AWA] end — text length', (message.text || activeResponseText).length);
        if (message.text) {
          activeResponseText = message.text;
        }
        showResultContent(message.action || 'grammar', activeResponseText);
        isLoading = false;
        setButtonsDisabled(false);
        activeRequestId = null;
        stopBtn.style.display = 'none';
        return;
      }

      if (message.phase === 'error') {
        console.error('[AWA] stream error', message.error);
        showError(message.error || 'An unexpected error occurred.');
        isLoading = false;
        setButtonsDisabled(false);
        activeRequestId = null;
        stopBtn.style.display = 'none';
        return;
      }

      if (message.phase === 'aborted') {
        console.log('[AWA] aborted');
        if (message.requestId !== activeRequestId) return;
        isLoading = false;
        setButtonsDisabled(false);
        activeRequestId = null;
        stopBtn.style.display = 'none';
      }
    });

    streamPort.onDisconnect.addListener(() => {
      streamPort = null;
      if (isLoading) {
        showError('Connection to background service was interrupted. Please try again.');
        isLoading = false;
        setButtonsDisabled(false);
        activeRequestId = null;
      }
    });

    return streamPort;
  }

  function cancelActiveStream() {
    if (!activeRequestId || !streamPort) {
      activeRequestId = null;
      isLoading = false;
      setButtonsDisabled(false);
      return;
    }

    try {
      streamPort.postMessage({ type: 'AI_STREAM_CANCEL', requestId: activeRequestId });
    } catch {
      // no-op
    }

    activeRequestId = null;
    isLoading = false;
    setButtonsDisabled(false);
  }

  async function requestAI(action, textOverride, anchorRectOverride) {
    const text = (textOverride || selectedText || '').trim();
    if (!text) return;

    if (isLoading) {
      cancelActiveStream();
    }

    isLoading = true;
    setButtonsDisabled(true);
    activeResponseText = '';

    // Capture the anchor rect BEFORE hiding the menu (hidden elements return zero rect).
    const anchorRect = anchorRectOverride || menu.getBoundingClientRect();
    // Persist so repositionResults() can use it after the menu is gone.
    lastAnchorRect = anchorRect;

    showLoading(action);
    results.classList.add('visible');
    stopBtn.style.display = 'flex';
    hideMenu();
    positionElement(results, anchorRect, 6);

    try {
      const port = ensureStreamPort();
      const requestId = generateRequestId();
      activeRequestId = requestId;
      console.log('[AWA] sending AI_STREAM_START', requestId, action, 'text len', text.length);
      port.postMessage({
        type: 'AI_STREAM_START',
        requestId,
        action,
        text,
      });
    } catch (err) {
      showError('Extension error: ' + (err.message || 'Unknown error'));
      isLoading = false;
      setButtonsDisabled(false);
      activeRequestId = null;
    }
  }

  document.addEventListener('mouseup', (e) => {
    lastMousePoint = { x: e.clientX, y: e.clientY };
    if (Date.now() < suppressUiUntil) return;
    if (hostEl.contains(e.target) || e.target === hostEl) return;

    setTimeout(() => {
      const payload = getSelectionPayload();
      const text = payload.text;

      if (text && text.length > 1) {
        selectedText = text;
        showMenu(payload.rect || SelectionUtils.rectFromPoint(lastMousePoint.x, lastMousePoint.y));
      } else {
        clearSelectionUi();
      }
    }, 10);
  });

  menu.addEventListener('click', (e) => {
    const button = getClickedButton(e, '.ai-menu-btn');
    if (!button || button.classList.contains('disabled')) return;

    const action = button.dataset.action;
    if (action) requestAI(action);
  });

  results.addEventListener('click', (e) => {
    const button = getClickedButton(e, '.ai-icon-btn');
    if (!button) return;

    const role = button.dataset.role;
    if (role === 'close') {
      e.preventDefault();
      e.stopPropagation();
      hideAll();
      return;
    }

    if (role === 'stop') {
      cancelActiveStream();
      stopBtn.style.display = 'none';
      // Keep the partial response visible
      if (activeResponseText) {
        showResultContent('', activeResponseText);
      }
      return;
    }

    if (role === 'copy') {
      const text = resultsBody.innerText;
      navigator.clipboard.writeText(text).then(() => {
        copyToast.classList.add('show');
        setTimeout(() => copyToast.classList.remove('show'), 1500);
      }).catch(() => {});
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (hostEl.contains(e.target) || e.target === hostEl) return;
    // Never close via mousedown while a request is loading.
    if (isLoading) return;

    if (results.classList.contains('visible') || menu.classList.contains('visible')) {
      setTimeout(() => {
        if (!hasActiveSelectionText()) {
          clearSelectionUi();
        }
      }, 150);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideAll();
  });

  function handleFocusLoss() {
    suppressUiUntil = Date.now() + 250;
    selectedText = '';
    hideMenu();

    // Keep active streams/results alive across focus changes so responses can finish.
    if (!isLoading && !results.classList.contains('visible')) {
      hideAll();
    }
  }

  window.addEventListener('blur', () => {
    handleFocusLoss();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      handleFocusLoss();
    }
  });

  let selectionChangeTimer = null;
  document.addEventListener('selectionchange', () => {
    clearTimeout(selectionChangeTimer);
    selectionChangeTimer = setTimeout(() => {
      if (Date.now() < suppressUiUntil) return;
      if (!menu.classList.contains('visible') && !results.classList.contains('visible')) return;

      if (isLoading) {
        hideMenu();
        return;
      }

      if (!hasActiveSelectionText()) {
        clearSelectionUi();
      }
    }, 250);
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== 'CONTEXT_ACTION_TRIGGER') return false;

    const text = String(message.text || '').trim();
    const actionId = String(message.actionId || '');
    if (!text || !actionId) return false;

    selectedText = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) : text;
    hideMenu();
    requestAI(actionId, selectedText, syntheticAnchorRect());
    return false;
  });

  window.addEventListener('beforeunload', () => {
    cancelActiveStream();
    hostEl.remove();
  });
})();
