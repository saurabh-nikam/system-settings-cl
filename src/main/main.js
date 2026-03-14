'use strict'

const { app, globalShortcut, protocol, shell } = require('electron')
const path = require('path')

// Single-instance lock
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
  process.exit(0)
}

// Disable GPU sandbox for transparency on macOS
app.commandLine.appendSwitch('enable-transparent-visuals')

const WindowManager = require('./windowManager')
const { registerAllHandlers } = require('./ipcHandlers')
const store = require('./store')

let windowManager = null

app.whenReady().then(() => {
  // Serve local files via app:// protocol (avoids file:// CSP restrictions)
  protocol.registerFileProtocol('app', (request, callback) => {
    const filePath = request.url.replace('app://', '')
    callback({ path: path.join(__dirname, '../../', filePath) })
  })

  windowManager = new WindowManager(store)
  windowManager.createWindows()

  registerAllHandlers(windowManager, store)

  // Global shortcut: Cmd+Shift+Space to toggle visibility
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    windowManager.toggleVisibility()
  })

  app.on('activate', () => {
    windowManager.showChat()
  })
})

// Second instance → focus existing window
app.on('second-instance', () => {
  if (windowManager) windowManager.showChat()
})

// Keep app alive when all windows closed (tray resident)
app.on('window-all-closed', (e) => {
  e.preventDefault()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// Open external links in default browser, not in Electron
app.on('web-contents-created', (_e, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
})
