'use strict'
// SettingsModal — provider/model selection + custom model entry + API keys + appearance

const BUILTIN_MODELS = {
  gemini: [
    'gemini-3.1-flash-lite-preview',
    'gemini-flash-latest',
    'gemini-3-flash-preview',
    'gemini-3.1-pro-preview'
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-3.5-turbo'
  ]
}

class SettingsModal {
  constructor(initialSettings, onSaved) {
    this._onSaved = onSaved
    this._modal   = document.getElementById('settings-modal')

    // Custom models per provider, loaded from persisted settings
    this._customModels = {
      gemini: initialSettings.customGeminiModels || [],
      openai: initialSettings.customOpenAIModels || []
    }

    // ── Element refs ──────────────────────────────────────────────────────────
    this._providerSel    = document.getElementById('settings-provider')
    this._modelSel       = document.getElementById('settings-model')
    this._customInput    = document.getElementById('settings-model-custom')
    this._addBtn         = document.getElementById('btn-add-model')
    this._customList     = document.getElementById('custom-models-list')
    this._googleSearchCb = document.getElementById('settings-google-search')
    this._thinkingCb     = document.getElementById('settings-thinking')

    // ── Restore saved provider + model ────────────────────────────────────────
    const savedProvider = initialSettings.aiProvider || 'gemini'
    const savedModel    = savedProvider === 'openai'
      ? (initialSettings.openaiModel || 'gpt-4o-mini')
      : (initialSettings.geminiModel || 'gemini-flash-latest')

    this._providerSel.value = savedProvider
    this._rebuildModelDropdown(savedProvider, savedModel)
    this._rebuildCustomList(savedProvider)
    this._updateGeminiOnlyToggles(savedProvider)

    // ── Provider change ───────────────────────────────────────────────────────
    this._providerSel.addEventListener('change', () => {
      const p = this._providerSel.value
      this._rebuildModelDropdown(p)
      this._rebuildCustomList(p)
      this._updateGeminiOnlyToggles(p)
      this._saveProviderModel()
      // Update placeholder hint to match provider
      this._customInput.placeholder = p === 'openai'
        ? 'e.g. gpt-5, o3-mini'
        : 'e.g. gemini-2.5-pro-preview'
    })

    // Auto-save when model dropdown changes
    this._modelSel.addEventListener('change', () => this._saveProviderModel())

    // ── Add custom model ──────────────────────────────────────────────────────
    this._addBtn.addEventListener('click', () => this._addCustomModel())

    this._customInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); this._addCustomModel() }
    })

    // ── Save API key buttons ──────────────────────────────────────────────────
    this._modal.querySelectorAll('.btn-save-key').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const provider = btn.dataset.provider
        const inputEl  = document.getElementById(`${provider}-key-input`)
        const key      = inputEl.value.trim()
        if (!key) return

        btn.disabled = true; btn.textContent = 'Saving…'
        await window.electronAPI.setApiKey(provider, key)
        inputEl.value = ''; inputEl.placeholder = '••••••••••••'

        const status = document.getElementById(`${provider}-key-status`)
        status.textContent = '✓ Saved'; status.className = 'key-status success'
        btn.disabled = false; btn.textContent = 'Save'
      })
    })

    // ── Opacity ───────────────────────────────────────────────────────────────
    const settingsOpacity    = document.getElementById('settings-opacity')
    const settingsOpacityVal = document.getElementById('settings-opacity-value')

    settingsOpacity.addEventListener('input', (e) => {
      const v = parseInt(e.target.value)
      settingsOpacityVal.textContent = v + '%'
      window.electronAPI.setOpacity(v / 100)
      window.electronAPI.saveSettings({ opacity: v / 100 })
    })

    if (initialSettings?.opacity) {
      const pct = Math.round(initialSettings.opacity * 100)
      settingsOpacity.value = pct; settingsOpacityVal.textContent = pct + '%'
    }

    // ── Close controls ────────────────────────────────────────────────────────
    document.getElementById('btn-settings-close').addEventListener('click', () => this.close())
    this._modal.querySelector('.modal-backdrop').addEventListener('click', () => this.close())
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this._modal.classList.contains('hidden')) this.close()
    })
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  open() {
    this._modal.classList.remove('hidden')
    this._refreshKeyStatuses()
    this._customInput.focus()
  }

  close() {
    this._modal.classList.add('hidden')
    this._saveProviderModel()
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  _addCustomModel() {
    const name     = this._customInput.value.trim()
    const provider = this._providerSel.value

    if (!name) return

    // Deduplicate across builtin + custom
    const allExisting = [
      ...BUILTIN_MODELS[provider],
      ...this._customModels[provider]
    ]
    if (allExisting.includes(name)) {
      // Already exists — just select it
      this._modelSel.value = name
      this._customInput.value = ''
      this._saveProviderModel()
      return
    }

    // Add to runtime list
    this._customModels[provider].push(name)
    this._customInput.value = ''

    // Persist custom models
    this._persistCustomModels(provider)

    // Rebuild dropdown and select the new model
    this._rebuildModelDropdown(provider, name)
    this._rebuildCustomList(provider)
    this._saveProviderModel()
  }

  _removeCustomModel(provider, name) {
    this._customModels[provider] = this._customModels[provider].filter((m) => m !== name)
    this._persistCustomModels(provider)

    // If the removed model was selected, fall back to first option
    const currentModel = this._modelSel.value
    this._rebuildModelDropdown(provider, currentModel === name ? undefined : currentModel)
    this._rebuildCustomList(provider)
    this._saveProviderModel()
  }

  _rebuildModelDropdown(provider, selectedModel) {
    const builtin = BUILTIN_MODELS[provider] || []
    const custom  = this._customModels[provider] || []
    const all     = [...builtin, ...custom]

    this._modelSel.innerHTML = ''

    builtin.forEach((m) => {
      const opt = document.createElement('option')
      opt.value = m; opt.textContent = m
      if (m === selectedModel) opt.selected = true
      this._modelSel.appendChild(opt)
    })

    if (custom.length) {
      const divider = document.createElement('option')
      divider.disabled = true; divider.textContent = '── custom ──'
      this._modelSel.appendChild(divider)

      custom.forEach((m) => {
        const opt = document.createElement('option')
        opt.value = m; opt.textContent = m
        if (m === selectedModel) opt.selected = true
        this._modelSel.appendChild(opt)
      })
    }

    if (!this._modelSel.value && all.length) {
      this._modelSel.value = all[0]
    }
  }

  _rebuildCustomList(provider) {
    const custom = this._customModels[provider] || []
    this._customList.innerHTML = ''

    custom.forEach((name) => {
      const row = document.createElement('div')
      row.className = 'custom-model-tag'

      const label = document.createElement('span')
      label.textContent = name
      label.className = 'custom-model-name'

      const removeBtn = document.createElement('button')
      removeBtn.textContent = '×'
      removeBtn.className = 'custom-model-remove'
      removeBtn.title = `Remove ${name}`
      removeBtn.addEventListener('click', () => this._removeCustomModel(provider, name))

      row.appendChild(label)
      row.appendChild(removeBtn)
      this._customList.appendChild(row)
    })
  }

  _updateGeminiOnlyToggles(provider) {
    const isGemini = provider === 'gemini'
    this._googleSearchCb.closest('.form-group').style.opacity = isGemini ? '1' : '0.4'
    this._thinkingCb.closest('.form-group').style.opacity     = isGemini ? '1' : '0.4'
    this._googleSearchCb.disabled = !isGemini
    this._thinkingCb.disabled     = !isGemini
  }

  _saveProviderModel() {
    const provider = this._providerSel.value
    const model    = this._modelSel.value
    const key      = provider === 'openai' ? 'openaiModel' : 'geminiModel'

    window.electronAPI.saveSettings({
      aiProvider: provider,
      [key]: model,
      googleSearch:    this._googleSearchCb.checked,
      thinkingEnabled: this._thinkingCb.checked
    })

    this._onSaved?.({ aiProvider: provider, aiModel: model })
  }

  _persistCustomModels(provider) {
    const key = provider === 'openai' ? 'customOpenAIModels' : 'customGeminiModels'
    window.electronAPI.saveSettings({ [key]: this._customModels[provider] })
  }

  async _refreshKeyStatuses() {
    for (const provider of ['gemini', 'openai']) {
      const key    = await window.electronAPI.getApiKey(provider)
      const status = document.getElementById(`${provider}-key-status`)
      status.textContent = key ? '✓ Key saved' : ''
      status.className   = key ? 'key-status success' : 'key-status'
    }
  }
}
