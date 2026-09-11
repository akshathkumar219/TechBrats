import { useState, useEffect, useCallback } from 'react'
import { pickVault, walkVault, readFile, createNote, createFolder, type VaultFile } from '../fs/vault'
import { getStoredVaultHandle, restoreVault, reopenStoredVault } from '../fs/persist'
import { useAutosave } from './useAutosave'

export function useVault() {
  const [vaultHandle, setVaultHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [vaultName, setVaultName] = useState<string | null>(null)
  const [files, setFiles] = useState<VaultFile[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [activeFile, setActiveFile] = useState<VaultFile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reopenCandidate, setReopenCandidate] = useState<FileSystemDirectoryHandle | null>(null)

  const { content, setContent, saveStatus, setSaveStatus, updateContent, flushSave } =
    useAutosave(activeFile)

  const loadVaultHandle = useCallback(async (handle: FileSystemDirectoryHandle) => {
    setIsLoading(true)
    setError(null)
    try {
      const vaultFiles = await walkVault(handle)
      setVaultHandle(handle)
      setVaultName(handle.name)
      setFiles(vaultFiles)
      setFolders([])
      setReopenCandidate(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load vault')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    async function initRestore() {
      try {
        const stored = await getStoredVaultHandle()
        if (!stored) return
        const restored = await restoreVault()
        if (restored) await loadVaultHandle(restored)
        else setReopenCandidate(stored)
      } catch {
        // Silently ignore boot restore errors
      }
    }
    void initRestore()
  }, [loadVaultHandle])

  const openVault = useCallback(async () => {
    try {
      const handle = await pickVault()
      await loadVaultHandle(handle)
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to open directory')
    }
  }, [loadVaultHandle])

  const reopenVault = useCallback(async () => {
    if (!reopenCandidate) return
    try {
      const handle = await reopenStoredVault(reopenCandidate)
      if (handle) await loadVaultHandle(handle)
      else setError('Permission not granted to open this folder')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reopen folder')
    }
  }, [reopenCandidate, loadVaultHandle])

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

  const createNewNote = useCallback(
    async (rawPath: string) => {
      if (!vaultHandle) return
      const trimmed = rawPath.trim().replace(/^\/+/, '')
      if (!trimmed) return
      const notePath = trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`
      const filename = notePath.split('/').pop()!
      try {
        setError(null)
        const handle = await createNote(vaultHandle, notePath)
        const newFile: VaultFile = { path: notePath, name: filename, handle }
        setFiles((prev) => (prev.some((f) => f.path === notePath) ? prev : [...prev, newFile]))
        await selectFile(notePath)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create note')
      }
    },
    [vaultHandle, selectFile]
  )

  const createNewFolder = useCallback(
    async (rawPath: string) => {
      if (!vaultHandle) return
      const folderPath = rawPath.trim().replace(/^\/+|\/+$/g, '')
      if (!folderPath) return
      try {
        setError(null)
        await createFolder(vaultHandle, folderPath)
        setFolders((prev) => (prev.includes(folderPath) ? prev : [...prev, folderPath]))
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create folder')
      }
    },
    [vaultHandle]
  )

  return {
    vaultHandle,
    vaultName,
    files,
    folders,
    activeFile,
    content,
    saveStatus,
    isLoading,
    error,
    reopenCandidateName: reopenCandidate?.name ?? null,
    openVault,
    reopenVault,
    selectFile,
    createNewNote,
    createNewFolder,
    updateContent,
    flushSave,
  }
}
