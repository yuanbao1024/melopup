/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    selectAudioFiles: () => Promise<ElectronFile[]>
    selectAudioFolder: () => Promise<ElectronFile[]>
    readAudioFile: (path: string) => Promise<ArrayBuffer>
  }
}

interface ElectronFile {
  name: string
  path: string
  size: number
}
