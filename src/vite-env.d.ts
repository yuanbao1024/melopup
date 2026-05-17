/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_OPENAI_BASE_URL: string
  readonly VITE_OPENAI_MODEL: string
  readonly VITE_NETEASE_COOKIE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

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
