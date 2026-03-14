'use strict'
// TopBar — close / ball / settings buttons + native drag region

class TopBar {
  constructor() {
    this._closeCb    = null
    this._ballCb     = null
    this._settingsCb = null

    document.getElementById('btn-close').addEventListener('click', () => {
      this._closeCb?.()
    })

    document.getElementById('btn-ball').addEventListener('click', () => {
      this._ballCb?.()
    })

    document.getElementById('btn-settings').addEventListener('click', () => {
      this._settingsCb?.()
    })
  }

  onClose(cb)    { this._closeCb = cb }
  onToggleBall(cb) { this._ballCb = cb }
  onSettings(cb) { this._settingsCb = cb }
}
