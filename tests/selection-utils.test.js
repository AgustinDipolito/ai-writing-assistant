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
