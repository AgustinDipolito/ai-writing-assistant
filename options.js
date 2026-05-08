// ============================================================
// AI Writing Assistant — Options Page
// Multi-provider: Gemini + OpenAI
// ============================================================

// ============================================================
// 1. PROVIDER REGISTRY (mirrors background.js adapters)
// ============================================================

const PROVIDERS = {
  gemini: {
    label: 'Gemini',
    defaultModel: 'gemini-2.0-flash',
    models: [
      { value: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash (recommended)' },
      { value: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (fastest)' },
      { value: 'gemini-1.5-pro',        label: 'Gemini 1.5 Pro (highest quality)' },
      { value: 'gemini-1.5-flash',      label: 'Gemini 1.5 Flash' },
    ],
  },
  openai: {
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini',
    models: [
      { value: 'gpt-4o-mini',    label: 'GPT-4o Mini (recommended)' },
      { value: 'gpt-4o',        label: 'GPT-4o (highest quality)' },
      { value: 'gpt-4-turbo',   label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (fastest)' },
    ],
  },
  anthropic: {
    label: 'Anthropic Claude',
    defaultModel: 'claude-3-5-haiku-20241022',
    models: [
      { value: 'claude-opus-4-5',            label: 'Claude Opus 4.5 (most capable)' },
      { value: 'claude-sonnet-4-5',          label: 'Claude Sonnet 4.5 (balanced)' },
      { value: 'claude-3-5-haiku-20241022',  label: 'Claude 3.5 Haiku (fastest)' },
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    ],
  },
  openrouter: {
    label: 'OpenRouter',
    defaultModel: 'openai/gpt-4o-mini',
    models: [
      { value: 'openai/gpt-4o-mini',                       label: 'GPT-4o Mini (OpenAI)' },
      { value: 'openai/gpt-4o',                            label: 'GPT-4o (OpenAI)' },
      { value: 'anthropic/claude-3-5-haiku',               label: 'Claude 3.5 Haiku (Anthropic)' },
      { value: 'anthropic/claude-3-5-sonnet',              label: 'Claude 3.5 Sonnet (Anthropic)' },
      { value: 'google/gemini-2.0-flash-001',              label: 'Gemini 2.0 Flash (Google)' },
      { value: 'meta-llama/llama-3.3-70b-instruct',        label: 'Llama 3.3 70B (Meta)' },
      { value: 'mistralai/mistral-small-3.1-24b-instruct', label: 'Mistral Small (Mistral AI)' },
      { value: 'deepseek/deepseek-chat-v3-0324',           label: 'DeepSeek Chat (DeepSeek)' },
    ],
  },
  ollama: {
    label: 'Ollama',
    defaultModel: 'llama3.2',
    requiresApiKey: false,
    models: [
      { value: 'llama3.2', label: 'Llama 3.2 (recommended)' },
      { value: 'llama3.1', label: 'Llama 3.1' },
      { value: 'mistral',  label: 'Mistral' },
      { value: 'phi4',     label: 'Phi-4' },
      { value: 'gemma3',   label: 'Gemma 3' },
      { value: 'qwen2.5',  label: 'Qwen 2.5' },
      { value: 'llava',    label: 'LLaVA (vision)' },
    ],
  },
};

// ============================================================
// 2. DOM REFERENCES
// ============================================================

const providerSelect     = document.getElementById('providerSelect');
const apiKeyInputs       = {
  gemini:      document.getElementById('apiKey-gemini'),
  openai:      document.getElementById('apiKey-openai'),
  anthropic:   document.getElementById('apiKey-anthropic'),
  openrouter:  document.getElementById('apiKey-openrouter'),
};
const ollamaBaseUrlInput = document.getElementById('baseUrl-ollama');
const providerPanels     = {
  gemini:      document.getElementById('panel-gemini'),
  openai:      document.getElementById('panel-openai'),
  anthropic:   document.getElementById('panel-anthropic'),
  openrouter:  document.getElementById('panel-openrouter'),
  ollama:      document.getElementById('panel-ollama'),
};
const saveBtn            = document.getElementById('save');
const testBtn            = document.getElementById('test');
const refreshModelsBtn   = document.getElementById('refreshModels');
const modelsHint         = document.getElementById('modelsHint');
const statusEl           = document.getElementById('status');
const modelSelect        = document.getElementById('modelSelect');
const temperatureSlider  = document.getElementById('temperature');
const tempValueDisplay   = document.getElementById('tempValue');
const maxTokensInput     = document.getElementById('maxTokens');
const responseLanguage   = document.getElementById('responseLanguage');
const promptGrammar      = document.getElementById('promptGrammar');
const promptStyle        = document.getElementById('promptStyle');
const promptSynonyms     = document.getElementById('promptSynonyms');
const systemInstruction  = document.getElementById('systemInstruction');
const resetConfigBtn     = document.getElementById('resetConfig');
const configStatusEl     = document.getElementById('configStatus');
const configAutoSave     = document.getElementById('configAutoSave');
const footerProvider     = document.getElementById('footerProvider');
const footerModel        = document.getElementById('footerModel');


// ============================================================
// 3. STATUS HELPER
// ============================================================

function showStatus(type, message, el = statusEl) {
  if (!el) return;
  el.className = `status ${type}`;
  el.textContent = message;
  if (type === 'success') {
    setTimeout(() => { el.className = 'status'; }, 4000);
  }
}

function escapeHtmlText(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeAttrValue(str) {
  return escapeHtmlText(str).replace(/"/g, '&quot;');
}

// ============================================================
// 4. PROVIDER PANEL SWITCHING
// ============================================================

function switchProviderPanel(providerId) {
  Object.keys(providerPanels).forEach((id) => {
    providerPanels[id].style.display = id === providerId ? '' : 'none';
  });
  populateModelSelect(providerId);
  renderActionCards();
  updateFooter(providerId);
}

function populateModelSelect(providerId, selectedModel) {
  const provider = PROVIDERS[providerId];
  if (!provider) return;
  modelSelect.innerHTML = provider.models
    .map((m) => `<option value="${escapeAttrValue(m.value)}"${m.value === (selectedModel || provider.defaultModel) ? ' selected' : ''}>${escapeHtmlText(m.label)}</option>`)
    .join('');
}

function updateFooter(providerId, model) {
  const provider = PROVIDERS[providerId];
  if (!provider) return;
  footerProvider.textContent = provider.label;
  footerModel.textContent = model || modelSelect.value || provider.defaultModel;
}

function buildModelOptions(providerId, selectedModel, includeGlobalOption = false, globalOptionLabel = 'Use global model') {
  const provider = PROVIDERS[providerId];
  if (!provider) return includeGlobalOption ? `<option value="">${escapeHtmlText(globalOptionLabel)}</option>` : '';

  const head = includeGlobalOption ? `<option value="">${escapeHtmlText(globalOptionLabel)}</option>` : '';
  const options = provider.models
    .map((m) => `<option value="${escapeAttrValue(m.value)}"${m.value === selectedModel ? ' selected' : ''}>${escapeHtmlText(m.label)}</option>`)
    .join('');

  return head + options;
}

providerSelect.addEventListener('change', () => {
  if (customActionsDirty) syncCardsToData();
  switchProviderPanel(providerSelect.value);
  autoSaveConfig();
});

// ============================================================
// 5. SHOW/HIDE KEY VISIBILITY (delegated, works for both panels)
// ============================================================

document.querySelectorAll('.toggle-visibility[data-target]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
    btn.title = input.type === 'password' ? 'Show key' : 'Hide key';
  });
});

// ============================================================
// 6. SAVE KEY
// ============================================================

saveBtn.addEventListener('click', () => {
  const providerId = providerSelect.value;

  // Ollama uses a base URL instead of an API key
  if (providerId === 'ollama') {
    const baseUrl = ollamaBaseUrlInput?.value.trim() || 'http://localhost:11434';
    chrome.storage.local.get('providerConfig', ({ providerConfig }) => {
      const pc = providerConfig || { activeProvider: providerId };
      pc.activeProvider = providerId;
      if (!pc[providerId]) pc[providerId] = {};
      pc[providerId].baseUrl = baseUrl;
      chrome.storage.local.set({ providerConfig: pc }, () => {
        showStatus('success', 'Ollama settings saved!');
      });
    });
    return;
  }

  const apiKey = apiKeyInputs[providerId]?.value.trim();

  if (!apiKey) {
    showStatus('error', 'Please enter an API key.');
    return;
  }

  chrome.storage.local.get('providerConfig', ({ providerConfig }) => {
    const pc = providerConfig || { activeProvider: providerId };
    pc.activeProvider = providerId;
    if (!pc[providerId]) pc[providerId] = {};
    pc[providerId].apiKey = apiKey;

    chrome.storage.local.set({ providerConfig: pc }, () => {
      showStatus('success', `${PROVIDERS[providerId].label} API key saved!`);
    });
  });
});

// ============================================================
// 7. TEST CONNECTION (via background router)
// ============================================================

testBtn.addEventListener('click', async () => {
  const providerId = providerSelect.value;
  const provider = PROVIDERS[providerId];

  // Gather provider-specific config to send with the test request
  const extraConfig = {};
  let apiKey = '';

  if (providerId === 'ollama') {
    extraConfig.baseUrl = ollamaBaseUrlInput?.value.trim() || 'http://localhost:11434';
  } else {
    apiKey = apiKeyInputs[providerId]?.value.trim() || '';
    if (!apiKey) {
      showStatus('error', 'Please enter an API key first.');
      return;
    }
  }

  testBtn.disabled = true;
  testBtn.textContent = 'Testing…';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TEST_CONNECTION',
      providerId,
      apiKey,
      model: modelSelect.value,
      config: extraConfig,
    });

    if (response?.error) {
      showStatus('error', `Connection failed: ${response.error}`);
    } else {
      const reply = (response?.result || '').trim().substring(0, 80);
      showStatus('success', `Connected! ${provider.label} says: "${reply}"`);
    }
  } catch (err) {
    showStatus('error', `Extension error: ${err.message || 'Unknown'}`);
  } finally {
    testBtn.disabled = false;
    testBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      Test Connection`;
  }
});

// ============================================================
// 7b. REFRESH MODELS
// ============================================================

refreshModelsBtn.addEventListener('click', async () => {
  const providerId = providerSelect.value;

  // Gather provider-specific config
  const extraConfig = {};
  let apiKey = '';

  if (providerId === 'ollama') {
    extraConfig.baseUrl = ollamaBaseUrlInput?.value.trim() || 'http://localhost:11434';
  } else {
    apiKey = apiKeyInputs[providerId]?.value.trim() || '';
    if (!apiKey) {
      showStatus('error', 'Please enter an API key first.');
      return;
    }
  }

  refreshModelsBtn.disabled = true;
  refreshModelsBtn.textContent = 'Loading…';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'LIST_MODELS',
      providerId,
      apiKey,
      config: extraConfig,
    });

    if (response?.error) {
      showStatus('error', `Failed to fetch models: ${response.error}`);
    } else {
      const models = response?.models || [];
      if (models.length === 0) {
        showStatus('error', 'No supported models found for this API key.');
      } else {
        const currentValue = modelSelect.value;
        modelSelect.innerHTML = '';
        models.forEach((m) => {
          const opt = document.createElement('option');
          opt.value = m.value;
          opt.textContent = m.label;
          opt.selected = m.value === currentValue;
          modelSelect.appendChild(opt);
        });
        const countLabel = `${models.length} model${models.length !== 1 ? 's' : ''}`;
        if (modelsHint) {
          modelsHint.textContent = `${countLabel} available.`;
        }
        showStatus('success', `Loaded ${countLabel}.`);
        autoSaveConfig();
      }
    }
  } catch (err) {
    showStatus('error', `Extension error: ${err.message || 'Unknown'}`);
  } finally {
    refreshModelsBtn.disabled = false;
    refreshModelsBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
      </svg>
      Refresh Models`;
  }
});

// ============================================================
// 8. AGENT CONFIG — gather + auto-save
// ============================================================

const DEFAULTS = {
  model: null, // derived from provider
  temperature: 0.4,
  maxTokens: 1500,
  responseLanguage: 'auto',
  promptGrammar: '',
  promptStyle: '',
  promptSynonyms: '',
  systemInstruction: '',
};

function parseOptionalNumber(value, min, max) {
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeTemperature(value) {
  return Number(value.toFixed(2));
}

function normalizeMaxTokens(value) {
  return Math.round(value);
}

function gatherSharedConfig() {
  return {
    model: modelSelect.value,
    temperature: parseFloat(temperatureSlider.value),
    maxTokens: Math.min(8000, Math.max(100, parseInt(maxTokensInput.value, 10) || 1500)),
    responseLanguage: responseLanguage.value,
    promptGrammar: (promptGrammar?.value || '').trim(),
    promptStyle: (promptStyle?.value || '').trim(),
    promptSynonyms: (promptSynonyms?.value || '').trim(),
    systemInstruction: (systemInstruction?.value || '').trim(),
  };
}

let autoSaveTimer = null;
let autoSaveBadgeTimer = null;

function autoSaveConfig() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const providerId = providerSelect.value;
    const shared = gatherSharedConfig();
    updateFooter(providerId, shared.model);

    chrome.storage.local.get('providerConfig', ({ providerConfig }) => {
      const pc = providerConfig || { activeProvider: providerId };
      pc.activeProvider = providerId;
      if (!pc[providerId]) pc[providerId] = {};
      // Merge shared config into the provider's sub-config (preserve apiKey and baseUrl)
      Object.assign(pc[providerId], shared);

      // Persist Ollama-specific baseUrl
      if (providerId === 'ollama' && ollamaBaseUrlInput) {
        pc[providerId].baseUrl = ollamaBaseUrlInput.value.trim() || 'http://localhost:11434';
      }

      chrome.storage.local.set({ providerConfig: pc }, () => {
        if (!configAutoSave) return;
        configAutoSave.classList.add('show');
        clearTimeout(autoSaveBadgeTimer);
        autoSaveBadgeTimer = setTimeout(() => {
          configAutoSave.classList.remove('show');
        }, 1800);
      });
    });
  }, 400);
}

modelSelect.addEventListener('change', autoSaveConfig);
temperatureSlider.addEventListener('input', () => {
  tempValueDisplay.textContent = temperatureSlider.value;
  autoSaveConfig();
});
maxTokensInput.addEventListener('input', autoSaveConfig);
responseLanguage.addEventListener('change', autoSaveConfig);
[promptGrammar, promptStyle, promptSynonyms, systemInstruction].forEach((el) => {
  el?.addEventListener('input', autoSaveConfig);
});
if (ollamaBaseUrlInput) {
  ollamaBaseUrlInput.addEventListener('input', autoSaveConfig);
}


// ============================================================
// 9. COLLAPSIBLE TEXTAREAS
// ============================================================

document.querySelectorAll('textarea.collapsible').forEach((ta) => {
  ta.addEventListener('focus', () => ta.classList.add('expanded'));
  ta.addEventListener('blur', () => {
    if (!ta.value.trim()) ta.classList.remove('expanded');
  });
});

function expandCollapsibleIfFilled() {
  [promptGrammar, promptStyle, promptSynonyms, systemInstruction].forEach((ta) => {
    if (!ta) return;
    if (ta.value.trim()) ta.classList.add('expanded');
    else ta.classList.remove('expanded');
  });
}

// ============================================================
// 10. LOAD SAVED CONFIG
// ============================================================

chrome.storage.local.get('providerConfig', ({ providerConfig }) => {
  const pc = providerConfig || {};
  const providerId = pc.activeProvider || 'gemini';

  // Set provider selector
  providerSelect.value = providerId;
  switchProviderPanel(providerId);

  // Load API keys for all key-based providers
  Object.keys(apiKeyInputs).forEach((id) => {
    if (pc[id]?.apiKey) apiKeyInputs[id].value = pc[id].apiKey;
  });

  // Load Ollama base URL
  if (ollamaBaseUrlInput && pc.ollama?.baseUrl) {
    ollamaBaseUrlInput.value = pc.ollama.baseUrl;
  }

  // Load shared config from active provider's sub-config
  const cfg = pc[providerId] || {};
  populateModelSelect(providerId, cfg.model);
  temperatureSlider.value = cfg.temperature ?? DEFAULTS.temperature;
  tempValueDisplay.textContent = temperatureSlider.value;
  maxTokensInput.value = cfg.maxTokens || DEFAULTS.maxTokens;
  responseLanguage.value = cfg.responseLanguage || DEFAULTS.responseLanguage;
  if (promptGrammar) promptGrammar.value = cfg.promptGrammar || '';
  if (promptStyle) promptStyle.value = cfg.promptStyle || '';
  if (promptSynonyms) promptSynonyms.value = cfg.promptSynonyms || '';
  if (systemInstruction) systemInstruction.value = cfg.systemInstruction || '';


  updateFooter(providerId, cfg.model);
  expandCollapsibleIfFilled();
  // Refresh generator availability after API keys are populated from storage
  if (typeof updateGeneratorAvailability === 'function') updateGeneratorAvailability();
});

// ============================================================
// 11. RESET DEFAULTS
// ============================================================

if (resetConfigBtn) resetConfigBtn.addEventListener('click', () => {
  const providerId = providerSelect.value;
  const provider = PROVIDERS[providerId];

  populateModelSelect(providerId, provider.defaultModel);
  temperatureSlider.value = DEFAULTS.temperature;
  tempValueDisplay.textContent = DEFAULTS.temperature;
  maxTokensInput.value = DEFAULTS.maxTokens;
  responseLanguage.value = DEFAULTS.responseLanguage;
  if (promptGrammar) promptGrammar.value = '';
  if (promptStyle) promptStyle.value = '';
  if (promptSynonyms) promptSynonyms.value = '';
  if (systemInstruction) systemInstruction.value = '';
  expandCollapsibleIfFilled();

  const resetCfg = {
    model: provider.defaultModel,
    ...DEFAULTS,
  };

  chrome.storage.local.get('providerConfig', ({ providerConfig }) => {
    const pc = providerConfig || { activeProvider: providerId };
    if (!pc[providerId]) pc[providerId] = {};
    const savedKey = pc[providerId].apiKey;
    pc[providerId] = { ...resetCfg, apiKey: savedKey };
    chrome.storage.local.set({ providerConfig: pc }, () => {
      updateFooter(providerId, provider.defaultModel);
      showStatus('success', 'Reset to defaults!', configStatusEl || statusEl);
    });
  });
});

// ============================================================
// 12. CUSTOM ACTIONS
// ============================================================

const customActionsList       = document.getElementById('customActionsList');
const addCustomActionBtn      = document.getElementById('addCustomAction');
const saveCustomActionsBtn    = document.getElementById('saveCustomActions');
const customActionsStatusEl   = document.getElementById('customActionsStatus');

const ICON_OPTIONS = ['✏️', '🔍', '📝', '💡', '🎯', '📐', '🧩', '🌐', '⚡', '📖', '🛠️', '🔄'];

let customActions = [];
let customActionsDirty = false;

function generateId() {
  return 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

function normalizeCustomAction(action) {
  const normalized = {
    id: action?.id || generateId(),
    name: String(action?.name || ''),
    icon: action?.icon || '✏️',
    prompt: String(action?.prompt || ''),
    overrides: {},
    hidden: action?.hidden === true,
  };

  const PROVIDER_KEYS = Object.keys(PROVIDERS);

  if (action?.overrides && typeof action.overrides === 'object') {
    const hasProviderKeys = PROVIDER_KEYS.some((key) => key in action.overrides);
    if (hasProviderKeys) {
      normalized.overrides = {};
      PROVIDER_KEYS.forEach((key) => {
        normalized.overrides[key] = action.overrides[key] || {};
      });
    } else {
      // Legacy flat overrides: apply to all providers so existing overrides continue to work
      normalized.overrides = {};
      PROVIDER_KEYS.forEach((key) => {
        normalized.overrides[key] = action.overrides;
      });
    }
  }

  return normalized;
}

function getCustomActionOverride(action, providerId) {
  if (!action?.overrides || typeof action.overrides !== 'object') return {};
  const override = action.overrides[providerId];
  return override && typeof override === 'object' ? override : {};
}

function getGlobalActionOverride(providerId) {
  const provider = PROVIDERS[providerId];
  const shared = gatherSharedConfig();
  return {
    model: shared.model || provider?.defaultModel || '',
    temperature: Number.isFinite(shared.temperature) ? normalizeTemperature(shared.temperature) : DEFAULTS.temperature,
    maxTokens: Number.isFinite(shared.maxTokens) ? normalizeMaxTokens(shared.maxTokens) : DEFAULTS.maxTokens,
  };
}

function getResolvedCustomActionOverride(action, providerId) {
  return {
    ...getGlobalActionOverride(providerId),
    ...getCustomActionOverride(action, providerId),
  };
}

function hasCustomActionOverride(action, providerId) {
  return Object.keys(getCustomActionOverride(action, providerId)).length > 0;
}

function getModelLabel(providerId, model) {
  const provider = PROVIDERS[providerId];
  return provider?.models.find((entry) => entry.value === model)?.label || model;
}

function renderActionCards() {
  if (customActions.length === 0) {
    customActionsList.innerHTML = '<div class="empty-state">No custom actions yet. Click the button below to add one.</div>';
    return;
  }

  const providerId = providerSelect.value;
  const providerLabel = escapeHtmlText(PROVIDERS[providerId].label);

  customActionsList.innerHTML = customActions.map((action, index) => {
    const customOverride = getCustomActionOverride(action, providerId);
    const resolvedOverride = getResolvedCustomActionOverride(action, providerId);
    const globalOverride = getGlobalActionOverride(providerId);
    const showCustomState = hasCustomActionOverride(action, providerId);
    const globalModelLabel = getModelLabel(providerId, globalOverride.model);

    return `
    <div class="custom-action-card${action.hidden ? ' is-hidden' : ''}" data-index="${index}">
      <div class="card-header">
        <span class="card-number">#${index + 1}</span>
        <div class="card-header-actions">
          <button class="btn-toggle-hidden" type="button" data-index="${index}" aria-label="${action.hidden ? 'Show action in menu' : 'Hide action from menu'}" aria-pressed="${action.hidden}" title="${action.hidden ? 'Show in menu' : 'Hide from menu'}">${action.hidden ? '🙈 Hidden' : '👁️ Visible'}</button>
          <button class="btn-remove" type="button" data-index="${index}">Remove</button>
        </div>
      </div>
      <div class="card-fields">
        <div>
          <label>Action Name</label>
          <input type="text" class="action-name" value="${escapeAttr(action.name)}" placeholder="e.g., Simplify, Translate, Summarize" data-index="${index}">
        </div>
        <div>
          <label>Icon</label>
          <div class="custom-action-icon-row">
            ${ICON_OPTIONS.map(icon => `
              <button type="button" class="icon-choice${action.icon === icon ? ' selected' : ''}" data-icon="${icon}" data-index="${index}">${icon}</button>
            `).join('')}
          </div>
        </div>
        <div>
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:4px;">
            <label style="margin-bottom:0;">Prompt Template</label>
            <button type="button" class="btn-enhance-prompt" data-index="${index}" title="Use AI to improve this prompt based on the action name and current description">✨ Enhance Prompt</button>
          </div>
          <textarea class="action-prompt" placeholder="Write your prompt here. Use {{TEXT}} for the selected text." data-index="${index}">${escapeHtml(action.prompt)}</textarea>
        </div>
        <div>
          <details class="advanced-settings" ${showCustomState ? 'open="open"' : ''}>
            <summary>
              Advanced Config (${providerLabel})
              <span class="advanced-summary-badge">${showCustomState ? 'Custom' : 'Global defaults'}</span>
            </summary>
            <div class="advanced-settings-body">
              <p class="override-hint">These values start from your current global ${providerLabel} settings. Matching values keep using the global configuration.</p>
              <div class="override-fields">
                <div>
                  <label>Model</label>
                  <select class="action-override-model" data-index="${index}">
                    ${buildModelOptions(providerId, customOverride.model, true, `Use global model (${globalModelLabel})`)}
                  </select>
                </div>
                <div>
                  <label>Temperature</label>
                  <input type="number" class="action-override-temp" data-index="${index}" min="0" max="1" step="0.1" value="${escapeAttrValue(resolvedOverride.temperature)}">
                </div>
                <div>
                  <label>Max Output Tokens</label>
                  <input type="number" class="action-override-tokens" data-index="${index}" min="100" max="8000" step="100" value="${escapeAttrValue(resolvedOverride.maxTokens)}">
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

function escapeAttr(str) {
  return escapeAttrValue(str);
}

function escapeHtml(str) {
  return escapeHtmlText(str);
}

function syncCardsToData() {
  const providerId = providerSelect.value;
  const globalOverride = getGlobalActionOverride(providerId);
  const cards = customActionsList.querySelectorAll('.custom-action-card');
  cards.forEach((card, index) => {
    if (customActions[index]) {
      customActions[index].name = card.querySelector('.action-name').value.trim();
      customActions[index].prompt = card.querySelector('.action-prompt').value.trim();

      if (!customActions[index].overrides || typeof customActions[index].overrides !== 'object') {
        customActions[index].overrides = {};
      }

      const model = card.querySelector('.action-override-model')?.value?.trim();
      const temperature = parseOptionalNumber(card.querySelector('.action-override-temp')?.value, 0, 1);
      const maxTokens = parseOptionalNumber(card.querySelector('.action-override-tokens')?.value, 100, 8000);
      const override = {};

      if (model && model !== globalOverride.model) override.model = model;
      if (typeof temperature === 'number') {
        const normalizedTemperature = normalizeTemperature(temperature);
        if (normalizedTemperature !== globalOverride.temperature) {
          override.temperature = normalizedTemperature;
        }
      }
      if (typeof maxTokens === 'number') {
        const normalizedMaxTokens = normalizeMaxTokens(maxTokens);
        if (normalizedMaxTokens !== globalOverride.maxTokens) {
          override.maxTokens = normalizedMaxTokens;
        }
      }

      if (Object.keys(override).length > 0) {
        customActions[index].overrides[providerId] = override;
      } else {
        delete customActions[index].overrides[providerId];
      }
    }
  });
  customActionsDirty = false;
}

addCustomActionBtn.addEventListener('click', () => {
  syncCardsToData();
  customActions.push({ id: generateId(), name: '', icon: '✏️', prompt: '', overrides: {}, hidden: false });
  renderActionCards();
  const lastCard = customActionsList.querySelector('.custom-action-card:last-child');
  if (lastCard) lastCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

customActionsList.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('.btn-remove');
  if (removeBtn) {
    syncCardsToData();
    customActions.splice(parseInt(removeBtn.dataset.index, 10), 1);
    renderActionCards();
    return;
  }
  const toggleHiddenBtn = e.target.closest('.btn-toggle-hidden');
  if (toggleHiddenBtn) {
    syncCardsToData();
    const index = parseInt(toggleHiddenBtn.dataset.index, 10);
    customActions[index].hidden = !customActions[index].hidden;
    renderActionCards();
    return;
  }
  const iconBtn = e.target.closest('.icon-choice');
  if (iconBtn) {
    syncCardsToData();
    customActions[parseInt(iconBtn.dataset.index, 10)].icon = iconBtn.dataset.icon;
    renderActionCards();
    return;
  }
  const enhanceBtn = e.target.closest('.btn-enhance-prompt');
  if (enhanceBtn) {
    const index = parseInt(enhanceBtn.dataset.index, 10);
    const card = customActionsList.querySelector(`.custom-action-card[data-index="${index}"]`);
    if (!card) return;
    const nameInput = card.querySelector('.action-name');
    const promptTextarea = card.querySelector('.action-prompt');
    const actionName = nameInput?.value.trim() || '';
    const currentPrompt = promptTextarea?.value.trim() || '';
    enhanceBtn.disabled = true;
    enhanceBtn.textContent = '⏳ Enhancing…';
    chrome.runtime.sendMessage(
      { type: 'ENHANCE_PROMPT', actionName, currentPrompt },
      (response) => {
        enhanceBtn.disabled = false;
        enhanceBtn.textContent = '✨ Enhance Prompt';
        if (response?.error) {
          showStatus('error', `Enhance failed: ${response.error}`, customActionsStatusEl);
        } else if (response?.result) {
          promptTextarea.value = response.result.trim();
          showStatus('success', 'Prompt enhanced!', customActionsStatusEl);
        }
      }
    );
  }
});

customActionsList.addEventListener('input', (e) => {
  if (e.target.closest('.custom-action-card')) customActionsDirty = true;
});

customActionsList.addEventListener('change', (e) => {
  if (e.target.closest('.custom-action-card')) customActionsDirty = true;
});

saveCustomActionsBtn.addEventListener('click', () => {
  syncCardsToData();
  for (let i = 0; i < customActions.length; i++) {
    if (!customActions[i].name) {
      showStatus('error', `Action #${i + 1} needs a name.`, customActionsStatusEl);
      return;
    }
    if (!customActions[i].prompt) {
      showStatus('error', `Action "${customActions[i].name}" needs a prompt template.`, customActionsStatusEl);
      return;
    }
  }
  chrome.storage.local.set({ customActions }, () => {
    showStatus('success', `${customActions.length} custom action(s) saved!`, customActionsStatusEl);
  });
});

chrome.storage.local.get('customActions', ({ customActions: saved }) => {
  customActions = (saved || []).map(normalizeCustomAction);
  renderActionCards();
});

// ============================================================
// 13. GOOGLE AUTH
// ============================================================

const btnGoogleSignIn      = document.getElementById('btnGoogleSignIn');
const btnGoogleSignOut     = document.getElementById('btnGoogleSignOut');
const accountSignedOut     = document.getElementById('accountSignedOut');
const accountSignedIn      = document.getElementById('accountSignedIn');
const accountAvatar        = document.getElementById('accountAvatar');
const accountAvatarPlaceholder = document.getElementById('accountAvatarPlaceholder');
const accountName          = document.getElementById('accountName');
const accountEmail         = document.getElementById('accountEmail');
const accountStatusMsg     = document.getElementById('accountStatusMsg');

function updateAuthUI(user) {
  if (user) {
    accountSignedOut.style.display = 'none';
    accountSignedIn.style.display = 'flex';
    accountName.textContent = user.name || 'Google User';
    accountEmail.textContent = user.email || '';
    if (user.picture) {
      accountAvatar.src = user.picture;
      accountAvatar.style.display = '';
      accountAvatarPlaceholder.style.display = 'none';
    } else {
      accountAvatar.style.display = 'none';
      accountAvatarPlaceholder.style.display = 'flex';
      accountAvatarPlaceholder.textContent = (user.name || 'G').charAt(0).toUpperCase();
    }
  } else {
    accountSignedOut.style.display = 'flex';
    accountSignedIn.style.display = 'none';
    accountAvatar.style.display = 'none';
    accountAvatarPlaceholder.style.display = 'flex';
    accountAvatarPlaceholder.textContent = '?';
  }
  accountStatusMsg.textContent = '';
}

function loadAuthState() {
  chrome.runtime.sendMessage({ type: 'GET_AUTH_STATE' }, (response) => {
    updateAuthUI(response?.user || null);
  });
}

btnGoogleSignIn.addEventListener('click', () => {
  btnGoogleSignIn.disabled = true;
  btnGoogleSignIn.textContent = 'Signing in…';
  accountStatusMsg.textContent = '';

  chrome.runtime.sendMessage({ type: 'GOOGLE_SIGN_IN' }, (response) => {
    btnGoogleSignIn.disabled = false;
    btnGoogleSignIn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
        <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
      </svg>
      Sign in with Google`;

    if (response?.error) {
      accountStatusMsg.textContent = `Sign-in failed: ${response.error}`;
      accountStatusMsg.style.color = 'var(--error)';
    } else if (response?.user) {
      updateAuthUI(response.user);
    }
  });
});

btnGoogleSignOut.addEventListener('click', () => {
  btnGoogleSignOut.disabled = true;
  btnGoogleSignOut.textContent = 'Signing out…';

  chrome.runtime.sendMessage({ type: 'GOOGLE_SIGN_OUT' }, () => {
    btnGoogleSignOut.disabled = false;
    btnGoogleSignOut.textContent = 'Sign out';
    updateAuthUI(null);
  });
});

loadAuthState();

// ============================================================
// 14. AI ACTION GENERATOR
// ============================================================

const generatorNoKey       = document.getElementById('generatorNoKey');
const generatorCategories  = document.getElementById('generatorCategories');
const generatorLoading     = document.getElementById('generatorLoading');
const generatingLabel      = document.getElementById('generatingCategoryLabel');
const generatorResults     = document.getElementById('generatorResults');

let activeGeneratorCategory = null;

/**
 * Check whether the active provider has a usable API key (or is Ollama which
 * needs no key) and update the generator UI accordingly.
 */
function updateGeneratorAvailability() {
  const providerId = providerSelect.value;
  const provider   = PROVIDERS[providerId];
  const needsKey   = provider?.requiresApiKey !== false;
  const hasKey     = needsKey
    ? !!(apiKeyInputs[providerId]?.value.trim())
    : true;

  if (hasKey) {
    generatorNoKey.style.display      = 'none';
    generatorCategories.style.display = '';
  } else {
    generatorNoKey.style.display      = '';
    generatorCategories.style.display = 'none';
    generatorLoading.style.display    = 'none';
    generatorResults.style.display    = 'none';
  }
}

function escapeHtmlSuggestion(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderSuggestions(suggestions, category) {
  if (!suggestions || suggestions.length === 0) {
    generatorResults.innerHTML = `<div class="empty-state">No suggestions returned. Try again.</div>`;
    generatorResults.style.display = '';
    return;
  }

  generatorResults.innerHTML = suggestions.map((s, i) => `
    <div class="suggestion-card" data-index="${i}">
      <div class="suggestion-icon">${escapeHtmlSuggestion(s.icon || '✏️')}</div>
      <div class="suggestion-body">
        <div class="suggestion-name">${escapeHtmlSuggestion(s.name || 'Untitled Action')}</div>
        <div class="suggestion-prompt-preview">${escapeHtmlSuggestion(s.prompt || '')}</div>
      </div>
      <div class="suggestion-actions">
        <button class="btn-add-suggestion" type="button" data-index="${i}" title="Add this action to your custom actions list">+ Add</button>
        <button class="btn-copy-prompt" type="button" data-index="${i}" title="Copy prompt to clipboard">Copy</button>
      </div>
    </div>
  `).join('');

  generatorResults.style.display = '';

  // Store suggestions on the container for event delegation
  generatorResults._suggestions = suggestions;
  generatorResults._category    = category;
}

generatorResults.addEventListener('click', (e) => {
  const addBtn  = e.target.closest('.btn-add-suggestion');
  const copyBtn = e.target.closest('.btn-copy-prompt');

  if (addBtn) {
    const idx        = parseInt(addBtn.dataset.index, 10);
    const suggestions = generatorResults._suggestions || [];
    const s          = suggestions[idx];
    if (!s) return;

    syncCardsToData();
    customActions.push({
      id:       generateId(),
      name:     s.name  || '',
      icon:     s.icon  || '✏️',
      prompt:   s.prompt || '',
      overrides: {},
      hidden: false,
    });
    renderActionCards();

    // Scroll to the newly added card and briefly highlight it
    const lastCard = customActionsList.querySelector('.custom-action-card:last-child');
    if (lastCard) {
      lastCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      lastCard.style.borderColor = 'var(--accent)';
      setTimeout(() => { lastCard.style.borderColor = ''; }, 1500);
    }

    addBtn.textContent = '✓ Added';
    addBtn.disabled    = true;
    showStatus('success', `"${s.name}" added — remember to save!`, customActionsStatusEl);
    return;
  }

  if (copyBtn) {
    const idx         = parseInt(copyBtn.dataset.index, 10);
    const suggestions  = generatorResults._suggestions || [];
    const s           = suggestions[idx];
    if (!s) return;

    navigator.clipboard.writeText(s.prompt || '').then(() => {
      const original    = copyBtn.textContent;
      copyBtn.textContent = '✓ Copied';
      setTimeout(() => { copyBtn.textContent = original; }, 1500);
    }).catch(() => {
      showStatus('error', 'Could not copy to clipboard.', customActionsStatusEl);
    });
  }
});

generatorCategories.addEventListener('click', (e) => {
  const chip = e.target.closest('.category-chip');
  if (!chip || chip.disabled) return;

  const category = chip.dataset.category;
  if (!category) return;

  // Toggle: clicking the active chip clears results
  if (activeGeneratorCategory === category) {
    activeGeneratorCategory = null;
    chip.classList.remove('active');
    generatorResults.style.display = 'none';
    generatorResults.innerHTML     = '';
    return;
  }

  // Mark chip as active
  generatorCategories.querySelectorAll('.category-chip').forEach((c) => c.classList.remove('active'));
  chip.classList.add('active');
  activeGeneratorCategory = category;

  // Disable all chips while loading
  generatorCategories.querySelectorAll('.category-chip').forEach((c) => { c.disabled = true; });

  // Show loading state
  generatingLabel.textContent    = category;
  generatorLoading.style.display = '';
  generatorResults.style.display = 'none';
  generatorResults.innerHTML     = '';

  chrome.runtime.sendMessage({ type: 'GENERATE_ACTIONS', category }, (response) => {
    // Re-enable chips
    generatorCategories.querySelectorAll('.category-chip').forEach((c) => { c.disabled = false; });
    generatorLoading.style.display = 'none';

    if (response?.error) {
      showStatus('error', `Generation failed: ${response.error}`, customActionsStatusEl);
      chip.classList.remove('active');
      activeGeneratorCategory = null;
      return;
    }

    renderSuggestions(response?.suggestions || [], category);
  });
});

// Update availability on initial load and whenever the provider or API key changes
updateGeneratorAvailability();

Object.keys(apiKeyInputs).forEach((id) => {
  apiKeyInputs[id]?.addEventListener('input', updateGeneratorAvailability);
});

providerSelect.addEventListener('change', updateGeneratorAvailability);

