import type React from 'react'
import type { CitationChipProps } from './types'

/**
 * CitationChip — Renders an evidentiary citation in Law 3 / Law 4 format: ^[source locator].
 * Clean, distinct evidentiary pill styled with design system tokens.
 * Clicking triggers onCitationClick callback to inspect evidence.
 */
export function CitationChip({
  source,
  locator,
  onClick,
  className,
}: CitationChipProps): React.JSX.Element {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    onClick?.(source, locator)
  }

  const tooltip = locator
    ? `Verified Evidence: ${source} [${locator}] — Click to open note`
    : `Verified Evidence: ${source} — Click to open note`

  return (
    <button
      type="button"
      className={`copilot-citation-chip ${className || ''}`.trim()}
      onClick={handleClick}
      title={tooltip}
      aria-label={`Citation ${source}${locator ? ` ${locator}` : ''}`}
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
