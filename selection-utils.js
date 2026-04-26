// Shared selection helpers for content script and unit tests.
(function attachSelectionUtils(globalObject) {
  'use strict';

  function clampText(value, maxLength) {
    const normalized = String(value || '').trim();
    return normalized.length > maxLength ? normalized.substring(0, maxLength) : normalized;
  }

  function rectFromPoint(x, y) {
    return {
      top: y,
      bottom: y,
      left: x,
      right: x,
      width: 0,
      height: 0,
      x,
      y,
      toJSON: () => ({}),
    };
  }

  function isZeroRect(rect) {
    return !rect || (!rect.width && !rect.height);
  }

  function getInputSelection(activeElement, maxLength) {
    if (!activeElement) return null;
    const tagName = String(activeElement.tagName || '').toUpperCase();
    const isTextArea = tagName === 'TEXTAREA';
    const isInput = tagName === 'INPUT' && /^(text|search|url|tel|email|password)$/i.test(activeElement.type || 'text');

    if (!isTextArea && !isInput) return null;

    const start = Number.isInteger(activeElement.selectionStart) ? activeElement.selectionStart : null;
    const end = Number.isInteger(activeElement.selectionEnd) ? activeElement.selectionEnd : null;

    if (start === null || end === null || end <= start) return null;

    const text = clampText(String(activeElement.value || '').slice(start, end), maxLength);
    if (!text) return null;

    const elementRect = typeof activeElement.getBoundingClientRect === 'function'
      ? activeElement.getBoundingClientRect()
      : { left: 0, top: 0, width: 0, height: 0 };

    return {
      text,
      rect: rectFromPoint(
        Math.round(elementRect.left + (elementRect.width / 2)),
        Math.round(elementRect.top + Math.min(28, Math.max(8, elementRect.height / 3)))
      ),
    };
  }

  function getInputSelectionSnapshot(activeElement, maxLength) {
    if (!activeElement) return null;
    const tagName = String(activeElement.tagName || '').toUpperCase();
    const isTextArea = tagName === 'TEXTAREA';
    const isInput = tagName === 'INPUT' && /^(text|search|url|tel|email|password)$/i.test(activeElement.type || 'text');

    if (!isTextArea && !isInput) return null;

    const start = Number.isInteger(activeElement.selectionStart) ? activeElement.selectionStart : null;
    const end = Number.isInteger(activeElement.selectionEnd) ? activeElement.selectionEnd : null;

    if (start === null || end === null || end <= start) return null;

    const text = clampText(String(activeElement.value || '').slice(start, end), maxLength);
    if (!text) return null;

    const elementRect = typeof activeElement.getBoundingClientRect === 'function'
      ? activeElement.getBoundingClientRect()
      : { left: 0, top: 0, width: 0, height: 0 };

    return {
      source: isTextArea ? 'textarea' : 'input',
      target: activeElement,
      start,
      end,
      text,
      rect: rectFromPoint(
        Math.round(elementRect.left + (elementRect.width / 2)),
        Math.round(elementRect.top + Math.min(28, Math.max(8, elementRect.height / 3)))
      ),
    };
  }

  function normalizeSelectionContextEntries(entries) {
    if (!Array.isArray(entries)) return [];

    return entries
      .map((entry) => String(entry || '').trim())
      .filter(Boolean);
  }

  function appendSelectionContext(entries, nextText, maxLength = Number.MAX_SAFE_INTEGER) {
    const normalizedEntries = normalizeSelectionContextEntries(entries);
    const normalizedText = clampText(nextText, maxLength);
    if (!normalizedText) return normalizedEntries;
    return [...normalizedEntries, normalizedText];
  }

  function buildSelectionContext(entries, currentText, maxLength, separator = '\n\n') {
    const normalizedEntries = normalizeSelectionContextEntries(entries);
    const normalizedCurrentText = clampText(currentText, maxLength);
    const parts = normalizedCurrentText ? [...normalizedEntries, normalizedCurrentText] : normalizedEntries;
    const effectiveMaxLength = Number.isInteger(maxLength) && maxLength > 0 ? maxLength : Number.MAX_SAFE_INTEGER;

    let combined = '';
    for (const part of parts) {
      if (!part) continue;

      const prefix = combined ? separator : '';
      const remaining = effectiveMaxLength - combined.length;
      if (remaining <= prefix.length) break;

      const available = remaining - prefix.length;
      const nextPart = part.length > available ? part.slice(0, available) : part;
      combined += prefix + nextPart;

      if (nextPart.length < part.length) break;
    }

    return combined;
  }

  function applyInputSelectionSnapshot(snapshot, replacementText) {
    if (!snapshot || !snapshot.target) return false;

    const target = snapshot.target;
    const value = String(target.value || '');
    const start = Number.isInteger(snapshot.start) ? snapshot.start : null;
    const end = Number.isInteger(snapshot.end) ? snapshot.end : null;

    if (start === null || end === null || end < start) return false;
    if (start > value.length || end > value.length) return false;

    const nextValue = `${value.slice(0, start)}${replacementText}${value.slice(end)}`;
    target.value = nextValue;

    const caretPosition = start + String(replacementText).length;
    if (typeof target.setSelectionRange === 'function') {
      target.setSelectionRange(caretPosition, caretPosition);
    }

    if (typeof target.dispatchEvent === 'function') {
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return true;
  }

  const api = {
    clampText,
    rectFromPoint,
    isZeroRect,
    getInputSelection,
    getInputSelectionSnapshot,
    appendSelectionContext,
    buildSelectionContext,
    applyInputSelectionSnapshot,
  };

  globalObject.AWASelectionUtils = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
