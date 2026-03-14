'use strict'
// StreamBuffer — accumulates SSE text chunks and calls onUpdate
// with the full accumulated string, throttled to ~60fps.

class StreamBuffer {
  /**
   * @param {function(string): void} onUpdate  called with accumulated text
   * @param {number} throttleMs               max render frequency (default 16ms ≈ 60fps)
   */
  constructor(onUpdate, throttleMs = 16) {
    this._onUpdate = onUpdate
    this._throttleMs = throttleMs
    this._accumulated = ''
    this._pending = false
    this._lastFlush = 0
  }

  /** Push a new chunk of text */
  push(chunk) {
    this._accumulated += chunk
    this._scheduleUpdate()
  }

  /** Force immediate flush (call on stream end) */
  flush() {
    this._pending = false
    this._lastFlush = Date.now()
    this._onUpdate(this._accumulated)
  }

  /** Get the full accumulated text */
  getText() {
    return this._accumulated
  }

  _scheduleUpdate() {
    if (this._pending) return
    const now = Date.now()
    const elapsed = now - this._lastFlush

    if (elapsed >= this._throttleMs) {
      // Render immediately
      this.flush()
    } else {
      // Schedule for next throttle window
      this._pending = true
      setTimeout(() => {
        this._pending = false
        this._lastFlush = Date.now()
        this._onUpdate(this._accumulated)
      }, this._throttleMs - elapsed)
    }
  }
}
