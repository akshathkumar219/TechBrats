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
import { AppModals } from './components/AppModals'

export function App() {
  const [isPreviewOnly, setIsPreviewOnly] = useState(false)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false)
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false)

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
      const isCmdOrCtrl = e.metaKey || e.ctrlKey
      if (isCmdOrCtrl && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        setIsPreviewOnly((prev) => !prev)
      } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        setIsGlobalSearchOpen((prev) => !prev)
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'o') {
        e.preventDefault()
        setIsQuickSwitcherOpen((prev) => !prev)
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
        <p>SyndicateBrain relies on the File System Access API supported in Google Chrome and Microsoft Edge.</p>
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

      <AppModals
        isQuickSwitcherOpen={isQuickSwitcherOpen}
        isGlobalSearchOpen={isGlobalSearchOpen}
        isNoteModalOpen={isNoteModalOpen}
        isFolderModalOpen={isFolderModalOpen}
        files={files}
        noteContents={noteContents}
        onSelectFile={selectFile}
        onCreateNewNote={(path) => void createNewNote(path)}
        onCreateNewFolder={(path) => void createNewFolder(path)}
        onCloseQuickSwitcher={() => setIsQuickSwitcherOpen(false)}
        onCloseGlobalSearch={() => setIsGlobalSearchOpen(false)}
        onCloseNoteModal={() => setIsNoteModalOpen(false)}
        onCloseFolderModal={() => setIsFolderModalOpen(false)}
      />

      <div className="window-too-small">
        <h2>Desktop Window Too Small</h2>
        <p>SyndicateBrain requires a minimum viewport width of 1280px to display all investigation panes.</p>
      </div>
    </>
  )
}

export default App
