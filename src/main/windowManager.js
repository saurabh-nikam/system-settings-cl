'use strict'

const { BrowserWindow, screen, Tray, Menu, nativeImage, app } = require('electron')
const path = require('path')

// Window modes
const MODE = { CHAT: 'chat', BALL: 'ball' }

class WindowManager {
  constructor(store) {
    this.store = store
    this.chatWindow = null
    this.mode = MODE.CHAT
    this.tray = null
    this._dragOrigin = null
  }

  createWindows() {
    this._createChatWindow()
    this._setupTray()
  }

  // ─── Chat Window ─────────────────────────────────────────────────────────────

  _createChatWindow() {
    const saved = this.store.get('windowBounds', {
      x: undefined, y: undefined, width: 420, height: 680
    })

    this.chatWindow = new BrowserWindow({
      x: saved.x,
      y: saved.y,
      width: saved.width,
      height: saved.height,
      minWidth: 320,
      minHeight: 400,

      // Frameless + transparent
      frame: false,
      transparent: true,
      titleBarStyle: 'hidden',

      // macOS frosted glass (NSVisualEffectView)
      vibrancy: 'under-window',
      visualEffectState: 'active',

      // Always-on-top over fullscreen Spaces
      alwaysOnTop: true,

      // NSPanel: excluded from Expose, Mission Control, screen capture enumeration
      type: 'panel',

      hasShadow: true,
      resizable: true,
      movable: true,
      skipTaskbar: true,

      webPreferences: {
        preload: path.join(__dirname, '../preload/preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,           // false required for safeStorage in preload
        webSecurity: true,
        devTools: process.env.NODE_ENV === 'development'
      }
    })

    // ── Screen-share protection ───────────────────────────────────────────────
    // Sets NSWindow sharingType = NSWindowSharingNone.
    // Blocks: QuickTime, older OBS/Zoom/Teams (pre-ScreenCaptureKit path).
    // NOTE: macOS ScreenCaptureKit (OBS 30+, Zoom 5.14+, macOS Screenshot on
    // Ventura 13.2+) ignores this flag by design — Apple's API change.
    this.chatWindow.setContentProtection(true)

    // Float above fullscreen apps in every Space
    this.chatWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    // Must call AFTER window is shown for screen-saver level to stick
    this.chatWindow.once('show', () => {
      this.chatWindow.setAlwaysOnTop(true, 'screen-saver', 1)
    })

    // Persist bounds on move/resize
    const saveBounds = () => {
      if (this.chatWindow && !this.chatWindow.isDestroyed()) {
        this.store.set('windowBounds', this.chatWindow.getBounds())
      }
    }
    this.chatWindow.on('moved', saveBounds)
    this.chatWindow.on('resized', saveBounds)

    this.chatWindow.loadFile(
      path.join(__dirname, '../../src/renderer/index.html')
    )

    if (process.env.NODE_ENV === 'development') {
      this.chatWindow.webContents.openDevTools({ mode: 'detach' })
    }

    this.chatWindow.on('close', (e) => {
      e.preventDefault()
      this.chatWindow.hide()
    })
  }

  // ─── Tray ────────────────────────────────────────────────────────────────────

  _setupTray() {
    const iconPath = path.join(__dirname, '../../assets/icon.png')
    let trayIcon = nativeImage.createFromPath(iconPath)
    if (trayIcon.isEmpty()) {
      // Fallback: create a simple 16x16 blank icon so tray doesn't crash
      trayIcon = nativeImage.createEmpty()
    }
    trayIcon = trayIcon.resize({ width: 16, height: 16 })

    this.tray = new Tray(trayIcon)
    this.tray.setToolTip('System Setting')

    const buildMenu = () => Menu.buildFromTemplate([
      {
        label: this.mode === MODE.BALL ? 'Show Chat' : 'Show',
        click: () => this.showChat()
      },
      {
        label: 'AssistBall Mode',
        type: 'checkbox',
        checked: this.mode === MODE.BALL,
        click: () => this.toggleMode()
      },
      { type: 'separator' },
      { label: 'Quit System Setting', click: () => app.exit(0) }
    ])

    this.tray.setContextMenu(buildMenu())
    this.tray.on('click', () => this.toggleVisibility())

    // Rebuild menu when mode changes
    this._rebuildTrayMenu = () => this.tray.setContextMenu(buildMenu())
  }

  // ─── Mode Switching ──────────────────────────────────────────────────────────

  toggleMode() {
    if (this.mode === MODE.CHAT) {
      this._enterBallMode()
    } else {
      this._exitBallMode()
    }
    if (this._rebuildTrayMenu) this._rebuildTrayMenu()
  }

  _enterBallMode() {
    this.mode = MODE.BALL
    // Notify renderer to show the AssistBall UI
    if (this.chatWindow && !this.chatWindow.isDestroyed()) {
      this.chatWindow.webContents.send('mode:change', 'ball')
      // Shrink window to ball size
      this.chatWindow.setResizable(false)
      const [x, y] = this.chatWindow.getPosition()
      const savedBounds = this.store.get('windowBounds', {})
      this.store.set('chatBoundsBeforeBall', this.chatWindow.getBounds())
      // Animate to ball size
      this.chatWindow.setSize(64, 64, true)
      const ballPos = this.store.get('ballPosition', { x: x + savedBounds.width - 80, y: y + 10 })
      this.chatWindow.setPosition(ballPos.x, ballPos.y, true)
    }
  }

  _exitBallMode() {
    this.mode = MODE.CHAT
    if (this.chatWindow && !this.chatWindow.isDestroyed()) {
      // Save ball position
      const [bx, by] = this.chatWindow.getPosition()
      this.store.set('ballPosition', { x: bx, y: by })

      const prev = this.store.get('chatBoundsBeforeBall', { x: 100, y: 100, width: 420, height: 680 })
      this.chatWindow.setPosition(prev.x, prev.y, true)
      this.chatWindow.setSize(prev.width, prev.height, true)
      this.chatWindow.setResizable(true)
      this.chatWindow.webContents.send('mode:change', 'chat')
      this.chatWindow.focus()
    }
  }

  toggleVisibility() {
    if (!this.chatWindow || this.chatWindow.isDestroyed()) return
    if (this.chatWindow.isVisible()) {
      this.chatWindow.hide()
    } else {
      this.showChat()
    }
  }

  showChat() {
    if (!this.chatWindow || this.chatWindow.isDestroyed()) {
      this._createChatWindow()
    }
    if (this.mode === MODE.BALL) {
      this._exitBallMode()
    }
    this.chatWindow.show()
    this.chatWindow.focus()
    this.chatWindow.setAlwaysOnTop(true, 'screen-saver', 1)
  }

  // ─── Window Drag (IPC-driven for ball mode) ──────────────────────────────────

  startDrag(screenX, screenY) {
    if (!this.chatWindow) return
    const [wx, wy] = this.chatWindow.getPosition()
    this._dragOrigin = { screenX, screenY, wx, wy }
  }

  updateDrag(screenX, screenY) {
    if (!this._dragOrigin || !this.chatWindow) return
    const dx = screenX - this._dragOrigin.screenX
    const dy = screenY - this._dragOrigin.screenY
    this.chatWindow.setPosition(
      this._dragOrigin.wx + dx,
      this._dragOrigin.wy + dy
    )
  }

  endDrag() {
    if (!this.chatWindow) return
    const [x, y] = this.chatWindow.getPosition()
    this.store.set('ballPosition', { x, y })
    this._dragOrigin = null
  }

  // ─── Opacity ─────────────────────────────────────────────────────────────────

  setOpacity(value) {
    if (!this.chatWindow || this.chatWindow.isDestroyed()) return
    const clamped = Math.max(0.15, Math.min(1.0, value))
    this.chatWindow.setOpacity(clamped)
    this.store.set('opacity', clamped)
  }

  getOpacity() {
    return this.store.get('opacity', 0.95)
  }
}

module.exports = WindowManager
