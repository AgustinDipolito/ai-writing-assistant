# GitHub Copilot Instructions — AI Writing Assistant

This document describes the architecture, conventions, and roadmap context for this Chrome extension. Use it as shared context when working with Copilot on this codebase.

---

## Project Overview

A **Chrome Extension (Manifest V3)** that injects a floating action menu over selected text on any web page and sends it to an AI provider (Gemini or OpenAI) for grammar correction, style improvement, synonym suggestions, or user-defined custom actions.

**No build step.** All files are plain JavaScript. To iterate: edit → reload extension in `chrome://extensions/` → test.

---

## File Structure

```
ai-writing-assistant/
├── background.js      # Service worker: prompt builder, provider adapters, message handler
├── content.js         # Content script: Shadow DOM UI, text selection, markdown renderer
├── manifest.json      # MV3 manifest: permissions, host_permissions, content_scripts
├── options.html       # Options page markup
├── options.js         # Options page logic: form state, provider switching, test connection
└── icons/             # PNG icons at 16, 48, 128px
```

---

## Architecture

### Communication Flow

```
[content.js]  →  chrome.runtime.sendMessage({ type: 'AI_REQUEST', action, text })
                                         ↓
[background.js] resolveActiveConfig() → adapter.call(prompt, apiKey, config)
                                         ↓
                       sendResponse({ result }) or sendResponse({ error })
                                         ↓
[content.js]  ← renders result in Shadow DOM panel
```

Message types:
- **`AI_REQUEST`** — sent by `content.js`, handled by `background.js`. Fields: `{ type, action, text }`.
- **`TEST_CONNECTION`** — sent by `options.js`. Fields: `{ type, providerId, apiKey, model }`.

### background.js — Sections

1. **Prompt Layer** (`LANGUAGE_INSTRUCTIONS`, `DEFAULT_PROMPTS`, `buildPrompt`, `buildCustomPrompt`)  
   Provider-neutral. Produces a final prompt string given an action, selected text, and config.

2. **Provider Adapters** (`geminiAdapter`, `openaiAdapter`)  
   Each adapter implements two methods:
   ```js
   call(prompt, apiKey, config) → Promise<string>  // main inference call
   test(apiKey, model)          → Promise<string>  // connectivity check
   ```
   Each adapter also exposes `defaultModel` and `models: [{ value, label }]`.

3. **Provider Registry** (`PROVIDERS` object)  
   Maps `'gemini'` and `'openai'` keys to their adapter objects.  
   Adding a new provider: implement the adapter interface and register it here.

4. **Storage Helpers** (`resolveActiveConfig`)  
   Reads `chrome.storage.local`. Supports two schemas:
   - **New schema** (`providerConfig` key):
     ```js
     {
       activeProvider: 'gemini' | 'openai',
       gemini:  { apiKey, model, temperature, maxTokens, responseLanguage,
                  promptGrammar, promptStyle, promptSynonyms, systemInstruction },
       openai:  { apiKey, model, temperature, maxTokens, responseLanguage,
                  promptGrammar, promptStyle, promptSynonyms, systemInstruction }
     }
     ```
   - **Legacy schema** (keys `apiKey` + `agentConfig`) — automatically treated as Gemini. Kept for backward compatibility.

5. **Message Handler** (`chrome.runtime.onMessage`)  
   Routes `AI_REQUEST` to the correct adapter after resolving config. Custom actions are identified by the `custom_` prefix on `action` and fetched from `chrome.storage.local` key `customActions`.

6. **Installation Handler**  
   Opens the options page automatically on first install.

### content.js — Sections

- **Shadow DOM host** — appended to `document.documentElement`, `z-index: 2147483647`. All UI lives inside it to avoid style conflicts with host pages.
- **Floating menu** (`.ai-menu`) — appears above selected text, contains built-in action buttons and custom action buttons.
- **Results panel** (`.ai-results`) — fixed-position panel with header, scrollable body, copy button.
- **Markdown renderer** — lightweight inline renderer (no external library). Supports bold, italic, code, blockquote, headings, horizontal rules, lists.
- **Positioning logic** (`positionElement`) — smart placement: prefers below selection, flips above if needed, clamps to viewport, constrains height.
- **Text selection** — detected via `mouseup` / `keyup` events; text capped at `MAX_TEXT_LENGTH = 5000` characters.
- **Live custom action updates** — `chrome.storage.onChanged` listener rebuilds menu buttons when `customActions` change without a page reload.

---

## Custom Actions

- Stored in `chrome.storage.local` under key `customActions: [{ id, name, icon, prompt }]`.
- `id` is always prefixed `custom_` (e.g. `custom_abc123`).
- Prompt template uses `{{TEXT}}` placeholder. If absent, selected text is appended automatically.
- Background checks `action.startsWith('custom_')` to route correctly.

---

## Styling Conventions

- All UI uses CSS custom properties scoped inside the Shadow DOM `:host`.
- Light/dark theme via `prefers-color-scheme` media query inside the shadow stylesheet.
- Color palette: primary accent `#6366f1` (indigo), neutral `#e2e8f0` borders, `#f1f5f9` hover backgrounds.
- Animations: `aiMenuFadeIn` (menu), `aiPanelSlideIn` (results panel).

---

## Adding a New AI Provider

1. Create an adapter object implementing:
   ```js
   const myAdapter = {
     defaultModel: 'model-id',
     models: [{ value: 'model-id', label: 'Display Name' }],
     async call(prompt, apiKey, config) { /* return string */ },
     async test(apiKey, model)          { /* return string */ },
   };
   ```
2. Register it: `PROVIDERS['myprovider'] = myAdapter;`
3. Add `host_permissions` for the provider's API domain in `manifest.json`.
4. Add provider UI (key input, model selector) in `options.html` / `options.js`.
5. Extend the `providerConfig` storage schema with a `myprovider` key.

---

## Roadmap Context (Planned Features)

When implementing roadmap items, follow the patterns below.

### Tier 1 — Core

| Feature | Notes |
|---|---|
| **Multi-Provider AI Router** | Base infrastructure exists (`PROVIDERS` registry + adapters). Next providers: Anthropic Claude, OpenRouter (acts as a meta-adapter). |
| **Streaming responses** | Requires `fetch` with `ReadableStream`. The adapter `call()` signature should accept an optional `onChunk(text)` callback; `content.js` would update `resultsBody` incrementally. |
| **Apply directly** | Add an "Apply" button to the results panel. Use `document.execCommand('insertText')` for `<input>`/`<textarea>` elements; for `contenteditable`, use `Selection` + `Range` APIs to replace the original range stored at call time. |

### Tier 2 — Power User

| Feature | Notes |
|---|---|
| **Session history** | Store last N results in `chrome.storage.session` (not `local`) to avoid persistence across browser restarts if desired. Render as a collapsible history drawer inside the results panel. |
| **Keyboard shortcuts** | Register via `manifest.json` `commands` key + `chrome.commands.onCommand` in `background.js`. Send an `AI_REQUEST` message targeting the active tab. |
| **Per-action config** | Extend each custom action object with optional `{ model, temperature, maxTokens }` overrides. Merge with global config in `buildCustomPrompt`. |
| **Prompt test button** | Options page: send a `TEST_PROMPT` message to `background.js` with a sample text and the draft prompt. Reuse the existing `adapter.call()` pattern. |

### Tier 3 — Extensibility & UX

| Feature | Notes |
|---|---|
| **Drag-to-reorder** | Use the HTML5 Drag and Drop API on the custom actions list in `options.html`. Persist reordered array to `chrome.storage.local`. |
| **Export / Import** | Serialize `chrome.storage.local` to JSON (excluding API keys for security, or warn user). Download via `URL.createObjectURL(new Blob(...))`. Import by parsing JSON and calling `chrome.storage.local.set`. |
| **Markdown improvements** | Extend the inline renderer in `content.js` to support fenced code blocks with syntax highlighting (Prism.js as a bundled module, or a micro-highlighter), tables (parse `|` rows), and ordered lists. |
| **Context menu** | Register via `manifest.json` `contextMenus` permission + `chrome.contextMenus.create` in `background.js` `onInstalled`. Send `AI_REQUEST` from the context menu handler. |

### Tool-Capable Assistant Plan

To add **web search** first and support **future agent/tools integrations** without reworking the current provider architecture, follow this phased design:

1. **Keep providers and tools separate**
   - `PROVIDERS` remains the registry for LLM backends only.
   - Add a parallel `TOOLS` registry in `background.js`.
   - Each tool should implement a small adapter contract:
     ```js
     const someTool = {
       id: 'tool_id',
       label: 'Human readable name',
       async execute(input, context) {
         // input: user request + selected text
         // context: active provider, tool settings, tab metadata
         return { ok: true, data: { results: [] } };
       },
     };
     ```

2. **Add orchestration in the background service worker**
   - The background should decide whether a request:
     - goes directly to the active provider, or
     - executes one or more enabled tools first and then sends a composed prompt to the provider.
   - This keeps `content.js` presentation-focused and prevents provider/tool coupling.

3. **Web search should be the first tool**
   - Implement a `web_search` adapter that returns normalized structured results:
     ```js
     {
       query: 'user request',
       results: [{ title, url, snippet }]
     }
     ```
   - Limit result count, sanitize all returned text, and pass only text/URLs into prompts or UI.
   - Keep search opt-in until permission and UX flows are complete.

4. **Extend storage schema for tool settings**
   - Add a top-level `toolConfig` object in `chrome.storage.local`, e.g.:
     ```js
     {
       toolConfig: {
         enabledTools: ['web_search'],
         webSearch: { maxResults: 5 }
       }
     }
     ```
   - Keep this independent from `providerConfig` so tool rollout does not affect provider compatibility.

5. **Plan for future agent tools**
   - Treat “agent tools” the same as any other tool: structured input → `execute()` → structured output.
   - Examples: browser automation, local knowledge retrieval, or delegated sub-agents.
   - The shared interface means tools can be added without changing the selection UI or prompt-building model.

6. **Security rules**
   - Every new tool must explicitly add required `host_permissions` to `manifest.json`.
   - Never inject remote HTML into the page; only render sanitized text output.
   - Prefer user confirmation before enabling tools that reach external services or perform browser actions.

7. **Recommended delivery order**
   - Phase 1: `TOOLS` registry + `toolConfig`
   - Phase 2: `web_search` adapter + minimal Options UI
   - Phase 3: prompt/orchestration layer that feeds tool output into the model
   - Phase 4: additional tool/agent adapters using the same contract

---

## Constraints & Gotchas

- **No `eval`, no remote scripts**: MV3 CSP forbids them. All code must be bundled locally or inline.
- **Service worker lifecycle**: `background.js` can be terminated between messages. Do not store state in module-level variables that must survive across messages; use `chrome.storage.local` instead.
- **Shadow DOM closed mode**: `content.js` attaches with `{ mode: 'closed' }`. Never try to query the shadow root from outside the IIFE.
- **Message channel must stay open**: The `onMessage` listener must return `true` synchronously when the response will be sent asynchronously (async `sendResponse`).
- **Text cap**: Selected text is capped at 5 000 characters before sending to any provider.
- **`host_permissions`** in `manifest.json` must be updated whenever a new API origin is introduced.
