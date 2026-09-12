import { useState, useEffect } from 'react'

interface StatusBarProps {
  caseName?: string | null
  filePath?: string | null
  wordCount?: number
  noteCount?: number
  linkCount?: number
  saveStatus?: 'saved' | 'unsaved'
  activeView?: 'editor' | 'graph'
  editorMode?: 'live-preview' | 'source' | 'reading' | 'split'
  onToggleEditorMode?: () => void
  nodeCount?: number
  edgeCount?: number
}

// noteCount/linkCount are intentionally optional with no numeric default —
// this bar is a trust surface (docs/design-system.md §3); it renders "—"
// rather than a plausible-looking invented count when data isn't available yet.

interface IntegrityData {
  status: 'verified' | 'contaminated' | 'unknown'
  failures: string[]
  document_count: number | null
}

const INTEGRITY_UNKNOWN: IntegrityData = {
  status: 'unknown',
  failures: [],
  document_count: null,
}

export function StatusBar({
  caseName = 'Case_01_Sonipat_Arms',
  filePath,
  wordCount = 0,
  noteCount,
  linkCount,
  saveStatus = 'saved',
  activeView = 'editor',
  editorMode,
  onToggleEditorMode,
  nodeCount,
  edgeCount,
}: StatusBarProps) {
  // The status bar is a trust surface (docs/design-system.md §3) — it must show
  // an honest "unknown" state while unverified, never a plausible-looking number
  // that didn't come from the backend.
  const [integrity, setIntegrity] = useState<IntegrityData>(INTEGRITY_UNKNOWN)

  useEffect(() => {
    let isMounted = true
    setIntegrity(INTEGRITY_UNKNOWN)
    fetch('http://127.0.0.1:8000/api/case/integrity')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: IntegrityData) => {
        if (isMounted) setIntegrity(data)
      })
      .catch(() => {
        if (isMounted) setIntegrity(INTEGRITY_UNKNOWN)
      })
    return () => {
      isMounted = false
    }
  }, [caseName])

  const noteDisplay = activeView === 'graph' ? nodeCount : noteCount ?? integrity.document_count ?? undefined
  const linkDisplay = activeView === 'graph' ? edgeCount : linkCount

  return (
    <footer className="status">
      <div className="status-left">
        <div className="status-item status-case-item">
          <span className="status-case-icon">🗂️</span>
          <span className="status-case-title">{caseName ?? 'Case_01_Sonipat_Arms'}</span>
        </div>

        <span className="status-sep">·</span>

        <div className="status-item status-integrity-item">
          <span
            className={`status-indicator status-${integrity.status}`}
          />
          <span>
            {integrity.status === 'verified'
              ? 'Evidence verified'
              : integrity.status === 'contaminated'
                ? `⚠ ${integrity.failures.length || 1} modified`
                : 'Integrity unknown'}
          </span>
        </div>

        <span className="status-sep">·</span>

        <div className="status-item">
          <span>{noteDisplay != null ? `${noteDisplay} ${activeView === 'graph' ? 'nodes' : 'documents'}` : '—'}</span>
        </div>

        <span className="status-sep">·</span>

        <div className="status-item">
          <span>{linkDisplay != null ? `${linkDisplay} links` : '—'}</span>
        </div>
      </div>

      <div className="status-right">
        {activeView === 'graph' ? (
          <>
            <div className="status-item">
              <span>Evidence Graph (Interactive)</span>
            </div>
            <span className="status-sep">·</span>
            <div className="status-item">
              <span className="status-indicator status-ok" />
              <span>Graph Ready</span>
            </div>
          </>
        ) : (
          <>
            {editorMode && (
              <>
                <div className="status-item">
                  <button
                    type="button"
                    className="status-mode-btn"
                    title="Click to cycle editor mode (⌘E)"
                    onClick={onToggleEditorMode}
                  >
                    <span>
                      {editorMode === 'live-preview'
                        ? '✦ Live Preview'
                        : editorMode === 'source'
                        ? '</> Source Mode'
                        : editorMode === 'reading'
                        ? '📖 Reading View'
                        : 'Split View'}
                    </span>
                  </button>
                </div>
                <span className="status-sep">·</span>
              </>
            )}

            {filePath && (
              <>
                <div className="status-item">
                  <span>{filePath}</span>
                </div>
                <span className="status-sep">·</span>
              </>
            )}

            <div className="status-item">
              <span>{wordCount} words</span>
            </div>

            <span className="status-sep">·</span>

            <div className="status-item">
              <span
                className={`status-indicator ${
                  saveStatus === 'unsaved' ? 'unsaved' : ''
                }`}
                style={{
                  backgroundColor:
                    saveStatus === 'unsaved' ? 'var(--accent)' : 'var(--ok)',
                }}
              />
              <span>{saveStatus}</span>
            </div>
          </>
        )}
      </div>
    </footer>
  )
}

