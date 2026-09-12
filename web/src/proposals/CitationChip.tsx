import React, { useCallback } from 'react'
import type { CitationChipProps } from './types'

export function CitationChip({
  citation,
  inline = false,
  onClick,
  className = '',
}: CitationChipProps) {
  const parseLocatorLine = (loc: string): number | undefined => {
    // "row:48219" for CDR, "p:3 l:11" or "l:14" for documents
    const rowMatch = /row:(\d+)/i.exec(loc)
    if (rowMatch) return parseInt(rowMatch[1], 10)
    const lineMatch = /l:(\d+)/i.exec(loc)
    if (lineMatch) return parseInt(lineMatch[1], 10)
    return undefined
  }

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClick?.(citation)

      // Notify global listeners across the workbench
      window.dispatchEvent(
        new CustomEvent('syndicate-brain:open-citation', { detail: citation })
      )

      const line = parseLocatorLine(citation.locator)
      window.dispatchEvent(
        new CustomEvent('syndicate-brain:open-file', {
          detail: { path: citation.source_doc_id, line },
        })
      )

      // Call global openFileAt if registered by HAR-T06 right-rail host
      const win = window as unknown as {
        openFileAt?: (path: string, line?: number) => void
      }
      if (typeof win.openFileAt === 'function') {
        win.openFileAt(citation.source_doc_id, line)
      }
    },
    [citation, onClick]
  )

  const label = `${citation.source_doc_id} · ${citation.locator}`
  const tooltip = citation.snippet
    ? `${label}\n"${citation.snippet}"`
    : `Source: ${citation.source_doc_id} (${citation.locator})`

  return (
    <button
      type="button"
      className={`proposal-citation-chip ${inline ? 'is-inline' : ''} ${className}`}
      onClick={handleClick}
      title={tooltip}
      aria-label={`Open source document ${label}`}
    >
      <svg
        className="proposal-citation-icon"
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
      <span className="proposal-citation-label">{label}</span>
    </button>
  )
}
