export interface QMCDecryptResult {
  data: Uint8Array
  mime: string
  ext: string
}

function detectFormat(data: Uint8Array): { mime: string; ext: string } {
  const magic = String.fromCharCode(...data.slice(0, 4))
  if (magic.startsWith('OggS')) {
    return { mime: 'audio/ogg', ext: '.ogg' }
  }
  if (magic.startsWith('fLaC')) {
    return { mime: 'audio/flac', ext: '.flac' }
  }
  const firstByte = data[0]
  if (
    firstByte === 0xFF &&
    (data[1] & 0xE0) === 0xE0
  ) {
    return { mime: 'audio/mpeg', ext: '.mp3' }
  }
  if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46) {
    return { mime: 'audio/wav', ext: '.wav' }
  }
  if (magic.startsWith('\x4D\x54\x68\x64') || magic.startsWith('\x4D\x54\x68\x64')) {
    return { mime: 'audio/midi', ext: '.midi' }
  }
  return { mime: 'audio/ogg', ext: '.ogg' }
}

export function decryptQMC(data: ArrayBuffer): QMCDecryptResult {
  const bytes = new Uint8Array(data)
  const len = bytes.length

  if (len < 4) {
    throw new Error('文件太小，不是有效的 QQ音乐 加密文件')
  }

  const b1 = bytes[0]
  const b2 = bytes[1]

  let keyLen: number
  let key: Uint8Array
  let audioStart: number

  if (b1 <= b2 && b2 <= 0x3f) {
    keyLen = b2
    audioStart = 2 + keyLen

    if (audioStart >= len) {
      throw new Error('QMCv2 格式无效：音频数据起始位置超出文件范围')
    }

    key = bytes.slice(2, audioStart)
  } else {
    if (b1 === 0 || b1 >= len) {
      throw new Error('无法识别的 QQ音乐 加密文件格式')
    }

    keyLen = b1
    audioStart = 1 + keyLen

    if (audioStart >= len) {
      throw new Error('QMCv1 格式无效：音频数据起始位置超出文件范围')
    }

    key = bytes.slice(1, audioStart)
  }

  if (key.length === 0) {
    return {
      data: bytes.slice(audioStart),
      ...detectFormat(bytes.slice(audioStart)),
    }
  }

  const audioData = bytes.slice(audioStart)
  const decrypted = new Uint8Array(audioData.length)

  for (let i = 0; i < audioData.length; i++) {
    decrypted[i] = audioData[i] ^ key[i % key.length]
  }

  const format = detectFormat(decrypted)

  return {
    data: decrypted,
    ...format,
  }
}

export function isQMCFile(fileName: string): boolean {
  const name = fileName.toLowerCase()
  return (
    name.endsWith('.mgg') ||
    name.endsWith('.mflac') ||
    name.endsWith('.mgga') ||
    name.endsWith('.qmc0') ||
    name.endsWith('.qmc2') ||
    name.endsWith('.qmc3') ||
    name.endsWith('.qmc4') ||
    name.endsWith('.qmc6') ||
    name.endsWith('.qmc8') ||
    name.endsWith('.qmcflac') ||
    name.endsWith('.qmcogg') ||
    name.endsWith('.tkm') ||
    name.endsWith('.tm0') ||
    name.endsWith('.tm2') ||
    name.endsWith('.tm3') ||
    name.endsWith('.tm6')
  )
}

export const QMC_EXTENSIONS = [
  '.mgg', '.mflac', '.mgga',
  '.qmc0', '.qmc2', '.qmc3', '.qmc4', '.qmc6', '.qmc8',
  '.qmcflac', '.qmcogg',
  '.tkm', '.tm0', '.tm2', '.tm3', '.tm6',
]
