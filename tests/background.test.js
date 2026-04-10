const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Minimal Chrome extension API stub so background.js can be evaluated without
// a real browser environment.
// ---------------------------------------------------------------------------
function createChromeMock() {
  const noop = () => {};
  const noopAsync = async () => {};
  return {
    runtime: {
      onConnect: { addListener: noop },
      onMessage: { addListener: noop },
      onInstalled: { addListener: noop },
      onStartup: { addListener: noop },
      openOptionsPage: noop,
      lastError: null,
    },
    storage: {
      local: {
        get: noopAsync,
        set: noopAsync,
      },
      onChanged: { addListener: noop },
    },
    tabs: {
      query: noop,
      sendMessage: noop,
      onActivated: { addListener: noop },
      onRemoved: { addListener: noop },
    },
    windows: {
      onFocusChanged: { addListener: noop },
      WINDOW_ID_NONE: -1,
    },
    contextMenus: {
      create: noop,
      removeAll: noopAsync,
      onClicked: { addListener: noop },
    },
  };
}

// Load background.js into an isolated VM context that has the chrome stub.
const bgSource = fs.readFileSync(
  path.join(__dirname, '..', 'background.js'),
  'utf8'
);

// Wrap the source so const/let variables are captured in a return object.
const wrapperSource = `
(function() {
${bgSource}
  return {
    DEFAULT_PROMPTS,
    IMAGE_ANALYSIS_ACTIONS,
    BASE_ACTIONS,
    geminiAdapter,
    openaiAdapter,
  };
})()
`;

const ctx = vm.createContext({
  chrome: createChromeMock(),
  fetch: async () => {},
  console,
  setTimeout,
  clearTimeout,
  AbortController,
  DOMException,
  TextDecoder,
  URL,
});

const bg = vm.runInContext(wrapperSource, ctx);

const {
  DEFAULT_PROMPTS,
  IMAGE_ANALYSIS_ACTIONS,
  geminiAdapter,
  openaiAdapter,
  BASE_ACTIONS,
} = bg;

// ---------------------------------------------------------------------------
// DEFAULT_PROMPTS image actions
// ---------------------------------------------------------------------------

test('DEFAULT_PROMPTS contains all image actions', () => {
  assert.ok(typeof DEFAULT_PROMPTS.describe_image === 'function', 'describe_image should be a function');
  assert.ok(typeof DEFAULT_PROMPTS.extract_text === 'function', 'extract_text should be a function');
  assert.ok(typeof DEFAULT_PROMPTS.analyze_image === 'function', 'analyze_image should be a function');
  assert.ok(typeof DEFAULT_PROMPTS.generate_image === 'function', 'generate_image should be a function');
});

test('DEFAULT_PROMPTS image action prompts return strings', () => {
  const lang = 'Respond in English.';
  assert.equal(typeof DEFAULT_PROMPTS.describe_image('', lang), 'string');
  assert.equal(typeof DEFAULT_PROMPTS.extract_text('', lang), 'string');
  assert.equal(typeof DEFAULT_PROMPTS.analyze_image('', lang), 'string');
});

test('DEFAULT_PROMPTS.generate_image returns the input text unchanged', () => {
  const prompt = 'a beautiful sunset over mountains';
  assert.equal(DEFAULT_PROMPTS.generate_image(prompt, 'Respond in English.'), prompt);
});

// ---------------------------------------------------------------------------
// IMAGE_ANALYSIS_ACTIONS set
// ---------------------------------------------------------------------------

test('IMAGE_ANALYSIS_ACTIONS contains the three image analysis actions', () => {
  assert.ok(IMAGE_ANALYSIS_ACTIONS.has('describe_image'));
  assert.ok(IMAGE_ANALYSIS_ACTIONS.has('extract_text'));
  assert.ok(IMAGE_ANALYSIS_ACTIONS.has('analyze_image'));
  assert.equal(IMAGE_ANALYSIS_ACTIONS.has('generate_image'), false);
  assert.equal(IMAGE_ANALYSIS_ACTIONS.has('grammar'), false);
});

// ---------------------------------------------------------------------------
// BASE_ACTIONS includes generate_image for the context menu
// ---------------------------------------------------------------------------

test('BASE_ACTIONS includes generate_image', () => {
  const ids = BASE_ACTIONS.map((a) => a.id);
  assert.ok(ids.includes('generate_image'), 'generate_image should be in BASE_ACTIONS');
});

// ---------------------------------------------------------------------------
// geminiAdapter._buildParts
// ---------------------------------------------------------------------------

test('geminiAdapter._buildParts with no imageData returns text-only part', () => {
  const parts = geminiAdapter._buildParts('hello', null);
  assert.equal(JSON.stringify(parts), JSON.stringify([{ text: 'hello' }]));
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
  // External URLs cannot be sent as inlineData; only the text part should be present.
  assert.equal(JSON.stringify(parts), JSON.stringify([{ text: 'describe this' }]));
});

// ---------------------------------------------------------------------------
// openaiAdapter._buildUserContent
// ---------------------------------------------------------------------------

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
