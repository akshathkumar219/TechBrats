import { useState, useEffect } from 'react'
import { fsSupported, pickVault, walkVault, type VaultFile } from './fs/vault'
import { TitleBar } from './components/TitleBar'
import { FileTree } from './components/FileTree'
import { StatusBar } from './components/StatusBar'

export function App() {
  const [isPreviewOnly, setIsPreviewOnly] = useState(false)
  const [vaultName, setVaultName] = useState<string | null>(null)
  const [files, setFiles] = useState<VaultFile[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
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
          onSelectFile={(path) => setSelectedPath(path)}
          isLoading={isLoading}
          error={error}
        />

        {/* 3. Centre (flex) - Split view */}
        <main className="center">
          <div className={`center-split ${isPreviewOnly ? 'preview-only' : ''}`}>
            <section className="editor-pane">
              <div className="pane-inner">
                <textarea
                  className="editor-textarea"
                  placeholder="Select a note from the left tree or create a new note..."
                  readOnly
                />
              </div>
            </section>
            <section className="preview-pane">
              <div className="pane-inner">
                <div className="preview-content">
                  <h1 className="note-h1">Investigation Workbench</h1>
                  <p className="note-body">
                    Markdown preview will render here. Toggle between raw and preview-only using <kbd>Cmd+E</kbd>.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>

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
          filePath={selectedPath ?? (vaultName ? `${files.length} notes found` : null)}
          wordCount={0}
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


