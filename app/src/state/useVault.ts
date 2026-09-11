import { useState, useRef, useEffect, useCallback } from 'react'
import {
  pickVault,
  walkVault,
  readFile,
  writeFile,
  type VaultFile,
} from '../fs/vault'

export function useVault() {
  const [vaultHandle, setVaultHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [vaultName, setVaultName] = useState<string | null>(null)
  const [files, setFiles] = useState<VaultFile[]>([])
  const [activeFile, setActiveFile] = useState<VaultFile | null>(null)
  const [content, setContent] = useState<string>('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved'>('saved')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timerRef = useRef<number | null>(null)
  const unsavedRef = useRef<{ file: VaultFile; text: string } | null>(null)

  const flushSave = useCallback(async () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (unsavedRef.current) {
      const { file, text } = unsavedRef.current
      unsavedRef.current = null
      try {
        await writeFile(file.handle, text)
        setSaveStatus('saved')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to flush save')
      }
    }
  }, [])

  const scheduleSave = useCallback((file: VaultFile, text: string) => {
    unsavedRef.current = { file, text }
    setSaveStatus('unsaved')
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = window.setTimeout(async () => {
      if (unsavedRef.current) {
        const { file: targetFile, text: targetText } = unsavedRef.current
        unsavedRef.current = null
        timerRef.current = null
        try {
          await writeFile(targetFile.handle, targetText)
          setSaveStatus('saved')
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : 'Autosave failed')
        }
      }
    }, 1000)
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
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to open directory')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const selectFile = useCallback(
    async (path: string) => {
      if (activeFile?.path === path) return

      // Flush any pending unsaved work before switching
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
    [activeFile, files, flushSave]
  )

  const updateContent = useCallback(
    (newContent: string) => {
      setContent(newContent)
      if (activeFile) {
        scheduleSave(activeFile, newContent)
      }
    },
    [activeFile, scheduleSave]
  )

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void flushSave()
      }
    }
    const handleBeforeUnload = () => {
      void flushSave()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      void flushSave()
    }
  }, [flushSave])

  return {
    vaultHandle,
    vaultName,
    files,
    activeFile,
    content,
    saveStatus,
    isLoading,
    error,
    openVault,
    selectFile,
    updateContent,
    flushSave,
  }
}
