const { app, BrowserWindow, Menu, Tray, ipcMain, nativeImage } = require('electron')
const path = require('node:path')
const { collectLocalSnapshot } = require('./collector.cjs')

let tray
let window
let snapshotTimer

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <rect x="5" y="7" width="22" height="18" rx="4" fill="black"/>
      <rect x="9" y="11" width="4" height="4" fill="white"/>
      <rect x="19" y="11" width="4" height="4" fill="white"/>
      <path d="M11 20h10" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>`
  const image = nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`)
  image.setTemplateImage(true)
  return image
}

function createWindow() {
  window = new BrowserWindow({
    width: 1180,
    height: 820,
    show: true,
    resizable: true,
    frame: true,
    center: true,
    alwaysOnTop: true,
    transparent: false,
    title: 'Codegotchi',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  const devUrl = process.env.CODEGOTCHI_DEV_URL
  if (devUrl) {
    window.loadURL(devUrl)
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  setTimeout(() => {
    if (!window.isDestroyed()) {
      window.setAlwaysOnTop(false)
    }
  }, 2500)
}

function sendLocalSnapshot() {
  if (!window || window.isDestroyed()) {
    return
  }

  const snapshot = collectLocalSnapshot()
  window.webContents.send('codegotchi:local-snapshot', snapshot)
}

function showWindow() {
  if (window.isDestroyed()) {
    return
  }

  window.center()
  window.setAlwaysOnTop(true)
  window.show()
  window.restore()
  window.focus()
  window.moveTop()
  setTimeout(() => {
    if (!window.isDestroyed()) {
      window.setAlwaysOnTop(false)
    }
  }, 2500)
}

function toggleWindow() {
  showWindow()
}

app.whenReady().then(() => {
  ipcMain.handle('codegotchi:get-local-snapshot', () => collectLocalSnapshot())
  createWindow()
  tray = new Tray(createTrayIcon())
  tray.setToolTip('Codegotchi')
  if (process.platform === 'darwin') {
    tray.setTitle(' Codegotchi ')
  }
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show Codegotchi', click: showWindow },
      { label: 'Hide', click: () => window.hide() },
      { type: 'separator' },
      { label: 'Quit', role: 'quit' },
    ]),
  )
  tray.on('click', showWindow)
  window.webContents.once('did-finish-load', () => {
    showWindow()
    sendLocalSnapshot()
    snapshotTimer = setInterval(sendLocalSnapshot, 60_000)
  })
})

app.on('activate', () => {
  if (window) {
    showWindow()
  }
})

app.on('window-all-closed', (event) => {
  event.preventDefault()
})

app.on('before-quit', () => {
  if (snapshotTimer) {
    clearInterval(snapshotTimer)
  }
})
