'use strict'
// ChatView — message list + streaming render loop + input bar

class ChatView {
  constructor(settings) {
    this._sendCb = null
    this._history = []  // [{role, content}]

    this._messagesEl = document.getElementById('messages')
    this._inputEl    = document.getElementById('user-input')
    this._sendBtn    = document.getElementById('btn-send')

    // Send on click
    this._sendBtn.addEventListener('click', () => this._submit())

    // Enter to send, Shift+Enter for newline
    this._inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        this._submit()
      }
    })

  }

  onSend(cb) { this._sendCb = cb }

  _submit() {
    const text = this._inputEl.value.trim()
    if (!text) return
    this._inputEl.value = ''
    this._inputEl.style.height = 'auto'
    this._sendCb?.(text)
  }

  /**
   * Add a message bubble to the DOM and history (for user messages).
   * For assistant streaming, call addMessage('assistant','') then update via the bubble.
   * @returns {MessageBubble}
   */
  addMessage(role, content) {
    const bubble = new MessageBubble(role, role === 'user'
      ? this._escapeHtml(content)
      : content
    )

    if (role === 'user') {
      this._history.push({ role: 'user', content })
    }

    this._messagesEl.appendChild(bubble.el)
    this.scrollToBottom()
    return bubble
  }

  /** Call when streaming is complete to add assistant turn to history */
  commitAssistantMessage(plainText) {
    this._history.push({ role: 'assistant', content: plainText })
  }

  getHistory() { return [...this._history] }

  scrollToBottom() {
    this._messagesEl.scrollTop = this._messagesEl.scrollHeight
  }

  _escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>')
  }
}
