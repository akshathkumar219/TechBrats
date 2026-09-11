import { get as idbGet, set as idbSet } from 'idb-keyval'

const VAULT_HANDLE_KEY = 'vaultHandle'

export async function saveVaultHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await idbSet(VAULT_HANDLE_KEY, handle)
}

export async function getStoredVaultHandle(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await idbGet<FileSystemDirectoryHandle>(VAULT_HANDLE_KEY)
  return handle ?? null
}

export async function restoreVault(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await getStoredVaultHandle()
  if (!handle) return null
  const opts = { mode: 'readwrite' as const }
  if ((await handle.queryPermission(opts)) === 'granted') {
    return handle
  }
  return null
}
