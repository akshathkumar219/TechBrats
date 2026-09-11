import type { VaultFile } from '../fs/vault'
import { PromptModal } from './PromptModal'
import { QuickSwitcher } from './QuickSwitcher'
import { GlobalSearch } from './GlobalSearch'

interface AppModalsProps {
  isQuickSwitcherOpen: boolean
  isGlobalSearchOpen: boolean
  isNoteModalOpen: boolean
  isFolderModalOpen: boolean
  files: VaultFile[]
  noteContents: Record<string, string>
  onSelectFile: (path: string) => void
  onCreateNewNote: (path: string) => void
  onCreateNewFolder: (path: string) => void
  onCloseQuickSwitcher: () => void
  onCloseGlobalSearch: () => void
  onCloseNoteModal: () => void
  onCloseFolderModal: () => void
}

export function AppModals({
  isQuickSwitcherOpen,
  isGlobalSearchOpen,
  isNoteModalOpen,
  isFolderModalOpen,
  files,
  noteContents,
  onSelectFile,
  onCreateNewNote,
  onCreateNewFolder,
  onCloseQuickSwitcher,
  onCloseGlobalSearch,
  onCloseNoteModal,
  onCloseFolderModal,
}: AppModalsProps) {
  return (
    <>
      <QuickSwitcher
        isOpen={isQuickSwitcherOpen}
        files={files}
        onSelectFile={onSelectFile}
        onClose={onCloseQuickSwitcher}
      />
      <GlobalSearch
        isOpen={isGlobalSearchOpen}
        files={files}
        noteContents={noteContents}
        onSelectFile={onSelectFile}
        onClose={onCloseGlobalSearch}
      />
      <PromptModal
        isOpen={isNoteModalOpen}
        title="Create New Note"
        placeholder="e.g. Suspects/Vikram Singh"
        hint="Supports nested paths. The .md extension is added automatically."
        confirmLabel="Create Note"
        onConfirm={(path) => void onCreateNewNote(path)}
        onClose={onCloseNoteModal}
      />
      <PromptModal
        isOpen={isFolderModalOpen}
        title="Create New Folder"
        placeholder="e.g. Cases/Sonipat Ring"
        confirmLabel="Create Folder"
        onConfirm={(path) => void onCreateNewFolder(path)}
        onClose={onCloseFolderModal}
      />
    </>
  )
}
