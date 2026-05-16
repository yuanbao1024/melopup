const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 720,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.handle('select-audio-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '音频文件', extensions: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'wma'] },
    ],
  })
  if (result.canceled) return []
  return result.filePaths.map((filePath) => ({
    name: path.basename(filePath),
    path: filePath,
    size: fs.statSync(filePath).size,
  }))
})

ipcMain.handle('select-audio-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  })
  if (result.canceled) return []
  const dirPath = result.filePaths[0]
  const files = fs.readdirSync(dirPath)
  const audioFiles = files
    .filter((f) => /\.(mp3|wav|flac|ogg|m4a|aac|wma)$/i.test(f))
    .map((f) => ({
      name: f,
      path: path.join(dirPath, f),
      size: fs.statSync(path.join(dirPath, f)).size,
    }))
  return audioFiles
})

ipcMain.handle('read-audio-file', async (_, filePath) => {
  const buffer = fs.readFileSync(filePath)
  return buffer.buffer
})

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: '音乐文件', extensions: ['mp3', 'wav', 'flac', 'ogg', 'm4a'] },
    ],
  })
  if (result.canceled) return null
  return {
    name: path.basename(result.filePaths[0]),
    path: result.filePaths[0],
    size: fs.statSync(result.filePaths[0]).size,
  }
})
