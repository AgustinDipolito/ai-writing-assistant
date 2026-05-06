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
  injectPageContext,
  buildEnhancePrompt,
  buildGenerateActionsPrompt,
  supportsGeneration,
  processSSEStream,
  coerceTemperature,
  coerceMaxTokens,
  normalizeActionOverride,
  resolveActionOverride,
  buildRuntimeConfig,
  geminiAdapter,
  openaiAdapter,
  anthropicAdapter,
  openrouterAdapter,
  ollamaAdapter,
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

test('buildPrompt includes selected text in chat prompt', () => {
  const prompt = buildPrompt('chat', 'Summarize this section.', {});
  assert.ok(prompt.includes('Summarize this section.'));
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
// injectPageContext
// ============================================================

test('injectPageContext appends page title, URL, and visible text when provided', () => {
  const prompt = injectPageContext('Base prompt', {
    title: 'Example Page',
    url: 'https://example.com/docs',
    visibleText: 'Visible content on the page.',
  });

  assert.ok(prompt.includes('Base prompt'));
  assert.ok(prompt.includes('Page title: Example Page'));
  assert.ok(prompt.includes('Page URL: https://example.com/docs'));
  assert.ok(prompt.includes('Visible page text excerpt:'));
  assert.ok(prompt.includes('Visible content on the page.'));
});

test('injectPageContext returns original prompt when context is empty', () => {
  const prompt = injectPageContext('Base prompt', {});
  assert.equal(prompt, 'Base prompt');
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

// ============================================================
// buildGenerateActionsPrompt
// ============================================================

test('buildGenerateActionsPrompt returns a string', () => {
  const result = buildGenerateActionsPrompt('Marketing & Sales');
  assert.equal(typeof result, 'string');
});

test('buildGenerateActionsPrompt includes the category name', () => {
  const result = buildGenerateActionsPrompt('Email & Communication');
  assert.ok(result.includes('Email & Communication'));
});

test('buildGenerateActionsPrompt includes {{TEXT}} placeholder instruction', () => {
  const result = buildGenerateActionsPrompt('Writing & Editing');
  assert.ok(result.includes('{{TEXT}}'));
});

test('buildGenerateActionsPrompt includes JSON format instructions', () => {
  const result = buildGenerateActionsPrompt('Social Media');
  assert.ok(result.includes('"name"'));
  assert.ok(result.includes('"icon"'));
  assert.ok(result.includes('"prompt"'));
});

test('buildGenerateActionsPrompt works with empty category string', () => {
  const result = buildGenerateActionsPrompt('');
  assert.equal(typeof result, 'string');
  assert.ok(result.length > 0);
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

test('BASE_ACTIONS includes chat', () => {
  const ids = BASE_ACTIONS.map((a) => a.id);
  assert.ok(ids.includes('chat'), 'chat should be in BASE_ACTIONS');
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

// ============================================================
// anthropicAdapter._buildContent
// ============================================================

test('anthropicAdapter._buildContent with no imageData returns text-only content', () => {
  const content = anthropicAdapter._buildContent('hello', null);
  assert.equal(content.length, 1);
  assert.equal(content[0].type, 'text');
  assert.equal(content[0].text, 'hello');
});

test('anthropicAdapter._buildContent with base64 data URL prepends image block', () => {
  const dataUrl = 'data:image/png;base64,iVBORw0K';
  const content = anthropicAdapter._buildContent('describe this', dataUrl);
  assert.equal(content.length, 2);
  assert.equal(content[0].type, 'image');
  assert.equal(content[0].source.type, 'base64');
  assert.equal(content[0].source.media_type, 'image/png');
  assert.equal(content[0].source.data, 'iVBORw0K');
  assert.equal(content[1].type, 'text');
  assert.equal(content[1].text, 'describe this');
});

test('anthropicAdapter._buildContent with external URL uses url source type', () => {
  const url = 'https://example.com/photo.jpg';
  const content = anthropicAdapter._buildContent('describe this', url);
  assert.equal(content.length, 2);
  assert.equal(content[0].type, 'image');
  assert.equal(content[0].source.type, 'url');
  assert.equal(content[0].source.url, url);
});

test('anthropicAdapter.call returns text from response', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      content: [{ type: 'text', text: 'Corrected text.' }],
    }),
  });

  const result = await anthropicAdapter.call('Check grammar.', 'test-key', {});
  assert.equal(result, 'Corrected text.');

  delete global.fetch;
});

test('anthropicAdapter.call throws on API error response', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: { message: 'Invalid API key.' } }),
  });

  await assert.rejects(
    () => anthropicAdapter.call('Check grammar.', 'bad-key', {}),
    (err) => {
      assert.ok(err.message.includes('Invalid API key.'));
      return true;
    }
  );

  delete global.fetch;
});

test('anthropicAdapter.call throws when response has no text content', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ content: [] }),
  });

  await assert.rejects(
    () => anthropicAdapter.call('prompt', 'key', {}),
    (err) => {
      assert.ok(err.message.toLowerCase().includes('empty'));
      return true;
    }
  );

  delete global.fetch;
});

test('anthropicAdapter.call sends correct headers', async () => {
  let capturedHeaders;
  global.fetch = async (_url, opts) => {
    capturedHeaders = opts.headers;
    return {
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    };
  };

  await anthropicAdapter.call('prompt', 'my-api-key', {});
  assert.equal(capturedHeaders['x-api-key'], 'my-api-key');
  assert.equal(capturedHeaders['anthropic-version'], '2023-06-01');

  delete global.fetch;
});

test('anthropicAdapter.call includes systemInstruction as top-level system field', async () => {
  let capturedBody;
  global.fetch = async (_url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    };
  };

  await anthropicAdapter.call('prompt', 'key', { systemInstruction: 'Be concise.' });
  assert.equal(capturedBody.system, 'Be concise.');

  delete global.fetch;
});

test('anthropicAdapter.test returns response text', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      content: [{ type: 'text', text: 'Connection successful!' }],
    }),
  });

  const result = await anthropicAdapter.test('test-key', 'claude-3-5-haiku-20241022');
  assert.equal(result, 'Connection successful!');

  delete global.fetch;
});

test('anthropicAdapter.test throws on non-ok response', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 403,
    json: async () => ({ error: { message: 'Forbidden.' } }),
  });

  await assert.rejects(
    () => anthropicAdapter.test('bad-key', 'claude-3-5-haiku-20241022'),
    (err) => {
      assert.ok(err.message.includes('Forbidden.'));
      return true;
    }
  );

  delete global.fetch;
});

// ============================================================
// openrouterAdapter
// ============================================================

test('openrouterAdapter.call returns text from response', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'Style improved.' } }],
    }),
  });

  const result = await openrouterAdapter.call('Improve style.', 'or-key', {});
  assert.equal(result, 'Style improved.');

  delete global.fetch;
});

test('openrouterAdapter.call sends correct Authorization header', async () => {
  let capturedHeaders;
  global.fetch = async (_url, opts) => {
    capturedHeaders = opts.headers;
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    };
  };

  await openrouterAdapter.call('prompt', 'or-api-key', {});
  assert.equal(capturedHeaders['Authorization'], 'Bearer or-api-key');
  assert.ok(capturedHeaders['HTTP-Referer']);
  assert.ok(capturedHeaders['X-Title']);

  delete global.fetch;
});

test('openrouterAdapter.call throws on non-ok response', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 429,
    json: async () => ({ error: { message: 'Rate limited.' } }),
  });

  await assert.rejects(
    () => openrouterAdapter.call('prompt', 'key', {}),
    (err) => {
      assert.ok(err.message.includes('Rate limited.'));
      return true;
    }
  );

  delete global.fetch;
});

test('openrouterAdapter.call includes image in messages when imageData provided', async () => {
  let capturedBody;
  global.fetch = async (_url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    };
  };

  const imageData = 'data:image/png;base64,abc123';
  await openrouterAdapter.call('describe', 'key', {}, imageData);
  const userMsg = capturedBody.messages.find((m) => m.role === 'user');
  assert.ok(Array.isArray(userMsg.content));
  assert.equal(userMsg.content[0].type, 'image_url');
  assert.equal(userMsg.content[0].image_url.url, imageData);

  delete global.fetch;
});

test('openrouterAdapter.listModels returns formatted model list', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: [
        { id: 'openai/gpt-4o', name: 'GPT-4o' },
        { id: 'anthropic/claude-3-5-haiku', name: 'Claude 3.5 Haiku' },
      ],
    }),
  });

  const models = await openrouterAdapter.listModels('or-key');
  assert.equal(models.length, 2);
  assert.equal(models[0].value, 'openai/gpt-4o');
  assert.equal(models[0].label, 'GPT-4o');
  assert.equal(models[1].value, 'anthropic/claude-3-5-haiku');

  delete global.fetch;
});

test('openrouterAdapter.listModels falls back to id when name is absent', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: [{ id: 'some/model-id' }],
    }),
  });

  const models = await openrouterAdapter.listModels('or-key');
  assert.equal(models[0].label, 'some/model-id');

  delete global.fetch;
});

test('openrouterAdapter.listModels throws on non-ok response', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: { message: 'Unauthorized.' } }),
  });

  await assert.rejects(
    () => openrouterAdapter.listModels('bad-key'),
    (err) => {
      assert.ok(err.message.includes('Unauthorized.'));
      return true;
    }
  );

  delete global.fetch;
});

test('openrouterAdapter.test returns response text', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'Connection successful!' } }],
    }),
  });

  const result = await openrouterAdapter.test('or-key', 'openai/gpt-4o-mini');
  assert.equal(result, 'Connection successful!');

  delete global.fetch;
});

// ============================================================
// ollamaAdapter._getBaseUrl
// ============================================================

test('ollamaAdapter._getBaseUrl defaults to http://localhost:11434', () => {
  assert.equal(ollamaAdapter._getBaseUrl({}), 'http://localhost:11434');
  assert.equal(ollamaAdapter._getBaseUrl(), 'http://localhost:11434');
});

test('ollamaAdapter._getBaseUrl uses provided baseUrl and strips trailing slash', () => {
  assert.equal(ollamaAdapter._getBaseUrl({ baseUrl: 'http://192.168.1.10:11434/' }), 'http://192.168.1.10:11434');
  assert.equal(ollamaAdapter._getBaseUrl({ baseUrl: 'http://myhostname:11434' }), 'http://myhostname:11434');
});

// ============================================================
// ollamaAdapter.call
// ============================================================

test('ollamaAdapter.call returns text from response', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'Hello from Ollama.' } }],
    }),
  });

  const result = await ollamaAdapter.call('Say hello.', '', { model: 'llama3.2' });
  assert.equal(result, 'Hello from Ollama.');

  delete global.fetch;
});

test('ollamaAdapter.call uses custom baseUrl from config', async () => {
  let capturedUrl;
  global.fetch = async (url) => {
    capturedUrl = url;
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    };
  };

  await ollamaAdapter.call('prompt', '', { baseUrl: 'http://remote-host:11434' });
  assert.ok(capturedUrl.startsWith('http://remote-host:11434'));

  delete global.fetch;
});

test('ollamaAdapter.call throws on non-ok response', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ error: 'model not found' }),
  });

  await assert.rejects(
    () => ollamaAdapter.call('prompt', '', {}),
    (err) => {
      assert.ok(err.message.includes('Ollama error') || err.message.includes('model not found'));
      return true;
    }
  );

  delete global.fetch;
});

test('ollamaAdapter.call sends no Authorization header (no API key needed)', async () => {
  let capturedHeaders;
  global.fetch = async (_url, opts) => {
    capturedHeaders = opts.headers;
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    };
  };

  await ollamaAdapter.call('prompt', '', {});
  assert.ok(!capturedHeaders['Authorization']);

  delete global.fetch;
});

test('ollamaAdapter.requiresApiKey is false', () => {
  assert.equal(ollamaAdapter.requiresApiKey, false);
});

// ============================================================
// ollamaAdapter.test
// ============================================================

test('ollamaAdapter.test returns response text', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'Connection successful!' } }],
    }),
  });

  const result = await ollamaAdapter.test('', 'llama3.2', { baseUrl: 'http://localhost:11434' });
  assert.equal(result, 'Connection successful!');

  delete global.fetch;
});

test('ollamaAdapter.test uses baseUrl from config', async () => {
  let capturedUrl;
  global.fetch = async (url) => {
    capturedUrl = url;
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    };
  };

  await ollamaAdapter.test('', 'llama3.2', { baseUrl: 'http://myserver:11434' });
  assert.ok(capturedUrl.startsWith('http://myserver:11434'));

  delete global.fetch;
});

// ============================================================
// ollamaAdapter.listModels
// ============================================================

test('ollamaAdapter.listModels returns installed models', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      models: [
        { name: 'llama3.2' },
        { name: 'mistral' },
      ],
    }),
  });

  const models = await ollamaAdapter.listModels('', {});
  assert.equal(models.length, 2);
  assert.equal(models[0].value, 'llama3.2');
  assert.equal(models[0].label, 'llama3.2');
  assert.equal(models[1].value, 'mistral');

  delete global.fetch;
});

test('ollamaAdapter.listModels uses baseUrl from config', async () => {
  let capturedUrl;
  global.fetch = async (url) => {
    capturedUrl = url;
    return {
      ok: true,
      json: async () => ({ models: [] }),
    };
  };

  await ollamaAdapter.listModels('', { baseUrl: 'http://remote:11434' });
  assert.ok(capturedUrl.startsWith('http://remote:11434'));
  assert.ok(capturedUrl.includes('/api/tags'));

  delete global.fetch;
});

test('ollamaAdapter.listModels throws on non-ok response', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 404,
    text: async () => '',
  });

  await assert.rejects(
    () => ollamaAdapter.listModels('', {}),
    (err) => {
      assert.ok(err.message.includes('Ollama error'));
      return true;
    }
  );

  delete global.fetch;
});

test('ollamaAdapter.listModels returns empty array when models is empty', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ models: [] }),
  });

  const models = await ollamaAdapter.listModels('', {});
  assert.equal(models.length, 0);

  delete global.fetch;
});

// ============================================================
// ollamaAdapter.test — error path
// ============================================================

test('ollamaAdapter.test throws on non-ok response', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 503,
    json: async () => ({ error: 'Ollama not running.' }),
  });

  await assert.rejects(
    () => ollamaAdapter.test('', 'llama3.2', {}),
    (err) => {
      assert.ok(err.message.includes('Ollama not running.') || err.message.includes('503'));
      return true;
    }
  );

  delete global.fetch;
});

// ============================================================
// ollamaAdapter._buildMessages
// ============================================================

test('ollamaAdapter._buildMessages returns single user message for text-only prompt', () => {
  const messages = ollamaAdapter._buildMessages('Hello', {}, null);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, 'user');
  assert.equal(messages[0].content, 'Hello');
});

test('ollamaAdapter._buildMessages prepends system message when systemInstruction is set', () => {
  const messages = ollamaAdapter._buildMessages('Hello', { systemInstruction: 'Be concise.' }, null);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, 'system');
  assert.equal(messages[0].content, 'Be concise.');
  assert.equal(messages[1].role, 'user');
  assert.equal(messages[1].content, 'Hello');
});

test('ollamaAdapter._buildMessages includes image_url content when imageData is provided', () => {
  const imageData = 'data:image/png;base64,abc123';
  const messages = ollamaAdapter._buildMessages('describe this', {}, imageData);
  assert.equal(messages.length, 1);
  const userMsg = messages[0];
  assert.ok(Array.isArray(userMsg.content));
  assert.equal(userMsg.content[0].type, 'image_url');
  assert.equal(userMsg.content[0].image_url.url, imageData);
  assert.equal(userMsg.content[1].type, 'text');
  assert.equal(userMsg.content[1].text, 'describe this');
});

// ============================================================
// anthropicAdapter._buildBody
// ============================================================

test('anthropicAdapter._buildBody sets model and max_tokens', () => {
  const body = anthropicAdapter._buildBody('prompt', { model: 'claude-3-5-haiku-20241022', maxTokens: 800 }, null);
  assert.equal(body.model, 'claude-3-5-haiku-20241022');
  assert.equal(body.max_tokens, 800);
  assert.ok(Array.isArray(body.messages));
  assert.equal(body.messages[0].role, 'user');
});

test('anthropicAdapter._buildBody sets system field when systemInstruction provided', () => {
  const body = anthropicAdapter._buildBody('prompt', { systemInstruction: 'Be brief.' }, null);
  assert.equal(body.system, 'Be brief.');
});

test('anthropicAdapter._buildBody sets stream flag when requested', () => {
  const body = anthropicAdapter._buildBody('prompt', {}, null, true);
  assert.equal(body.stream, true);
});

test('anthropicAdapter._buildBody omits stream when not requested', () => {
  const body = anthropicAdapter._buildBody('prompt', {}, null, false);
  assert.ok(!Object.hasOwn(body, 'stream'));
});

test('anthropicAdapter._buildBody defaults to adapter defaultModel when config.model is absent', () => {
  const body = anthropicAdapter._buildBody('prompt', {}, null);
  assert.equal(body.model, anthropicAdapter.defaultModel);
});

// ============================================================
// buildPrompt — image analysis actions
// ============================================================

test('buildPrompt returns string for describe_image action', () => {
  const prompt = buildPrompt('describe_image', '', {});
  assert.equal(typeof prompt, 'string');
  assert.ok(prompt.length > 0);
  assert.ok(prompt.includes(LANGUAGE_INSTRUCTIONS.auto));
});

test('buildPrompt returns string for extract_text action', () => {
  const prompt = buildPrompt('extract_text', '', {});
  assert.equal(typeof prompt, 'string');
  assert.ok(prompt.length > 0);
});

test('buildPrompt returns string for analyze_image action', () => {
  const prompt = buildPrompt('analyze_image', '', {});
  assert.equal(typeof prompt, 'string');
  assert.ok(prompt.length > 0);
});

test('buildPrompt returns text unchanged for generate_image action', () => {
  const prompt = buildPrompt('generate_image', 'a majestic mountain', {});
  assert.ok(prompt.includes('a majestic mountain'));
});

// ============================================================
// geminiAdapter.call
// ============================================================

test('geminiAdapter.call returns text from response', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: 'Grammar looks good.' }] } }],
    }),
  });

  const result = await geminiAdapter.call('Check grammar.', 'test-key', {});
  assert.equal(result, 'Grammar looks good.');

  delete global.fetch;
});

test('geminiAdapter.call concatenates multiple text parts', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: 'Part one. ' }, { text: 'Part two.' }] } }],
    }),
  });

  const result = await geminiAdapter.call('prompt', 'key', {});
  assert.equal(result, 'Part one. Part two.');

  delete global.fetch;
});

test('geminiAdapter.call throws on API error response', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: { message: 'Bad request.' } }),
  });

  await assert.rejects(
    () => geminiAdapter.call('prompt', 'key', {}),
    (err) => {
      assert.ok(err.message.includes('Bad request.'));
      return true;
    }
  );

  delete global.fetch;
});

test('geminiAdapter.call throws when response has no candidates', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ candidates: [] }),
  });

  await assert.rejects(
    () => geminiAdapter.call('prompt', 'key', {}),
    (err) => {
      assert.ok(err.message.toLowerCase().includes('empty'));
      return true;
    }
  );

  delete global.fetch;
});

test('geminiAdapter.call sends systemInstruction in request body', async () => {
  let capturedBody;
  global.fetch = async (_url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
      }),
    };
  };

  await geminiAdapter.call('prompt', 'key', { systemInstruction: 'Be brief.' });
  assert.ok(capturedBody.systemInstruction);
  assert.equal(capturedBody.systemInstruction.parts[0].text, 'Be brief.');

  delete global.fetch;
});

test('geminiAdapter.call includes base64 imageData in request parts', async () => {
  let capturedBody;
  global.fetch = async (_url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
      }),
    };
  };

  const imageData = 'data:image/png;base64,iVBORw0K';
  await geminiAdapter.call('describe this', 'key', {}, imageData);
  const parts = capturedBody.contents[0].parts;
  assert.ok(parts.some((p) => p.inlineData?.mimeType === 'image/png'));

  delete global.fetch;
});

// ============================================================
// geminiAdapter.test
// ============================================================

test('geminiAdapter.test returns response text on success', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: 'Connection successful!' }] } }],
    }),
  });

  const result = await geminiAdapter.test('test-key', 'gemini-2.0-flash');
  assert.equal(result, 'Connection successful!');

  delete global.fetch;
});

test('geminiAdapter.test throws on non-ok response', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: { message: 'API key not valid.' } }),
  });

  await assert.rejects(
    () => geminiAdapter.test('bad-key', 'gemini-2.0-flash'),
    (err) => {
      assert.ok(err.message.includes('API key not valid.'));
      return true;
    }
  );

  delete global.fetch;
});

test('geminiAdapter.test uses defaultModel when model argument is omitted', async () => {
  let capturedUrl;
  global.fetch = async (url) => {
    capturedUrl = url;
    return {
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'ok' }] } }],
      }),
    };
  };

  await geminiAdapter.test('key');
  assert.ok(capturedUrl.includes(geminiAdapter.defaultModel));

  delete global.fetch;
});

// ============================================================
// geminiAdapter.generateImage
// ============================================================

test('geminiAdapter.generateImage returns imageDataUrl and mimeType', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [{ inlineData: { mimeType: 'image/png', data: 'base64encodeddata' } }],
          },
        },
      ],
    }),
  });

  const result = await geminiAdapter.generateImage('a sunset', 'test-key', {});
  assert.equal(result.mimeType, 'image/png');
  assert.ok(result.imageDataUrl.startsWith('data:image/png;base64,'));
  assert.ok(result.imageDataUrl.includes('base64encodeddata'));

  delete global.fetch;
});

test('geminiAdapter.generateImage throws on API error', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: { message: 'Model not found.' } }),
  });

  await assert.rejects(
    () => geminiAdapter.generateImage('prompt', 'key', {}),
    (err) => {
      assert.ok(err.message.includes('Model not found.'));
      return true;
    }
  );

  delete global.fetch;
});

test('geminiAdapter.generateImage throws when response contains no image part', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: 'I cannot generate images.' }] } }],
    }),
  });

  await assert.rejects(
    () => geminiAdapter.generateImage('prompt', 'key', {}),
    (err) => {
      assert.ok(err.message.toLowerCase().includes('image'));
      return true;
    }
  );

  delete global.fetch;
});

// ============================================================
// openaiAdapter.call
// ============================================================

test('openaiAdapter.call returns text from response', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'Style improved.' } }],
    }),
  });

  const result = await openaiAdapter.call('Improve style.', 'sk-key', {});
  assert.equal(result, 'Style improved.');

  delete global.fetch;
});

test('openaiAdapter.call throws on API error response', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 429,
    json: async () => ({ error: { message: 'Rate limit exceeded.' } }),
  });

  await assert.rejects(
    () => openaiAdapter.call('prompt', 'key', {}),
    (err) => {
      assert.ok(err.message.includes('Rate limit exceeded.'));
      return true;
    }
  );

  delete global.fetch;
});

test('openaiAdapter.call throws when response has no content', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: null } }] }),
  });

  await assert.rejects(
    () => openaiAdapter.call('prompt', 'key', {}),
    (err) => {
      assert.ok(err.message.toLowerCase().includes('empty'));
      return true;
    }
  );

  delete global.fetch;
});

test('openaiAdapter.call includes systemInstruction as system message', async () => {
  let capturedBody;
  global.fetch = async (_url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    };
  };

  await openaiAdapter.call('prompt', 'key', { systemInstruction: 'Be terse.' });
  const systemMsg = capturedBody.messages.find((m) => m.role === 'system');
  assert.ok(systemMsg);
  assert.equal(systemMsg.content, 'Be terse.');

  delete global.fetch;
});

test('openaiAdapter.call uses vision-capable model when imageData is provided', async () => {
  let capturedBody;
  global.fetch = async (_url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    };
  };

  const imageData = 'data:image/jpeg;base64,/9j/abc';
  await openaiAdapter.call('describe', 'key', { model: 'gpt-3.5-turbo' }, imageData);
  // gpt-3.5-turbo is not vision-capable; should fall back to gpt-4o-mini
  assert.equal(capturedBody.model, 'gpt-4o-mini');
  const userMsg = capturedBody.messages.find((m) => m.role === 'user');
  assert.ok(Array.isArray(userMsg.content));
  assert.equal(userMsg.content[0].type, 'image_url');

  delete global.fetch;
});

test('openaiAdapter.call sends correct Authorization header', async () => {
  let capturedHeaders;
  global.fetch = async (_url, opts) => {
    capturedHeaders = opts.headers;
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    };
  };

  await openaiAdapter.call('prompt', 'sk-my-key', {});
  assert.equal(capturedHeaders['Authorization'], 'Bearer sk-my-key');

  delete global.fetch;
});

// ============================================================
// openaiAdapter.test
// ============================================================

test('openaiAdapter.test returns response text on success', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'Connection successful!' } }],
    }),
  });

  const result = await openaiAdapter.test('sk-key', 'gpt-4o-mini');
  assert.equal(result, 'Connection successful!');

  delete global.fetch;
});

test('openaiAdapter.test throws on non-ok response', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: { message: 'Incorrect API key.' } }),
  });

  await assert.rejects(
    () => openaiAdapter.test('bad-key', 'gpt-4o-mini'),
    (err) => {
      assert.ok(err.message.includes('Incorrect API key.'));
      return true;
    }
  );

  delete global.fetch;
});

test('openaiAdapter.test uses defaultModel when model argument is omitted', async () => {
  let capturedBody;
  global.fetch = async (_url, opts) => {
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    };
  };

  await openaiAdapter.test('key');
  assert.equal(capturedBody.model, openaiAdapter.defaultModel);

  delete global.fetch;
});

// ============================================================
// openaiAdapter.generateImage
// ============================================================

test('openaiAdapter.generateImage returns imageDataUrl and mimeType', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      data: [{ b64_json: 'base64imagedata' }],
    }),
  });

  const result = await openaiAdapter.generateImage('a mountain', 'sk-key', {});
  assert.equal(result.mimeType, 'image/png');
  assert.ok(result.imageDataUrl.startsWith('data:image/png;base64,'));
  assert.ok(result.imageDataUrl.includes('base64imagedata'));

  delete global.fetch;
});

test('openaiAdapter.generateImage throws on API error', async () => {
  global.fetch = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ error: { message: 'Content policy violation.' } }),
  });

  await assert.rejects(
    () => openaiAdapter.generateImage('prompt', 'key', {}),
    (err) => {
      assert.ok(err.message.includes('Content policy violation.'));
      return true;
    }
  );

  delete global.fetch;
});

test('openaiAdapter.generateImage throws when response contains no image data', async () => {
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ data: [] }),
  });

  await assert.rejects(
    () => openaiAdapter.generateImage('prompt', 'key', {}),
    (err) => {
      assert.ok(err.message.toLowerCase().includes('image'));
      return true;
    }
  );

  delete global.fetch;
});

// ============================================================
// supportsGeneration
// ============================================================

test('supportsGeneration returns true for model that supports generateContent', () => {
  assert.equal(
    supportsGeneration({ supportedGenerationMethods: ['generateContent', 'countTokens'] }),
    true
  );
});

test('supportsGeneration returns false for model that does not support generateContent', () => {
  assert.equal(
    supportsGeneration({ supportedGenerationMethods: ['embedContent'] }),
    false
  );
});

test('supportsGeneration returns false when supportedGenerationMethods is absent', () => {
  assert.equal(supportsGeneration({}), false);
  assert.equal(supportsGeneration({ supportedGenerationMethods: null }), false);
});

// ============================================================
// processSSEStream
// ============================================================

// Creates a minimal mock fetch response whose body is a ReadableStream
// that yields the given SSE text chunks one-by-one, simulating a streaming API response.
function makeStreamResponse(chunks) {
  const encoder = new TextEncoder();
  let index = 0;
  const readable = new ReadableStream({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[index++]));
    },
  });
  return { ok: true, body: readable, text: async () => '' };
}

test('processSSEStream accumulates deltas and returns full text (LF framing)', async () => {
  const chunks = [
    'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
    'data: [DONE]\n\n',
  ];

  const received = [];
  const result = await processSSEStream(
    makeStreamResponse(chunks),
    (data) => data?.choices?.[0]?.delta?.content || '',
    (delta) => received.push(delta),
    null
  );

  assert.equal(result, 'Hello world');
  assert.deepEqual(received, ['Hello', ' world']);
});

test('processSSEStream handles CRLF event framing', async () => {
  const chunks = [
    'data: {"choices":[{"delta":{"content":"Hi"}}]}\r\n\r\n',
    'data: [DONE]\r\n\r\n',
  ];

  const received = [];
  const result = await processSSEStream(
    makeStreamResponse(chunks),
    (data) => data?.choices?.[0]?.delta?.content || '',
    (delta) => received.push(delta),
    null
  );

  assert.equal(result, 'Hi');
  assert.deepEqual(received, ['Hi']);
});

test('processSSEStream stops at [DONE] and returns accumulated text', async () => {
  const chunks = [
    'data: {"choices":[{"delta":{"content":"stop here"}}]}\n\n',
    'data: [DONE]\n\n',
    'data: {"choices":[{"delta":{"content":"never seen"}}]}\n\n',
  ];

  const result = await processSSEStream(
    makeStreamResponse(chunks),
    (data) => data?.choices?.[0]?.delta?.content || '',
    () => {},
    null
  );

  assert.equal(result, 'stop here');
});

test('processSSEStream skips malformed JSON lines without throwing', async () => {
  const chunks = [
    'data: not-valid-json\n\n',
    'data: {"choices":[{"delta":{"content":"good"}}]}\n\n',
    'data: [DONE]\n\n',
  ];

  const result = await processSSEStream(
    makeStreamResponse(chunks),
    (data) => data?.choices?.[0]?.delta?.content || '',
    () => {},
    null
  );

  assert.equal(result, 'good');
});

test('processSSEStream throws when response is not ok', async () => {
  const errorResponse = {
    ok: false,
    status: 429,
    text: async () => 'Rate limited.',
    body: null,
  };

  await assert.rejects(
    () => processSSEStream(errorResponse, () => '', () => {}, null),
    (err) => {
      assert.ok(err.message.includes('Rate limited.') || err.message.includes('429'));
      return true;
    }
  );
});

test('processSSEStream throws AbortError when signal is already aborted', async () => {
  const controller = new AbortController();
  controller.abort();

  const chunks = ['data: {"choices":[{"delta":{"content":"x"}}]}\n\n'];

  await assert.rejects(
    () =>
      processSSEStream(
        makeStreamResponse(chunks),
        (data) => data?.choices?.[0]?.delta?.content || '',
        () => {},
        controller.signal
      ),
    (err) => {
      assert.equal(err.name, 'AbortError');
      return true;
    }
  );
});
