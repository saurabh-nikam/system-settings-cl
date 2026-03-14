'use strict'
// AssistBall — collapsed floating ball UI with drag support

class AssistBall {
  constructor() {
    this._expandCb = null
    this._el = document.getElementById('assist-ball')

    if (!this._el) return

    let isDragging = false
    let dragStartX = 0
    let dragStartY = 0
    let mouseDownTime = 0
    let hasMoved = false
    const DRAG_THROTTLE_MS = 16

    this._el.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return
      isDragging = true
      hasMoved = false
      mouseDownTime = Date.now()
      dragStartX = e.screenX
      dragStartY = e.screenY
      window.electronAPI.ballDragStart(e.screenX, e.screenY)
      e.preventDefault()
    })

    let lastSend = 0
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return
      const now = Date.now()
      if (now - lastSend < DRAG_THROTTLE_MS) return
      lastSend = now

      const dx = Math.abs(e.screenX - dragStartX)
      const dy = Math.abs(e.screenY - dragStartY)
      if (dx > 3 || dy > 3) hasMoved = true

      window.electronAPI.ballDragMove(e.screenX, e.screenY)
    })

    window.addEventListener('mouseup', (e) => {
      if (!isDragging) return
      isDragging = false
      window.electronAPI.ballDragEnd()

      // Only treat as click if not dragged and duration < 300ms
      if (!hasMoved && Date.now() - mouseDownTime < 300) {
        this._expandCb?.()
      }
    })

    // Keyboard accessibility
    this._el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        this._expandCb?.()
      }
    })
  }

  onExpand(cb) { this._expandCb = cb }
}
