// ============================================================
// AI Writing Assistant — Background Service Worker
// Handles Gemini API calls and message passing with content script
// ============================================================

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// --- Default Prompt Templates (multi-language aware) ---

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
};

// --- Gemini API Call ---

async function callGemini(prompt, apiKey, config = {}) {
  const model = config.model || 'gemini-2.0-flash';
  const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: config.temperature ?? 0.4,
      maxOutputTokens: config.maxTokens || 1500,
    },
  };

  // Add system instruction if provided
  if (config.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: config.systemInstruction }],
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = err.error?.message || `API error (HTTP ${response.status})`;
    throw new Error(message);
  }

  const data = await response.json();
  const result = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!result) {
    throw new Error('Gemini returned an empty response. Please try again.');
  }

  return result;
}

// --- Build prompt from config ---

function buildPrompt(action, text, config) {
  const langKey = config.responseLanguage || 'auto';
  const langInstruction = LANGUAGE_INSTRUCTIONS[langKey] || LANGUAGE_INSTRUCTIONS.auto;

  // Check for user custom prompts
  const customPromptMap = {
    grammar: config.promptGrammar,
    style: config.promptStyle,
    synonyms: config.promptSynonyms,
  };

  const customPrompt = customPromptMap[action];

  if (customPrompt) {
    // Replace {{TEXT}} placeholder
    let prompt = customPrompt.replace(/\{\{TEXT\}\}/gi, text);
    // If no placeholder was used, append the text
    if (!customPrompt.match(/\{\{TEXT\}\}/i)) {
      prompt += `\n\nText:\n"""\n${text}\n"""`;
    }
    return `${langInstruction}\n\n${prompt}`;
  }

  // Use default prompt
  return DEFAULT_PROMPTS[action](text, langInstruction);
}

// --- Build prompt for custom actions ---

function buildCustomPrompt(promptTemplate, text, config) {
  const langKey = config.responseLanguage || 'auto';
  const langInstruction = LANGUAGE_INSTRUCTIONS[langKey] || LANGUAGE_INSTRUCTIONS.auto;

  let prompt = promptTemplate.replace(/\{\{TEXT\}\}/gi, text);
  // If no placeholder was used, append the text
  if (!promptTemplate.match(/\{\{TEXT\}\}/i)) {
    prompt += `\n\nText:\n"""\n${text}\n"""`;
  }
  return `${langInstruction}\n\n${prompt}`;
}

// --- Message Handler ---

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== 'AI_REQUEST') return false;

  const { action, text } = message;
  const isCustomAction = action.startsWith('custom_');

  if (!DEFAULT_PROMPTS[action] && !isCustomAction) {
    sendResponse({ error: `Unknown action: ${action}` });
    return false;
  }

  // Guard against very long selections
  const trimmedText = text.length > 5000 ? text.substring(0, 5000) + '...' : text;

  (async () => {
    try {
      const storageKeys = ['apiKey', 'agentConfig'];
      if (isCustomAction) storageKeys.push('customActions');

      const storage = await chrome.storage.local.get(storageKeys);
      const apiKey = storage.apiKey;
      const config = storage.agentConfig || {};

      if (!apiKey) {
        sendResponse({
          error: 'API key not configured. Right-click the extension icon → Options to set your Gemini API key.',
        });
        return;
      }

      let prompt;

      if (isCustomAction) {
        const customActions = storage.customActions || [];
        const customAction = customActions.find((a) => a.id === action);
        if (!customAction) {
          sendResponse({ error: `Custom action not found. It may have been deleted.` });
          return;
        }
        prompt = buildCustomPrompt(customAction.prompt, trimmedText, config);
      } else {
        prompt = buildPrompt(action, trimmedText, config);
      }

      const result = await callGemini(prompt, apiKey, config);
      sendResponse({ result });
    } catch (err) {
      sendResponse({ error: err.message || 'An unexpected error occurred.' });
    }
  })();

  // Return true to keep the message channel open for the async response
  return true;
});

// --- Installation Handler ---

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});
