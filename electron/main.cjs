const { app, BrowserWindow, Menu, Tray, nativeImage, screen } = require('electron')
const path = require('node:path')

let tray
let window

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
    width: 460,
    height: 720,
    show: false,
    resizable: true,
    frame: true,
    transparent: false,
    title: 'Codegotchi',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const devUrl = process.env.CODEGOTCHI_DEV_URL
  if (devUrl) {
    window.loadURL(devUrl)
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

function positionWindow() {
  const trayBounds = tray.getBounds()
  const windowBounds = window.getBounds()
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y })
  const fallbackX = Math.round(display.workArea.x + display.workArea.width / 2 - windowBounds.width / 2)
  const fallbackY = Math.round(display.workArea.y + display.workArea.height / 2 - windowBounds.height / 2)
  const trayX = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2)
  const trayY = Math.round(display.workArea.y + 24)
  const x = Number.isFinite(trayX) && trayBounds.width > 0 ? trayX : fallbackX
  const y = Number.isFinite(trayY) ? trayY : fallbackY

  window.setPosition(x, y, false)
}

function showWindow() {
  if (window.isDestroyed()) {
    return
  }

  positionWindow()
  window.show()
  window.focus()
  window.moveTop()
}

function toggleWindow() {
  if (window.isVisible() && window.isFocused()) {
    window.hide()
    return
  }

  showWindow()
}

app.whenReady().then(() => {
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
  window.once('ready-to-show', showWindow)
  window.webContents.once('did-finish-load', showWindow)
})

app.on('activate', () => {
  if (window) {
    showWindow()
  }
})

app.on('window-all-closed', (event) => {
  event.preventDefault()
})
