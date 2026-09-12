import { useState, useEffect, useMemo } from 'react'
import { fsSupported } from './fs/vault'
import { useVault } from './state/useVault'
import { useNoteIndex } from './state/useNoteIndex'
import { FileTree } from './components/FileTree'
import { Editor } from './components/Editor'
import { Workspace } from './components/Workspace'
import { AppModals } from './components/AppModals'

export function App() {
  const [isPreviewOnly, setIsPreviewOnly] = useState(false)
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false)
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const {
    vaultName, files, folders, activeFile, content,
    saveStatus, isLoading, error, reopenCandidateName,
    openVault, reopenVault, selectFile, createNewNote,
    createNewFolder, navigateWikiLink, updateContent,
  } = useVault()

  const noteContents = useNoteIndex(files, activeFile, content)

  const commands = useMemo(
    () => [
      { id: '1', label: 'Create new note', category: 'Note', action: () => setIsNoteModalOpen(true) },
      { id: '2', label: 'Create new folder', category: 'Folder', action: () => setIsFolderModalOpen(true) },
      { id: '3', label: 'Open note (Quick Switcher)...', category: 'Navigation', shortcut: '⌘O', action: () => setIsQuickSwitcherOpen(true) },
      { id: '4', label: 'Search in all notes...', category: 'Search', shortcut: '⌘⇧F', action: () => setIsGlobalSearchOpen(true) },
      { id: '5', label: isPreviewOnly ? 'Exit preview-only view' : 'Toggle live preview only', category: 'View', shortcut: '⌘E', action: () => setIsPreviewOnly((p) => !p) },
      { id: '6', label: 'Open vault folder...', category: 'Vault', action: () => void openVault() },
    ],
    [isPreviewOnly, openVault]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey
      if (isCmdOrCtrl && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        setIsPreviewOnly((prev) => !prev)
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        setIsCommandPaletteOpen((prev) => !prev)
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
      <Workspace
        vaultName={vaultName}
        files={files}
        activeFile={activeFile}
        wordCount={wordCount}
        saveStatus={saveStatus}
        onSelectFile={(path) => void selectFile(path)}
        onOpenVault={() => void openVault()}
        onNewNote={() => setIsNoteModalOpen(true)}
        onNewFolder={() => setIsFolderModalOpen(true)}
        onQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
        onSearch={() => setIsGlobalSearchOpen(true)}
        sidebar={
          <FileTree
            files={files} folders={folders} selectedPath={activeFile?.path ?? null}
            reopenCandidateName={reopenCandidateName}
            noteContents={noteContents}
            onSelectFile={selectFile} onReopenVault={reopenVault}
            isLoading={isLoading} error={error}
          />
        }
        editor={
          <Editor
            content={content} activeFile={activeFile} files={files}
            isPreviewOnly={isPreviewOnly} onChange={updateContent}
            onNavigateWikiLink={navigateWikiLink}
          />
        }
      />

      <AppModals
        isCommandPaletteOpen={isCommandPaletteOpen}
        isQuickSwitcherOpen={isQuickSwitcherOpen}
        isGlobalSearchOpen={isGlobalSearchOpen}
        isNoteModalOpen={isNoteModalOpen}
        isFolderModalOpen={isFolderModalOpen}
        commands={commands}
        files={files}
        noteContents={noteContents}
        onSelectFile={selectFile}
        onCreateNewNote={(path) => void createNewNote(path)}
        onCreateNewFolder={(path) => void createNewFolder(path)}
        onCloseCommandPalette={() => setIsCommandPaletteOpen(false)}
        onCloseQuickSwitcher={() => setIsQuickSwitcherOpen(false)}
        onCloseGlobalSearch={() => setIsGlobalSearchOpen(false)}
        onCloseNoteModal={() => setIsNoteModalOpen(false)}
        onCloseFolderModal={() => setIsFolderModalOpen(false)}
      />

      <div className="window-too-small">
        <h2>SyndicateBrain requires a desktop display</h2>
        <p>SyndicateBrain requires a minimum viewport width of 1280px to display all investigation panes.</p>
      </div>
    </>
  )
}

export default App
