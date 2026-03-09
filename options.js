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
};

// ============================================================
// 2. DOM REFERENCES
// ============================================================

const providerSelect     = document.getElementById('providerSelect');
const apiKeyInputs       = {
  gemini: document.getElementById('apiKey-gemini'),
  openai: document.getElementById('apiKey-openai'),
};
const providerPanels     = {
  gemini: document.getElementById('panel-gemini'),
  openai: document.getElementById('panel-openai'),
};
const saveBtn            = document.getElementById('save');
const testBtn            = document.getElementById('test');
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
const ACTION_IDS         = ['grammar', 'style', 'synonyms'];
const baseOverrideInputs = {
  grammar: {
    model: document.getElementById('overrideModel-grammar'),
    temperature: document.getElementById('overrideTemp-grammar'),
    maxTokens: document.getElementById('overrideTokens-grammar'),
  },
  style: {
    model: document.getElementById('overrideModel-style'),
    temperature: document.getElementById('overrideTemp-style'),
    maxTokens: document.getElementById('overrideTokens-style'),
  },
  synonyms: {
    model: document.getElementById('overrideModel-synonyms'),
    temperature: document.getElementById('overrideTemp-synonyms'),
    maxTokens: document.getElementById('overrideTokens-synonyms'),
  },
};

// ============================================================
// 3. STATUS HELPER
// ============================================================

function showStatus(type, message, el = statusEl) {
  el.className = `status ${type}`;
  el.textContent = message;
  if (type === 'success') {
    setTimeout(() => { el.className = 'status'; }, 4000);
  }
}

// ============================================================
// 4. PROVIDER PANEL SWITCHING
// ============================================================

function switchProviderPanel(providerId) {
  Object.keys(providerPanels).forEach((id) => {
    providerPanels[id].style.display = id === providerId ? '' : 'none';
  });
  populateModelSelect(providerId);
  populateBaseOverrideModelSelects(providerId);
  renderActionCards();
  updateFooter(providerId);
}

function populateModelSelect(providerId, selectedModel) {
  const provider = PROVIDERS[providerId];
  if (!provider) return;
  modelSelect.innerHTML = provider.models
    .map((m) => `<option value="${m.value}"${m.value === (selectedModel || provider.defaultModel) ? ' selected' : ''}>${m.label}</option>`)
    .join('');
}

function updateFooter(providerId, model) {
  const provider = PROVIDERS[providerId];
  if (!provider) return;
  footerProvider.textContent = provider.label;
  footerModel.textContent = model || modelSelect.value || provider.defaultModel;
}

function buildModelOptions(providerId, selectedModel, includeGlobalOption = false) {
  const provider = PROVIDERS[providerId];
  if (!provider) return includeGlobalOption ? '<option value="">Use global model</option>' : '';

  const head = includeGlobalOption ? '<option value="">Use global model</option>' : '';
  const options = provider.models
    .map((m) => `<option value="${m.value}"${m.value === selectedModel ? ' selected' : ''}>${m.label}</option>`)
    .join('');

  return head + options;
}

function populateBaseOverrideModelSelects(providerId) {
  ACTION_IDS.forEach((actionId) => {
    const select = baseOverrideInputs[actionId]?.model;
    if (!select) return;
    const currentValue = select.value || '';
    select.innerHTML = buildModelOptions(providerId, currentValue, true);
  });
}

providerSelect.addEventListener('change', () => {
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
  const apiKey = apiKeyInputs[providerId]?.value.trim();

  if (!apiKey) {
    showStatus('error', 'Please enter an API key first.');
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = 'Testing…';

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'TEST_CONNECTION',
      providerId,
      apiKey,
      model: modelSelect.value,
    });

    if (response?.error) {
      showStatus('error', `Connection failed: ${response.error}`);
    } else {
      const reply = (response?.result || '').trim().substring(0, 80);
      showStatus('success', `Connected! ${PROVIDERS[providerId].label} says: "${reply}"`);
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

function gatherBaseActionOverrides() {
  const overrides = {};

  ACTION_IDS.forEach((actionId) => {
    const actionInputs = baseOverrideInputs[actionId];
    if (!actionInputs) return;

    const actionOverride = {};
    const model = actionInputs.model?.value?.trim();
    const temperature = parseOptionalNumber(actionInputs.temperature?.value, 0, 1);
    const maxTokens = parseOptionalNumber(actionInputs.maxTokens?.value, 100, 8000);

    if (model) actionOverride.model = model;
    if (typeof temperature === 'number') actionOverride.temperature = Number(temperature.toFixed(2));
    if (typeof maxTokens === 'number') actionOverride.maxTokens = Math.round(maxTokens);

    if (Object.keys(actionOverride).length > 0) {
      overrides[actionId] = actionOverride;
    }
  });

  return overrides;
}

function setBaseActionOverridesInForm(providerId, actionOverrides = {}) {
  populateBaseOverrideModelSelects(providerId);

  ACTION_IDS.forEach((actionId) => {
    const actionInputs = baseOverrideInputs[actionId];
    const override = actionOverrides[actionId] || {};
    if (!actionInputs) return;

    actionInputs.model.value = override.model || '';
    actionInputs.temperature.value = override.temperature ?? '';
    actionInputs.maxTokens.value = override.maxTokens ?? '';
  });
}

function gatherSharedConfig() {
  return {
    model: modelSelect.value,
    temperature: parseFloat(temperatureSlider.value),
    maxTokens: Math.min(8000, Math.max(100, parseInt(maxTokensInput.value, 10) || 1500)),
    responseLanguage: responseLanguage.value,
    promptGrammar: promptGrammar.value.trim(),
    promptStyle: promptStyle.value.trim(),
    promptSynonyms: promptSynonyms.value.trim(),
    systemInstruction: systemInstruction.value.trim(),
    actionOverrides: gatherBaseActionOverrides(),
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
      // Merge shared config into the provider's sub-config (preserve apiKey)
      Object.assign(pc[providerId], shared);

      chrome.storage.local.set({ providerConfig: pc }, () => {
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
promptGrammar.addEventListener('input', autoSaveConfig);
promptStyle.addEventListener('input', autoSaveConfig);
promptSynonyms.addEventListener('input', autoSaveConfig);
systemInstruction.addEventListener('input', autoSaveConfig);
ACTION_IDS.forEach((actionId) => {
  const inputs = baseOverrideInputs[actionId];
  if (!inputs) return;
  inputs.model.addEventListener('change', autoSaveConfig);
  inputs.temperature.addEventListener('input', autoSaveConfig);
  inputs.maxTokens.addEventListener('input', autoSaveConfig);
});

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

  // Load API keys for all providers
  Object.keys(apiKeyInputs).forEach((id) => {
    if (pc[id]?.apiKey) apiKeyInputs[id].value = pc[id].apiKey;
  });

  // Load shared config from active provider's sub-config
  const cfg = pc[providerId] || {};
  populateModelSelect(providerId, cfg.model);
  temperatureSlider.value = cfg.temperature ?? DEFAULTS.temperature;
  tempValueDisplay.textContent = temperatureSlider.value;
  maxTokensInput.value = cfg.maxTokens || DEFAULTS.maxTokens;
  responseLanguage.value = cfg.responseLanguage || DEFAULTS.responseLanguage;
  promptGrammar.value = cfg.promptGrammar || '';
  promptStyle.value = cfg.promptStyle || '';
  promptSynonyms.value = cfg.promptSynonyms || '';
  systemInstruction.value = cfg.systemInstruction || '';
  setBaseActionOverridesInForm(providerId, cfg.actionOverrides || {});

  updateFooter(providerId, cfg.model);
  expandCollapsibleIfFilled();
});

// ============================================================
// 11. RESET DEFAULTS
// ============================================================

resetConfigBtn.addEventListener('click', () => {
  const providerId = providerSelect.value;
  const provider = PROVIDERS[providerId];

  populateModelSelect(providerId, provider.defaultModel);
  temperatureSlider.value = DEFAULTS.temperature;
  tempValueDisplay.textContent = DEFAULTS.temperature;
  maxTokensInput.value = DEFAULTS.maxTokens;
  responseLanguage.value = DEFAULTS.responseLanguage;
  promptGrammar.value = '';
  promptStyle.value = '';
  promptSynonyms.value = '';
  systemInstruction.value = '';
  setBaseActionOverridesInForm(providerId, {});
  expandCollapsibleIfFilled();

  const resetCfg = {
    model: provider.defaultModel,
    ...DEFAULTS,
  };

  chrome.storage.local.get('providerConfig', ({ providerConfig }) => {
    const pc = providerConfig || { activeProvider: providerId };
    if (!pc[providerId]) pc[providerId] = {};
    const savedKey = pc[providerId].apiKey;
    pc[providerId] = { ...resetCfg, apiKey: savedKey, actionOverrides: {} };
    chrome.storage.local.set({ providerConfig: pc }, () => {
      updateFooter(providerId, provider.defaultModel);
      showStatus('success', 'Reset to defaults!', configStatusEl);
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
  };

  if (action?.overrides && typeof action.overrides === 'object') {
    if (action.overrides.gemini || action.overrides.openai) {
      normalized.overrides = {
        gemini: action.overrides.gemini || {},
        openai: action.overrides.openai || {},
      };
    } else {
      normalized.overrides = {
        gemini: action.overrides,
        openai: {},
      };
    }
  }

  return normalized;
}

function getCustomActionOverride(action, providerId) {
  if (!action?.overrides || typeof action.overrides !== 'object') return {};
  const override = action.overrides[providerId];
  return override && typeof override === 'object' ? override : {};
}

function renderActionCards() {
  if (customActions.length === 0) {
    customActionsList.innerHTML = '<div class="empty-state">No custom actions yet. Click the button below to add one.</div>';
    return;
  }

  const providerId = providerSelect.value;

  customActionsList.innerHTML = customActions.map((action, index) => `
    <div class="custom-action-card" data-index="${index}">
      <div class="card-header">
        <span class="card-number">#${index + 1}</span>
        <button class="btn-remove" type="button" data-index="${index}">Remove</button>
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
          <label>Prompt Template</label>
          <textarea class="action-prompt" placeholder="Write your prompt here. Use {{TEXT}} for the selected text." data-index="${index}">${escapeHtml(action.prompt)}</textarea>
        </div>
        <div>
          <label>Per-Action Overrides (${PROVIDERS[providerId].label})</label>
          <div class="override-fields">
            <div>
              <label>Model</label>
              <select class="action-override-model" data-index="${index}">
                ${buildModelOptions(providerId, getCustomActionOverride(action, providerId).model, true)}
              </select>
            </div>
            <div>
              <label>Temp</label>
              <input type="number" class="action-override-temp" data-index="${index}" min="0" max="1" step="0.1" placeholder="Global" value="${getCustomActionOverride(action, providerId).temperature ?? ''}">
            </div>
            <div>
              <label>Max Tokens</label>
              <input type="number" class="action-override-tokens" data-index="${index}" min="100" max="8000" step="100" placeholder="Global" value="${getCustomActionOverride(action, providerId).maxTokens ?? ''}">
            </div>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

function escapeAttr(str) {
  return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function syncCardsToData() {
  const providerId = providerSelect.value;
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

      if (model) override.model = model;
      if (typeof temperature === 'number') override.temperature = Number(temperature.toFixed(2));
      if (typeof maxTokens === 'number') override.maxTokens = Math.round(maxTokens);

      if (Object.keys(override).length > 0) {
        customActions[index].overrides[providerId] = override;
      } else {
        delete customActions[index].overrides[providerId];
      }
    }
  });
}

addCustomActionBtn.addEventListener('click', () => {
  syncCardsToData();
  customActions.push({ id: generateId(), name: '', icon: '✏️', prompt: '', overrides: {} });
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
  const iconBtn = e.target.closest('.icon-choice');
  if (iconBtn) {
    syncCardsToData();
    customActions[parseInt(iconBtn.dataset.index, 10)].icon = iconBtn.dataset.icon;
    renderActionCards();
  }
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
