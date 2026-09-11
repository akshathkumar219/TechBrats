import { useState, useRef, useEffect, useCallback } from 'react'
import { writeFile, type VaultFile } from '../fs/vault'

export function useAutosave(activeFile: VaultFile | null) {
  const [content, setContent] = useState<string>('')
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved'>('saved')
  const [saveError, setSaveError] = useState<string | null>(null)

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
        setSaveError(err instanceof Error ? err.message : 'Save flush failed')
      }
    }
  }, [])

  const scheduleSave = useCallback((file: VaultFile, text: string) => {
    unsavedRef.current = { file, text }
    setSaveStatus('unsaved')
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(async () => {
      if (unsavedRef.current) {
        const { file: targetFile, text: targetText } = unsavedRef.current
        unsavedRef.current = null
        timerRef.current = null
        try {
          await writeFile(targetFile.handle, targetText)
          setSaveStatus('saved')
        } catch (err: unknown) {
          setSaveError(err instanceof Error ? err.message : 'Autosave failed')
        }
      }
    }, 1000)
  }, [])

  const updateContent = useCallback(
    (newContent: string) => {
      setContent(newContent)
      if (activeFile) scheduleSave(activeFile, newContent)
    },
    [activeFile, scheduleSave]
  )

  useEffect(() => {
    const onFlush = () => void flushSave()
    document.addEventListener('visibilitychange', onFlush)
    window.addEventListener('beforeunload', onFlush)
    return () => {
      document.removeEventListener('visibilitychange', onFlush)
      window.removeEventListener('beforeunload', onFlush)
      void flushSave()
    }
  }, [flushSave])

  return {
    content,
    setContent,
    saveStatus,
    setSaveStatus,
    saveError,
    updateContent,
    flushSave,
  }
}
