// ============================================================
// AI Writing Assistant — Background Service Worker
// Unified router: Gemini + OpenAI + streaming + context menu
// ============================================================

const STREAM_PORT_NAME = 'ai_stream';
const CONTEXT_ROOT_ID = 'awa_root';
const CONTEXT_ACTION_PREFIX = 'awa_action:';

const activeStreams = new Map();
const activeTabByWindow = new Map();
let lastFocusedWindowId = null;

const LANGUAGE_INSTRUCTIONS = {
  auto: 'Respond in the SAME language as the input text.',
  en: 'Respond in English.',
  es: 'Responde en español.',
  fr: 'Réponds en français.',
  de: 'Antworte auf Deutsch.',
  pt: 'Responda em português.',
  it: 'Rispondi in italiano.',
  zh: '用中文回答。',
  ja: '日本語で回答してください。',
  ko: '한국어로 답변해 주세요.',
};

const BASE_ACTIONS = [
  { id: 'grammar', label: 'Grammar' },
  { id: 'style', label: 'Style' },
  { id: 'synonyms', label: 'Synonyms' },
  { id: 'generate_image', label: '🎨 Generate Image' },
];

const IMAGE_ANALYSIS_ACTIONS = new Set(['describe_image', 'extract_text', 'analyze_image']);

const DEFAULT_PROMPTS = {
  grammar: (text, lang) =>
    `You are an expert proofreader. Check the following text for grammar, spelling, and punctuation errors.

For each error found:
1. Quote the error
2. Explain why it's wrong
3. Provide the corrected version

If no errors are found, say "✅ No grammar issues found — the text looks great!"

${lang}. Use clear formatting with bullet points.

Text to check:
"""
${text}
"""`,

  style: (text, lang) =>
    `You are an expert writing coach. Analyze the following text for writing style improvements.

Evaluate and suggest improvements for:
- **Clarity** — Is the meaning easy to understand?
- **Conciseness** — Are there unnecessary words or redundancies?
- **Tone** — Is the tone consistent and appropriate?
- **Readability** — Could sentence structure be improved?
- **Word choice** — Are there better alternatives for any words?

Provide specific rewritten alternatives for each suggestion.

${lang}. Use clear formatting.

Text to analyze:
"""
${text}
"""`,

  synonyms: (text, lang) =>
    `You are a vocabulary expert and thesaurus. For each significant content word in the following text (skip articles, prepositions, conjunctions, pronouns, and very common verbs like "is/are/was/were/have/has"), provide 2-4 synonyms.

Format each entry as:
**word** → synonym1, synonym2, synonym3

Group by word class (nouns, verbs, adjectives, adverbs) if the text is long enough.

${lang}.

Text:
"""
${text}
"""`,

  describe_image: (_text, lang) =>
    `You are a visual analyst. Describe this image in detail, including:
- Main subjects and objects present
- Colors, composition, and visual style
- Any text visible in the image
- Context, setting, and mood

${lang}. Be comprehensive yet concise. Use clear formatting.`,

  extract_text: (_text, lang) =>
    `Extract and transcribe ALL text visible in this image exactly as written. Maintain the original formatting and layout as closely as possible. Preserve line breaks, bullet points, and structure where relevant. If no text is visible in the image, say "No text found in this image."

${lang}.`,

  analyze_image: (_text, lang) =>
    `You are an expert visual analyst. Provide a thorough analysis of this image:

1. **Content** — What is depicted? Who or what are the main subjects?
2. **Context** — What is the likely purpose, origin, or setting?
3. **Details** — Notable features, symbols, text, or elements worth highlighting.
4. **Composition** — Visual layout, color palette, style, and technical quality.

${lang}. Use clear formatting with sections.`,

  generate_image: (text, _lang) => text,
};

function buildPrompt(action, text, config) {
  const langKey = config.responseLanguage || 'auto';
  const langInstruction = LANGUAGE_INSTRUCTIONS[langKey] || LANGUAGE_INSTRUCTIONS.auto;

  const customPromptMap = {
    grammar: config.promptGrammar,
    style: config.promptStyle,
    synonyms: config.promptSynonyms,
  };

  const customPrompt = customPromptMap[action];

  if (customPrompt) {
    let prompt = customPrompt.replace(/\{\{TEXT\}\}/gi, text);
    if (!customPrompt.match(/\{\{TEXT\}\}/i)) {
      prompt += `\n\nText:\n"""\n${text}\n"""`;
    }
    return `${langInstruction}\n\n${prompt}`;
  }

  return DEFAULT_PROMPTS[action](text, langInstruction);
}

function buildCustomPrompt(promptTemplate, text, config) {
  const langKey = config.responseLanguage || 'auto';
  const langInstruction = LANGUAGE_INSTRUCTIONS[langKey] || LANGUAGE_INSTRUCTIONS.auto;

  let prompt = promptTemplate.replace(/\{\{TEXT\}\}/gi, text);
  if (!promptTemplate.match(/\{\{TEXT\}\}/i)) {
    prompt += `\n\nText:\n"""\n${text}\n"""`;
  }
  return `${langInstruction}\n\n${prompt}`;
}

function supportsGeneration(model) {
  return Array.isArray(model.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent');
}

const geminiAdapter = {
  defaultModel: 'gemini-2.0-flash',
  imageGenerationModel: 'gemini-2.0-flash-preview-image-generation',
  models: [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (recommended)' },
    { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (fastest)' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (highest quality)' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
  ],

  _buildParts(prompt, imageData) {
    const parts = [];
    if (imageData) {
      if (imageData.startsWith('data:')) {
        const commaIdx = imageData.indexOf(',');
        const header = commaIdx > -1 ? imageData.slice(0, commaIdx) : '';
        const base64 = commaIdx > -1 ? imageData.slice(commaIdx + 1) : imageData;
        const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
        parts.push({ inlineData: { mimeType, data: base64 } });
      }
      // External URLs are not supported by Gemini inlineData; skip silently.
    }
    parts.push({ text: prompt });
    return parts;
  },

  async call(prompt, apiKey, config = {}, imageData = null) {
    const model = config.model || this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ parts: this._buildParts(prompt, imageData) }],
      generationConfig: {
        temperature: config.temperature ?? 0.4,
        maxOutputTokens: config.maxTokens || 1500,
      },
    };

    if (config.systemInstruction) {
      body.systemInstruction = { parts: [{ text: config.systemInstruction }] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API error (HTTP ${response.status})`);
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('');
    if (!result) throw new Error('Gemini returned an empty response. Please try again.');
    return result;
  },

  async stream(prompt, apiKey, config = {}, onDelta, signal, imageData = null) {
    const model = config.model || this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const body = {
      contents: [{ parts: this._buildParts(prompt, imageData) }],
      generationConfig: {
        temperature: config.temperature ?? 0.4,
        maxOutputTokens: config.maxTokens || 1500,
      },
    };

    if (config.systemInstruction) {
      body.systemInstruction = { parts: [{ text: config.systemInstruction }] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    return processSSEStream(
      response,
      (data) => data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('') || '',
      onDelta,
      signal
    );
  },

  async generateImage(prompt, apiKey, _config = {}) {
    const model = this.imageGenerationModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API error (HTTP ${response.status})`);
    }

    const data = await response.json();
    const imagePart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!imagePart) {
      throw new Error('Gemini did not return an image. Try a different prompt.');
    }
    const { mimeType, data: base64 } = imagePart.inlineData;
    return { imageDataUrl: `data:${mimeType};base64,${base64}`, mimeType };
  },

  async test(apiKey, model) {
    const m = model || this.defaultModel;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say "Connection successful!" in exactly those words.' }] }],
        generationConfig: { maxOutputTokens: 20 },
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  },

  async listModels(apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Gemini API error (HTTP ${response.status})`);
    }
    const data = await response.json();
    return (data.models || [])
      .filter(supportsGeneration)
      .map((m) => ({
        value: m.name.replace(/^models\//, ''),
        label: m.displayName || m.name.replace(/^models\//, ''),
        supportedMethods: m.supportedGenerationMethods,
      }));
  },
};

const openaiAdapter = {
  defaultModel: 'gpt-4o-mini',
  visionModels: new Set(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']),
  models: [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (recommended)' },
    { value: 'gpt-4o', label: 'GPT-4o (highest quality)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (fastest)' },
  ],

  _buildUserContent(prompt, imageData, model) {
    if (!imageData) return prompt;
    // Fall back to a vision-capable model if the configured one doesn't support it.
    const visionModel = this.visionModels.has(model) ? model : 'gpt-4o-mini';
    return {
      _visionModel: visionModel,
      content: [
        { type: 'image_url', image_url: { url: imageData } },
        { type: 'text', text: prompt },
      ],
    };
  },

  async call(prompt, apiKey, config = {}, imageData = null) {
    const baseModel = config.model || this.defaultModel;
    const userContent = this._buildUserContent(prompt, imageData, baseModel);
    const model = userContent?._visionModel || baseModel;
    const messages = [];

    if (config.systemInstruction) {
      messages.push({ role: 'system', content: config.systemInstruction });
    }
    messages.push({ role: 'user', content: userContent?._visionModel ? userContent.content : prompt });

    const body = {
      model,
      messages,
      temperature: config.temperature ?? 0.4,
      max_tokens: config.maxTokens || 1500,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API error (HTTP ${response.status})`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content;
    if (!result) throw new Error('OpenAI returned an empty response. Please try again.');
    return result;
  },

  async stream(prompt, apiKey, config = {}, onDelta, signal, imageData = null) {
    const baseModel = config.model || this.defaultModel;
    const userContent = this._buildUserContent(prompt, imageData, baseModel);
    const model = userContent?._visionModel || baseModel;
    const messages = [];

    if (config.systemInstruction) {
      messages.push({ role: 'system', content: config.systemInstruction });
    }
    messages.push({ role: 'user', content: userContent?._visionModel ? userContent.content : prompt });

    const body = {
      model,
      messages,
      temperature: config.temperature ?? 0.4,
      max_tokens: config.maxTokens || 1500,
      stream: true,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    return processSSEStream(
      response,
      (data) => data?.choices?.[0]?.delta?.content || '',
      onDelta,
      signal
    );
  },

  async generateImage(prompt, apiKey, _config = {}) {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API error (HTTP ${response.status})`);
    }

    const data = await response.json();
    const base64 = data.data?.[0]?.b64_json;
    if (!base64) throw new Error('OpenAI did not return an image. Try a different prompt.');
    return { imageDataUrl: `data:image/png;base64,${base64}`, mimeType: 'image/png' };
  },

  async test(apiKey, model) {
    const m = model || this.defaultModel;
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: m,
        messages: [{ role: 'user', content: 'Say "Connection successful!" in exactly those words.' }],
        max_tokens: 20,
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  },
};

const PROVIDERS = {
  gemini: geminiAdapter,
  openai: openaiAdapter,
};

async function processSSEStream(response, extractDelta, onDelta, signal) {
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(errText || `HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error('Streaming response body is empty.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  const findEventBoundary = (input) => {
    const lf = input.indexOf('\n\n');
    const crlf = input.indexOf('\r\n\r\n');
    if (lf === -1) return crlf;
    if (crlf === -1) return lf;
    return Math.min(lf, crlf);
  };

  const boundaryLengthAt = (input, index) => {
    if (index < 0) return 0;
    return input.startsWith('\r\n\r\n', index) ? 4 : 2;
  };

  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let boundary = findEventBoundary(buffer);
    while (boundary !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + boundaryLengthAt(buffer, boundary));
      boundary = findEventBoundary(buffer);

      const dataLines = rawEvent
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim());

      if (!dataLines.length) continue;

      const payload = dataLines.join('\n');
      if (payload === '[DONE]') {
        return fullText;
      }

      let parsed;
      try {
        parsed = JSON.parse(payload);
      } catch {
        continue;
      }

      const delta = extractDelta(parsed);
      if (!delta) continue;

      fullText += delta;
      onDelta(delta);
    }
  }

  return fullText;
}

async function resolveActiveConfig() {
  const storage = await chrome.storage.local.get(['providerConfig', 'apiKey', 'agentConfig']);

  if (storage.providerConfig) {
    const pc = storage.providerConfig;
    const providerId = pc.activeProvider || 'gemini';
    const adapter = PROVIDERS[providerId];
    if (!adapter) throw new Error(`Unknown provider: "${providerId}". Open Options to reconfigure.`);

    const providerCfg = pc[providerId] || {};
    const apiKey = providerCfg.apiKey || '';

    if (!apiKey) {
      throw new Error(
        `No API key configured for ${providerId === 'gemini' ? 'Gemini' : 'OpenAI'}. Open Options to add your key.`
      );
    }

    return { adapter, apiKey, config: providerCfg, providerId };
  }

  const apiKey = storage.apiKey || '';
  if (!apiKey) {
    throw new Error('API key not configured. Right-click the extension icon → Options to set your API key.');
  }

  return { adapter: geminiAdapter, apiKey, config: storage.agentConfig || {}, providerId: 'gemini' };
}

function coerceTemperature(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(1, numeric));
}

function coerceMaxTokens(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(100, Math.min(8000, Math.round(numeric)));
}

function normalizeActionOverride(override) {
  if (!override || typeof override !== 'object') return {};

  const normalized = {};
  if (typeof override.model === 'string' && override.model.trim()) {
    normalized.model = override.model.trim();
  }

  const temperature = coerceTemperature(override.temperature);
  if (temperature !== null) {
    normalized.temperature = temperature;
  }

  const maxTokens = coerceMaxTokens(override.maxTokens);
  if (maxTokens !== null) {
    normalized.maxTokens = maxTokens;
  }

  return normalized;
}

function resolveActionOverride(action, providerConfig, customAction, providerId) {
  if (action.startsWith('custom_')) {
    if (!customAction) return {};

    const fromProviderScoped = customAction.overrides?.[providerId];
    if (fromProviderScoped && typeof fromProviderScoped === 'object') {
      return normalizeActionOverride(fromProviderScoped);
    }

    if (customAction.overrides && typeof customAction.overrides === 'object') {
      return normalizeActionOverride(customAction.overrides);
    }

    return {};
  }

  const baseOverrides = providerConfig?.actionOverrides;
  if (!baseOverrides || typeof baseOverrides !== 'object') return {};

  return normalizeActionOverride(baseOverrides[action]);
}

function buildRuntimeConfig(action, providerConfig, customAction, providerId) {
  const runtimeConfig = { ...providerConfig };
  const override = resolveActionOverride(action, providerConfig, customAction, providerId);
  if (Object.keys(override).length) {
    Object.assign(runtimeConfig, override);
  }
  return runtimeConfig;
}

async function resolvePromptAndConfig(action, text, config, providerId) {
  const isCustomAction = action.startsWith('custom_');

  if (!DEFAULT_PROMPTS[action] && !isCustomAction) {
    throw new Error(`Unknown action: "${action}"`);
  }

  const trimmedText = text.length > 5000 ? text.substring(0, 5000) + '…' : text;

  if (!isCustomAction) {
    const runtimeConfig = buildRuntimeConfig(action, config, null, providerId);
    const prompt = buildPrompt(action, trimmedText, runtimeConfig);
    return { prompt, runtimeConfig };
  }

  const storage = await chrome.storage.local.get('customActions');
  const customActions = storage.customActions || [];
  const customAction = customActions.find((a) => a.id === action);

  if (!customAction) {
    throw new Error('Custom action not found. It may have been deleted.');
  }

  const runtimeConfig = buildRuntimeConfig(action, config, customAction, providerId);
  const prompt = buildCustomPrompt(customAction.prompt, trimmedText, runtimeConfig);
  return { prompt, runtimeConfig };
}

function emitStream(port, requestId, payload) {
  try {
    port.postMessage({
      type: 'AI_STREAM_EVENT',
      requestId,
      ...payload,
    });
  } catch {
    // Port might be disconnected; stream cleanup happens in finally/disconnect.
  }
}

function notifyTabToHideUi(tabId) {
  if (typeof tabId !== 'number') return;
  chrome.tabs.sendMessage(tabId, { type: 'FORCE_HIDE_UI' }, () => {
    chrome.runtime.lastError;
  });
}

function rememberActiveTab(windowId, tabId) {
  if (typeof windowId !== 'number' || typeof tabId !== 'number') return;
  activeTabByWindow.set(windowId, tabId);
}

function syncActiveTabForWindow(windowId) {
  if (typeof windowId !== 'number' || windowId < 0) return;
  chrome.tabs.query({ active: true, windowId }, (tabs) => {
    if (chrome.runtime.lastError) return;
    const tabId = tabs?.[0]?.id;
    if (typeof tabId === 'number') {
      rememberActiveTab(windowId, tabId);
    }
  });
}

function initializeActiveTabMap() {
  chrome.tabs.query({ active: true }, (tabs) => {
    if (chrome.runtime.lastError || !Array.isArray(tabs)) return;
    tabs.forEach((tab) => {
      if (typeof tab.windowId === 'number' && typeof tab.id === 'number') {
        rememberActiveTab(tab.windowId, tab.id);
      }
    });
  });
}

async function runStream(port, requestId, action, text, imageData) {
  const existing = activeStreams.get(requestId);
  if (existing?.controller) {
    existing.controller.abort();
  }

  const abortController = new AbortController();
  activeStreams.set(requestId, { controller: abortController, port });

  try {
    const { adapter, apiKey, config, providerId } = await resolveActiveConfig();

    // Image generation: use the dedicated generateImage method, skip streaming.
    if (action === 'generate_image') {
      if (typeof adapter.generateImage !== 'function') {
        throw new Error('Image generation is not supported by the current provider.');
      }
      emitStream(port, requestId, { phase: 'start', provider: providerId, action });
      const result = await adapter.generateImage(text, apiKey, config);
      emitStream(port, requestId, { phase: 'image_result', imageDataUrl: result.imageDataUrl, mimeType: result.mimeType, provider: providerId, action });
      emitStream(port, requestId, { phase: 'end', text: '', provider: providerId, action });
      return;
    }

    const { prompt, runtimeConfig } = await resolvePromptAndConfig(action, text, config, providerId);

    emitStream(port, requestId, { phase: 'start', provider: providerId, action });

    let completeText = '';
    if (typeof adapter.stream === 'function') {
      completeText = await adapter.stream(
        prompt,
        apiKey,
        runtimeConfig,
        (delta) => emitStream(port, requestId, { phase: 'delta', delta, provider: providerId, action }),
        abortController.signal,
        imageData || null
      );

      // Fallback for providers/environments where streaming yields no deltas.
      if (!completeText?.trim()) {
        completeText = await adapter.call(prompt, apiKey, runtimeConfig, imageData || null);
        if (completeText) {
          emitStream(port, requestId, { phase: 'delta', delta: completeText, provider: providerId, action });
        }
      }
    } else {
      completeText = await adapter.call(prompt, apiKey, runtimeConfig, imageData || null);
      emitStream(port, requestId, { phase: 'delta', delta: completeText, provider: providerId, action });
    }

    if (!completeText?.trim()) {
      throw new Error('AI returned an empty response. Try again or change model/provider in Options.');
    }

    emitStream(port, requestId, { phase: 'end', text: completeText, provider: providerId, action });
  } catch (err) {
    if (err?.name === 'AbortError') {
      emitStream(port, requestId, { phase: 'aborted', action });
      return;
    }

    emitStream(port, requestId, {
      phase: 'error',
      error: err?.message || 'An unexpected error occurred.',
      action,
    });
  } finally {
    activeStreams.delete(requestId);
  }
}

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== STREAM_PORT_NAME) return;

  port.onMessage.addListener((message) => {
    if (message?.type === 'AI_STREAM_START') {
      const { requestId, action, text, imageData } = message;
      const hasContent = text || imageData;
      if (!requestId || !action || !hasContent) {
        emitStream(port, requestId || 'unknown', { phase: 'error', error: 'Invalid stream request payload.' });
        return;
      }
      runStream(port, requestId, action, text || '', imageData || null);
      return;
    }

    if (message?.type === 'AI_STREAM_CANCEL') {
      const { requestId } = message;
      const stream = activeStreams.get(requestId);
      if (stream?.controller && stream.port === port) {
        stream.controller.abort();
      }
    }
  });

  port.onDisconnect.addListener(() => {
    for (const [requestId, stream] of activeStreams.entries()) {
      if (stream.port !== port) continue;
      stream.controller.abort();
      activeStreams.delete(requestId);
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TEST_CONNECTION') {
    const { providerId, apiKey, model } = message;
    const adapter = PROVIDERS[providerId];

    if (!adapter) {
      sendResponse({ error: `Unknown provider: "${providerId}"` });
      return false;
    }

    (async () => {
      try {
        const reply = await adapter.test(apiKey, model);
        sendResponse({ result: reply });
      } catch (err) {
        sendResponse({ error: err.message || 'Connection test failed.' });
      }
    })();

    return true;
  }

  if (message.type === 'LIST_MODELS') {
    const { providerId, apiKey } = message;
    const adapter = PROVIDERS[providerId];

    if (!adapter) {
      sendResponse({ error: `Unknown provider: "${providerId}"` });
      return false;
    }

    if (typeof adapter.listModels !== 'function') {
      sendResponse({ error: `Provider "${providerId}" does not support listing models.` });
      return false;
    }

    (async () => {
      try {
        const models = await adapter.listModels(apiKey);
        sendResponse({ models });
      } catch (err) {
        sendResponse({ error: err.message || 'Failed to list models.' });
      }
    })();

    return true;
  }

  if (message.type !== 'AI_REQUEST') return false;

  const { action, text } = message;

  (async () => {
    try {
      const { adapter, apiKey, config, providerId } = await resolveActiveConfig();
      const { prompt, runtimeConfig } = await resolvePromptAndConfig(action, text, config, providerId);
      const result = await adapter.call(prompt, apiKey, runtimeConfig);
      sendResponse({ result });
    } catch (err) {
      sendResponse({ error: err.message || 'An unexpected error occurred.' });
    }
  })();

  return true;
});

async function getContextActions() {
  const storage = await chrome.storage.local.get('customActions');
  const customActions = (storage.customActions || [])
    .filter((a) => a?.id && a?.name && a?.prompt)
    .map((a) => ({ id: a.id, label: `${a.icon || '✏️'} ${a.name}` }));

  return [...BASE_ACTIONS, ...customActions];
}

async function rebuildContextMenus() {
  await chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: CONTEXT_ROOT_ID,
    title: 'AI Writing Assistant',
    contexts: ['selection'],
  });

  const actions = await getContextActions();
  actions.forEach((action) => {
    chrome.contextMenus.create({
      id: `${CONTEXT_ACTION_PREFIX}${action.id}`,
      parentId: CONTEXT_ROOT_ID,
      title: action.label,
      contexts: ['selection'],
    });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.menuItemId || typeof info.menuItemId !== 'string') return;
  if (!info.menuItemId.startsWith(CONTEXT_ACTION_PREFIX)) return;
  if (!tab?.id || !info.selectionText) return;

  const actionId = info.menuItemId.slice(CONTEXT_ACTION_PREFIX.length);

  chrome.tabs.sendMessage(tab.id, {
    type: 'CONTEXT_ACTION_TRIGGER',
    actionId,
    text: info.selectionText,
  });
});

chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
  const previousTabId = activeTabByWindow.get(windowId);
  if (typeof previousTabId === 'number' && previousTabId !== tabId) {
    notifyTabToHideUi(previousTabId);
  }

  rememberActiveTab(windowId, tabId);
  lastFocusedWindowId = windowId;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  for (const [windowId, activeTabId] of activeTabByWindow.entries()) {
    if (activeTabId === tabId) {
      activeTabByWindow.delete(windowId);
    }
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    if (typeof lastFocusedWindowId === 'number') {
      notifyTabToHideUi(activeTabByWindow.get(lastFocusedWindowId));
    }
    return;
  }

  if (typeof lastFocusedWindowId === 'number' && lastFocusedWindowId !== windowId) {
    notifyTabToHideUi(activeTabByWindow.get(lastFocusedWindowId));
  }

  lastFocusedWindowId = windowId;
  syncActiveTabForWindow(windowId);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  if (changes.customActions) rebuildContextMenus().catch(() => {});
});

chrome.runtime.onInstalled.addListener((details) => {
  initializeActiveTabMap();
  rebuildContextMenus().catch(() => {});

  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LANGUAGE_INSTRUCTIONS,
    DEFAULT_PROMPTS,
    IMAGE_ANALYSIS_ACTIONS,
    BASE_ACTIONS,
    buildPrompt,
    buildCustomPrompt,
    coerceTemperature,
    coerceMaxTokens,
    normalizeActionOverride,
    resolveActionOverride,
    buildRuntimeConfig,
    geminiAdapter,
    openaiAdapter,
  };
}

chrome.runtime.onStartup.addListener(() => {
  initializeActiveTabMap();
  rebuildContextMenus().catch(() => {});
});
