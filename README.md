# System Setting

A transparent, always-on-top AI chat assistant for macOS (Apple Silicon), disguised as a system utility. Supports Google Gemini and OpenAI with streaming responses, markdown rendering, and a collapsible floating ball mode.

---

## Requirements

- macOS 13+ (Ventura or later), Apple Silicon (arm64)
- Node.js 20+
- npm 9+

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Add API keys

Launch the app and open **Settings (⚙)** to enter your keys. They are encrypted using macOS Keychain via Electron's `safeStorage` API — never stored in plain text.

| Provider | Where to get key |
|----------|-----------------|
| Google Gemini | https://aistudio.google.com/app/apikey |
| OpenAI | https://platform.openai.com/api-keys |

---

## Commands

| Command | Description |
|---------|-------------|
| `npm start` | Run in development mode (DevTools attached) |
| `npm run start:dev` | Same as above with `NODE_ENV=development` |
| `npm run build:mac` | Build signed `.dmg` for macOS arm64 |
| `npm run build` | Build for current platform |

### Development

```bash
npm start
```

Opens the app with DevTools detached. All source changes require a restart (`Ctrl+C` then `npm start`).

### Production Build

```bash
npm run build:mac
```

Outputs a `.dmg` installer to `dist/`. Requires `assets/icon.icns` to exist. Notarization is skipped by default — set `APPLE_ID`, `APPLE_ID_PASSWORD`, and `APPLE_TEAM_ID` environment variables to enable it.

---

## Project Structure

```
system-settings-cl/
├── src/
│   ├── main/
│   │   ├── main.js             # App entry — single-instance lock, global shortcut
│   │   ├── windowManager.js    # BrowserWindow creation + all macOS protections
│   │   ├── ipcHandlers.js      # IPC channels + Gemini / OpenAI streaming
│   │   └── store.js            # Persistent settings + encrypted API key storage
│   ├── preload/
│   │   └── preload.js          # contextBridge surface between renderer and main
│   └── renderer/
│       ├── index.html          # HTML shell with Content Security Policy
│       ├── app.js              # Root state machine: CHAT ↔ BALL mode
│       ├── components/         # TopBar, ChatView, MessageBubble, AssistBall,
│       │                       # SettingsModal, OpacitySlider
│       ├── ai/                 # AIProviderBase, GeminiProvider, OpenAIProvider,
│       │                       # ProviderFactory
│       ├── utils/              # markdownParser (marked + hljs + DOMPurify)
│       │                       # streamBuffer (60fps throttled streaming render)
│       └── styles/             # base, window, chat, assistball, settings, markdown
├── assets/
│   ├── icon.icns               # Required for macOS build
│   └── icon.png
├── scripts/
│   └── notarize.js             # Post-sign notarization hook
├── entitlements.mac.plist
├── entitlements.mac.inherit.plist
└── electron-builder.yml
```

---

## Key Features

### 1. Always-on-Top — Floats Over Every App Including Fullscreen

The window is set to `screen-saver` level, the highest window tier on macOS. This places it above fullscreen apps, video players, and all other windows across every Space.

**How it works (`src/main/windowManager.js`):**

```js
// NSPanel type — excluded from Expose, Mission Control, Dock
type: 'panel'

// Called after window show — must be set post-show to stick
win.setAlwaysOnTop(true, 'screen-saver', 1)

// Visible in every Space and above fullscreen apps
win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
```

- `type: 'panel'` creates an `NSPanel` instead of `NSWindow`. Panels do not steal keyboard focus from the active app, do not appear in the macOS Window menu, and are excluded from Mission Control grouping.
- `level: 'screen-saver'` maps to `NSScreenSaverWindowLevel` (CGWindowLevel 1000), above `NSFloatingWindowLevel` (3) and `NSModalPanelWindowLevel` (8). This is required for the window to float over native fullscreen apps.
- `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` ensures the window follows you across every Space and persists over fullscreen apps.

**Global shortcut:** `Cmd+Shift+Space` toggles visibility from anywhere.

---

### 2. Screen Share Protection

The window is hidden from screen capture tools by setting the macOS window sharing type to `NSWindowSharingNone`.

**How it works (`src/main/windowManager.js`):**

```js
win.setContentProtection(true)
```

This sets `[NSWindow setSharingType: NSWindowSharingNone]` on the underlying native window, which removes it from the list of shareable window surfaces.

**What it blocks:**
- QuickTime Player screen recording
- OBS Studio (versions using the legacy CGDisplayStream capture path)
- Zoom screen share (versions prior to ScreenCaptureKit migration)
- Teams screen share (legacy path)
- Third-party capture tools that enumerate windows via `CGWindowListCreateImage`

**Known limitation — ScreenCaptureKit (macOS 13.2+):**

Apple introduced ScreenCaptureKit in macOS 13 and migrated all first-party and major third-party apps to it by Ventura 13.2. ScreenCaptureKit intentionally bypasses `NSWindowSharingNone` by design — Apple removed the ability for apps to exclude themselves from ScreenCaptureKit capture. This affects:

- macOS Screenshot (`Cmd+Shift+4/5`) on Ventura 13.2+
- OBS Studio 30+
- Zoom 5.14+ (ScreenCaptureKit path)

This is an OS-level restriction. No Electron API can override it on modern macOS. `setContentProtection(true)` remains the strongest available defense for Electron apps.

---

## AI Providers

### Google Gemini — `@google/genai` SDK

Uses `GoogleGenAI.models.generateContentStream()` with optional:
- `ThinkingLevel.HIGH` — deep reasoning before answering
- `tools: [{ googleSearch: {} }]` — Google Search grounding for real-time data

Both toggleable in Settings.

### OpenAI — `openai` SDK (Responses API)

Uses `client.responses.create()` with `stream: true`. Streams `response.output_text.delta` events.

### Custom Models

Both providers support adding custom model names at runtime via Settings → AI Provider → "Add custom model". Custom models are persisted to disk and survive restarts.

---

## Settings

All settings are persisted via `electron-store` to:
`~/Library/Application Support/system-setting-config/`

API keys are encrypted with `safeStorage.encryptString()` which uses the macOS Keychain-backed credential store. Keys cannot be read by other apps or extracted from the config file without the user's OS credentials.

---

## AssistBall Mode

Click **⬤** in the top bar to collapse the chat window into a small floating ball. The ball:
- Stays on top using the same `screen-saver` level
- Is draggable anywhere on screen (position persisted)
- Expands back to full chat on click
- Protected from screen capture same as the chat window
