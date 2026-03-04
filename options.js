// ============================================================
// AI Writing Assistant — Options Page
// Save/load Gemini API key and test the connection.
// ============================================================

const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('save');
const testBtn = document.getElementById('test');
const toggleBtn = document.getElementById('toggleKey');
const statusEl = document.getElementById('status');

// ---- Load existing key ----

chrome.storage.local.get('apiKey', ({ apiKey }) => {
  if (apiKey) {
    apiKeyInput.value = apiKey;
  }
});

// ---- Save key ----

saveBtn.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showStatus('error', 'Please enter an API key.');
    return;
  }

  chrome.storage.local.set({ apiKey }, () => {
    showStatus('success', 'API key saved successfully!');
  });
});

// ---- Test connection ----

testBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showStatus('error', 'Please enter an API key first.');
    return;
  }

  testBtn.disabled = true;
  testBtn.textContent = 'Testing…';

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (reply) {
      showStatus('success', `Connected! Gemini says: "${reply.trim().substring(0, 60)}"`);
    } else {
      showStatus('error', 'Connected but received an empty response.');
    }
  } catch (err) {
    showStatus('error', `Connection failed: ${err.message}`);
  } finally {
    testBtn.disabled = false;
    testBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      Test Connection
    `;
  }
});

// ---- Toggle key visibility ----

toggleBtn.addEventListener('click', () => {
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
  toggleBtn.title = isPassword ? 'Hide key' : 'Show key';
});

// ---- Status display ----

function showStatus(type, message, el = statusEl) {
  el.className = `status ${type}`;
  el.textContent = message;

  if (type === 'success') {
    setTimeout(() => {
      el.className = 'status';
    }, 4000);
  }
}

// ============================================================
// Agent Configuration — Auto-save on every change
// ============================================================

const modelSelect = document.getElementById('modelSelect');
const temperatureSlider = document.getElementById('temperature');
const tempValueDisplay = document.getElementById('tempValue');
const maxTokensInput = document.getElementById('maxTokens');
const responseLanguage = document.getElementById('responseLanguage');
const promptGrammar = document.getElementById('promptGrammar');
const promptStyle = document.getElementById('promptStyle');
const promptSynonyms = document.getElementById('promptSynonyms');
const systemInstruction = document.getElementById('systemInstruction');
const resetConfigBtn = document.getElementById('resetConfig');
const configStatusEl = document.getElementById('configStatus');
const configAutoSave = document.getElementById('configAutoSave');
const footerModel = document.getElementById('footerModel');

const MODEL_LABELS = {
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
  'gemini-1.5-pro': 'Gemini 1.5 Pro',
  'gemini-1.5-flash': 'Gemini 1.5 Flash',
};

const DEFAULTS = {
  model: 'gemini-2.0-flash',
  temperature: 0.4,
  maxTokens: 1500,
  responseLanguage: 'auto',
  promptGrammar: '',
  promptStyle: '',
  promptSynonyms: '',
  systemInstruction: '',
};

// ---- Gather current config from the form ----

function gatherConfig() {
  return {
    model: modelSelect.value,
    temperature: parseFloat(temperatureSlider.value),
    maxTokens: Math.min(8000, Math.max(100, parseInt(maxTokensInput.value, 10) || 1500)),
    responseLanguage: responseLanguage.value,
    promptGrammar: promptGrammar.value.trim(),
    promptStyle: promptStyle.value.trim(),
    promptSynonyms: promptSynonyms.value.trim(),
    systemInstruction: systemInstruction.value.trim(),
  };
}

// ---- Auto-save with debounce ----

let autoSaveTimer = null;
let autoSaveBadgeTimer = null;

function autoSaveConfig() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const config = gatherConfig();
    footerModel.textContent = MODEL_LABELS[config.model] || config.model;

    chrome.storage.local.set({ agentConfig: config }, () => {
      // Flash the "Saved" badge
      configAutoSave.classList.add('show');
      clearTimeout(autoSaveBadgeTimer);
      autoSaveBadgeTimer = setTimeout(() => {
        configAutoSave.classList.remove('show');
      }, 1800);
    });
  }, 400);
}

// ---- Attach auto-save to all config inputs ----

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

// ---- Collapsible textareas: expand if they have content ----

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

// ---- Load config ----

chrome.storage.local.get('agentConfig', ({ agentConfig }) => {
  const cfg = agentConfig || DEFAULTS;
  modelSelect.value = cfg.model || DEFAULTS.model;
  temperatureSlider.value = cfg.temperature ?? DEFAULTS.temperature;
  tempValueDisplay.textContent = temperatureSlider.value;
  maxTokensInput.value = cfg.maxTokens || DEFAULTS.maxTokens;
  responseLanguage.value = cfg.responseLanguage || DEFAULTS.responseLanguage;
  promptGrammar.value = cfg.promptGrammar || '';
  promptStyle.value = cfg.promptStyle || '';
  promptSynonyms.value = cfg.promptSynonyms || '';
  systemInstruction.value = cfg.systemInstruction || '';
  footerModel.textContent = MODEL_LABELS[modelSelect.value] || modelSelect.value;
  expandCollapsibleIfFilled();
});

// ---- Reset defaults ----

resetConfigBtn.addEventListener('click', () => {
  modelSelect.value = DEFAULTS.model;
  temperatureSlider.value = DEFAULTS.temperature;
  tempValueDisplay.textContent = DEFAULTS.temperature;
  maxTokensInput.value = DEFAULTS.maxTokens;
  responseLanguage.value = DEFAULTS.responseLanguage;
  promptGrammar.value = '';
  promptStyle.value = '';
  promptSynonyms.value = '';
  systemInstruction.value = '';
  expandCollapsibleIfFilled();

  chrome.storage.local.set({ agentConfig: DEFAULTS }, () => {
    footerModel.textContent = MODEL_LABELS[DEFAULTS.model];
    showStatus('success', 'Reset to defaults!', configStatusEl);
  });
});

// ============================================================
// Custom Actions
// ============================================================

const customActionsList = document.getElementById('customActionsList');
const addCustomActionBtn = document.getElementById('addCustomAction');
const saveCustomActionsBtn = document.getElementById('saveCustomActions');
const customActionsStatusEl = document.getElementById('customActionsStatus');

const ICON_OPTIONS = ['✏️', '🔍', '📝', '💡', '🎯', '📐', '🧩', '🌐', '⚡', '📖', '🛠️', '🔄'];

let customActions = [];

function generateId() {
  return 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
}

function renderActionCards() {
  if (customActions.length === 0) {
    customActionsList.innerHTML = '<div class="empty-state">No custom actions yet. Click the button below to add one.</div>';
    return;
  }

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
      </div>
    </div>
  `).join('');
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function syncCardsToData() {
  const cards = customActionsList.querySelectorAll('.custom-action-card');
  cards.forEach((card, index) => {
    if (customActions[index]) {
      customActions[index].name = card.querySelector('.action-name').value.trim();
      customActions[index].prompt = card.querySelector('.action-prompt').value.trim();
    }
  });
}

// ---- Add action ----

addCustomActionBtn.addEventListener('click', () => {
  syncCardsToData();
  customActions.push({
    id: generateId(),
    name: '',
    icon: '✏️',
    prompt: '',
  });
  renderActionCards();
  // Scroll to new card
  const lastCard = customActionsList.querySelector('.custom-action-card:last-child');
  if (lastCard) lastCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// ---- Remove action & icon selection (delegated) ----

customActionsList.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('.btn-remove');
  if (removeBtn) {
    syncCardsToData();
    const idx = parseInt(removeBtn.dataset.index, 10);
    customActions.splice(idx, 1);
    renderActionCards();
    return;
  }

  const iconBtn = e.target.closest('.icon-choice');
  if (iconBtn) {
    syncCardsToData();
    const idx = parseInt(iconBtn.dataset.index, 10);
    customActions[idx].icon = iconBtn.dataset.icon;
    renderActionCards();
  }
});

// ---- Save custom actions ----

saveCustomActionsBtn.addEventListener('click', () => {
  syncCardsToData();

  // Validate
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

// ---- Load custom actions ----

chrome.storage.local.get('customActions', ({ customActions: saved }) => {
  customActions = saved || [];
  renderActionCards();
});
