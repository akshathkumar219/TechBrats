import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  WhatChangedPanelProps,
  WhatChangedDiff,
  WhatChangedItem,
  WhatChangedCategory,
  WhatChangedNavigationTarget,
} from './types'
import {
  DEFAULT_WHAT_CHANGED_DIFF,
  buildDiffFromAnalysis,
} from './types'
import type { AnalysisResult } from '../proposals/types'
import { CitationChip } from '../proposals'
import './changed.css'

type FilterMode = 'all' | WhatChangedCategory

export function WhatChangedPanel({
  analysisResult,
  diffData,
  caseId = 'Case_01_Sonipat_Arms',
  vaultPath,
  isLoading: externalLoading = false,
  onNavigateProposal,
  onSelectProposal,
  onOpenFile,
  onSelectCrossCase,
  onRefresh,
  className = '',
}: WhatChangedPanelProps) {
  // Diff state: derived from props, live events, or backend responses
  const [internalDiff, setInternalDiff] = useState<WhatChangedDiff>(() => {
    if (diffData) return diffData
    if (analysisResult) return buildDiffFromAnalysis(analysisResult, caseId)
    return { ...DEFAULT_WHAT_CHANGED_DIFF, caseId }
  })

  const [activeFilter, setActiveFilter] = useState<FilterMode>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [prevDiffData, setPrevDiffData] = useState<WhatChangedDiff | null | undefined>(diffData)
  const [prevAnalysisResult, setPrevAnalysisResult] = useState<AnalysisResult | null | undefined>(analysisResult)

  // Synchronize when incoming props change during render (standard React pattern)
  if (diffData !== prevDiffData) {
    setPrevDiffData(diffData)
    if (diffData) {
      setInternalDiff(diffData)
    }
  } else if (analysisResult !== prevAnalysisResult) {
    setPrevAnalysisResult(analysisResult)
    if (analysisResult) {
      setInternalDiff(buildDiffFromAnalysis(analysisResult, caseId))
    }
  }

  // Listen to workbench analysis events (e.g. from AnalyseButton or batch pipeline)
  useEffect(() => {
    const handleCaseAnalysed = (e: Event) => {
      const customEvent = e as CustomEvent<AnalysisResult>
      if (customEvent.detail) {
        const parsed = buildDiffFromAnalysis(customEvent.detail, caseId)
        setInternalDiff(parsed)
      }
    }

    const handleCustomDiff = (e: Event) => {
      const customEvent = e as CustomEvent<WhatChangedDiff>
      if (customEvent.detail) {
        setInternalDiff(customEvent.detail)
      }
    }

    window.addEventListener('syndicate-brain:case-analysed', handleCaseAnalysed)
    window.addEventListener('syndicate-brain:what-changed-update', handleCustomDiff)

    return () => {
      window.removeEventListener('syndicate-brain:case-analysed', handleCaseAnalysed)
      window.removeEventListener('syndicate-brain:what-changed-update', handleCustomDiff)
    }
  }, [caseId])

  // Re-run analysis or refresh diff
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      if (onRefresh) {
        await onRefresh()
      } else {
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
          setInternalDiff(buildDiffFromAnalysis(data, caseId))
        } else {
          console.warn('[WhatChangedPanel] /api/case/analyse non-200, using default diff')
          setInternalDiff({ ...DEFAULT_WHAT_CHANGED_DIFF, caseId })
        }
      }
    } catch (err) {
      console.warn('[WhatChangedPanel] Error refreshing diff, using fallback:', err)
      setInternalDiff({ ...DEFAULT_WHAT_CHANGED_DIFF, caseId })
    } finally {
      setIsRefreshing(false)
    }
  }, [caseId, vaultPath, onRefresh])

  // Row navigation handler: fires events, updates external components, jumps to DOM elements
  const handleRowClick = useCallback(
    (item: WhatChangedItem) => {
      const sectionId =
        item.category === 'connections'
          ? 'heading-new-connections'
          : item.category === 'updates'
          ? 'heading-files-to-update'
          : item.category === 'contradictions'
          ? 'heading-contradictions'
          : 'heading-cross-case'

      const target: WhatChangedNavigationTarget = {
        category: item.category,
        proposalId: item.targetProposalId || item.id,
        filePath: item.targetFilePath,
        identifier: item.targetIdentifier,
        sectionId,
        item,
      }

      // 1. Dispatch custom event for right rail or workbench proposal coordinator
      window.dispatchEvent(
        new CustomEvent('syndicate-brain:navigate-proposal', {
          detail: target,
          bubbles: true,
        })
      )

      // 2. Dispatch file open event if pointing to a vault note
      if (item.targetFilePath) {
        window.dispatchEvent(
          new CustomEvent('syndicate-brain:open-file', {
            detail: { path: item.targetFilePath },
            bubbles: true,
          })
        )

        const win = window as unknown as {
          openFileAt?: (path: string, line?: number) => void
        }
        if (typeof win.openFileAt === 'function') {
          win.openFileAt(item.targetFilePath)
        }
      }

      // 3. Smooth scroll to matching DOM node if currently mounted in proposal panel
      const targetId = item.targetProposalId || item.id
      let el: HTMLElement | null = document.getElementById(targetId)
      if (!el) {
        el = document.querySelector(`[data-proposal-id="${targetId}"]`) as HTMLElement | null
      }
      if (!el && sectionId) {
        el = document.getElementById(sectionId)
      }

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.focus?.()
      }

      // 4. Trigger direct callbacks
      onNavigateProposal?.(target)
      if (item.targetProposalId || item.id) {
        onSelectProposal?.(item.targetProposalId || item.id)
      }
      if (item.targetFilePath) {
        onOpenFile?.(item.targetFilePath)
      }
      if (item.targetIdentifier) {
        onSelectCrossCase?.(item.targetIdentifier)
      }
    },
    [onNavigateProposal, onSelectProposal, onOpenFile, onSelectCrossCase]
  )

  const isLoading = externalLoading || isRefreshing

  // Filtered lists
  const visibleContradictions = useMemo(() => {
    if (activeFilter !== 'all' && activeFilter !== 'contradictions') return []
    return internalDiff.contradictions
  }, [activeFilter, internalDiff.contradictions])

  const visibleConnections = useMemo(() => {
    if (activeFilter !== 'all' && activeFilter !== 'connections') return []
    return internalDiff.connections
  }, [activeFilter, internalDiff.connections])

  const visibleUpdates = useMemo(() => {
    if (activeFilter !== 'all' && activeFilter !== 'updates') return []
    return internalDiff.filesToUpdate
  }, [activeFilter, internalDiff.filesToUpdate])

  const visibleCrossCase = useMemo(() => {
    if (activeFilter !== 'all' && activeFilter !== 'crosscase') return []
    return internalDiff.crossCaseHits
  }, [activeFilter, internalDiff.crossCaseHits])

  const totalVisibleCount =
    visibleContradictions.length +
    visibleConnections.length +
    visibleUpdates.length +
    visibleCrossCase.length

  return (
    <div
      className={`what-changed-panel ${className}`}
      role="region"
      aria-label="What Changed Diff Summary"
    >
      {/* Top Banner & Header */}
      <header className="wc-header">
        <div className="wc-topline">
          <div className="wc-topline-left">
            <span className="wc-status-pill">
              <span className="wc-pulse-dot" aria-hidden="true" />
              <span>Analysis Run Complete</span>
            </span>
            <span className="wc-case-badge">
              <span>CASE:</span>
              <strong>{internalDiff.caseId || caseId}</strong>
            </span>
          </div>

          <div className="wc-actions">
            <button
              type="button"
              className="wc-btn-action"
              onClick={handleRefresh}
              disabled={isLoading}
              title="Re-run analysis scan to detect recent evidentiary changes"
            >
              <svg
                width="13"
                height="13"
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
              <span>{isLoading ? 'Scanning...' : 'Re-scan Vault'}</span>
            </button>
          </div>
        </div>

        <div className="wc-title-row">
          <div className="wc-title-group">
            <h1 className="wc-title">What Changed</h1>
            <span className="wc-subtitle">
              Instant evidentiary delta generated across 00_Raw_Inputs/ and markdown case notes
            </span>
          </div>
        </div>

        {/* Diff Headline Summary */}
        <div className="wc-headline-summary">
          {internalDiff.metrics.newConnectionsCount} new connections proposed ·{' '}
          {internalDiff.metrics.filesToUpdateCount} files to update ·{' '}
          {internalDiff.metrics.contradictionsCount} contradiction found ·{' '}
          {internalDiff.metrics.crossCaseHitsCount} cross-case hit
        </div>

        {/* Procedural Summary Prose */}
        {internalDiff.summaryText && (
          <div className="wc-summary-prose">
            <p style={{ margin: 0 }}>{internalDiff.summaryText}</p>
          </div>
        )}
      </header>

      {/* Room-Readable KPI Metrics Grid (Bold stats visible across a room) */}
      <section className="wc-stats-grid" aria-label="Key Diff Metrics">
        {/* Card 1: New Connections Proposed */}
        <button
          type="button"
          className={`wc-stat-card is-connections ${activeFilter === 'connections' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter(activeFilter === 'connections' ? 'all' : 'connections')}
          aria-label={`${internalDiff.metrics.newConnectionsCount} new connections proposed`}
        >
          <div className="wc-stat-header">
            <div className="wc-stat-label-wrap">
              <span className="wc-stat-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="18" cy="18" r="3" />
                  <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
                </svg>
              </span>
              <span className="wc-stat-label">New Connections</span>
            </div>
            <span className="wc-stat-badge tone-evidence">
              +{internalDiff.metrics.newConnectionsCount} Proposed
            </span>
          </div>

          <div className="wc-stat-body">
            <span className="wc-stat-number">{internalDiff.metrics.newConnectionsCount}</span>
          </div>

          <div className="wc-stat-footer">
            Record-derived associations awaiting detective verification
          </div>
        </button>

        {/* Card 2: Files to Update */}
        <button
          type="button"
          className={`wc-stat-card is-updates ${activeFilter === 'updates' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter(activeFilter === 'updates' ? 'all' : 'updates')}
          aria-label={`${internalDiff.metrics.filesToUpdateCount} files to update`}
        >
          <div className="wc-stat-header">
            <div className="wc-stat-label-wrap">
              <span className="wc-stat-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </span>
              <span className="wc-stat-label">Files to Update</span>
            </div>
            <span className="wc-stat-badge tone-info">
              {internalDiff.metrics.filesToUpdateCount} Notes
            </span>
          </div>

          <div className="wc-stat-body">
            <span className="wc-stat-number">{internalDiff.metrics.filesToUpdateCount}</span>
          </div>

          <div className="wc-stat-footer">
            Read-only suggested link updates for existing notes
          </div>
        </button>

        {/* Card 3: Contradictions Found */}
        <button
          type="button"
          className={`wc-stat-card is-contradictions ${activeFilter === 'contradictions' ? 'is-active' : ''}`}
          onClick={() =>
            setActiveFilter(activeFilter === 'contradictions' ? 'all' : 'contradictions')
          }
          aria-label={`${internalDiff.metrics.contradictionsCount} contradictions found`}
        >
          <div className="wc-stat-header">
            <div className="wc-stat-label-wrap">
              <span className="wc-stat-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              <span className="wc-stat-label">Contradictions</span>
            </div>
            <span className="wc-stat-badge tone-danger">
              {internalDiff.metrics.contradictionsCount} Conflict
            </span>
          </div>

          <div className="wc-stat-body">
            <span className="wc-stat-number">{internalDiff.metrics.contradictionsCount}</span>
          </div>

          <div className="wc-stat-footer">
            Suspect statement refuted by physical logs or tower dump
          </div>
        </button>

        {/* Card 4: Cross-Case Hits */}
        <button
          type="button"
          className={`wc-stat-card is-crosscase ${activeFilter === 'crosscase' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter(activeFilter === 'crosscase' ? 'all' : 'crosscase')}
          aria-label={`${internalDiff.metrics.crossCaseHitsCount} cross-case hits`}
        >
          <div className="wc-stat-header">
            <div className="wc-stat-label-wrap">
              <span className="wc-stat-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </span>
              <span className="wc-stat-label">Cross-Case Hits</span>
            </div>
            <span className="wc-stat-badge tone-hypothesis">
              {internalDiff.metrics.crossCaseHitsCount} Multi-Case
            </span>
          </div>

          <div className="wc-stat-body">
            <span className="wc-stat-number">{internalDiff.metrics.crossCaseHitsCount}</span>
          </div>

          <div className="wc-stat-footer">
            Deterministic identifier matches across investigation vaults
          </div>
        </button>
      </section>

      {/* Filter Navigation Bar */}
      <nav className="wc-filter-bar" aria-label="Diff view filters">
        <button
          type="button"
          className={`wc-filter-pill ${activeFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          <span>All Changes</span>
          <span className="wc-filter-pill-count">{internalDiff.metrics.totalChangesCount}</span>
        </button>

        <button
          type="button"
          className={`wc-filter-pill ${activeFilter === 'contradictions' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('contradictions')}
        >
          <span>Contradictions</span>
          <span className="wc-filter-pill-count">{internalDiff.metrics.contradictionsCount}</span>
        </button>

        <button
          type="button"
          className={`wc-filter-pill ${activeFilter === 'connections' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('connections')}
        >
          <span>New Connections</span>
          <span className="wc-filter-pill-count">{internalDiff.metrics.newConnectionsCount}</span>
        </button>

        <button
          type="button"
          className={`wc-filter-pill ${activeFilter === 'updates' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('updates')}
        >
          <span>Files to Update</span>
          <span className="wc-filter-pill-count">{internalDiff.metrics.filesToUpdateCount}</span>
        </button>

        <button
          type="button"
          className={`wc-filter-pill ${activeFilter === 'crosscase' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter('crosscase')}
        >
          <span>Cross-Case Hits</span>
          <span className="wc-filter-pill-count">{internalDiff.metrics.crossCaseHitsCount}</span>
        </button>
      </nav>

      {/* Main Diff Content */}
      <main className="wc-content">
        {totalVisibleCount === 0 ? (
          <div className="wc-empty-state">
            <div className="wc-empty-icon" aria-hidden="true">
              ✓
            </div>
            <div className="wc-empty-title">No changes in selected filter</div>
            <div className="wc-empty-desc">
              No pending evidentiary modifications detected. The case vault matches registered inputs.
            </div>
          </div>
        ) : (
          <>
            {/* SECTION: CONTRADICTIONS (High priority alibi conflicts) */}
            {visibleContradictions.length > 0 && (
              <section className="wc-section" aria-labelledby="wc-heading-contradictions">
                <div className="wc-section-header">
                  <div className="wc-section-title-wrap">
                    <span className="wc-section-icon tone-contradiction" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                    </span>
                    <h2 id="wc-heading-contradictions" className="wc-section-title">
                      Contradictions Found
                    </h2>
                    <span className="wc-section-count">{visibleContradictions.length}</span>
                  </div>
                  <span className="wc-section-subtitle">
                    Evidentiary conflicts between recorded statements and physical logs
                  </span>
                </div>

                <div className="wc-rows-list">
                  {visibleContradictions.map((item) => (
                    <article
                      key={item.id}
                      className="wc-row-card is-contradictions"
                      onClick={() => handleRowClick(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleRowClick(item)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Contradiction: ${item.title}`}
                    >
                      <div className="wc-row-top">
                        <div className="wc-row-title-wrap">
                          <h3 className="wc-row-title">{item.title}</h3>
                          {item.sourceEntity && item.targetEntity && (
                            <div className="wc-row-entities">
                              <span className="wc-entity-tag">{item.sourceEntity}</span>
                              <span className="wc-entity-arrow" aria-hidden="true">→</span>
                              <span className="wc-entity-tag">{item.targetEntity}</span>
                            </div>
                          )}
                        </div>

                        <div className="wc-row-badges">
                          <span className="wc-row-badge tone-danger">{item.badgeText}</span>
                          {item.confidence !== undefined && (
                            <span className="wc-row-confidence">
                              {Math.round(item.confidence * 100)}% conf
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="wc-row-desc">{item.description}</p>

                      <div className="wc-row-footer">
                        <div className="wc-row-citation-wrap">
                          {item.citation && <CitationChip citation={item.citation} />}
                        </div>
                        <span className="wc-row-action-hint">
                          <span>Review in Proposals</span>
                          <span aria-hidden="true">→</span>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION: NEW CONNECTIONS PROPOSED */}
            {visibleConnections.length > 0 && (
              <section className="wc-section" aria-labelledby="wc-heading-connections">
                <div className="wc-section-header">
                  <div className="wc-section-title-wrap">
                    <span className="wc-section-icon tone-connection" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="6" cy="6" r="3" />
                        <circle cx="18" cy="18" r="3" />
                        <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
                      </svg>
                    </span>
                    <h2 id="wc-heading-connections" className="wc-section-title">
                      New Connections Proposed
                    </h2>
                    <span className="wc-section-count">{visibleConnections.length}</span>
                  </div>
                  <span className="wc-section-subtitle">
                    Record-derived and model-suggested links requiring human sign-off (Law 2)
                  </span>
                </div>

                <div className="wc-rows-list">
                  {visibleConnections.map((item) => (
                    <article
                      key={item.id}
                      className="wc-row-card is-connections"
                      onClick={() => handleRowClick(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleRowClick(item)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Connection proposal: ${item.title}`}
                    >
                      <div className="wc-row-top">
                        <div className="wc-row-title-wrap">
                          <h3 className="wc-row-title">{item.title}</h3>
                          {item.sourceEntity && item.targetEntity && (
                            <div className="wc-row-entities">
                              <span className="wc-entity-tag">{item.sourceEntity}</span>
                              <span className="wc-entity-arrow" aria-hidden="true">→</span>
                              <span className="wc-entity-tag">{item.targetEntity}</span>
                            </div>
                          )}
                        </div>

                        <div className="wc-row-badges">
                          <span className={`wc-row-badge tone-${item.badgeTone}`}>
                            {item.badgeText}
                          </span>
                          {item.confidence !== undefined && (
                            <span className="wc-row-confidence">
                              {Math.round(item.confidence * 100)}% conf
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="wc-row-desc">{item.description}</p>

                      <div className="wc-row-footer">
                        <div className="wc-row-citation-wrap">
                          {item.citation && <CitationChip citation={item.citation} />}
                        </div>
                        <span className="wc-row-action-hint">
                          <span>Review Proposal Card</span>
                          <span aria-hidden="true">→</span>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION: FILES TO UPDATE */}
            {visibleUpdates.length > 0 && (
              <section className="wc-section" aria-labelledby="wc-heading-updates">
                <div className="wc-section-header">
                  <div className="wc-section-title-wrap">
                    <span className="wc-section-icon tone-update" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </span>
                    <h2 id="wc-heading-updates" className="wc-section-title">
                      Files to Update
                    </h2>
                    <span className="wc-section-count">{visibleUpdates.length}</span>
                  </div>
                  <span className="wc-section-subtitle">
                    Read-only suggestions. The AI proposes updates but never modifies note bodies
                  </span>
                </div>

                <div className="wc-rows-list">
                  {visibleUpdates.map((item) => (
                    <article
                      key={item.id}
                      className="wc-row-card is-updates"
                      onClick={() => handleRowClick(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleRowClick(item)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`File update suggestion for ${item.title}`}
                    >
                      <div className="wc-row-top">
                        <div className="wc-row-title-wrap">
                          <h3 className="wc-row-title" style={{ fontFamily: 'var(--font-mono)' }}>
                            {item.title}
                          </h3>
                        </div>

                        <div className="wc-row-badges">
                          <span className="wc-row-badge tone-info">{item.badgeText}</span>
                        </div>
                      </div>

                      <p className="wc-row-desc">{item.description}</p>

                      {item.suggestedAdditions && item.suggestedAdditions.length > 0 && (
                        <div className="wc-row-additions">
                          <span className="wc-additions-label">Suggested additions:</span>
                          <ul className="wc-additions-list">
                            {item.suggestedAdditions.map((addition, aIdx) => (
                              <li key={aIdx} className="wc-addition-item">
                                {addition}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="wc-row-footer">
                        <div className="wc-row-citation-wrap">
                          {item.citation && <CitationChip citation={item.citation} />}
                        </div>
                        <span className="wc-row-action-hint">
                          <span>Open Note in Editor</span>
                          <span aria-hidden="true">→</span>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION: CROSS-CASE HITS */}
            {visibleCrossCase.length > 0 && (
              <section className="wc-section" aria-labelledby="wc-heading-crosscase">
                <div className="wc-section-header">
                  <div className="wc-section-title-wrap">
                    <span className="wc-section-icon tone-crosscase" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                    </span>
                    <h2 id="wc-heading-crosscase" className="wc-section-title">
                      Cross-Case Hits
                    </h2>
                    <span className="wc-section-count">{visibleCrossCase.length}</span>
                  </div>
                  <span className="wc-section-subtitle">
                    Deterministic hardware and telephone identifier matches across investigation vaults
                  </span>
                </div>

                <div className="wc-rows-list">
                  {visibleCrossCase.map((item) => (
                    <article
                      key={item.id}
                      className="wc-row-card is-crosscase"
                      onClick={() => handleRowClick(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleRowClick(item)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Cross case hit: ${item.title}`}
                    >
                      <div className="wc-row-top">
                        <div className="wc-row-title-wrap">
                          <h3 className="wc-row-title">{item.title}</h3>
                          {item.matchedCases && item.matchedCases.length > 0 && (
                            <div className="wc-row-cases">
                              <span>MATCHED CASES:</span>
                              {item.matchedCases.map((c, cIdx) => (
                                <span key={cIdx} className="wc-case-tag">
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="wc-row-badges">
                          <span className="wc-row-badge tone-hypothesis">{item.badgeText}</span>
                        </div>
                      </div>

                      <p className="wc-row-desc">{item.description}</p>

                      <div className="wc-row-footer">
                        <div className="wc-row-citation-wrap">
                          {item.citation && <CitationChip citation={item.citation} />}
                        </div>
                        <span className="wc-row-action-hint">
                          <span>Inspect Cross-Case Lead</span>
                          <span aria-hidden="true">→</span>
                        </span>
                      </div>
                    </article>
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
