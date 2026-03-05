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

  const api = {
    clampText,
    rectFromPoint,
    isZeroRect,
    getInputSelection,
  };

  globalObject.AWASelectionUtils = api;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
