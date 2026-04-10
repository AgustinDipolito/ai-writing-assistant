const test = require('node:test');
const assert = require('node:assert/strict');

const {
  clampText,
  rectFromPoint,
  isZeroRect,
  getInputSelection,
  getInputSelectionSnapshot,
  applyInputSelectionSnapshot,
} = require('../selection-utils.js');

test('clampText trims and limits by max length', () => {
  assert.equal(clampText('   hello world   ', 5), 'hello');
  assert.equal(clampText('  ok ', 10), 'ok');
});

test('rectFromPoint builds a zero-size anchor rect', () => {
  const rect = rectFromPoint(100, 50);
  assert.deepEqual(
    {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      width: rect.width,
      height: rect.height,
      x: rect.x,
      y: rect.y,
    },
    {
      top: 50,
      bottom: 50,
      left: 100,
      right: 100,
      width: 0,
      height: 0,
      x: 100,
      y: 50,
    }
  );
  assert.equal(typeof rect.toJSON, 'function');
});

test('isZeroRect detects zero or missing rects', () => {
  assert.equal(isZeroRect(null), true);
  assert.equal(isZeroRect({ width: 0, height: 0 }), true);
  assert.equal(isZeroRect({ width: 10, height: 0 }), false);
});

test('getInputSelection returns text and synthetic anchor for text inputs', () => {
  const activeElement = {
    tagName: 'INPUT',
    type: 'text',
    value: 'hello beautiful world',
    selectionStart: 6,
    selectionEnd: 15,
    getBoundingClientRect: () => ({ left: 20, top: 30, width: 200, height: 36 }),
  };

  const result = getInputSelection(activeElement, 5000);
  assert.ok(result);
  assert.equal(result.text, 'beautiful');
  assert.equal(result.rect.left, 120);
  assert.equal(result.rect.top, 42);
});

test('getInputSelection returns null for non-text elements or collapsed selections', () => {
  const nonTextInput = {
    tagName: 'INPUT',
    type: 'number',
    value: '12345',
    selectionStart: 0,
    selectionEnd: 3,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 20 }),
  };

  const collapsed = {
    tagName: 'TEXTAREA',
    value: 'line one',
    selectionStart: 2,
    selectionEnd: 2,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 20 }),
  };

  assert.equal(getInputSelection(nonTextInput, 5000), null);
  assert.equal(getInputSelection(collapsed, 5000), null);
});

test('getInputSelectionSnapshot returns metadata for replacement', () => {
  const activeElement = {
    tagName: 'TEXTAREA',
    value: 'alpha beta gamma',
    selectionStart: 6,
    selectionEnd: 10,
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 300, height: 60 }),
  };

  const snapshot = getInputSelectionSnapshot(activeElement, 5000);
  assert.ok(snapshot);
  assert.equal(snapshot.source, 'textarea');
  assert.equal(snapshot.start, 6);
  assert.equal(snapshot.end, 10);
  assert.equal(snapshot.text, 'beta');
});

test('applyInputSelectionSnapshot replaces selected range and emits events', () => {
  const emitted = [];
  const target = {
    value: 'hello brave world',
    setSelectionRange(start, end) {
      this.selectionStart = start;
      this.selectionEnd = end;
    },
    dispatchEvent(event) {
      emitted.push(event.type);
      return true;
    },
  };

  const ok = applyInputSelectionSnapshot(
    { source: 'input', target, start: 6, end: 11 },
    'wonderful'
  );

  assert.equal(ok, true);
  assert.equal(target.value, 'hello wonderful world');
  assert.deepEqual(emitted, ['input', 'change']);
  assert.equal(target.selectionStart, 15);
  assert.equal(target.selectionEnd, 15);
});

// ---------------------------------------------------------------------------
// clampText — additional edge cases
// ---------------------------------------------------------------------------

test('clampText returns empty string for null or undefined', () => {
  assert.equal(clampText(null, 10), '');
  assert.equal(clampText(undefined, 10), '');
});

test('clampText returns full string when length equals maxLength', () => {
  assert.equal(clampText('hello', 5), 'hello');
});

test('clampText coerces non-string values to string', () => {
  assert.equal(clampText(12345, 10), '12345');
});

// ---------------------------------------------------------------------------
// isZeroRect — additional edge cases
// ---------------------------------------------------------------------------

test('isZeroRect returns false when only one dimension is non-zero', () => {
  assert.equal(isZeroRect({ width: 5, height: 0 }), false);
  assert.equal(isZeroRect({ width: 0, height: 5 }), false);
});

test('isZeroRect returns true for undefined', () => {
  assert.equal(isZeroRect(undefined), true);
});

// ---------------------------------------------------------------------------
// getInputSelection — additional paths
// ---------------------------------------------------------------------------

test('getInputSelection returns null for null activeElement', () => {
  assert.equal(getInputSelection(null, 5000), null);
});

test('getInputSelection works for textarea', () => {
  const ta = {
    tagName: 'TEXTAREA',
    value: 'one two three',
    selectionStart: 4,
    selectionEnd: 7,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 40 }),
  };
  const result = getInputSelection(ta, 5000);
  assert.ok(result);
  assert.equal(result.text, 'two');
});

test('getInputSelection works for search/email/url/tel/password input types', () => {
  for (const type of ['search', 'email', 'url', 'tel', 'password']) {
    const el = {
      tagName: 'INPUT',
      type,
      value: 'abcdef',
      selectionStart: 0,
      selectionEnd: 3,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 24 }),
    };
    const result = getInputSelection(el, 5000);
    assert.ok(result, `expected result for type="${type}"`);
    assert.equal(result.text, 'abc');
  }
});

test('getInputSelection uses fallback rect when getBoundingClientRect is absent', () => {
  const el = {
    tagName: 'INPUT',
    type: 'text',
    value: 'hello world',
    selectionStart: 0,
    selectionEnd: 5,
  };
  const result = getInputSelection(el, 5000);
  assert.ok(result);
  assert.equal(result.text, 'hello');
  // Fallback rect: { left:0, top:0, width:0, height:0 }
  // → left = Math.round(0 + 0/2) = 0, top = Math.round(0 + 8) = 8
  assert.equal(result.rect.left, 0);
  assert.equal(result.rect.top, 8);
});

test('getInputSelection returns null when selectionStart/End are non-integers', () => {
  const el = {
    tagName: 'INPUT',
    type: 'text',
    value: 'hello',
    selectionStart: null,
    selectionEnd: 3,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 24 }),
  };
  assert.equal(getInputSelection(el, 5000), null);
});

// ---------------------------------------------------------------------------
// getInputSelectionSnapshot — additional paths
// ---------------------------------------------------------------------------

test('getInputSelectionSnapshot returns null for null activeElement', () => {
  assert.equal(getInputSelectionSnapshot(null, 5000), null);
});

test('getInputSelectionSnapshot returns source "input" for INPUT elements', () => {
  const el = {
    tagName: 'INPUT',
    type: 'text',
    value: 'foo bar baz',
    selectionStart: 4,
    selectionEnd: 7,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 30 }),
  };
  const snap = getInputSelectionSnapshot(el, 5000);
  assert.ok(snap);
  assert.equal(snap.source, 'input');
  assert.equal(snap.text, 'bar');
});

test('getInputSelectionSnapshot uses fallback rect when getBoundingClientRect is absent', () => {
  const el = {
    tagName: 'TEXTAREA',
    value: 'hello world',
    selectionStart: 6,
    selectionEnd: 11,
  };
  const snap = getInputSelectionSnapshot(el, 5000);
  assert.ok(snap);
  assert.equal(snap.text, 'world');
  // Fallback rect: { left:0, top:0, width:0, height:0 }
  // → left = Math.round(0 + 0/2) = 0, top = Math.round(0 + 8) = 8
  assert.equal(snap.rect.left, 0);
  assert.equal(snap.rect.top, 8);
});

test('getInputSelectionSnapshot returns null when selectionStart/End are non-integers', () => {
  const el = {
    tagName: 'TEXTAREA',
    value: 'hello',
    selectionStart: 0,
    selectionEnd: null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 24 }),
  };
  assert.equal(getInputSelectionSnapshot(el, 5000), null);
});

// ---------------------------------------------------------------------------
// applyInputSelectionSnapshot — additional edge cases
// ---------------------------------------------------------------------------

test('applyInputSelectionSnapshot returns false for null snapshot', () => {
  assert.equal(applyInputSelectionSnapshot(null, 'text'), false);
});

test('applyInputSelectionSnapshot returns false when target is absent', () => {
  assert.equal(applyInputSelectionSnapshot({ start: 0, end: 3 }, 'text'), false);
});

test('applyInputSelectionSnapshot returns false when indices are out of bounds', () => {
  const target = { value: 'abc' };
  assert.equal(applyInputSelectionSnapshot({ target, start: 0, end: 10 }, 'x'), false);
});

test('applyInputSelectionSnapshot works without setSelectionRange or dispatchEvent', () => {
  const target = { value: 'hello world' };
  const ok = applyInputSelectionSnapshot({ target, start: 6, end: 11 }, 'there');
  assert.equal(ok, true);
  assert.equal(target.value, 'hello there');
});
