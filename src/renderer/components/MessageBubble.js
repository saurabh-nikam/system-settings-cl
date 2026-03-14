'use strict'
// MessageBubble — renders a single chat message (user or assistant)

class MessageBubble {
  /**
   * @param {'user'|'assistant'} role
   * @param {string} initialContent  raw text or HTML string
   */
  constructor(role, initialContent = '') {
    this._role = role
    this._rawText = ''

    this.el = document.createElement('div')
    this.el.className = `message message-${role}`

    const bubble = document.createElement('div')
    bubble.className = 'bubble'
    this.el.appendChild(bubble)
    this._bubble = bubble

    if (initialContent) this.setContent(initialContent)
  }

  /** Set rendered HTML content (already sanitized markdown) */
  setContent(html) {
    this._bubble.innerHTML = html
    this._addCopyButtons()
  }

  /** Set plain text content */
  setText(text) {
    this._rawText = text
    this._bubble.textContent = text
  }

  /** Get accumulated plain text */
  getText() { return this._rawText }

  /** Called by StreamBuffer with new accumulated text */
  appendText(text) {
    this._rawText += text
  }

  /** Add copy buttons to all code blocks inside this bubble */
  _addCopyButtons() {
    this._bubble.querySelectorAll('pre').forEach((pre) => {
      if (pre.querySelector('.copy-btn')) return // already added
      const btn = document.createElement('button')
      btn.className = 'copy-btn'
      btn.textContent = 'Copy'
      btn.addEventListener('click', () => {
        const code = pre.querySelector('code')?.textContent || pre.textContent
        navigator.clipboard.writeText(code).then(() => {
          btn.textContent = 'Copied!'
          setTimeout(() => { btn.textContent = 'Copy' }, 2000)
        })
      })
      pre.style.position = 'relative'
      pre.appendChild(btn)
    })
  }
}
