import type { VaultFile } from '../fs/vault'
import { PromptModal } from './PromptModal'
import { QuickSwitcher } from './QuickSwitcher'
import { GlobalSearch } from './GlobalSearch'
import { CommandPalette, type WorkbenchCommand } from './CommandPalette'
import { ShortcutsModal } from './ShortcutsModal'
import { SettingsModal } from './SettingsModal'

interface AppModalsProps {
  isCommandPaletteOpen: boolean
  isQuickSwitcherOpen: boolean
  isGlobalSearchOpen: boolean
  isNoteModalOpen: boolean
  isFolderModalOpen: boolean
  isShortcutsOpen?: boolean
  isSettingsOpen?: boolean
  vaultName?: string | null
  commands: WorkbenchCommand[]
  files: VaultFile[]
  noteContents: Record<string, string>
  onSelectFile: (path: string) => void
  onCreateNewNote: (path: string) => void
  onCreateNewFolder: (path: string) => void
  onCloseCommandPalette: () => void
  onCloseQuickSwitcher: () => void
  onCloseGlobalSearch: () => void
  onCloseNoteModal: () => void
  onCloseFolderModal: () => void
  onCloseShortcuts?: () => void
  onCloseSettings?: () => void
}

export function AppModals({
  isCommandPaletteOpen,
  isQuickSwitcherOpen,
  isGlobalSearchOpen,
  isNoteModalOpen,
  isFolderModalOpen,
  isShortcutsOpen = false,
  isSettingsOpen = false,
  vaultName = null,
  commands,
  files,
  noteContents,
  onSelectFile,
  onCreateNewNote,
  onCreateNewFolder,
  onCloseCommandPalette,
  onCloseQuickSwitcher,
  onCloseGlobalSearch,
  onCloseNoteModal,
  onCloseFolderModal,
  onCloseShortcuts,
  onCloseSettings,
}: AppModalsProps) {
  return (
    <>
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        commands={commands}
        onClose={onCloseCommandPalette}
      />
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
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={onCloseShortcuts ?? (() => {})}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        vaultName={vaultName}
        onClose={onCloseSettings ?? (() => {})}
      />
    </>
  )
}
