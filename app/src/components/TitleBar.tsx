interface TitleBarProps {
  vaultName: string | null
  isLoading: boolean
  reopenCandidateName?: string | null
  onOpenFolder: () => void
  onReopenVault?: () => void
  onNewNote?: () => void
  onNewFolder?: () => void
}

export function TitleBar({
  vaultName,
  isLoading,
  reopenCandidateName,
  onOpenFolder,
  onReopenVault,
  onNewNote,
  onNewFolder,
}: TitleBarProps) {
  return (
    <header className="title">
      <div className="vault-title">
        <span>SyndicateBrain</span>
        <span className="vault-badge">
          {vaultName ?? 'No Vault Loaded'}
        </span>
      </div>
      <div className="title-actions">
        <button
          type="button"
          className="btn"
          disabled={!vaultName}
          onClick={onNewNote}
          title="Create new note"
        >
          + New note
        </button>
        <button
          type="button"
          className="btn"
          disabled={!vaultName}
          onClick={onNewFolder}
          title="Create new folder"
        >
          + New folder
        </button>
        {reopenCandidateName && !vaultName && onReopenVault && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onReopenVault}
            disabled={isLoading}
            title={`Restore permission to folder: ${reopenCandidateName}`}
          >
            {isLoading ? 'Reopening...' : `Reopen "${reopenCandidateName}"`}
          </button>
        )}
        <button
          type="button"
          className={reopenCandidateName && !vaultName ? 'btn' : 'btn btn-primary'}
          onClick={onOpenFolder}
          disabled={isLoading}
        >
          {isLoading && !reopenCandidateName ? 'Opening...' : 'Open folder'}
        </button>
      </div>
    </header>
  )
}

