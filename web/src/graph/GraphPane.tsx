import React, { useEffect, useRef, useState, useCallback } from 'react'
import { EmptyState, LoadingSkeleton, ErrorState } from '../states'
import { CytoscapeGraphEngine } from './engine'
import type { GraphData } from './types'

export interface GraphPaneProps {
  caseId?: string | null
  data?: GraphData | null
  isLoading?: boolean
  error?: string | null
  failedFile?: string | null
  onRetry?: () => void
  onSelectNode?: (nodeId: string) => void
  onSelectEdge?: (edgeId: string) => void
  className?: string
  style?: React.CSSProperties
  isVisible?: boolean
}

/**
 * GraphPane — Evidence Graph Container with full state handling (AKT-T05).
 * States handled using shared components:
 * - No case open (<EmptyState>)
 * - Case has no links yet (<EmptyState>)
 * - Loading skeleton (<LoadingSkeleton variant="graph">)
 * - Parse error (<ErrorState>)
 * Focus mode:
 * - 'F' on selected node dims everything >1 hop away
 * - 'Escape' clears focus mode
 */
export function GraphPane({
  caseId,
  data,
  isLoading = false,
  error = null,
  failedFile = null,
  onRetry,
  onSelectNode,
  onSelectEdge,
  className = '',
  style,
  isVisible = true,
}: GraphPaneProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const engineRef = useRef<CytoscapeGraphEngine | null>(null)
  const [isFocusActive, setIsFocusActive] = useState(false)
  const [leadsVisible, setLeadsVisible] = useState(true)

  // Initialize or update Cytoscape instance
  useEffect(() => {
    if (!containerRef.current || !data || isLoading || error || !caseId) {
      return
    }

    let engine = engineRef.current
    if (!engine) {
      engine = new CytoscapeGraphEngine(containerRef.current, data, {
        leadsVisible,
      })
      engineRef.current = engine

      engine.onSelectionChange((evt) => {
        setIsFocusActive(engine?.isFocusActive() ?? false)
        if (evt.nodes.length > 0 && onSelectNode) {
          onSelectNode(evt.nodes[0])
        }
        if (evt.edges.length > 0 && onSelectEdge) {
          onSelectEdge(evt.edges[0])
        }
      })
    } else {
      engine.updateData(data)
    }

    return () => {
      // Container kept alive across tab switches without remount jumping
    }
  }, [data, isLoading, error, caseId, leadsVisible, onSelectNode, onSelectEdge])

  // Resize when visibility changes or container geometry changes
  useEffect(() => {
    if (isVisible && engineRef.current) {
      const t = setTimeout(() => {
        engineRef.current?.resize()
      }, 50)
      return () => clearTimeout(t)
    }
  }, [isVisible])

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 20 && entry.contentRect.height > 20) {
          engineRef.current?.resize()
        }
      }
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Toggle leads visibility
  const handleToggleLeads = useCallback(() => {
    if (!engineRef.current) return
    const next = !leadsVisible
    setLeadsVisible(next)
    engineRef.current.setLeadsVisible(next)
  }, [leadsVisible])

  // Clear focus mode
  const handleClearFocus = useCallback(() => {
    if (!engineRef.current) return
    engineRef.current.clearFocus()
    setIsFocusActive(false)
  }, [])

  // State 1: No case open
  if (!caseId) {
    return (
      <div className={`graph-pane-state-container ${className}`} style={style} role="region" aria-label="Evidence Graph State">
        <EmptyState
          headline="No Case Open"
          body="Open an investigation case folder to load and visualize entity connections."
        />
      </div>
    )
  }

  // State 2: Loading skeleton
  if (isLoading) {
    return (
      <div className={`graph-pane-state-container ${className}`} style={style} role="region" aria-label="Evidence Graph Loading">
        <LoadingSkeleton variant="graph" />
      </div>
    )
  }

  // State 3: Parse error
  if (error) {
    return (
      <div className={`graph-pane-state-container ${className}`} style={style} role="region" aria-label="Evidence Graph Error">
        <ErrorState
          title="Graph Parse Error"
          message={error || 'Failed to parse markdown entity notes for graph visualization.'}
          failedFile={failedFile ?? undefined}
          retryAction={onRetry}
          retryLabel="Retry Parsing"
        />
      </div>
    )
  }

  // State 4: Case has no links yet
  const totalEdges = data?.edges?.length ?? 0
  if (data && totalEdges === 0) {
    return (
      <div className={`graph-pane-state-container ${className}`} style={style} role="region" aria-label="Evidence Graph State">
        <EmptyState
          headline="No Links In Case"
          body="Entity notes have been parsed, but no links or co-occurrences have been established yet in the case vault."
          action={onRetry ? { label: 'Refresh Graph', onClick: onRetry } : undefined}
        />
      </div>
    )
  }

  // Active graph canvas view
  return (
    <div
      className={`graph-pane-root ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-void)',
        ...style,
      }}
      role="region"
      aria-label="Evidence Graph Canvas"
    >
      {/* Investigative Leads Sandbox Banner (design-system.md §4) */}
      {leadsVisible && (
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--s1) var(--s3)',
            backgroundColor: 'rgba(194, 86, 158, 0.12)',
            borderBottom: '1px solid var(--hypothesis)',
            color: 'var(--hypothesis)',
            fontSize: 'var(--fs-xs)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            letterSpacing: '0.04em',
            zIndex: 10,
          }}
        >
          <span>INVESTIGATIVE LEADS — NON-EVIDENTIARY · NOT ADMISSIBLE AS EVIDENCE</span>
          <button
            type="button"
            onClick={handleToggleLeads}
            style={{
              background: 'none',
              border: '1px solid var(--hypothesis)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--hypothesis)',
              padding: '1px var(--s2)',
              fontSize: 'var(--fs-xs)',
              cursor: 'pointer',
            }}
            title="Toggle display of unverified hypothesis edges"
          >
            Hide Leads
          </button>
        </div>
      )}

      {/* Focus Mode active toast indicator */}
      {isFocusActive && (
        <div
          style={{
            position: 'absolute',
            top: leadsVisible ? '38px' : '12px',
            right: '16px',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--s2)',
            backgroundColor: 'var(--bg-raised)',
            border: '1px solid var(--border-focus)',
            borderRadius: 'var(--r-sm)',
            padding: 'var(--s1) var(--s2)',
            fontSize: 'var(--fs-xs)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-pop)',
          }}
        >
          <span>Focus Mode: 1-hop neighborhood active</span>
          <button
            type="button"
            onClick={handleClearFocus}
            style={{
              background: 'var(--bg-overlay)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)',
              color: 'var(--text-body)',
              padding: '1px var(--s1)',
              cursor: 'pointer',
            }}
            title="Clear focus mode (Escape)"
          >
            Esc to Clear
          </button>
        </div>
      )}

      {/* Cytoscape Container */}
      <div
        ref={containerRef}
        id="graph-canvas-container"
        className="graph-canvas-host"
        style={{
          flex: '1 1 auto',
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-void)',
        }}
      />
    </div>
  )
}
