import React, { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  AnalysisResult,
  Proposal,
  FileUpdateProposal,
  ProposalPanelProps,
  Citation,
} from './types'
import { ProposalCard } from './ProposalCard'
import { CitationChip } from './CitationChip'
import { DEFAULT_MOCK_ANALYSIS_RESULT } from './mockData'
import { EmptyState, LoadingSkeleton } from '../states'
import { openFileAt } from '../workspace/navigation'
import './proposals.css'

export function ProposalPanel({
  analysisResult,
  caseId = 'Case_01_Sonipat_Arms',
  vaultPath,
  isLoading: externalLoading = false,
  onAcceptProposal,
  onRejectProposal,
  onOpenCitation,
  onOpenFile,
  onRefresh,
  className = '',
}: ProposalPanelProps) {
  const [prevAnalysisResult, setPrevAnalysisResult] = useState<AnalysisResult | null | undefined>(analysisResult)
  const [internalResult, setInternalResult] = useState<AnalysisResult>(() => {
    return analysisResult || DEFAULT_MOCK_ANALYSIS_RESULT
  })
  const [proposals, setProposals] = useState<Proposal[]>(() => {
    return analysisResult?.new_connections || DEFAULT_MOCK_ANALYSIS_RESULT.new_connections || []
  })
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted' | 'all'>('pending')
  const [isFetching, setIsFetching] = useState(false)

  // Sync state when props change during render (standard React pattern without effect cascade)
  if (analysisResult !== prevAnalysisResult) {
    setPrevAnalysisResult(analysisResult)
    if (analysisResult) {
      setInternalResult(analysisResult)
      if (analysisResult.new_connections) {
        setProposals(analysisResult.new_connections)
      }
    }
  }

  // Listen to external workbench events (e.g. from AnalyseButton in the titlebar)
  useEffect(() => {
    const handleCaseAnalysed = (e: Event) => {
      const customEvent = e as CustomEvent<AnalysisResult>
      if (customEvent.detail) {
        setInternalResult(customEvent.detail)
        if (customEvent.detail.new_connections) {
          setProposals(customEvent.detail.new_connections)
        }
      }
    }

    window.addEventListener('syndicate-brain:case-analysed', handleCaseAnalysed)
    return () => {
      window.removeEventListener('syndicate-brain:case-analysed', handleCaseAnalysed)
    }
  }, [])

  // Allow fetching directly from POST /api/case/analyse
  const fetchAnalysis = useCallback(async () => {
    setIsFetching(true)
    try {
      const res = await fetch('/api/case/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          case_path: vaultPath,
        }),
      })

      if (res.ok) {
        const data: AnalysisResult = await res.json()
        setInternalResult(data)
        if (data.new_connections) {
          setProposals(data.new_connections)
        }
        onRefresh?.()
      } else {
        console.warn('[ProposalPanel] /api/case/analyse returned non-200, using mock fallback')
        setInternalResult(DEFAULT_MOCK_ANALYSIS_RESULT)
        setProposals(DEFAULT_MOCK_ANALYSIS_RESULT.new_connections || [])
      }
    } catch (err) {
      console.warn('[ProposalPanel] Error fetching analysis, falling back to mock:', err)
      setInternalResult(DEFAULT_MOCK_ANALYSIS_RESULT)
      setProposals(DEFAULT_MOCK_ANALYSIS_RESULT.new_connections || [])
    } finally {
      setIsFetching(false)
    }
  }, [caseId, vaultPath, onRefresh])

  // Accept proposal handler
  const handleAccept = useCallback(
    async (id: string) => {
      try {
        if (onAcceptProposal) {
          await onAcceptProposal(id)
        } else {
          await fetch(`/api/proposal/${encodeURIComponent(id)}/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }).catch((err) => {
            console.warn('[ProposalPanel] Accept endpoint call:', err)
          })
        }
      } finally {
        setProposals((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: 'accepted',
                  decided_at: new Date().toISOString(),
                }
              : p
          )
        )

        window.dispatchEvent(
          new CustomEvent('syndicate-brain:proposal-accepted', {
            detail: { id },
          })
        )
      }
    },
    [onAcceptProposal]
  )

  // Reject proposal handler
  const handleReject = useCallback(
    async (id: string) => {
      try {
        if (onRejectProposal) {
          await onRejectProposal(id)
        } else {
          await fetch(`/api/proposal/${encodeURIComponent(id)}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }).catch((err) => {
            console.warn('[ProposalPanel] Reject endpoint call:', err)
          })
        }
      } finally {
        setProposals((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: 'rejected',
                  decided_at: new Date().toISOString(),
                }
              : p
          )
        )

        window.dispatchEvent(
          new CustomEvent('syndicate-brain:proposal-rejected', {
            detail: { id },
          })
        )
      }
    },
    [onRejectProposal]
  )

  // Open note file
  const handleOpenFile = useCallback(
    (filePath: string) => {
      onOpenFile?.(filePath)
      openFileAt(filePath, 1)
    },
    [onOpenFile]
  )

  // Derived counts
  const pendingProposals = useMemo(
    () => proposals.filter((p) => !p.status || p.status === 'proposed'),
    [proposals]
  )
  const acceptedProposals = useMemo(
    () => proposals.filter((p) => p.status === 'accepted'),
    [proposals]
  )
  const rejectedProposals = useMemo(
    () => proposals.filter((p) => p.status === 'rejected'),
    [proposals]
  )

  const filesToUpdate: FileUpdateProposal[] = useMemo(
    () => internalResult.files_to_update || [],
    [internalResult]
  )

  // Helper: parse summary prose and render inline clickable citation chips
  const renderProseWithCitations = (
    text: string,
    citationHandler?: (c: Citation) => void
  ) => {
    // Matches ^[DOC_ID locator] e.g. ^[DOC_CDR_9812345678 row:48219] or ^[DOC_FIR_0142 p:3 l:14]
    const citationRegex = /\^\[([^\s\]]+)\s+([^\]]+)\]/g
    const elements: (string | React.ReactElement)[] = []
    let lastIdx = 0
    let match: RegExpExecArray | null

    while ((match = citationRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        elements.push(text.slice(lastIdx, match.index))
      }
      const sourceDocId = match[1]
      const locator = match[2]
      const citation: Citation = {
        source_doc_id: sourceDocId,
        locator: locator,
      }
      elements.push(
        <CitationChip
          key={`chip-${match.index}`}
          citation={citation}
          inline
          onClick={citationHandler}
        />
      )
      lastIdx = citationRegex.lastIndex
    }

    if (lastIdx < text.length) {
      elements.push(text.slice(lastIdx))
    }

    return elements
  }

  const isLoading = externalLoading || isFetching

  return (
    <div className={`proposal-panel ${className}`} role="region" aria-label="AI Proposals and Analysis">
      {/* Header Banner & Counter */}
      <header className="proposal-panel-header">
        <div className="proposal-panel-titlebar">
          <div className="proposal-panel-title-group">
            <h2 className="proposal-panel-title">AI Proposals & Review</h2>
            <span className="proposal-case-tag">{internalResult.case_id || caseId}</span>
          </div>

          <button
            type="button"
            className="proposal-btn-reanalyse"
            onClick={fetchAnalysis}
            disabled={isLoading}
            title="Re-run analysis pipeline across 00_Raw_Inputs/ and notes"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            <span>{isLoading ? 'Analysing...' : 'Re-analyse'}</span>
          </button>
        </div>

        {/* Counter Banner: Total proposed, accepted, rejected, dropped */}
        <div className="proposal-metrics-banner" aria-label="Proposal metrics count">
          <span className="proposal-metric-badge is-proposed" title="Active proposals awaiting review">
            <span>●</span>
            <span>{pendingProposals.length} Proposed</span>
          </span>

          <span className="proposal-metric-badge is-accepted" title="AI links accepted into case notes">
            <span>✓</span>
            <span>{acceptedProposals.length} Accepted</span>
          </span>

          <span className="proposal-metric-badge is-rejected" title="Proposals rejected and logged to decisions.jsonl">
            <span>✕</span>
            <span>{rejectedProposals.length} Rejected</span>
          </span>

          {(internalResult.dropped_proposals_count ?? 0) > 0 && (
            <span
              className="proposal-metric-badge is-dropped"
              title="Proposals dropped by Law 4 Citation Validator due to unresolvable sources"
            >
              <span>⚖</span>
              <span>{internalResult.dropped_proposals_count} Dropped (Law 4)</span>
            </span>
          )}
        </div>

        {/* Navigation / Filter Tabs */}
        <nav className="proposal-nav-tabs" aria-label="Proposal views">
          <button
            type="button"
            className={`proposal-nav-tab ${activeTab === 'pending' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Active Proposals ({pendingProposals.length})
          </button>
          <button
            type="button"
            className={`proposal-nav-tab ${activeTab === 'accepted' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('accepted')}
          >
            Accepted AI Links ({acceptedProposals.length})
          </button>
          <button
            type="button"
            className={`proposal-nav-tab ${activeTab === 'all' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            All Review History ({proposals.length})
          </button>
        </nav>
      </header>

      {/* Main Content: Three distinct sections */}
      <main className="proposal-panel-body">
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)', padding: 'var(--s3)' }}>
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="card" />
          </div>
        ) : proposals.length === 0 ? (
          <EmptyState
            headline="No proposals generated"
            body="Run 'Analyse case' to detect candidate connections from evidentiary records."
            action={{ label: 'Analyse case', onClick: fetchAnalysis }}
          />
        ) : (
          <>
            {activeTab === 'pending' && (
              <>
                {/* SECTION 1: NEW CONNECTIONS */}
            <section className="proposal-section" aria-labelledby="heading-new-connections">
              <div className="proposal-section-head">
                <div className="proposal-section-title-wrap">
                  <h3 id="heading-new-connections" className="proposal-section-title">
                    1. New Connections
                  </h3>
                  <span className="proposal-section-badge">{pendingProposals.length}</span>
                </div>
                <span className="proposal-section-subtitle">
                  AI-proposed links awaiting human verification (Law 2)
                </span>
              </div>

              {pendingProposals.length === 0 ? (
                <EmptyState
                  headline="All proposed connections reviewed"
                  body="No pending connections. Accepted links have been written to markdown notes under Law 3."
                />
              ) : (
                <div className="proposal-cards-list">
                  {pendingProposals.map((item) => (
                    <ProposalCard
                      key={item.id}
                      proposal={item}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onOpenCitation={onOpenCitation}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* SECTION 2: FILES TO UPDATE */}
            <section className="proposal-section" aria-labelledby="heading-files-to-update">
              <div className="proposal-section-head">
                <div className="proposal-section-title-wrap">
                  <h3 id="heading-files-to-update" className="proposal-section-title">
                    2. Files to Update
                  </h3>
                  <span className="proposal-section-badge">{filesToUpdate.length}</span>
                </div>
                <span className="proposal-section-subtitle">Read-only suggestions</span>
              </div>

              {/* Law 2 & Permission Boundary Notice */}
              <div className="proposal-law2-banner" role="note">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <strong>Law 2 &amp; Permission Boundary:</strong> The AI proposes updates but never modifies note
                  bodies. Review these suggestions and apply them manually to your case notes.
                </div>
              </div>

              {filesToUpdate.length === 0 ? (
                <EmptyState
                  compact
                  headline="No note updates suggested"
                  body="All existing notes are consistent with recent evidence."
                />
              ) : (
                <div className="proposal-updates-list">
                  {filesToUpdate.map((item, idx) => (
                    <article key={idx} className="proposal-update-card">
                      <div className="proposal-update-header">
                        <button
                          type="button"
                          className="proposal-update-target"
                          onClick={() => handleOpenFile(item.file_path)}
                          title={`Open note ${item.file_path}`}
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
                          </svg>
                          <span>{item.file_path}</span>
                        </button>
                        <span className="proposal-readonly-badge">READ-ONLY</span>
                      </div>

                      <p className="proposal-update-reason">{item.reason}</p>

                      <div className="proposal-additions-box">
                        <span className="proposal-additions-title">Suggested additions to note:</span>
                        <ul className="proposal-additions-list">
                          {item.suggested_additions.map((addition, aIdx) => (
                            <li key={aIdx} className="proposal-addition-item">
                              {addition}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {item.citation && (
                        <div className="proposal-update-footer">
                          <span className="proposal-provenance-label">PROVENANCE</span>
                          <CitationChip citation={item.citation} onClick={onOpenCitation} />
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* SECTION 3: SUMMARY */}
            <section className="proposal-section" aria-labelledby="heading-summary">
              <div className="proposal-section-head">
                <div className="proposal-section-title-wrap">
                  <h3 id="heading-summary" className="proposal-section-title">
                    3. Summary
                  </h3>
                  <span className="proposal-section-badge">Synthesis</span>
                </div>
                <span className="proposal-section-subtitle">Plain prose analysis with inline citations</span>
              </div>

              <div className="proposal-summary-card">
                <div className="proposal-summary-prose">
                  {renderProseWithCitations(internalResult.summary, onOpenCitation)}
                </div>
                {internalResult.analyzed_at && (
                  <span className="proposal-summary-timestamp">
                    Analysis generated: {new Date(internalResult.analyzed_at).toLocaleString()}
                  </span>
                )}
              </div>
            </section>
          </>
        )}

        {/* View Tab: Accepted AI Links */}
        {activeTab === 'accepted' && (
          <section className="proposal-section" aria-label="Accepted AI links">
            <div className="proposal-section-head">
              <div className="proposal-section-title-wrap">
                <h3 className="proposal-section-title">Accepted AI-Added Links</h3>
                <span className="proposal-section-badge">{acceptedProposals.length}</span>
              </div>
              <span className="proposal-section-subtitle">
                Written into note `## Links` sections with &lt;!-- ai:prop_id accepted --&gt;
              </span>
            </div>

            {acceptedProposals.length === 0 ? (
              <EmptyState
                headline="No accepted AI links yet"
                body="Proposals accepted from the Active tab will appear here with permanent provenance records."
              />
            ) : (
              <div className="proposal-cards-list">
                {acceptedProposals.map((item) => (
                  <article key={item.id} className="proposal-card" style={{ borderLeftColor: 'var(--ok)' }}>
                    <div className="proposal-card-header">
                      <div className="proposal-card-headline-group">
                        <span className="proposal-status-chip is-accepted">✓ ACCEPTED LINK</span>
                        <h4 className="proposal-card-claim">{item.claim}</h4>
                      </div>
                      <span className="proposal-confidence-badge is-conf-high">
                        {Math.round(item.confidence * 100)}% confidence
                      </span>
                    </div>

                    {(item.source_entity || item.target_entity) && (
                      <div className="proposal-card-entities">
                        {item.source_entity && (
                          <span className="proposal-entity-tag">{item.source_entity}</span>
                        )}
                        <span className="proposal-entity-arrow" aria-hidden="true">
                          →
                        </span>
                        {item.target_entity && (
                          <span className="proposal-entity-tag">{item.target_entity}</span>
                        )}
                      </div>
                    )}

                    <p className="proposal-card-reason">{item.reason}</p>

                    <div className="proposal-card-footer">
                      <div className="proposal-card-provenance">
                        <span className="proposal-provenance-label">PROVENANCE</span>
                        <CitationChip citation={item.citation} onClick={onOpenCitation} />
                      </div>
                      <span className="proposal-summary-timestamp">
                        {item.decided_at ? `Accepted ${new Date(item.decided_at).toLocaleTimeString()}` : 'Accepted'}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* View Tab: All Review History */}
        {activeTab === 'all' && (
          <section className="proposal-section" aria-label="All proposal review history">
            <div className="proposal-section-head">
              <div className="proposal-section-title-wrap">
                <h3 className="proposal-section-title">All Review History</h3>
                <span className="proposal-section-badge">{proposals.length}</span>
              </div>
              <span className="proposal-section-subtitle">
                Complete audit trail of all model proposals for this case
              </span>
            </div>

            <div className="proposal-cards-list">
              {proposals.map((item) => (
                <ProposalCard
                  key={item.id}
                  proposal={item}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onOpenCitation={onOpenCitation}
                />
              ))}
            </div>
          </section>
        )}
          </>
        )}
      </main>
    </div>
  )
}
