import { useState, useEffect, useMemo } from 'react'
import { fsSupported } from './fs/vault'
import { useVault } from './state/useVault'
import { useNoteIndex } from './state/useNoteIndex'
import { findBacklinks } from './lib/links'
import { TitleBar } from './components/TitleBar'
import { FileTree } from './components/FileTree'
import { Editor } from './components/Editor'
import { StatusBar } from './components/StatusBar'
import { Backlinks } from './components/Backlinks'
import { PromptModal } from './components/PromptModal'

export function App() {
  const [isPreviewOnly, setIsPreviewOnly] = useState(false)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)

  const {
    vaultName, files, folders, activeFile, content,
    saveStatus, isLoading, error, reopenCandidateName,
    openVault, reopenVault, selectFile, createNewNote,
    createNewFolder, navigateWikiLink, updateContent,
  } = useVault()

  const noteContents = useNoteIndex(files, activeFile, content)
  const backlinks = useMemo(
    () => findBacklinks(activeFile, files, noteContents),
    [activeFile, files, noteContents]
  )

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
          reopenCandidateName={reopenCandidateName}
          onOpenFolder={openVault}
          onReopenVault={reopenVault}
          onNewNote={() => setIsNoteModalOpen(true)}
          onNewFolder={() => setIsFolderModalOpen(true)}
        />

        {/* 2. Left rail (240px) */}
        <FileTree
          files={files}
          folders={folders}
          selectedPath={activeFile?.path ?? null}
          reopenCandidateName={reopenCandidateName}
          onSelectFile={selectFile}
          onReopenVault={reopenVault}
          isLoading={isLoading}
          error={error}
        />

        {/* 3. Centre (flex) - Split view with debounced autosave */}
        <Editor
          content={content}
          activeFile={activeFile}
          files={files}
          isPreviewOnly={isPreviewOnly}
          onChange={updateContent}
          onNavigateWikiLink={navigateWikiLink}
        />

        {/* 4. Right rail (320px) */}
        <Backlinks
          activeFile={activeFile}
          backlinks={backlinks}
          onSelectFile={selectFile}
        />

        {/* 5. Status bar (24px) */}
        <StatusBar
          filePath={activeFile ? activeFile.path : (vaultName ? `${files.length} notes found` : null)}
          wordCount={wordCount}
          saveStatus={saveStatus}
        />
      </div>

      {/* Dialog for New Note */}
      <PromptModal
        isOpen={isNoteModalOpen}
        title="Create New Note"
        placeholder="e.g. Suspects/Vikram Singh"
        hint="Supports nested paths. The .md extension is added automatically."
        confirmLabel="Create Note"
        onConfirm={(path) => void createNewNote(path)}
        onClose={() => setIsNoteModalOpen(false)}
      />

      {/* Dialog for New Folder */}
      <PromptModal
        isOpen={isFolderModalOpen}
        title="Create New Folder"
        placeholder="e.g. Cases/Sonipat Ring"
        confirmLabel="Create Folder"
        onConfirm={(path) => void createNewFolder(path)}
        onClose={() => setIsFolderModalOpen(false)}
      />

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
