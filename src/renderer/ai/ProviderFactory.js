'use strict'

class ProviderFactory {
  static _instances = {}

  static get(providerName) {
    if (!ProviderFactory._instances[providerName]) {
      switch (providerName) {
        case 'gemini':
          ProviderFactory._instances[providerName] = new GeminiProvider()
          break
        case 'openai':
          ProviderFactory._instances[providerName] = new OpenAIProvider()
          break
        default:
          throw new Error(`Unknown AI provider: ${providerName}`)
      }
    }
    return ProviderFactory._instances[providerName]
  }

  static getAll() {
    return [new GeminiProvider(), new OpenAIProvider()]
  }
}
