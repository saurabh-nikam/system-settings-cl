'use strict'

class GeminiProvider extends AIProviderBase {
  constructor() {
    super('gemini')
  }

  getModels() {
    return [
      'gemini-3.1-flash-lite-preview',
      'gemini-flash-latest',
       'gemini-3-flash-preview',
      'gemini-3.1-pro-preview',
     
    ]
  }

  getDefaultModel() { return 'gemini-flash-latest' }
  getDisplayName()  { return 'Google Gemini' }

  /**
   * Gemini requires alternating user/model turns.
   * Merge consecutive same-role messages before sending.
   */
  normalizeMessages(messages) {
    const base = super.normalizeMessages(messages)
    const merged = []
    for (const msg of base) {
      const last = merged[merged.length - 1]
      if (last && last.role === msg.role) {
        last.content += '\n' + msg.content
      } else {
        merged.push({ ...msg })
      }
    }
    return merged
  }
}
