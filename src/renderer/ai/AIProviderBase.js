'use strict'
// AIProviderBase — abstract base class for AI providers in the renderer.
// Note: Actual HTTP requests are made in the main process (ipcHandlers.js).
// These classes provide message normalization and model metadata only.

class AIProviderBase {
  constructor(providerName) {
    this.providerName = providerName
  }

  /** Normalize messages to {role, content} format */
  normalizeMessages(messages) {
    return messages
      .filter((m) => m.role && m.content && m.content.trim())
      .map((m) => ({
        role: m.role,
        content: String(m.content).trim()
      }))
  }

  /** @returns {string[]} available model IDs */
  getModels() {
    return []
  }

  /** @returns {string} default model ID */
  getDefaultModel() {
    return this.getModels()[0] || ''
  }

  /** Display name for UI */
  getDisplayName() {
    return this.providerName
  }
}
