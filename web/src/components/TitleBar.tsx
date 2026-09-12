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

export function TitleBar({
  vaultName,
  caseId,
  activeView = 'editor',
  onViewChange,
  onAnalysisComplete,
}: TitleBarProps) {
  return (
    <header className="title">
      <div className="vault-title">
        {vaultName && <span className="vault-badge">{vaultName}</span>}
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
      </div>
    </header>
  )
}

