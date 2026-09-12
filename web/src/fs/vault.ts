import { saveVaultHandle } from './persist'

export const fsSupported = typeof window !== 'undefined' && 'showDirectoryPicker' in window

export interface VaultFile {
  path: string // e.g. "01_People/Vikram Singh.md"
  name: string // e.g. "Vikram Singh.md"
  handle?: FileSystemFileHandle
  isLocked?: boolean
  role?: string | null
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
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.csv') || entry.name.endsWith('.yaml')) {
      out.push({ path, name: entry.name, handle: entry, isLocked: path.includes('00_Raw_Inputs') })
    }
  }
  return out
}

export async function loadVaultFromApi(caseId = 'Case_01_Sonipat_Arms'): Promise<VaultFile[]> {
  try {
    const casesRes = await fetch('/api/cases')
    if (casesRes.ok) {
      const cases: Array<{ case_id?: string; id?: string }> = await casesRes.json()
      if (Array.isArray(cases) && cases.length > 0) {
        // Sort cases canonically so Case 1 appears before Case 2
        cases.sort((a, b) => {
          const idA = a.case_id || a.id || ''
          const idB = b.case_id || b.id || ''
          return idA.localeCompare(idB, undefined, { numeric: true })
        })

        const allFiles: VaultFile[] = []
        for (const c of cases) {
          const cid = c.case_id || c.id
          if (!cid) continue
          try {
            const treeRes = await fetch(`/api/vault/tree?case_id=${encodeURIComponent(cid)}`)
            if (treeRes.ok) {
              const items: Array<{
                path: string
                name: string
                is_locked?: boolean
                role?: string | null
              }> = await treeRes.json()

              for (const it of items) {
                const prefix = `${cid}/`
                const fullPath = it.path.startsWith(prefix) ? it.path : `${prefix}${it.path}`
                allFiles.push({
                  path: fullPath,
                  name: it.name,
                  isLocked: it.is_locked,
                  role: it.role,
                })
              }
            }
          } catch (e) {
            console.warn(`Failed to fetch tree for case ${cid}:`, e)
          }
        }
        if (allFiles.length > 0) {
          return allFiles
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch /api/cases, falling back to single case:', err)
  }

  const res = await fetch(`/api/vault/tree?case_id=${encodeURIComponent(caseId)}`)
  if (!res.ok) {
    throw new Error(`Failed to load vault tree: ${res.statusText}`)
  }
  const items: Array<{
    path: string
    name: string
    is_locked?: boolean
    role?: string | null
  }> = await res.json()

  return items.map((it) => {
    const prefix = `${caseId}/`
    const fullPath = it.path.startsWith(prefix) ? it.path : `${prefix}${it.path}`
    return {
      path: fullPath,
      name: it.name,
      isLocked: it.is_locked,
      role: it.role,
    }
  })
}

export async function readFile(target: FileSystemFileHandle | VaultFile | string): Promise<string> {
  if (typeof target === 'string') {
    const res = await fetch(`/api/vault/note?path=${encodeURIComponent(target)}`)
    if (!res.ok) throw new Error(`Failed to read note: ${res.statusText}`)
    const data = await res.json()
    return data.content ?? ''
  }

  if ('handle' in target && target.handle) {
    const file = await target.handle.getFile()
    return file.text()
  }

  if ('getFile' in target && typeof (target as FileSystemFileHandle).getFile === 'function') {
    const file = await (target as FileSystemFileHandle).getFile()
    return file.text()
  }

  if ('path' in target) {
    const res = await fetch(`/api/vault/note?path=${encodeURIComponent(target.path)}`)
    if (!res.ok) throw new Error(`Failed to read note: ${res.statusText}`)
    const data = await res.json()
    return data.content ?? ''
  }

  return ''
}

export async function writeFile(target: FileSystemFileHandle | VaultFile | string, text: string): Promise<void> {
  if (typeof target === 'string') {
    const res = await fetch('/api/vault/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: target, content: text }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to write note: ${res.statusText}`)
    }
    return
  }

  if ('handle' in target && target.handle) {
    const w = await target.handle.createWritable()
    await w.write(text)
    await w.close()
    return
  }

  if ('createWritable' in target && typeof (target as FileSystemFileHandle).createWritable === 'function') {
    const w = await (target as FileSystemFileHandle).createWritable()
    await w.write(text)
    await w.close()
    return
  }

  if ('path' in target) {
    const res = await fetch('/api/vault/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: target.path, content: text }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || `Failed to write note: ${res.statusText}`)
    }
  }
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

export async function createNoteApi(
  path: string,
  content = '',
  caseId = 'Case_01_Sonipat_Arms'
): Promise<VaultFile> {
  const res = await fetch('/api/vault/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content, case_id: caseId }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Failed to create note: ${res.statusText}`)
  }
  const data = await res.json()
  return {
    path: data.path,
    name: data.name,
  }
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


