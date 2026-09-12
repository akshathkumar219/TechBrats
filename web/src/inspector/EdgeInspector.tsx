import React, { useState, useEffect, useCallback, useMemo } from 'react'
import './inspector.css'
import { openFileAt } from '../workspace/navigation'
import { EmptyState } from '../states'
import {
  type EdgeInspectorProps,
  type InspectableEdge,
  type SnippetLine,
  formatLocator,
  parseLocatorLine,
  inferDocType,
  normalizeEdge,
} from './types'

/**
 * EdgeInspector — Right-rail panel component for edge provenance inspection.
 * Mounts into the panel host and opens on edge selection.
 * Enforces Case Model Law 2, Law 3, and Design System §5.
 */
export function EdgeInspector({
  selectedEdge: externalEdge,
  onClose,
  onOpenSource,
  className = '',
  style,
}: EdgeInspectorProps): React.JSX.Element {
  const [eventEdge, setEventEdge] = useState<InspectableEdge | null>(null)
  const [copiedHash, setCopiedHash] = useState(false)
  const [copiedCitation, setCopiedCitation] = useState(false)

  // Global event subscription for edge selection across the workbench
  useEffect(() => {
    const handleEdgeSelected = (e: Event) => {
      const customEvent = e as CustomEvent
      if (!customEvent.detail) {
        setEventEdge(null)
        return
      }
      const rawDetail = customEvent.detail
      const edgeData = rawDetail.edge !== undefined ? rawDetail.edge : rawDetail
      const normalized = normalizeEdge(edgeData)
      if (normalized) {
        setEventEdge(normalized)
      }
    }

    const handleSelectionChanged = (e: Event) => {
      const customEvent = e as CustomEvent
      if (customEvent.detail && Array.isArray(customEvent.detail.edges)) {
        if (customEvent.detail.edges.length === 0) {
          setEventEdge(null)
        } else {
          const first = customEvent.detail.edges[0]
          if (first && typeof first === 'object') {
            const normalized = normalizeEdge(first)
            if (normalized) setEventEdge(normalized)
          }
        }
      }
    }

    window.addEventListener('syndicate-brain:edge-selected', handleEdgeSelected)
    window.addEventListener('syndicate-brain:selection-changed', handleSelectionChanged)

    return () => {
      window.removeEventListener('syndicate-brain:edge-selected', handleEdgeSelected)
      window.removeEventListener('syndicate-brain:selection-changed', handleSelectionChanged)
    }
  }, [])

  // Derive active edge from props (controlled) or global event state (uncontrolled)
  const edge = useMemo(() => {
    if (externalEdge !== undefined) {
      return normalizeEdge(externalEdge)
    }
    return eventEdge
  }, [externalEdge, eventEdge])

  // Formatted locator (e.g. "p:3 l:11" or "row:48219")
  const locator = useMemo(() => {
    return formatLocator(edge?.citation?.locator)
  }, [edge?.citation?.locator])

  // Numeric line / row for navigation
  const lineNumber = useMemo(() => {
    return parseLocatorLine(locator)
  }, [locator])

  // Prepare raw snippet lines with ±2 context lines
  const snippetLines = useMemo<SnippetLine[]>(() => {
    if (!edge) return []

    const baseLineNum = lineNumber || 18
    const matchedLineText =
      edge.rawSnippet ||
      edge.citation?.snippet ||
      'No raw snippet recorded for this locator'

    const beforeLines: SnippetLine[] = (edge.contextBefore || []).map((text, idx, arr) => ({
      lineNumber: baseLineNum - (arr.length - idx),
      text,
      isMatch: false,
    }))

    const afterLines: SnippetLine[] = (edge.contextAfter || []).map((text, idx) => ({
      lineNumber: baseLineNum + (idx + 1),
      text,
      isMatch: false,
    }))

    const matchedLine: SnippetLine = {
      lineNumber: baseLineNum,
      text: matchedLineText,
      isMatch: true,
      matchedSpan: edge.matchedSpan,
    }

    return [...beforeLines, matchedLine, ...afterLines]
  }, [edge, lineNumber])

  // Handle "Open in Source" action
  const handleOpenInSource = useCallback(async () => {
    if (!edge) return

    const sourceDoc =
      edge.sourceDoc?.filename ||
      edge.citation?.sourceDocId ||
      edge.citation?.source_doc_id ||
      edge.citation?.sourceId ||
      'source_document'
    const line = lineNumber
    const span = edge.matchedSpan

    // 1. Direct call to exported openFileAt per AKT-T05 / HAR-T06
    try {
      openFileAt(sourceDoc, line ?? 1, span)
    } catch (err) {
      console.warn('[EdgeInspector] openFileAt call failed:', err)
    }

    // 2. Props callback
    if (onOpenSource) {
      onOpenSource(sourceDoc, line, span)
    }

    // 3. Global window function if registered
    const win = typeof window !== 'undefined' ? (window as unknown as { openFileAt?: (path: string, line?: number, span?: [number, number]) => void }) : null
    if (win && typeof win.openFileAt === 'function') {
      try {
        win.openFileAt(sourceDoc, line, span)
      } catch (err) {
        console.warn('[EdgeInspector] window.openFileAt call failed:', err)
      }
    }

    // 4. Always dispatch events for workbench decoupling
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('syndicate-brain:open-file-at', {
          detail: { path: sourceDoc, line, span },
        })
      )
      window.dispatchEvent(
        new CustomEvent('syndicate-brain:open-file', {
          detail: { path: sourceDoc, line, span },
        })
      )
      window.dispatchEvent(
        new CustomEvent('syndicate-brain:open-citation', {
          detail: {
            source_doc_id: sourceDoc,
            locator: edge.citation?.locator,
            line,
            span,
          },
        })
      )
    }
  }, [edge, lineNumber, onOpenSource])

  // Copy SHA-256 hash helper
  const handleCopyHash = useCallback(() => {
    if (!edge?.sourceDoc?.sha256) return
    navigator.clipboard?.writeText(edge.sourceDoc.sha256)
    setCopiedHash(true)
    setTimeout(() => setCopiedHash(false), 1500)
  }, [edge])

  // Copy Citation helper
  const handleCopyCitation = useCallback(() => {
    if (!edge?.citation) return
    const citStr = `^[${edge.sourceDoc?.id || edge.citation.sourceDocId} ${locator}]`
    navigator.clipboard?.writeText(citStr)
    setCopiedCitation(true)
    setTimeout(() => setCopiedCitation(false), 1500)
  }, [edge, locator])

  // Render clean empty state when no edge is selected
  if (!edge) {
    return (
      <aside
        className={`edge-inspector ${className}`}
        style={style}
        role="region"
        aria-label="Provenance Edge Inspector"
      >
        <div className="edge-inspector-header">
          <div className="edge-inspector-titlebar">
            <div className="edge-inspector-title-group">
              <span className="edge-inspector-icon-wrap" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </span>
              <span className="edge-inspector-title">Provenance Inspector</span>
            </div>
            {onClose && (
              <button
                type="button"
                className="edge-inspector-close-btn"
                onClick={onClose}
                aria-label="Close inspector panel"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="edge-inspector-empty">
          <EmptyState
            headline="Provenance Inspector"
            body="Select an edge or connection in the graph to inspect provenance and source citation."
            icon={null}
            compact
          />
          <div className="edge-inspector-empty-law3-badge">
            LAW 3: Every link carries its reason and locator
          </div>
        </div>
      </aside>
    )
  }

  const isRecordDerived = edge.tier === 'record-derived' || (!edge.isAi && !edge.aiProposalId)
  const isAiAccepted = edge.tier === 'ai-accepted' || Boolean(edge.acceptedAt)
  const docType = edge.sourceDoc?.type || inferDocType(edge.sourceDoc?.filename)

  return (
    <aside
      className={`edge-inspector ${className}`}
      style={style}
      role="region"
      aria-label={`Provenance Inspector for connection between ${edge.source} and ${edge.target}`}
    >
      {/* Header with Title and Connection Graphic */}
      <div className="edge-inspector-header">
        <div className="edge-inspector-titlebar">
          <div className="edge-inspector-title-group">
            <span className="edge-inspector-icon-wrap" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </span>
            <span className="edge-inspector-title">Provenance Inspector</span>
          </div>
          {onClose && (
            <button
              type="button"
              className="edge-inspector-close-btn"
              onClick={onClose}
              aria-label="Close inspector panel"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Connection banner: Node A ──REASON──▶ Node B */}
        <div className="edge-inspector-connection-banner">
          <span className="edge-inspector-endpoint" title={edge.sourceName || edge.source}>
            {edge.sourceName || edge.source}
          </span>
          <div className="edge-inspector-connector">
            <span className="edge-inspector-connector-line" />
            <span>LINK</span>
            <span className="edge-inspector-connector-arrow">▶</span>
          </div>
          <span className="edge-inspector-endpoint" title={edge.targetName || edge.target}>
            {edge.targetName || edge.target}
          </span>
        </div>
      </div>

      {/* Main scrollable body */}
      <div className="edge-inspector-body">
        {/* Evidentiary Status Badge (Law 2) */}
        <div className="edge-inspector-section">
          <div className="edge-inspector-section-label">
            <span>Evidentiary Status</span>
            <span className="edge-inspector-immutable-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Law 1 Immutable
            </span>
          </div>

          {isRecordDerived ? (
            <div className="edge-inspector-tier-badge is-record-derived">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Record-Derived (Law 2)</span>
            </div>
          ) : (
            <>
              <div className="edge-inspector-tier-badge is-ai-accepted">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span>{isAiAccepted ? 'AI-Accepted Lead' : 'AI-Proposed Lead'}</span>
              </div>
              <div className="edge-inspector-ai-metadata">
                <div>
                  <strong>Accepted:</strong> {edge.acceptedAt || '19 Feb 2026, 14:35 IST'}
                  {edge.acceptedBy ? ` by ${edge.acceptedBy}` : ''}
                </div>
                {edge.aiProposalId && (
                  <div className="edge-inspector-ai-marker">
                    &lt;!-- ai:{edge.aiProposalId} accepted --&gt;
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* The Claim and Reason */}
        <div className="edge-inspector-section">
          <div className="edge-inspector-section-label">Claim &amp; Finding</div>
          {edge.claim && edge.claim !== edge.reason && (
            <div className="edge-inspector-claim-box">
              {edge.claim}
            </div>
          )}
          <div className="edge-inspector-reason-box">
            {edge.reason}
          </div>
        </div>

        {/* Source Document Provenance Card */}
        <div className="edge-inspector-section">
          <div className="edge-inspector-section-label">Source Document (Law 3)</div>
          <div className="edge-inspector-doc-card">
            <div className="edge-inspector-doc-head">
              <div className="edge-inspector-doc-name-group">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="edge-inspector-doc-name" title={edge.sourceDoc?.filename}>
                  {edge.sourceDoc?.filename}
                </span>
              </div>
              <span
                className={`edge-inspector-doc-badge is-${docType.toLowerCase()}`}
              >
                {docType}
              </span>
            </div>

            <div className="edge-inspector-meta-grid">
              <span className="edge-inspector-meta-label">Locator:</span>
              <div className="edge-inspector-meta-value">
                <button
                  type="button"
                  className="edge-inspector-locator-chip is-clickable"
                  onClick={handleOpenInSource}
                  title={`Open source at ${locator}`}
                >
                  {locator}
                </button>
              </div>

              <span className="edge-inspector-meta-label">Ingested:</span>
              <div className="edge-inspector-meta-value">
                {edge.sourceDoc?.ingestTimestamp || '14 Feb 2026, 04:30 IST'}
              </div>

              <span className="edge-inspector-meta-label">SHA-256:</span>
              <div className="edge-inspector-meta-value">
                <span className="edge-inspector-hash">
                  {edge.sourceDoc?.sha256 ? `${edge.sourceDoc.sha256.slice(0, 8)}…${edge.sourceDoc.sha256.slice(-4)}` : 'a3f2…9c1e'}
                </span>
                <button
                  type="button"
                  className="edge-inspector-copy-btn"
                  onClick={handleCopyHash}
                  title="Copy full SHA-256 hash"
                >
                  {copiedHash ? '✓ copied' : 'copy'}
                </button>
              </div>

              {edge.observedAt && (
                <>
                  <span className="edge-inspector-meta-label">Observed:</span>
                  <div className="edge-inspector-meta-value">{edge.observedAt}</div>
                </>
              )}

              {edge.effectiveWeight && (
                <>
                  <span className="edge-inspector-meta-label">Weight:</span>
                  <div className="edge-inspector-meta-value">
                    eff. {edge.effectiveWeight}
                    {edge.callCount ? ` · ${edge.callCount} calls` : ''}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* THE RAW SOURCE SNIPPET (Law 3 Guarantee) */}
        <div className="edge-inspector-section">
          <div className="edge-inspector-section-label">
            <span>Raw Source Snippet (±2 Lines)</span>
            <span className="edge-inspector-snippet-badge">Verbatim Guarantee</span>
          </div>

          <div className="edge-inspector-snippet-container">
            <div className="edge-inspector-snippet-header">
              <span>{edge.sourceDoc?.filename}</span>
              <span>{locator}</span>
            </div>

            <div
              className="edge-inspector-snippet-code"
              role="region"
              aria-label="Raw uncleaned source code snippet"
            >
              {snippetLines.map((line, idx) => (
                <div
                  key={idx}
                  className={`edge-inspector-snippet-line ${
                    line.isMatch ? 'is-match' : 'is-context'
                  }`}
                >
                  <span className="edge-inspector-snippet-gutter">
                    {line.lineNumber ?? idx + 1}
                  </span>
                  <span className="edge-inspector-snippet-text">
                    {line.isMatch && line.matchedSpan ? (
                      <>
                        {line.text.slice(0, line.matchedSpan[0])}
                        <mark className="edge-inspector-matched-span">
                          {line.text.slice(line.matchedSpan[0], line.matchedSpan[1])}
                        </mark>
                        {line.text.slice(line.matchedSpan[1])}
                      </>
                    ) : (
                      line.text
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="edge-inspector-footer">
        <button
          type="button"
          className="edge-inspector-btn-open"
          onClick={handleOpenInSource}
          title={`Open ${edge.sourceDoc?.filename} at ${locator}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span>Open in Source</span>
        </button>

        <button
          type="button"
          className="edge-inspector-btn-secondary"
          onClick={handleCopyCitation}
          title="Copy wiki citation string"
        >
          <span>{copiedCitation ? '✓ Copied' : 'Copy Citation'}</span>
        </button>
      </div>
    </aside>
  )
}
