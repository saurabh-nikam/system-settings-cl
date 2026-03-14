'use strict'
// OpacitySlider — live opacity control in the top bar panel

class OpacitySlider {
  constructor(initialOpacity = 0.95) {
    this._changeCb = null

    this._panel  = document.getElementById('opacity-panel')
    this._slider = document.getElementById('opacity-slider')
    this._label  = document.getElementById('opacity-value')
    this._btnOpacity = document.getElementById('btn-opacity')

    const pct = Math.round(initialOpacity * 100)
    this._slider.value = pct
    this._label.textContent = pct + '%'

    // Toggle panel visibility
    this._btnOpacity.addEventListener('click', (e) => {
      e.stopPropagation()
      this._panel.classList.toggle('hidden')
    })

    // Hide panel on outside click
    document.addEventListener('click', (e) => {
      if (!this._panel.contains(e.target) && e.target !== this._btnOpacity) {
        this._panel.classList.add('hidden')
      }
    })

    this._slider.addEventListener('input', (e) => {
      const v = parseInt(e.target.value)
      this._label.textContent = v + '%'
      this._changeCb?.(v / 100)
    })
  }

  onChange(cb) { this._changeCb = cb }
}
