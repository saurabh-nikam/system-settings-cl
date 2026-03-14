'use strict'

class OpenAIProvider extends AIProviderBase {
  constructor() {
    super('openai')
  }

  getModels() {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo'
    ]
  }

  getDefaultModel() { return 'gpt-4o-mini' }
  getDisplayName()  { return 'OpenAI' }
}
