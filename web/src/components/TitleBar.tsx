import { AnalyseButton, type AnalysisResult } from './AnalyseButton'

export type ActiveView = 'editor' | 'graph'

export interface TitleBarProps {
  vaultName: string | null
  caseId?: string
  isLoading?: boolean
  reopenCandidateName?: string | null
  activeView?: ActiveView
  onViewChange?: (view: ActiveView) => void
  onOpenFolder?: () => void
  onReopenVault?: () => void
  onNewNote?: () => void
  onNewFolder?: () => void
  onAnalysisComplete?: (result: AnalysisResult) => void
}

const TITLE_CSS = `
.title {
  flex: 0 0 40px;
  height: 40px;
  background-color: var(--bg-base);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--s3);
  user-select: none;
  box-sizing: border-box;
  z-index: 10;
}

.vault-title {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--s2);
}

.vault-badge {
  font-size: var(--fs-xs);
  background-color: var(--accent-bg);
  color: var(--accent);
  padding: 2px var(--s1);
  border-radius: var(--r-sm);
}

.title-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-view-switcher {
  display: inline-flex;
  align-items: center;
  background: var(--bg-inset);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: 2px;
  gap: 2px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
}

.title-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 12px;
  font-family: var(--font-ui);
  font-size: var(--fs-sm);
  font-weight: 500;
  line-height: 1.3;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: all var(--t-fast);
  outline: none;
}

.title-toggle-btn:hover {
  background: var(--bg-overlay);
  color: var(--text-primary);
}

.title-toggle-btn.is-active {
  background: var(--bg-surface-elevated, var(--bg-overlay));
  color: var(--accent);
  font-weight: 600;
  border-color: var(--border-strong);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

.title-toggle-btn .toggle-indicator {
  display: inline-block;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--accent);
  box-shadow: 0 0 5px var(--accent);
}

.title-toggle-btn:focus-visible {
  border-color: var(--border-focus);
}

.title-actions {
  display: flex;
  align-items: center;
  gap: var(--s2);
}

.title .btn {
  background-color: var(--bg-raised);
  color: var(--text-body);
  border: 1px solid var(--border);
  border-radius: var(--r-sm);
  padding: var(--s1) var(--s2);
  font-family: var(--font-ui);
  font-size: var(--fs-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--s1);
  transition: all var(--t-fast);
}

.title .btn:hover:not(:disabled) {
  background-color: var(--bg-overlay);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.title .btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.title .btn-primary {
  background-color: var(--accent);
  color: var(--text-inverse);
  border-color: var(--accent);
  font-weight: 500;
}

.title .btn-primary:hover:not(:disabled) {
  background-color: var(--border-focus);
  color: var(--text-inverse);
  border-color: var(--border-focus);
}
`

export function TitleBar({
  vaultName,
  caseId,
  isLoading = false,
  reopenCandidateName,
  activeView = 'editor',
  onViewChange,
  onOpenFolder,
  onReopenVault,
  onNewNote,
  onNewFolder,
  onAnalysisComplete,
}: TitleBarProps) {
  return (
    <header className="title">
      <style>{TITLE_CSS}</style>
      <div className="vault-title">
        <span>SyndicateBrain</span>
        <span className="vault-badge">
          {vaultName ?? 'No Vault Loaded'}
        </span>
      </div>

      <div className="title-center">
        <div className="title-view-switcher" role="tablist" aria-label="Workbench View Switcher">
          <button
            type="button"
            id="btn-view-editor"
            role="tab"
            aria-selected={activeView === 'editor'}
            aria-label="Editor View (Notes & Statements)"
            className={`title-toggle-btn${activeView === 'editor' ? ' is-active' : ''}`}
            onClick={() => onViewChange?.('editor')}
            title="Switch to Editor View (Notes & Statements) · ⌘G"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span className="toggle-label">Editor</span>
            {activeView === 'editor' && <span className="toggle-indicator" aria-hidden="true" />}
          </button>

          <button
            type="button"
            id="btn-view-graph"
            role="tab"
            aria-selected={activeView === 'graph'}
            aria-label="Evidence Graph Canvas"
            className={`title-toggle-btn${activeView === 'graph' ? ' is-active' : ''}`}
            onClick={() => onViewChange?.('graph')}
            title="Switch to Evidence Graph Canvas · ⌘G"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="3" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="12" cy="18" r="3" />
              <line x1="8.5" y1="7.5" x2="15.5" y2="7.5" />
              <line x1="7.5" y1="8.5" x2="10.5" y2="15.5" />
              <line x1="16.5" y1="8.5" x2="13.5" y2="15.5" />
            </svg>
            <span className="toggle-label">Graph</span>
            {activeView === 'graph' && <span className="toggle-indicator" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div className="title-actions">
        <AnalyseButton
          vaultName={vaultName}
          caseId={caseId || vaultName || 'Case_01_Sonipat_Arms'}
          onAnalysisComplete={onAnalysisComplete}
        />
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

