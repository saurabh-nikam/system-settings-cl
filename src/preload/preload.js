'use strict'

const { contextBridge, ipcRenderer } = require('electron')

// ─── electronAPI exposed to renderer (window.electronAPI) ────────────────────
// contextIsolation: true means this is the only bridge to Node/main process.

contextBridge.exposeInMainWorld('electronAPI', {

  // ── Window controls ────────────────────────────────────────────────────────
  close: () => ipcRenderer.send('window:close'),
  toggleMode: () => ipcRenderer.send('window:toggle-mode'),
  setOpacity: (v) => ipcRenderer.send('window:set-opacity', v),
  getOpacity: () => ipcRenderer.invoke('window:get-opacity'),

  // ── Ball drag (screen coordinates) ────────────────────────────────────────
  ballDragStart: (screenX, screenY) =>
    ipcRenderer.send('ball:drag-start', { screenX, screenY }),
  ballDragMove: (screenX, screenY) =>
    ipcRenderer.send('ball:drag-move', { screenX, screenY }),
  ballDragEnd: () => ipcRenderer.send('ball:drag-end'),

  // ── Settings ───────────────────────────────────────────────────────────────
  getSettings: () => ipcRenderer.invoke('settings:get-all'),
  saveSettings: (partial) => ipcRenderer.invoke('settings:save', partial),
  getApiKey: (provider) => ipcRenderer.invoke('settings:get-api-key', provider),
  setApiKey: (provider, key) => ipcRenderer.invoke('settings:set-api-key', provider, key),

  // ── AI Streaming ───────────────────────────────────────────────────────────
  // Returns a Promise<void> immediately; chunks arrive via onChunk/onDone/onError
  sendMessage: (provider, model, messages) =>
    ipcRenderer.invoke('ai:send', { provider, model, messages }),

  onChunk: (cb) => {
    ipcRenderer.on('ai:chunk', (_e, text) => cb(text))
  },
  onDone: (cb) => {
    ipcRenderer.on('ai:done', () => cb())
  },
  onError: (cb) => {
    ipcRenderer.on('ai:error', (_e, err) => cb(err))
  },
  removeAiListeners: () => {
    ipcRenderer.removeAllListeners('ai:chunk')
    ipcRenderer.removeAllListeners('ai:done')
    ipcRenderer.removeAllListeners('ai:error')
  },

  // ── Mode changes pushed from main ─────────────────────────────────────────
  onModeChange: (cb) => {
    ipcRenderer.on('mode:change', (_e, mode) => cb(mode))
  }
})
