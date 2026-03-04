// ============================================================
// AI Writing Assistant — Content Script
// Handles text selection detection, floating UI (Shadow DOM),
// and communication with the background service worker.
// ============================================================

(() => {
  'use strict';

  // Prevent multiple injections
  if (window.__aiWritingAssistantLoaded) return;
  window.__aiWritingAssistantLoaded = true;

  // ---- Constants ----
  const MAX_TEXT_LENGTH = 5000;
  const MENU_OFFSET = 10;

  // ---- SVG Icons ----
  const ICONS = {
    grammar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>`,
    style: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>`,
    synonyms: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>`,
    close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`,
    copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>`,
    sparkle: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 8.41L23 11L14.59 13.59L12 22L9.41 13.59L1 11L9.41 8.41L12 0Z"/>
    </svg>`,
  };

  // ---- Shadow DOM Setup ----

  const hostEl = document.createElement('div');
  hostEl.id = 'ai-writing-assistant-host';
  hostEl.style.cssText = 'position:absolute;top:0;left:0;z-index:2147483647;pointer-events:none;';
  document.documentElement.appendChild(hostEl);

  const shadow = hostEl.attachShadow({ mode: 'closed' });

  // ---- Styles (injected into shadow root) ----

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* ============= BASE / LIGHT THEME ============= */
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1a1a1a;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* ---- Floating Menu ---- */
    .ai-menu {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      position: fixed;
      display: none;
      align-items: center;
      gap: 2px;
      padding: 4px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.10), 0 1px 3px rgba(0, 0, 0, 0.06);
      z-index: 2147483647;
      pointer-events: auto;
      animation: aiMenuFadeIn 0.15s ease-out;
    }

    @keyframes aiMenuFadeIn {
      from { opacity: 0; transform: translateY(4px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .ai-menu.visible {
      display: flex;
    }

    .ai-menu-btn {
      all: unset;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 7px;
      cursor: pointer;
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      color: #374151;
      white-space: nowrap;
      transition: background 0.15s, color 0.15s;
      pointer-events: auto;
    }

    .ai-menu-btn:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    .ai-menu-btn:active {
      background: #e2e8f0;
    }

    .ai-menu-btn .icon {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .ai-menu-separator {
      width: 1px;
      height: 22px;
      background: #e2e8f0;
      flex-shrink: 0;
    }

    /* ---- Results Panel ---- */
    .ai-results {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      position: fixed;
      display: none;
      flex-direction: column;
      width: 420px;
      max-width: calc(100vw - 24px);
      max-height: 60vh;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
      z-index: 2147483647;
      pointer-events: auto;
      animation: aiPanelSlideIn 0.2s ease-out;
      overflow: hidden;
    }

    @keyframes aiPanelSlideIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .ai-results.visible {
      display: flex;
    }

    .ai-results-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
      flex-shrink: 0;
    }

    .ai-results-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }

    .ai-results-title .icon {
      display: flex;
      color: #6366f1;
    }

    .ai-results-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .ai-icon-btn {
      all: unset;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      color: #64748b;
      transition: background 0.15s, color 0.15s;
    }

    .ai-icon-btn:hover {
      background: #f1f5f9;
      color: #1e293b;
    }

    .ai-results-body {
      padding: 14px;
      overflow-y: auto;
      flex: 1;
      font-size: 13.5px;
      line-height: 1.65;
      color: #1e293b;
    }

    .ai-results-body::-webkit-scrollbar {
      width: 6px;
    }

    .ai-results-body::-webkit-scrollbar-track {
      background: transparent;
    }

    .ai-results-body::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;
    }

    .ai-results-body::-webkit-scrollbar-thumb:hover {
      background: #94a3b8;
    }

    /* ---- Markdown-like rendered content ---- */
    .ai-results-body p {
      margin-bottom: 10px;
    }

    .ai-results-body strong, .ai-results-body b {
      font-weight: 600;
      color: #0f172a;
    }

    .ai-results-body em, .ai-results-body i {
      font-style: italic;
    }

    .ai-results-body ul, .ai-results-body ol {
      margin: 6px 0 10px 20px;
    }

    .ai-results-body li {
      margin-bottom: 4px;
    }

    .ai-results-body code {
      font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
      font-size: 12.5px;
      background: #f1f5f9;
      padding: 1px 5px;
      border-radius: 4px;
      color: #6366f1;
    }

    .ai-results-body blockquote {
      border-left: 3px solid #6366f1;
      padding-left: 12px;
      margin: 8px 0;
      color: #475569;
    }

    .ai-results-body h1, .ai-results-body h2, .ai-results-body h3,
    .ai-results-body h4, .ai-results-body h5, .ai-results-body h6 {
      font-weight: 600;
      margin: 12px 0 6px 0;
      color: #0f172a;
    }

    .ai-results-body h1 { font-size: 16px; }
    .ai-results-body h2 { font-size: 15px; }
    .ai-results-body h3 { font-size: 14px; }

    .ai-results-body hr {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 12px 0;
    }

    .ai-results-body a {
      color: #6366f1;
      text-decoration: underline;
    }

    /* ---- Loading State ---- */
    .ai-loading {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px 0;
      color: #64748b;
      font-size: 13px;
    }

    .ai-loading-dots {
      display: flex;
      gap: 4px;
    }

    .ai-loading-dots span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #6366f1;
      animation: aiDotPulse 1.2s ease-in-out infinite;
    }

    .ai-loading-dots span:nth-child(2) { animation-delay: 0.15s; }
    .ai-loading-dots span:nth-child(3) { animation-delay: 0.3s; }

    @keyframes aiDotPulse {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1); }
    }

    /* ---- Error State ---- */
    .ai-error {
      color: #dc2626;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      line-height: 1.5;
    }

    /* ---- Copy feedback ---- */
    .ai-copy-toast {
      position: absolute;
      top: 8px;
      right: 50px;
      background: #10b981;
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 5px;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
    }

    .ai-copy-toast.show {
      opacity: 1;
    }

    /* ---- Disabled state for buttons during loading ---- */
    .ai-menu-btn.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    /* ============= DARK THEME ============= */
    @media (prefers-color-scheme: dark) {
      .ai-menu {
        background: #1e1e2e;
        border-color: #313244;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.2);
      }

      .ai-menu-btn {
        color: #cdd6f4;
      }

      .ai-menu-btn:hover {
        background: #313244;
        color: #ffffff;
      }

      .ai-menu-btn:active {
        background: #45475a;
      }

      .ai-menu-separator {
        background: #313244;
      }

      .ai-results {
        background: #1e1e2e;
        border-color: #313244;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.25);
      }

      .ai-results-header {
        border-bottom-color: #313244;
      }

      .ai-results-title {
        color: #cdd6f4;
      }

      .ai-results-title .icon {
        color: #a5b4fc;
      }

      .ai-icon-btn {
        color: #a6adc8;
      }

      .ai-icon-btn:hover {
        background: #313244;
        color: #ffffff;
      }

      .ai-results-body {
        color: #cdd6f4;
      }

      .ai-results-body strong, .ai-results-body b {
        color: #ffffff;
      }

      .ai-results-body code {
        background: #313244;
        color: #a5b4fc;
      }

      .ai-results-body blockquote {
        border-left-color: #a5b4fc;
        color: #a6adc8;
      }

      .ai-results-body h1, .ai-results-body h2, .ai-results-body h3,
      .ai-results-body h4, .ai-results-body h5, .ai-results-body h6 {
        color: #ffffff;
      }

      .ai-results-body hr {
        border-top-color: #313244;
      }

      .ai-results-body a {
        color: #a5b4fc;
      }

      .ai-results-body::-webkit-scrollbar-thumb {
        background: #45475a;
      }

      .ai-results-body::-webkit-scrollbar-thumb:hover {
        background: #585b70;
      }

      .ai-error {
        color: #f87171;
        background: #2d1b1b;
        border-color: #5c2020;
      }
    }
  `;
  shadow.appendChild(styleEl);

  // ---- Build UI Components ----

  // Floating menu
  const menu = document.createElement('div');
  menu.className = 'ai-menu';

  // ---- Custom Actions State ----
  let loadedCustomActions = [];

  function buildMenuButtons() {
    const defaultButtons = [
      { action: 'grammar', icon: ICONS.grammar, label: 'Grammar' },
      { action: 'style', icon: ICONS.style, label: 'Style' },
      { action: 'synonyms', icon: ICONS.synonyms, label: 'Synonyms' },
    ];

    let html = defaultButtons.map(btn =>
      `<button class="ai-menu-btn" data-action="${btn.action}"><span class="icon">${btn.icon}</span>${btn.label}</button>`
    ).join('<div class="ai-menu-separator"></div>');

    if (loadedCustomActions.length > 0) {
      html += '<div class="ai-menu-separator"></div>';
      html += loadedCustomActions.map(ca =>
        `<button class="ai-menu-btn" data-action="${ca.id}"><span class="icon" style="font-style:normal;">${ca.icon || '✏️'}</span>${ca.name}</button>`
      ).join('<div class="ai-menu-separator"></div>');
    }

    menu.innerHTML = html;
  }

  // Load custom actions and build menu
  chrome.storage.local.get('customActions', ({ customActions }) => {
    loadedCustomActions = customActions || [];
    buildMenuButtons();
  });

  // Live update when custom actions change in options
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.customActions) {
      loadedCustomActions = changes.customActions.newValue || [];
      buildMenuButtons();
    }
  });

  shadow.appendChild(menu);

  // Results panel
  const results = document.createElement('div');
  results.className = 'ai-results';
  results.innerHTML = `
    <div class="ai-results-header">
      <div class="ai-results-title">
        <span class="icon">${ICONS.sparkle}</span>
        <span class="ai-results-title-text">AI Suggestion</span>
      </div>
      <div class="ai-results-actions">
        <div class="ai-copy-toast">Copied!</div>
        <button class="ai-icon-btn" data-role="copy" title="Copy result">${ICONS.copy}</button>
        <button class="ai-icon-btn" data-role="close" title="Close">${ICONS.close}</button>
      </div>
    </div>
    <div class="ai-results-body"></div>
  `;
  shadow.appendChild(results);

  // References
  const resultsBody = results.querySelector('.ai-results-body');
  const resultsTitleText = results.querySelector('.ai-results-title-text');
  const copyToast = results.querySelector('.ai-copy-toast');

  // ---- State ----
  let selectedText = '';
  let isLoading = false;

  // ---- Positioning Helpers ----

  function positionElement(el, anchorRect, offsetY = MENU_OFFSET) {
    // Reset position offscreen to measure natural size
    el.style.left = '0px';
    el.style.top = '-9999px';
    el.style.maxHeight = '';
    el.style.display = 'flex';

    // Force layout to read dimensions
    const elRect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 12;

    let top = anchorRect.bottom + offsetY;
    let left = anchorRect.left + (anchorRect.width / 2) - (elRect.width / 2);

    // Clamp horizontal
    if (left + elRect.width > vw - pad) left = vw - elRect.width - pad;
    if (left < pad) left = pad;

    // Vertical: try below first
    const spaceBelow = vh - anchorRect.bottom - offsetY - pad;
    const spaceAbove = anchorRect.top - offsetY - pad;

    if (elRect.height <= spaceBelow) {
      // Fits below — use it
    } else if (elRect.height <= spaceAbove) {
      // Fits above — flip
      top = anchorRect.top - elRect.height - offsetY;
    } else {
      // Doesn't fit either way — pick the side with more space and constrain height
      if (spaceBelow >= spaceAbove) {
        el.style.maxHeight = `${Math.max(spaceBelow, 120)}px`;
      } else {
        top = pad;
        el.style.maxHeight = `${Math.max(spaceAbove, 120)}px`;
      }
    }

    // Final clamp
    if (top < pad) top = pad;

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  // ---- Show / Hide ----

  function showMenu(rect) {
    hideResults();
    menu.classList.add('visible');
    positionElement(menu, rect);
  }

  function hideMenu() {
    menu.classList.remove('visible');
  }

  function showResults(rect) {
    results.classList.add('visible');
    // Position below the menu
    const menuRect = menu.getBoundingClientRect();
    positionElement(results, menuRect, 6);
  }

  function hideResults() {
    results.classList.remove('visible');
    resultsBody.innerHTML = '';
  }

  function hideAll() {
    hideMenu();
    hideResults();
    isLoading = false;
    setButtonsDisabled(false);
  }

  function setButtonsDisabled(disabled) {
    menu.querySelectorAll('.ai-menu-btn').forEach((btn) => {
      btn.classList.toggle('disabled', disabled);
    });
  }

  // ---- Markdown-ish Rendering ----

  function renderMarkdown(text) {
    let html = text
      // Escape HTML entities
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

      // Headings (### to <h3>, etc.)
      .replace(/^######\s+(.+)$/gm, '<h6>$1</h6>')
      .replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>')
      .replace(/^####\s+(.+)$/gm, '<h4>$1</h4>')
      .replace(/^###\s+(.+)$/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.+)$/gm, '<h2>$1</h2>')
      .replace(/^#\s+(.+)$/gm, '<h1>$1</h1>')

      // Horizontal rules
      .replace(/^---+$/gm, '<hr>')

      // Bold + Italic
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')

      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')

      // Blockquotes
      .replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>')

      // Unordered list items
      .replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')

      // Ordered list items
      .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')

      // Arrows (→)
      .replace(/→/g, '→');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((<li>.*<\/li>\n*)+)/g, '<ul>$1</ul>');

    // Paragraphs: split by double newlines
    html = html
      .split(/\n{2,}/)
      .map((block) => {
        block = block.trim();
        if (!block) return '';
        // Don't wrap block elements
        if (/^<(h[1-6]|ul|ol|li|blockquote|hr|p)/.test(block)) return block;
        return `<p>${block.replace(/\n/g, '<br>')}</p>`;
      })
      .join('\n');

    return html;
  }

  // ---- Loading UI ----

  function showLoading(action) {
    const labels = {
      grammar: 'Checking grammar',
      style: 'Analyzing style',
      synonyms: 'Finding synonyms',
    };
    let label = labels[action];
    if (!label && action.startsWith('custom_')) {
      const ca = loadedCustomActions.find(a => a.id === action);
      label = ca ? ca.name : 'Processing';
    }
    resultsTitleText.textContent = label || 'AI Suggestion';
    resultsBody.innerHTML = `
      <div class="ai-loading">
        <div class="ai-loading-dots">
          <span></span><span></span><span></span>
        </div>
        ${label || 'Thinking'}…
      </div>
    `;
  }

  function repositionResults() {
    if (!results.classList.contains('visible')) return;
    const anchor = menu.classList.contains('visible')
      ? menu.getBoundingClientRect()
      : results.getBoundingClientRect();
    positionElement(results, anchor, 6);
  }

  function showError(message) {
    resultsBody.innerHTML = `<div class="ai-error">${message}</div>`;
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
      const ca = loadedCustomActions.find(a => a.id === action);
      title = ca ? ca.name : 'Custom Action';
    }
    resultsTitleText.textContent = title || 'AI Suggestion';
    resultsBody.innerHTML = renderMarkdown(content);
    repositionResults();
  }

  // ---- API Request ----

  async function requestAI(action) {
    if (isLoading || !selectedText) return;

    isLoading = true;
    setButtonsDisabled(true);

    // Show results panel with loading state
    showLoading(action);
    const menuRect = menu.getBoundingClientRect();
    results.classList.add('visible');
    positionElement(results, menuRect, 6);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'AI_REQUEST',
        action,
        text: selectedText,
      });

      if (response?.error) {
        showError(response.error);
      } else if (response?.result) {
        showResultContent(action, response.result);
      } else {
        showError('No response received. Please try again.');
      }
    } catch (err) {
      showError('Extension error: ' + (err.message || 'Unknown error'));
    } finally {
      isLoading = false;
      setButtonsDisabled(false);
    }
  }

  // ---- Event Listeners ----

  // Text selection on mouseup
  document.addEventListener('mouseup', (e) => {
    // Ignore clicks inside our own UI
    if (hostEl.contains(e.target) || e.target === hostEl) return;

    // Small delay to let selection finalize
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 1) {
        selectedText = text.length > MAX_TEXT_LENGTH
          ? text.substring(0, MAX_TEXT_LENGTH)
          : text;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        showMenu(rect);
      } else if (!isLoading) {
        // Don't hide if results are showing
        if (!results.classList.contains('visible')) {
          hideAll();
        }
      }
    }, 10);
  });

  // Menu button clicks
  menu.addEventListener('click', (e) => {
    const btn = e.target.closest('.ai-menu-btn');
    if (!btn || btn.classList.contains('disabled')) return;

    const action = btn.dataset.action;
    if (action) {
      requestAI(action);
    }
  });

  // Results panel actions (copy, close)
  results.addEventListener('click', (e) => {
    const btn = e.target.closest('.ai-icon-btn');
    if (!btn) return;

    const role = btn.dataset.role;

    if (role === 'close') {
      hideAll();
    } else if (role === 'copy') {
      const text = resultsBody.innerText;
      navigator.clipboard.writeText(text).then(() => {
        copyToast.classList.add('show');
        setTimeout(() => copyToast.classList.remove('show'), 1500);
      }).catch(() => {
        // Fallback: select all text in results
      });
    }
  });

  // Click outside to dismiss
  document.addEventListener('mousedown', (e) => {
    if (hostEl.contains(e.target) || e.target === hostEl) return;

    // Only dismiss if clicking outside and not selecting new text
    if (results.classList.contains('visible') || menu.classList.contains('visible')) {
      // Delay to allow selection detection to run first
      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        if (!text || text.length <= 1) {
          hideAll();
        }
      }, 150);
    }
  });

  // Escape key to dismiss
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideAll();
    }
  });

  // ---- Clean up on page unload ----
  window.addEventListener('beforeunload', () => {
    hostEl.remove();
  });
})();
