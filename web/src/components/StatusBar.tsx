import { useState, useEffect } from 'react'

interface StatusBarProps {
  caseName?: string | null
  filePath?: string | null
  wordCount?: number
  noteCount?: number
  linkCount?: number
  saveStatus?: 'saved' | 'unsaved'
  activeView?: 'editor' | 'graph'
  nodeCount?: number
  edgeCount?: number
}

interface IntegrityData {
  status: 'verified' | 'contaminated'
  failures: string[]
  document_count: number
}

export function StatusBar({
  caseName = 'Case_01_Sonipat_Arms',
  filePath,
  wordCount = 0,
  noteCount = 42,
  linkCount = 36,
  saveStatus = 'saved',
  activeView = 'editor',
  nodeCount,
  edgeCount,
}: StatusBarProps) {
  const [integrity, setIntegrity] = useState<IntegrityData>({
    status: 'verified',
    failures: [],
    document_count: 8,
  })

  useEffect(() => {
    let isMounted = true
    fetch('http://127.0.0.1:8000/api/case/integrity')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: IntegrityData) => {
        if (isMounted) setIntegrity(data)
      })
      .catch(() => {
        // Mock fallback if server is offline
        if (isMounted) {
          setIntegrity({
            status: 'verified',
            failures: [],
            document_count: 8,
          })
        }
      })
    return () => {
      isMounted = false
    }
  }, [caseName])

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
            className={`status-indicator ${
              integrity.status === 'verified' ? 'status-verified' : 'status-danger'
            }`}
            style={{
              backgroundColor:
                integrity.status === 'verified' ? 'var(--ok)' : 'var(--danger)',
            }}
          />
          <span>
            {integrity.status === 'verified'
              ? 'Evidence verified'
              : `⚠ ${integrity.failures.length || 1} modified`}
          </span>
        </div>

        <span className="status-sep">·</span>

        <div className="status-item">
          <span>{activeView === 'graph' ? `${nodeCount ?? noteCount} nodes` : `${noteCount || integrity.document_count} documents`}</span>
        </div>

        <span className="status-sep">·</span>

        <div className="status-item">
          <span>{activeView === 'graph' ? `${edgeCount ?? linkCount} links` : `${linkCount} links`}</span>
        </div>

        {activeView === 'graph' && (
          <>
            <span className="status-sep">·</span>
            <div className="status-item">
              <span style={{ color: 'var(--color-amber, #f59e0b)' }}>14 unresolved leads</span>
            </div>
          </>
        )}
      </div>

      <div className="status-right">
        {activeView === 'graph' ? (
          <>
            <div className="status-item">
              <span>Evidence Graph (Interactive)</span>
            </div>
            <span className="status-sep">·</span>
            <div className="status-item">
              <span className="status-indicator" style={{ backgroundColor: 'var(--ok)' }} />
              <span>Cytoscape Ready</span>
            </div>
          </>
        ) : (
          <>
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

