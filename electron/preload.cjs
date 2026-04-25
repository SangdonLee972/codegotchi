const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('codegotchi', {
  getLocalSnapshot: () => ipcRenderer.invoke('codegotchi:get-local-snapshot'),
  onLocalSnapshot: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot)
    ipcRenderer.on('codegotchi:local-snapshot', listener)
    return () => ipcRenderer.removeListener('codegotchi:local-snapshot', listener)
  },
})
