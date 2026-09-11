import { useState, useEffect, useMemo } from 'react'
import { fsSupported } from './fs/vault'
import { useVault } from './state/useVault'
import { TitleBar } from './components/TitleBar'
import { FileTree } from './components/FileTree'
import { Editor } from './components/Editor'
import { StatusBar } from './components/StatusBar'

export function App() {
  const [isPreviewOnly, setIsPreviewOnly] = useState(false)

  const {
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
  } = useVault()

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
          onOpenFolder={openVault}
        />

        {/* 2. Left rail (240px) */}
        <FileTree
          files={files}
          selectedPath={activeFile?.path ?? null}
          onSelectFile={selectFile}
          isLoading={isLoading}
          error={error}
        />

        {/* 3. Centre (flex) - Split view with debounced autosave */}
        <Editor
          content={content}
          activeFile={activeFile}
          isPreviewOnly={isPreviewOnly}
          onChange={updateContent}
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
          saveStatus={saveStatus}
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


