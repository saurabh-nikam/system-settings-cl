'use strict'

const { ipcMain } = require('electron')
const OpenAI = require('openai')

/**
 * Register all IPC handlers.
 * Called once from main.js after windows are created.
 */
function registerAllHandlers(windowManager, store) {
  // ─── Window Controls ────────────────────────────────────────────────────────

  ipcMain.on('window:close', () => {
    windowManager.chatWindow?.hide()
  })

  ipcMain.on('window:toggle-mode', () => {
    windowManager.toggleMode()
  })

  ipcMain.on('window:set-opacity', (_e, value) => {
    windowManager.setOpacity(value)
  })

  ipcMain.handle('window:get-opacity', () => {
    return windowManager.getOpacity()
  })

  // Ball drag — uses screen coordinates for precision
  ipcMain.on('ball:drag-start', (_e, { screenX, screenY }) => {
    windowManager.startDrag(screenX, screenY)
  })

  ipcMain.on('ball:drag-move', (_e, { screenX, screenY }) => {
    windowManager.updateDrag(screenX, screenY)
  })

  ipcMain.on('ball:drag-end', () => {
    windowManager.endDrag()
  })

  // ─── Settings ────────────────────────────────────────────────────────────────

  ipcMain.handle('settings:get-all', () => {
    return store.getPublicSettings()
  })

  ipcMain.handle('settings:save', (_e, partial) => {
    store.saveSettings(partial)
    return true
  })

  ipcMain.handle('settings:get-api-key', (_e, provider) => {
    return store.getApiKey(provider)
  })

  ipcMain.handle('settings:set-api-key', (_e, provider, key) => {
    store.setApiKey(provider, key)
    return true
  })

  // ─── AI Streaming ────────────────────────────────────────────────────────────
  // ipcMain.handle returns immediately (void).
  // Chunks are pushed back via webContents.send events.

  ipcMain.handle('ai:send', async (event, { provider, model, messages }) => {
    const webContents = event.sender
    const apiKey = store.getApiKey(provider)

    if (!apiKey) {
      webContents.send('ai:error', { message: `No API key configured for ${provider}. Open Settings (⚙) to add one.` })
      return
    }

    const streamFn = provider === 'openai' ? streamOpenAI : streamGemini

    // Gemini-specific flags from settings
    const googleSearch    = store.get('googleSearch', true)
    const thinkingEnabled = store.get('thinkingEnabled', true)

    try {
      await streamFn({
        apiKey,
        model,
        messages,
        googleSearch,
        thinkingEnabled,
        onChunk: (text) => {
          if (!webContents.isDestroyed()) webContents.send('ai:chunk', text)
        },
        onDone: () => {
          if (!webContents.isDestroyed()) webContents.send('ai:done')
        }
      })
    } catch (err) {
      if (!webContents.isDestroyed()) {
        webContents.send('ai:error', { message: err.message })
      }
    }
  })
}

// ─── Google Gemini via @google/genai SDK ─────────────────────────────────────

async function streamGemini({ apiKey, model, messages, googleSearch, thinkingEnabled, onChunk, onDone }) {
  // Dynamic import required: @google/genai is ESM-only
  const { GoogleGenAI, ThinkingLevel } = await import('@google/genai')

  const ai = new GoogleGenAI({ apiKey })

  // Convert to Gemini contents format (user / model roles)
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))

  const config = {}

  if (thinkingEnabled) {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH }
  }

  if (googleSearch) {
    config.tools = [{ googleSearch: {} }]
  }

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents
  })

  for await (const chunk of response) {
    if (chunk.text) onChunk(chunk.text)
  }

  onDone()
}

// ─── OpenAI via official openai SDK (Responses API) ──────────────────────────

async function streamOpenAI({ apiKey, model, messages, onChunk, onDone }) {
  const client = new OpenAI({ apiKey })

  // Responses API input: convert {role, content} history to input items
  const input = messages.map((m) => ({
    role: m.role,   // 'user' | 'assistant'
    content: m.content
  }))

  const stream = await client.responses.create({
    model: model || 'gpt-4o-mini',
    input,
    stream: true
  })

  for await (const event of stream) {
    if (event.type === 'response.output_text.delta') {
      onChunk(event.delta)
    }
  }

  onDone()
}

module.exports = { registerAllHandlers }
