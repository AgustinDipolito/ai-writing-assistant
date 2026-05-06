# AI Writing Assistant

A Chrome extension that brings AI writing help to every web page. Select text or use the right-click context menu to send it to any AI provider — Gemini, OpenAI, Anthropic, OpenRouter, or Ollama — and view the response in an in-page results panel. The extension ships with five provider adapters out of the box and can be extended with more.

---

## Overview

Select text anywhere in Chrome. A small floating menu appears. Choose an action — grammar check, style improvement, synonym lookup, image generation, or any custom action you have defined. The result streams into a panel in real time. Copy it, apply it directly to the original field, or dismiss and keep browsing. Click on any image to trigger image analysis actions (describe, extract text, or analyze).

No backend, no data collection. Every API call goes directly from your browser to the provider you choose.

**Vision**: become the universal access layer between users and LLMs across the entire web — provider-agnostic, page-aware, and extensible enough to support autonomous agent workflows.

---

## Features

- Floating action menu appears above any text selection, isolated via Shadow DOM so it never conflicts with page styles.
- Right-click context menu as an alternative trigger for every action.
- Results stream token-by-token using the provider's SSE API.
- Built-in Markdown rendering in the results panel: headings, bold/italic, inline code, fenced code blocks, blockquotes, tables, ordered and unordered lists.
- Apply button replaces the selected text in-place for `<input>`, `<textarea>`, and `contenteditable` elements.
- Light and dark themes follow the system `prefers-color-scheme`.
- All configuration stored locally with `chrome.storage.local`.

### Examples actions

| Action         | What it does                                                                              |
|----------------|-------------------------------------------------------------------------------------------|
| Grammar        | Identifies errors, explains each one, and provides the correction.                        |
| Style          | Evaluates clarity, conciseness, tone, readability, and word choice.                       |
| Synonyms       | Lists 2-4 synonyms for every significant word in the selection.                           |
| Generate Image | Creates an image from the selected text used as a prompt (Gemini only).                   |
| Describe Image | Describes an image's subjects, colors, composition, and any visible text (image click).   |
| Extract Text   | Transcribes all text visible in a clicked image, preserving layout and structure.         |
| Analyze Image  | Analyzes a clicked image for content, context, details, and visual composition.           |

---

## Installation

> Requires Chrome or any Chromium-based browser with developer mode enabled.

1. Clone the repository:

```bash
git clone https://github.com/AgustinDipolito/ai-writing-assistant.git
cd ai-writing-assistant
```

2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the project folder.

The extension installs immediately. No build step or dependencies are required.

---

## Setup

1. Open the extension options (click the extension icon and choose Options, or right-click the icon and select **Options**).
2. Select your provider (Gemini, OpenAI, Anthropic, OpenRouter, or Ollama).
3. Paste the API key for that provider. Ollama does not require an API key — configure the base URL of your local server instead.
4. Click **Save**, then **Test Connection** to verify.

Get your API key:
- Gemini: https://aistudio.google.com/app/apikey
- OpenAI: https://platform.openai.com/api-keys
- Anthropic: https://console.anthropic.com/settings/keys
- OpenRouter: https://openrouter.ai/keys
- Ollama: no key required — install Ollama and run a model locally (https://ollama.com)

---

## Usage

1. Select any text on a web page.
2. Click an action in the floating menu, or right-click and choose **AI Writing Assistant** > action.
3. The result panel opens and streams the response.
4. Use **Copy** to copy the result to the clipboard, or **Apply** to replace the original text directly in the page.

---

## Configuration

All settings are available in the Options page.

### Global settings

| Setting            | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| Provider           | Active AI provider: Gemini, OpenAI, Anthropic, OpenRouter, or Ollama.       |
| Model              | Model to use for the selected provider.                                     |
| Temperature        | Controls response creativity (0 = deterministic, 1 = most varied).         |
| Max tokens         | Maximum length of the response.                                             |
| Response language  | Force a specific output language, or auto-detect from the input text.       |
| System instruction | A global instruction prepended to every request.                            |

### Custom actions

Custom actions appear in both the floating menu and the context menu alongside the built-in ones.

Each custom action has:
- **Name** - label shown on the button.
- **Icon** - emoji or short symbol displayed on the button.
- **Prompt** - template sent to the AI. Use `{{TEXT}}` as a placeholder for the selected text. If `{{TEXT}}` is absent, the selected text is appended at the end automatically.

Custom action IDs are generated automatically with the prefix `custom_`.

---

## Troubleshooting

**"API key not configured"** - Open Options, enter and save an API key for the active provider.

**API error or model not found** - Verify the API key is valid and the selected model is available under your account.

**Context menu does not appear** - Make sure text is selected before right-clicking. Reload the extension and the tab after any update.

**Floating menu does not appear** - Confirm the extension is enabled in `chrome://extensions/`. Reload the tab after installing or updating.

---

## Technical Reference

This section covers internals relevant to contributors or anyone extending the extension.

### Technology

- Chrome Extension Manifest V3
- Plain JavaScript, no build step, no external runtime dependencies
- Google Gemini API (`generateContent`, `streamGenerateContent`, image generation)
- OpenAI Chat Completions API (standard and streaming, vision-capable models)
- Anthropic Messages API (standard and streaming)
- OpenRouter API (meta-adapter providing 100+ models, standard and streaming)
- Ollama REST API (local and self-hosted models, standard and streaming)

### Project structure

```text
ai-writing-assistant/
├── background.js        # Service worker: provider adapters, streaming, context menu
├── content.js           # Content script: Shadow DOM UI, selection detection, result panel
├── selection-utils.js   # Shared selection/apply helpers (loaded by content script and tests)
├── manifest.json        # MV3 manifest: permissions, host_permissions, content scripts
├── options.html         # Options page markup
├── options.js           # Options page logic: form state, provider switching, connection test
├── icons/               # Extension icons at 16, 48, and 128 px
├── tests/               # Node.js unit tests (built-in test runner)
└── product-strategy/    # Strategic planning documents (roadmap, personas, experimental actions)
```

### Architecture

```
[content.js]  --port(ai_stream)-->  [background.js]
                AI_STREAM_START         resolveActiveConfig()
                                        resolvePromptAndConfig()
                                        adapter.stream(...)
                AI_STREAM_EVENT <--         onDelta -> emitStream()
                  phase: delta
                  phase: end / error / aborted
```

- `content.js` opens a long-lived port named `ai_stream` for each request and receives incremental `AI_STREAM_EVENT` messages.
- `background.js` resolves the active provider and config from `chrome.storage.local`, builds the prompt, and calls the adapter's `stream` method.
- A non-streaming fallback (`adapter.call`) is used automatically if `stream` yields no content.
- The `TEST_CONNECTION` message uses a regular `sendMessage` round-trip (not a port) and is handled by `background.js` for the Options page.

### Storage schema

Configuration is stored under the key `providerConfig` in `chrome.storage.local`:

```js
{
  activeProvider: 'gemini' | 'openai',
  gemini: {
    apiKey, model, temperature, maxTokens,
    responseLanguage,
    systemInstruction,
    actionOverrides: {
      grammar:  { model, temperature, maxTokens },
      style:    { model, temperature, maxTokens },
      synonyms: { model, temperature, maxTokens },
    }
  },
  openai: { /* same shape */ }
}
```

Custom actions are stored separately under `customActions: [{ id, name, icon, prompt, overrides }]`.

A legacy schema (`apiKey` + `agentConfig` keys) is supported for backward compatibility and is treated as Gemini automatically.

### Adding a provider

1. Implement the adapter interface in `background.js`:

```js
const myAdapter = {
  defaultModel: 'model-id',
  models: [{ value: 'model-id', label: 'Display name' }],
  async call(prompt, apiKey, config) { /* return string */ },
  async stream(prompt, apiKey, config, onDelta, signal) { /* call onDelta(chunk); return fullText */ },
  async test(apiKey, model) { /* return string */ },
};
```

2. Register it: `PROVIDERS['myprovider'] = myAdapter;`
3. Add the API origin to `host_permissions` in `manifest.json`.
4. Add the provider panel (key input, model selector) in `options.html` and `options.js`.
5. Extend the `providerConfig` storage schema with a `myprovider` key.

### Development workflow

No compilation is needed. To iterate:

1. Edit any source file.
2. Open `chrome://extensions/` and click **Reload** on the extension.
3. Reload the target page and test.

Run the unit tests:

```bash
npm test
```

Tests use Node's built-in test runner. The test suite covers the shared selection utilities in `selection-utils.js`.

### Permissions

| Permission / host                   | Why it is needed                                      |
|-------------------------------------|-------------------------------------------------------|
| `activeTab`                         | Inject the content script into the current tab.       |
| `storage`                           | Persist provider config and custom actions locally.   |
| `contextMenus`                      | Register the right-click submenu entries.             |
| `generativelanguage.googleapis.com` | Gemini API calls.                                     |
| `api.openai.com`                    | OpenAI API calls.                                     |
| `api.anthropic.com`                 | Anthropic API calls.                                  |
| `openrouter.ai`                     | OpenRouter API calls.                                 |
| `localhost`, `127.0.0.1`            | Ollama local model server calls.                      |

---

## Roadmap

The roadmap is organized around a single goal: **make LLMs and AI agents accessible on every web page**, regardless of provider, model, or workflow. See [`product-strategy/roadmap-validation.md`](product-strategy/roadmap-validation.md) for the full 18-month investor-facing plan.

### Completed ✅

| Feature | Description |
|---|---|
| **Multi-provider router** | Gemini, OpenAI, Anthropic, OpenRouter, and Ollama — one extension, any LLM. |
| **Streaming responses** | Token-by-token streaming via SSE for all providers. |
| **Apply in place** | Direct text replacement in `<input>`, `<textarea>`, and `contenteditable` elements. |
| **Context menu** | Right-click submenu for every action on any page. |
| **Custom actions** | User-defined prompt library with per-action model and parameter overrides. |
| **Image generation** | Create images from selected text as a prompt (Gemini). |
| **Image analysis** | Describe, extract text from, or fully analyze any image on any page. |
| **Sidebar chat panel** | Minimized-by-default floating chat panel for freeform AI conversations while browsing. |

### Phase 1 — Foundation for Scale

| Feature | Description |
|---|---|
| **Page-aware context** | Inject the visible page (or a selection of it) into every prompt so the LLM understands what the user is looking at — summaries, Q&A, and data extraction become one-click actions. |
| **Session history** | In-panel drawer to revisit recent results and conversations within a browser session. |
| **Keyboard shortcuts** | Trigger any action via configurable hotkeys. |
| **Onboarding flow** | Guided setup to reduce API key configuration abandonment. |

### Phase 2 — Agentic Workflows

| Feature | Description |
|---|---|
| **Agent mode** | Define multi-step workflows (chains) that run sequentially or branch on LLM output. Example: _"Extract emails → draft a reply for each → copy to clipboard."_ |
| **Action marketplace** | Publish, share, and install community-created actions and workflows from a public directory. |
| **Web actions library** | Prebuilt page-level actions: _Summarize page_, _Extract structured data_, _Translate_, _Explain like I'm five_, _Compare with clipboard_. |
| **Cross-tab context** | Let agents pull context from multiple open tabs so workflows can span sites (e.g., compare two product pages). |
| **Developer SDK** | JavaScript API that lets any web page interact with the extension's LLM layer — sites can offer "Ask AI" features without shipping their own integration. |

### Phase 3 — Platform & Enterprise

| Feature | Description |
|---|---|
| **Enterprise edition** | Team workspace, SSO, admin controls, usage analytics, and centralized billing. |
| **Model Context Protocol (MCP) integration** | Connect to external tools and data sources via MCP, turning the browser into a full agent runtime. |
| **Mobile support** | iOS Safari and Chrome Android extensions. |
| **Export / Import** | Serialize and restore the full configuration (actions, workflows, preferences) as a portable JSON file. |
| **Keyboard-first UX** | Full keyboard navigation and customizable shortcuts for every action to support power users. |

---

## Author

Built by [AgustinDipolito](https://github.com/AgustinDipolito).

Repository: https://github.com/AgustinDipolito/ai-writing-assistant
