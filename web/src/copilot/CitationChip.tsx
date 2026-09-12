import React, { useCallback } from 'react'
import type { CitationChipProps } from './types'
import { openFileAt, parseLocator, resolveCitationPath } from './navigation'

/**
 * CitationChip — Renders an evidentiary citation in Law 3 / Law 4 format: ^[source locator].
 * Clean, distinct evidentiary pill styled with 100% design system tokens (ZERO hex codes).
 * Clicking calls openFileAt(path, line, span) to open note, scroll to line, and highlight span.
 */
export function CitationChip({
  source: sourceProp,
  locator: locatorProp,
  path: pathProp,
  line: lineProp,
  span: spanProp,
  citation,
  retrievedNotes,
  onClick,
  className,
  inline = true,
}: CitationChipProps): React.JSX.Element {
  // Resolve source and locator from direct props or citation object
  const source = sourceProp || citation?.source_doc_id || ''
  const locator = locatorProp !== undefined ? locatorProp : citation?.locator || null

  // Parse line and span from locator if not explicitly provided
  const parsed = parseLocator(locator)
  const line = lineProp !== undefined ? lineProp : parsed.line
  const span = spanProp !== undefined ? spanProp : parsed.span

  // Resolve target file path (e.g. DOC_FIR_0142 -> 00_Raw_Inputs/FIR/FIR_0142_2026_Kharkhoda.md)
  const targetPath = pathProp || resolveCitationPath(source, retrievedNotes)

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()

      // Primary requirement: open note, scroll to line, and highlight span
      openFileAt(targetPath, line, span)

      // Call optional callback
      onClick?.(source, locator)
    },
    [targetPath, line, span, source, locator, onClick]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        openFileAt(targetPath, line, span)
        onClick?.(source, locator)
      }
    },
    [targetPath, line, span, source, locator, onClick]
  )

  const lineSuffix = line
    ? ` (line ${line}${span ? ` [${span[0]}-${span[1]}]` : ''})`
    : ''
  const tooltip = locator
    ? `Verified Evidence: ${source} [${locator}]${lineSuffix} — Click to open note`
    : `Verified Evidence: ${source} — Click to open note`

  return (
    <button
      type="button"
      className={`copilot-citation-chip ${inline ? 'is-inline' : ''} ${className || ''}`.trim()}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      title={tooltip}
      aria-label={`Citation ${source}${locator ? ` ${locator}` : ''}`}
      data-source={source}
      data-locator={locator || ''}
      data-line={line}
    >
      <span className="copilot-citation-icon" aria-hidden="true">§</span>
      <span className="copilot-citation-source">{source}</span>
      {locator && (
        <>
          <span className="copilot-citation-sep" aria-hidden="true">·</span>
          <span className="copilot-citation-locator">{locator}</span>
        </>
      )}
    </button>
  )
}
