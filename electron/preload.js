const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  selectAudioFiles: () => ipcRenderer.invoke('select-audio-files'),
  selectAudioFolder: () => ipcRenderer.invoke('select-audio-folder'),
  readAudioFile: (path) => ipcRenderer.invoke('read-audio-file', path),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
})
