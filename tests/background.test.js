// Stub chrome global so background.js event-listener registrations do not throw.
global.chrome = {
  runtime: {
    onConnect: { addListener: () => {} },
    onMessage: { addListener: () => {} },
    onInstalled: { addListener: () => {} },
    onStartup: { addListener: () => {} },
    openOptionsPage: () => {},
  },
  contextMenus: {
    onClicked: { addListener: () => {} },
    create: () => {},
    removeAll: () => Promise.resolve(),
  },
  tabs: {
    onActivated: { addListener: () => {} },
    onRemoved: { addListener: () => {} },
    query: () => {},
    sendMessage: () => {},
  },
  windows: {
    onFocusChanged: { addListener: () => {} },
    WINDOW_ID_NONE: -1,
  },
  storage: {
    onChanged: { addListener: () => {} },
    local: { get: () => Promise.resolve({}) },
  },
};

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  LANGUAGE_INSTRUCTIONS,
  buildPrompt,
  buildCustomPrompt,
  coerceTemperature,
  coerceMaxTokens,
  normalizeActionOverride,
  resolveActionOverride,
  buildRuntimeConfig,
} = require('../background.js');

// ============================================================
// LANGUAGE_INSTRUCTIONS
// ============================================================

test('LANGUAGE_INSTRUCTIONS contains expected language codes', () => {
  assert.ok(typeof LANGUAGE_INSTRUCTIONS.auto === 'string');
  assert.ok(typeof LANGUAGE_INSTRUCTIONS.en === 'string');
  assert.ok(typeof LANGUAGE_INSTRUCTIONS.es === 'string');
});

// ============================================================
// buildPrompt — built-in actions
// ============================================================

test('buildPrompt includes selected text in grammar prompt', () => {
  const prompt = buildPrompt('grammar', 'She dont know.', {});
  assert.ok(prompt.includes('She dont know.'));
  assert.ok(prompt.includes(LANGUAGE_INSTRUCTIONS.auto));
});

test('buildPrompt includes selected text in style prompt', () => {
  const prompt = buildPrompt('style', 'Very unique idea.', {});
  assert.ok(prompt.includes('Very unique idea.'));
});

test('buildPrompt includes selected text in synonyms prompt', () => {
  const prompt = buildPrompt('synonyms', 'happy dog', {});
  assert.ok(prompt.includes('happy dog'));
});

test('buildPrompt uses specified responseLanguage', () => {
  const prompt = buildPrompt('grammar', 'Hola.', { responseLanguage: 'es' });
  assert.ok(prompt.includes(LANGUAGE_INSTRUCTIONS.es));
  assert.ok(!prompt.includes(LANGUAGE_INSTRUCTIONS.auto));
});

test('buildPrompt falls back to "auto" for unknown responseLanguage', () => {
  const prompt = buildPrompt('grammar', 'Hello.', { responseLanguage: 'xx' });
  assert.ok(prompt.includes(LANGUAGE_INSTRUCTIONS.auto));
});

test('buildPrompt uses custom grammar prompt with {{TEXT}} placeholder', () => {
  const config = { promptGrammar: 'Fix this: {{TEXT}}' };
  const prompt = buildPrompt('grammar', 'bad text', config);
  assert.ok(prompt.includes('Fix this: bad text'));
  assert.ok(!prompt.includes('{{TEXT}}'));
});

test('buildPrompt appends text block when custom prompt lacks {{TEXT}}', () => {
  const config = { promptGrammar: 'Check grammar carefully.' };
  const prompt = buildPrompt('grammar', 'some text', config);
  assert.ok(prompt.includes('Check grammar carefully.'));
  assert.ok(prompt.includes('some text'));
});

// ============================================================
// buildCustomPrompt
// ============================================================

test('buildCustomPrompt replaces {{TEXT}} placeholder', () => {
  const prompt = buildCustomPrompt('Improve: {{TEXT}}', 'my text', {});
  assert.equal(prompt.includes('Improve: my text'), true);
  assert.equal(prompt.includes('{{TEXT}}'), false);
});

test('buildCustomPrompt replaces {{TEXT}} case-insensitively', () => {
  const prompt = buildCustomPrompt('Do this: {{text}} and {{TEXT}}', 'hello', {});
  assert.ok(!prompt.includes('{{text}}'));
  assert.ok(!prompt.includes('{{TEXT}}'));
  assert.ok(prompt.includes('hello'));
});

test('buildCustomPrompt appends text block when {{TEXT}} is absent', () => {
  const prompt = buildCustomPrompt('Summarize the following.', 'long text here', {});
  assert.ok(prompt.includes('Summarize the following.'));
  assert.ok(prompt.includes('long text here'));
});

test('buildCustomPrompt includes language instruction', () => {
  const prompt = buildCustomPrompt('Fix: {{TEXT}}', 'text', { responseLanguage: 'fr' });
  assert.ok(prompt.includes(LANGUAGE_INSTRUCTIONS.fr));
});

// ============================================================
// coerceTemperature
// ============================================================

test('coerceTemperature clamps values to [0, 1]', () => {
  assert.equal(coerceTemperature(0), 0);
  assert.equal(coerceTemperature(1), 1);
  assert.equal(coerceTemperature(0.5), 0.5);
  assert.equal(coerceTemperature(-1), 0);
  assert.equal(coerceTemperature(2), 1);
});

test('coerceTemperature returns null for non-numeric inputs', () => {
  assert.equal(coerceTemperature('abc'), null);
  assert.equal(coerceTemperature(undefined), null);
  assert.equal(coerceTemperature(NaN), null);
});

test('coerceTemperature treats null as 0 (Number(null) === 0)', () => {
  assert.equal(coerceTemperature(null), 0);
});

test('coerceTemperature accepts numeric strings', () => {
  assert.equal(coerceTemperature('0.7'), 0.7);
});

// ============================================================
// coerceMaxTokens
// ============================================================

test('coerceMaxTokens clamps values to [100, 8000]', () => {
  assert.equal(coerceMaxTokens(500), 500);
  assert.equal(coerceMaxTokens(50), 100);
  assert.equal(coerceMaxTokens(10000), 8000);
  assert.equal(coerceMaxTokens(100), 100);
  assert.equal(coerceMaxTokens(8000), 8000);
});

test('coerceMaxTokens rounds fractional values', () => {
  assert.equal(coerceMaxTokens(1500.7), 1501);
  assert.equal(coerceMaxTokens(200.2), 200);
});

test('coerceMaxTokens returns null for non-numeric inputs', () => {
  assert.equal(coerceMaxTokens('abc'), null);
  assert.equal(coerceMaxTokens(undefined), null);
  assert.equal(coerceMaxTokens(NaN), null);
});

test('coerceMaxTokens treats null as 0 and clamps to minimum (Number(null) === 0)', () => {
  assert.equal(coerceMaxTokens(null), 100);
});

// ============================================================
// normalizeActionOverride
// ============================================================

test('normalizeActionOverride returns empty object for falsy or non-object input', () => {
  assert.deepEqual(normalizeActionOverride(null), {});
  assert.deepEqual(normalizeActionOverride(undefined), {});
  assert.deepEqual(normalizeActionOverride('string'), {});
  assert.deepEqual(normalizeActionOverride(42), {});
});

test('normalizeActionOverride trims and includes valid model string', () => {
  const result = normalizeActionOverride({ model: '  gpt-4o  ' });
  assert.equal(result.model, 'gpt-4o');
});

test('normalizeActionOverride omits empty model string', () => {
  const result = normalizeActionOverride({ model: '   ' });
  assert.equal(Object.hasOwn(result, 'model'), false);
});

test('normalizeActionOverride omits non-string model', () => {
  const result = normalizeActionOverride({ model: 42 });
  assert.equal(Object.hasOwn(result, 'model'), false);
});

test('normalizeActionOverride clamps temperature and maxTokens', () => {
  const result = normalizeActionOverride({ temperature: 2, maxTokens: 50 });
  assert.equal(result.temperature, 1);
  assert.equal(result.maxTokens, 100);
});

test('normalizeActionOverride omits invalid temperature/maxTokens', () => {
  const result = normalizeActionOverride({ temperature: 'bad', maxTokens: NaN });
  assert.equal(Object.hasOwn(result, 'temperature'), false);
  assert.equal(Object.hasOwn(result, 'maxTokens'), false);
});

// ============================================================
// resolveActionOverride
// ============================================================

test('resolveActionOverride returns empty object for non-custom action with no actionOverrides', () => {
  assert.deepEqual(resolveActionOverride('grammar', {}, null, 'gemini'), {});
  assert.deepEqual(resolveActionOverride('style', { actionOverrides: null }, null, 'openai'), {});
});

test('resolveActionOverride uses providerConfig.actionOverrides for built-in actions', () => {
  const pc = { actionOverrides: { grammar: { temperature: 0.2, maxTokens: 500 } } };
  const result = resolveActionOverride('grammar', pc, null, 'gemini');
  assert.equal(result.temperature, 0.2);
  assert.equal(result.maxTokens, 500);
});

test('resolveActionOverride returns empty object when action not in actionOverrides', () => {
  const pc = { actionOverrides: { style: { temperature: 0.3 } } };
  const result = resolveActionOverride('grammar', pc, null, 'gemini');
  assert.deepEqual(result, {});
});

test('resolveActionOverride uses provider-scoped override for custom actions', () => {
  const customAction = {
    id: 'custom_abc',
    overrides: {
      gemini: { temperature: 0.1 },
      openai: { temperature: 0.9 },
    },
  };
  const geminiResult = resolveActionOverride('custom_abc', {}, customAction, 'gemini');
  assert.equal(geminiResult.temperature, 0.1);

  const openaiResult = resolveActionOverride('custom_abc', {}, customAction, 'openai');
  assert.equal(openaiResult.temperature, 0.9);
});

test('resolveActionOverride falls back to flat overrides when provider-scoped key is absent', () => {
  const customAction = {
    id: 'custom_abc',
    overrides: { temperature: 0.6, maxTokens: 800 },
  };
  const result = resolveActionOverride('custom_abc', {}, customAction, 'gemini');
  assert.equal(result.temperature, 0.6);
  assert.equal(result.maxTokens, 800);
});

test('resolveActionOverride returns empty object when customAction is null', () => {
  assert.deepEqual(resolveActionOverride('custom_abc', {}, null, 'gemini'), {});
});

// ============================================================
// buildRuntimeConfig
// ============================================================

test('buildRuntimeConfig returns copy of providerConfig when no overrides exist', () => {
  const config = { model: 'gemini-2.0-flash', temperature: 0.4 };
  const result = buildRuntimeConfig('grammar', config, null, 'gemini');
  assert.equal(result.model, 'gemini-2.0-flash');
  assert.equal(result.temperature, 0.4);
});

test('buildRuntimeConfig merges action overrides into config', () => {
  const config = {
    model: 'gemini-2.0-flash',
    temperature: 0.4,
    maxTokens: 1500,
    actionOverrides: { grammar: { temperature: 0.1, maxTokens: 300 } },
  };
  const result = buildRuntimeConfig('grammar', config, null, 'gemini');
  assert.equal(result.temperature, 0.1);
  assert.equal(result.maxTokens, 300);
  assert.equal(result.model, 'gemini-2.0-flash');
});

test('buildRuntimeConfig does not mutate the original config', () => {
  const config = { temperature: 0.5, actionOverrides: { style: { temperature: 0.2 } } };
  buildRuntimeConfig('style', config, null, 'gemini');
  assert.equal(config.temperature, 0.5);
});
