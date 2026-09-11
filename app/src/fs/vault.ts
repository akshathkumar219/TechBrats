import { saveVaultHandle } from './persist'

export const fsSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window

export interface VaultFile {
  path: string // "Suspects/Vikram Singh.md"
  name: string // "Vikram Singh.md"
  handle: FileSystemFileHandle
}

export async function pickVault(): Promise<FileSystemDirectoryHandle> {
  if (!fsSupported) {
    throw new Error('File System Access API is not supported in this browser. Please use Chrome or Edge.')
  }
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  await saveVaultHandle(handle)
  return handle
}

export async function walkVault(
  dir: FileSystemDirectoryHandle,
  prefix = ''
): Promise<VaultFile[]> {
  const out: VaultFile[] = []
  for await (const entry of dir.values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.kind === 'directory') {
      if (entry.name.startsWith('.')) continue // skip .obsidian, .git
      out.push(...(await walkVault(entry, path)))
    } else if (entry.name.endsWith('.md')) {
      out.push({ path, name: entry.name, handle: entry })
    }
  }
  return out
}

export async function readFile(h: FileSystemFileHandle): Promise<string> {
  const file = await h.getFile()
  return file.text()
}

export async function writeFile(h: FileSystemFileHandle, text: string): Promise<void> {
  const w = await h.createWritable()
  await w.write(text)
  await w.close() // MUST close or nothing is saved
}

// nested path like "Suspects/New Note.md" — walk/create each segment
export async function createNote(
  root: FileSystemDirectoryHandle,
  path: string
): Promise<FileSystemFileHandle> {
  const parts = path.split('/')
  const filename = parts.pop()!
  let dir = root
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true })
  }
  return dir.getFileHandle(filename, { create: true })
}

// nested folder path like "Suspects/Unverified" — walk/create each segment
export async function createFolder(
  root: FileSystemDirectoryHandle,
  path: string
): Promise<FileSystemDirectoryHandle> {
  const parts = path.split('/').filter(Boolean)
  let dir = root
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true })
  }
  return dir
}

