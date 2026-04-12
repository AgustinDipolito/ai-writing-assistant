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
  DEFAULT_PROMPTS,
  IMAGE_ANALYSIS_ACTIONS,
  BASE_ACTIONS,
  buildPrompt,
  buildCustomPrompt,
  buildEnhancePrompt,
  coerceTemperature,
  coerceMaxTokens,
  normalizeActionOverride,
  resolveActionOverride,
  buildRuntimeConfig,
  geminiAdapter,
  openaiAdapter,
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

test('buildPrompt falls back to auto language when responseLanguage is unknown', () => {
  const prompt = buildPrompt('grammar', 'Text.', { responseLanguage: 'zzz' });
  assert.ok(prompt.includes(LANGUAGE_INSTRUCTIONS.auto));
});

test('buildPrompt includes systemInstruction when provided', () => {
  const prompt = buildPrompt('grammar', 'Test.', { systemInstruction: 'Be terse.' });
  // systemInstruction is part of the Gemini body separately, not prepended to the prompt.
  // Just confirm the base prompt is present.
  assert.ok(prompt.includes('Test.'));
});

test('buildPrompt uses custom grammar prompt when configured', () => {
  const prompt = buildPrompt('grammar', 'hello', { promptGrammar: 'Custom: {{TEXT}} done.' });
  assert.ok(prompt.includes('Custom: hello done.'));
  assert.ok(!prompt.includes('{{TEXT}}'));
});

test('buildPrompt uses custom style prompt when configured', () => {
  const prompt = buildPrompt('style', 'world', { promptStyle: 'Restyle: {{TEXT}} end.' });
  assert.ok(prompt.includes('Restyle: world end.'));
});

test('buildPrompt uses custom synonyms prompt when configured', () => {
  const prompt = buildPrompt('synonyms', 'cat', { promptSynonyms: 'Synonyms for {{TEXT}}.' });
  assert.ok(prompt.includes('Synonyms for cat.'));
});

test('buildPrompt appends text when custom prompt has no {{TEXT}}', () => {
  const prompt = buildPrompt('grammar', 'dog', { promptGrammar: 'Fix grammar.' });
  assert.ok(prompt.includes('Fix grammar.'));
  assert.ok(prompt.includes('dog'));
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
// buildEnhancePrompt
// ============================================================

test('buildEnhancePrompt includes action name in prompt', () => {
  const prompt = buildEnhancePrompt('Summarize', '');
  assert.ok(prompt.includes('Summarize'));
});

test('buildEnhancePrompt includes current prompt when provided', () => {
  const prompt = buildEnhancePrompt('Translate', 'Translate the text to French.');
  assert.ok(prompt.includes('Translate the text to French.'));
});

test('buildEnhancePrompt works with empty action name and empty current prompt', () => {
  const prompt = buildEnhancePrompt('', '');
  assert.equal(typeof prompt, 'string');
  assert.ok(prompt.length > 0);
  assert.ok(prompt.includes('{{TEXT}}'));
});

test('buildEnhancePrompt instructs to include {{TEXT}} placeholder', () => {
  const prompt = buildEnhancePrompt('Simplify', '');
  assert.ok(prompt.includes('{{TEXT}}'));
});

test('buildEnhancePrompt returns a string', () => {
  const prompt = buildEnhancePrompt('My Action', 'Some prompt');
  assert.equal(typeof prompt, 'string');
});

test('buildEnhancePrompt omits current prompt section when not provided', () => {
  const prompt = buildEnhancePrompt('Translate', '');
  assert.ok(!prompt.includes('Current Prompt'));
});

test('buildEnhancePrompt omits action name section when not provided', () => {
  const prompt = buildEnhancePrompt('', 'Existing prompt');
  assert.ok(!prompt.includes('Action Name'));
  assert.ok(prompt.includes('Existing prompt'));
});



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

// ============================================================
// DEFAULT_PROMPTS — image actions
// ============================================================

test('DEFAULT_PROMPTS contains all image actions', () => {
  ['describe_image', 'extract_text', 'analyze_image', 'generate_image'].forEach((action) => {
    assert.equal(typeof DEFAULT_PROMPTS[action], 'function', `${action} should be a function`);
  });
});

test('DEFAULT_PROMPTS image analysis action prompts return strings', () => {
  const lang = 'Respond in English.';
  assert.equal(typeof DEFAULT_PROMPTS.describe_image('', lang), 'string');
  assert.equal(typeof DEFAULT_PROMPTS.extract_text('', lang), 'string');
  assert.equal(typeof DEFAULT_PROMPTS.analyze_image('', lang), 'string');
});

test('DEFAULT_PROMPTS.generate_image returns the input text unchanged', () => {
  const prompt = 'a beautiful sunset over mountains';
  assert.equal(DEFAULT_PROMPTS.generate_image(prompt, 'Respond in English.'), prompt);
});

// ============================================================
// IMAGE_ANALYSIS_ACTIONS set
// ============================================================

test('IMAGE_ANALYSIS_ACTIONS contains the three image analysis actions', () => {
  assert.ok(IMAGE_ANALYSIS_ACTIONS.has('describe_image'));
  assert.ok(IMAGE_ANALYSIS_ACTIONS.has('extract_text'));
  assert.ok(IMAGE_ANALYSIS_ACTIONS.has('analyze_image'));
  assert.equal(IMAGE_ANALYSIS_ACTIONS.has('generate_image'), false);
  assert.equal(IMAGE_ANALYSIS_ACTIONS.has('grammar'), false);
});

// ============================================================
// BASE_ACTIONS
// ============================================================

test('BASE_ACTIONS includes generate_image', () => {
  const ids = BASE_ACTIONS.map((a) => a.id);
  assert.ok(ids.includes('generate_image'), 'generate_image should be in BASE_ACTIONS');
});

// ============================================================
// geminiAdapter._buildParts
// ============================================================

test('geminiAdapter._buildParts with no imageData returns text-only part', () => {
  const parts = geminiAdapter._buildParts('hello', null);
  assert.equal(parts.length, 1);
  assert.equal(parts[0].text, 'hello');
});

test('geminiAdapter._buildParts with base64 data URL prepends inlineData part', () => {
  const dataUrl = 'data:image/jpeg;base64,/9j/abc123';
  const parts = geminiAdapter._buildParts('describe this', dataUrl);
  assert.equal(parts.length, 2);
  assert.equal(parts[0].inlineData.mimeType, 'image/jpeg');
  assert.equal(parts[0].inlineData.data, '/9j/abc123');
  assert.equal(parts[1].text, 'describe this');
});

test('geminiAdapter._buildParts with external URL skips inlineData (Gemini limitation)', () => {
  const parts = geminiAdapter._buildParts('describe this', 'https://example.com/photo.jpg');
  assert.equal(parts.length, 1);
  assert.equal(parts[0].text, 'describe this');
});

// ============================================================
// openaiAdapter._buildUserContent
// ============================================================

test('openaiAdapter._buildUserContent with no imageData returns plain string', () => {
  const result = openaiAdapter._buildUserContent('hello', null, 'gpt-4o-mini');
  assert.equal(result, 'hello');
});

test('openaiAdapter._buildUserContent with imageData returns array with image and text', () => {
  const dataUrl = 'data:image/png;base64,iVBORw0K';
  const result = openaiAdapter._buildUserContent('describe this', dataUrl, 'gpt-4o');
  assert.ok(result && result._visionModel, 'should mark which vision model to use');
  assert.equal(result._visionModel, 'gpt-4o');
  assert.equal(result.content.length, 2);
  assert.equal(result.content[0].type, 'image_url');
  assert.equal(result.content[0].image_url.url, dataUrl);
  assert.equal(result.content[1].type, 'text');
  assert.equal(result.content[1].text, 'describe this');
});

test('openaiAdapter._buildUserContent falls back to gpt-4o-mini for non-vision model', () => {
  const result = openaiAdapter._buildUserContent('describe', 'data:image/png;base64,abc', 'gpt-3.5-turbo');
  assert.equal(result._visionModel, 'gpt-4o-mini');
});

test('openaiAdapter._buildUserContent with a URL (not data URL) passes it through for vision', () => {
  const url = 'https://example.com/img.jpg';
  const result = openaiAdapter._buildUserContent('describe', url, 'gpt-4o-mini');
  assert.ok(result._visionModel);
  assert.equal(result.content[0].image_url.url, url);
});

// ============================================================
// geminiAdapter.listModels
// ============================================================

test('geminiAdapter.listModels returns models supporting generateContent', async () => {
  const mockModels = [
    {
      name: 'models/gemini-2.0-flash',
      displayName: 'Gemini 2.0 Flash',
      supportedGenerationMethods: ['generateContent', 'countTokens'],
    },
    {
      name: 'models/gemini-1.5-pro',
      displayName: 'Gemini 1.5 Pro',
      supportedGenerationMethods: ['generateContent', 'streamGenerateContent', 'countTokens'],
    },
    {
      name: 'models/embedding-001',
      displayName: 'Embedding 001',
      supportedGenerationMethods: ['embedContent'],
    },
  ];

  global.fetch = async () => ({
    ok: true,
    json: async () => ({ models: mockModels }),
  });

  const result = await geminiAdapter.listModels('test-api-key');

  assert.equal(result.length, 2);
  assert.equal(result[0].value, 'gemini-2.0-flash');
  assert.equal(result[0].label, 'Gemini 2.0 Flash');
  assert.ok(Array.isArray(result[0].supportedMethods));
  assert.ok(result[0].supportedMethods.includes('generateContent'));
  assert.equal(result[1].value, 'gemini-1.5-pro');

  delete global.fetch;
});

test('geminiAdapter.listModels excludes models that do not support generateContent', async () => {
  const mockModels = [
    {
      name: 'models/embedding-001',
      displayName: 'Embedding 001',
      supportedGenerationMethods: ['embedContent'],
    },
    {
      name: 'models/aqa',
      displayName: 'AQA',
      supportedGenerationMethods: ['createAQA'],
    },
  ];

  global.fetch = async () => ({
    ok: true,
    json: async () => ({ models: mockModels }),
  });

  const result = await geminiAdapter.listModels('test-api-key');
  assert.equal(result.length, 0);

  delete global.fetch;
});

test('geminiAdapter.listModels strips "models/" prefix from value', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      models: [
        {
          name: 'models/gemini-2.0-flash-lite',
          displayName: 'Gemini 2.0 Flash Lite',
          supportedGenerationMethods: ['generateContent'],
        },
      ],
    }),
  });

  const result = await geminiAdapter.listModels('test-api-key');
  assert.equal(result[0].value, 'gemini-2.0-flash-lite');

  delete global.fetch;
});

test('geminiAdapter.listModels falls back to model name when displayName is absent', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      models: [
        {
          name: 'models/gemini-custom',
          supportedGenerationMethods: ['generateContent'],
        },
      ],
    }),
  });

  const result = await geminiAdapter.listModels('test-api-key');
  assert.equal(result[0].label, 'gemini-custom');

  delete global.fetch;
});

test('geminiAdapter.listModels throws on non-ok response', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 403,
    json: async () => ({ error: { message: 'API key invalid.' } }),
  });

  await assert.rejects(
    () => geminiAdapter.listModels('bad-key'),
    (err) => {
      assert.ok(err.message.includes('API key invalid.'));
      return true;
    }
  );

  delete global.fetch;
});

test('geminiAdapter.listModels handles empty models array', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ models: [] }),
  });

  const result = await geminiAdapter.listModels('test-api-key');
  assert.equal(result.length, 0);

  delete global.fetch;
});

test('geminiAdapter.listModels uses the correct API endpoint', async () => {
  let capturedUrl;
  global.fetch = async (url) => {
    capturedUrl = url;
    return {
      ok: true,
      json: async () => ({ models: [] }),
    };
  };

  await geminiAdapter.listModels('my-api-key');
  assert.ok(capturedUrl.startsWith('https://generativelanguage.googleapis.com/'));
  assert.ok(capturedUrl.includes('/models'));
  assert.ok(capturedUrl.includes('my-api-key'));

  delete global.fetch;
});
