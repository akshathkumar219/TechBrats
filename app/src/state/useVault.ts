import { useState, useEffect, useCallback } from 'react'
import { pickVault, walkVault, readFile, type VaultFile } from '../fs/vault'
import { getStoredVaultHandle, restoreVault, reopenStoredVault } from '../fs/persist'
import { useAutosave } from './useAutosave'

export function useVault() {
  const [vaultHandle, setVaultHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [vaultName, setVaultName] = useState<string | null>(null)
  const [files, setFiles] = useState<VaultFile[]>([])
  const [activeFile, setActiveFile] = useState<VaultFile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reopenCandidate, setReopenCandidate] = useState<FileSystemDirectoryHandle | null>(null)

  const {
    content,
    setContent,
    saveStatus,
    setSaveStatus,
    updateContent,
    flushSave,
  } = useAutosave(activeFile)

  // Boot check: restore if permission granted, or offer Reopen <folder>
  useEffect(() => {
    async function initRestore() {
      try {
        const stored = await getStoredVaultHandle()
        if (!stored) return
        const restored = await restoreVault()
        if (restored) {
          setIsLoading(true)
          const vaultFiles = await walkVault(restored)
          setVaultHandle(restored)
          setVaultName(restored.name)
          setFiles(vaultFiles)
          setIsLoading(false)
        } else {
          setReopenCandidate(stored)
        }
      } catch {
        // Silently ignore boot restore errors
      }
    }
    void initRestore()
  }, [])

  const openVault = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const handle = await pickVault()
      const vaultFiles = await walkVault(handle)
      setVaultHandle(handle)
      setVaultName(handle.name)
      setFiles(vaultFiles)
      setReopenCandidate(null)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to open directory')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reopenVault = useCallback(async () => {
    if (!reopenCandidate) return
    try {
      setIsLoading(true)
      setError(null)
      const handle = await reopenStoredVault(reopenCandidate)
      if (handle) {
        const vaultFiles = await walkVault(handle)
        setVaultHandle(handle)
        setVaultName(handle.name)
        setFiles(vaultFiles)
        setReopenCandidate(null)
      } else {
        setError('Permission not granted to open this folder')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reopen folder')
    } finally {
      setIsLoading(false)
    }
  }, [reopenCandidate])

  const selectFile = useCallback(
    async (path: string) => {
      if (activeFile?.path === path) return
      await flushSave()
      const target = files.find((f) => f.path === path)
      if (!target) return
      try {
        setError(null)
        const text = await readFile(target.handle)
        setActiveFile(target)
        setContent(text)
        setSaveStatus('saved')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to read file')
      }
    },
    [activeFile, files, flushSave, setContent, setSaveStatus]
  )

  return {
    vaultHandle,
    vaultName,
    files,
    activeFile,
    content,
    saveStatus,
    isLoading,
    error,
    reopenCandidateName: reopenCandidate?.name ?? null,
    openVault,
    reopenVault,
    selectFile,
    updateContent,
    flushSave,
  }
}
