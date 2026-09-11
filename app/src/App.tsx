import { useState, useEffect, useMemo } from 'react'
import { fsSupported, pickVault, walkVault, readFile, type VaultFile } from './fs/vault'
import { TitleBar } from './components/TitleBar'
import { FileTree } from './components/FileTree'
import { Editor } from './components/Editor'
import { StatusBar } from './components/StatusBar'

export function App() {
  const [isPreviewOnly, setIsPreviewOnly] = useState(false)
  const [vaultName, setVaultName] = useState<string | null>(null)
  const [files, setFiles] = useState<VaultFile[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [activeFile, setActiveFile] = useState<VaultFile | null>(null)
  const [content, setContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        setIsPreviewOnly((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleOpenFolder = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const handle = await pickVault()
      const vaultFiles = await walkVault(handle)
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
  }

  const handleSelectFile = async (path: string) => {
    const file = files.find((f) => f.path === path)
    if (!file) return
    try {
      setError(null)
      const text = await readFile(file.handle)
      setActiveFile(file)
      setSelectedPath(file.path)
      setContent(text)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to read file')
    }
  }

  const wordCount = useMemo(() => {
    const trimmed = content.trim()
    return trimmed ? trimmed.split(/\s+/).length : 0
  }, [content])

  if (!fsSupported) {
    return (
      <div className="browser-unsupported">
        <h2>Chrome or Edge Required</h2>
        <p>
          SyndicateBrain relies on the File System Access API to read and write notes directly on disk.
          This feature is currently supported in Google Chrome and Microsoft Edge.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="app">
        {/* 1. Title bar (40px) */}
        <TitleBar
          vaultName={vaultName}
          isLoading={isLoading}
          onOpenFolder={handleOpenFolder}
        />

        {/* 2. Left rail (240px) */}
        <FileTree
          files={files}
          selectedPath={selectedPath}
          onSelectFile={handleSelectFile}
          isLoading={isLoading}
          error={error}
        />

        {/* 3. Centre (flex) - Split view */}
        <Editor
          content={content}
          activeFile={activeFile}
          isPreviewOnly={isPreviewOnly}
          onChange={setContent}
        />

        {/* 4. Right rail (320px) */}
        <aside className="right">
          <div className="panel-header">
            <span>Backlinks</span>
          </div>
          <div className="backlink-section">
            <div className="backlink-section-title">
              <span>Linked Mentions</span>
              <span>0</span>
            </div>
          </div>
          <div className="backlink-section">
            <div className="backlink-section-title">
              <span>Unlinked Mentions</span>
              <span>0</span>
            </div>
          </div>
          <div className="placeholder-content">
            <p>Select a note to inspect incoming mentions.</p>
          </div>
        </aside>

        {/* 5. Status bar (24px) */}
        <StatusBar
          filePath={activeFile ? activeFile.path : (vaultName ? `${files.length} notes found` : null)}
          wordCount={wordCount}
          saveStatus="saved"
        />
      </div>

      {/* Window too small guard below 1280px */}
      <div className="window-too-small">
        <h2>Desktop Window Too Small</h2>
        <p>
          SyndicateBrain requires a minimum viewport width of 1280px to display all investigation panes. Please expand your browser window.
        </p>
      </div>
    </>
  )
}

export default App


