interface TitleBarProps {
  vaultName: string | null
  isLoading: boolean
  onOpenFolder: () => void
}

export function TitleBar({ vaultName, isLoading, onOpenFolder }: TitleBarProps) {
  return (
    <header className="title">
      <div className="vault-title">
        <span>SyndicateBrain</span>
        <span className="vault-badge">
          {vaultName ?? 'No Vault Loaded'}
        </span>
      </div>
      <div className="title-actions">
        <button type="button" className="btn" disabled={!vaultName}>
          + New note
        </button>
        <button type="button" className="btn" disabled={!vaultName}>
          + New folder
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onOpenFolder}
          disabled={isLoading}
        >
          {isLoading ? 'Opening...' : 'Open folder'}
        </button>
      </div>
    </header>
  )
}
