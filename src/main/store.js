'use strict'

const Store = require('electron-store')
const { safeStorage } = require('electron')

const store = new Store({
  name: 'system-setting-config',
  defaults: {
    aiProvider: 'gemini',
    geminiModel: 'gemini-flash-latest',
    openaiModel: 'gpt-4o-mini',
    opacity: 0.95,
    googleSearch: true,
    thinkingEnabled: true,
    customGeminiModels: [],
    customOpenAIModels: [],
    windowBounds: { x: undefined, y: undefined, width: 420, height: 680 },
    ballPosition: { x: 100, y: 100 },
    chatBoundsBeforeBall: null
  }
})

// ─── Public settings (safe to send to renderer) ───────────────────────────────

function getPublicSettings() {
  return {
    aiProvider:      store.get('aiProvider'),
    geminiModel:     store.get('geminiModel'),
    openaiModel:     store.get('openaiModel'),
    opacity:         store.get('opacity'),
    googleSearch:       store.get('googleSearch'),
    thinkingEnabled:    store.get('thinkingEnabled'),
    customGeminiModels: store.get('customGeminiModels'),
    customOpenAIModels: store.get('customOpenAIModels'),
    hasGeminiKey:    !!_getRawKey('gemini'),
    hasOpenAIKey:    !!_getRawKey('openai')
  }
}

function saveSettings(partial) {
  const allowed = ['aiProvider', 'geminiModel', 'openaiModel', 'opacity', 'googleSearch', 'thinkingEnabled', 'customGeminiModels', 'customOpenAIModels']
  for (const key of allowed) {
    if (key in partial) store.set(key, partial[key])
  }
}

// ─── API Key Storage (encrypted via macOS Keychain / safeStorage) ─────────────

function setApiKey(provider, plaintext) {
  if (!plaintext) {
    store.delete(`enc_key_${provider}`)
    store.delete(`raw_key_${provider}`)
    return
  }

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(plaintext)
    store.set(`enc_key_${provider}`, encrypted.toString('base64'))
    store.delete(`raw_key_${provider}`)
  } else {
    // Fallback when Keychain unavailable (CI / headless)
    store.set(`raw_key_${provider}`, plaintext)
  }
}

function getApiKey(provider) {
  // Try encrypted first
  const enc = store.get(`enc_key_${provider}`)
  if (enc && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(enc, 'base64'))
    } catch (_) {}
  }
  // Fallback to raw
  return store.get(`raw_key_${provider}`, '')
}

function _getRawKey(provider) {
  return store.get(`enc_key_${provider}`) || store.get(`raw_key_${provider}`)
}

// Proxy store methods used by windowManager directly
function get(key, defaultVal) { return store.get(key, defaultVal) }
function set(key, val) { return store.set(key, val) }

module.exports = {
  get,
  set,
  getPublicSettings,
  saveSettings,
  setApiKey,
  getApiKey
}
