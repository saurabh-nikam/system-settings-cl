'use strict'
// Root state machine: CHAT_VIEW ↔ ASSIST_BALL

;(async function AppInit() {
  // ── Load persisted settings ───────────────────────────────────────────────
  const settings = await window.electronAPI.getSettings()

  // Active provider/model — updated whenever SettingsModal saves
  let currentProvider = settings.aiProvider || 'gemini'
  let currentModel    = _modelFromSettings(currentProvider, settings)

  // ── Initialize components ─────────────────────────────────────────────────
  const topBar        = new TopBar()
  const chatView      = new ChatView(settings)
  const assistBall    = new AssistBall()
  const opacitySlider = new OpacitySlider(settings.opacity)
  const settingsModal = new SettingsModal(settings, onSettingsSaved)

  // ── Update the read-only indicator bar ───────────────────────────────────
  _updateProviderBar(currentProvider, currentModel)

  // ── TopBar events ─────────────────────────────────────────────────────────
  topBar.onClose(()       => window.electronAPI.close())
  topBar.onToggleBall(()  => window.electronAPI.toggleMode())
  topBar.onSettings(()    => settingsModal.open())

  // ── AssistBall ────────────────────────────────────────────────────────────
  assistBall.onExpand(() => window.electronAPI.toggleMode())

  // ── Mode changes pushed from main process ─────────────────────────────────
  window.electronAPI.onModeChange((mode) => setMode(mode))

  // ── Opacity ───────────────────────────────────────────────────────────────
  opacitySlider.onChange((v) => window.electronAPI.setOpacity(v))

  // ── Send message ──────────────────────────────────────────────────────────
  chatView.onSend(async (text) => {
    chatView.addMessage('user', text)
    chatView.scrollToBottom()

    const messages = chatView.getHistory()
    const streamEl = chatView.addMessage('assistant', '')

    window.electronAPI.removeAiListeners()

    const buf = new StreamBuffer((accumulated) => {
      streamEl.setContent(window.renderMarkdown(accumulated))
      chatView.scrollToBottom()
    })

    window.electronAPI.onChunk((chunk) => buf.push(chunk))

    window.electronAPI.onDone(() => {
      buf.flush()
      chatView.commitAssistantMessage(streamEl.getText())
    })

    window.electronAPI.onError((err) => {
      streamEl.setContent(`<span class="error-text">⚠ ${err.message}</span>`)
    })

    await window.electronAPI.sendMessage(currentProvider, currentModel, messages)
  })

  // ── Settings saved callback ───────────────────────────────────────────────
  function onSettingsSaved(saved) {
    if (saved.aiProvider) currentProvider = saved.aiProvider
    if (saved.aiModel)    currentModel    = saved.aiModel
    _updateProviderBar(currentProvider, currentModel)
  }

  // ── Mode switch ───────────────────────────────────────────────────────────
  function setMode(mode) {
    const chatEl = document.getElementById('chat-view')
    const ballEl = document.getElementById('ball-view')
    if (mode === 'ball') {
      chatEl.classList.add('hidden');    chatEl.classList.remove('active')
      ballEl.classList.remove('hidden'); ballEl.classList.add('active')
    } else {
      ballEl.classList.add('hidden');    ballEl.classList.remove('active')
      chatEl.classList.remove('hidden'); chatEl.classList.add('active')
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function _updateProviderBar(provider, model) {
    const providerNames = { gemini: 'Gemini', openai: 'OpenAI' }
    document.getElementById('active-provider-label').textContent =
      providerNames[provider] || provider
    document.getElementById('active-model-label').textContent = model || ''
  }

  function _modelFromSettings(provider, s) {
    return provider === 'openai'
      ? (s.openaiModel || 'gpt-4o-mini')
      : (s.geminiModel || 'gemini-flash-latest')
  }
})()
