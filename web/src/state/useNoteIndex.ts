import { useState, useEffect } from 'react'
import { readFile, type VaultFile } from '../fs/vault'

export function useNoteIndex(
  files: VaultFile[],
  activeFile: VaultFile | null,
  activeContent: string
): Record<string, string> {
  const [contents, setContents] = useState<Record<string, string>>({})

  useEffect(() => {
    let isMounted = true

    async function loadMissing() {
      const missing = files.filter((f) => contents[f.path] === undefined)
      if (missing.length === 0) return

      const updates: Record<string, string> = {}
      for (const file of missing) {
        try {
          const text = await readFile(file)
          updates[file.path] = text
        } catch {
          // If reading fails, store empty string to prevent endless retries
          updates[file.path] = ''
        }
      }

      if (isMounted && Object.keys(updates).length > 0) {
        setContents((prev) => ({ ...prev, ...updates }))
      }
    }

    void loadMissing()

    return () => {
      isMounted = false
    }
  }, [files, contents])

  // Sync active file's live editing content into the cache
  useEffect(() => {
    if (!activeFile) return
    setContents((prev) => {
      if (prev[activeFile.path] === activeContent) return prev
      return { ...prev, [activeFile.path]: activeContent }
    })
  }, [activeFile, activeContent])

  return contents
}
