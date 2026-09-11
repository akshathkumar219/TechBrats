import { useEffect, useRef } from 'react'
import type { CaretCoordinates } from '../lib/caret'

export interface AutocompleteCandidate {
  name: string
  path: string
  insertText: string
}

interface WikiAutocompleteProps {
  candidates: AutocompleteCandidate[]
  selectedIndex: number
  position: CaretCoordinates
  onSelect: (candidate: AutocompleteCandidate) => void
}

export function WikiAutocomplete({
  candidates,
  selectedIndex,
  position,
  onSelect,
}: WikiAutocompleteProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('.wiki-autocomplete-item.selected')
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Calculate coordinates and flip above if close to bottom of screen
  const dropdownWidth = 280
  const dropdownHeight = 220
  const clampedLeft = Math.max(16, Math.min(position.left, window.innerWidth - dropdownWidth - 16))
  const flipAbove = position.top + position.height + dropdownHeight > window.innerHeight
  const top = flipAbove
    ? Math.max(16, position.top - dropdownHeight - 6)
    : position.top + position.height + 4

  if (candidates.length === 0) {
    return (
      <div
        className="wiki-autocomplete"
        style={{ top: `${top}px`, left: `${clampedLeft}px`, width: `${dropdownWidth}px` }}
      >
        <div className="wiki-autocomplete-empty">No matching notes</div>
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      className="wiki-autocomplete"
      style={{ top: `${top}px`, left: `${clampedLeft}px`, width: `${dropdownWidth}px` }}
    >
      {candidates.map((item, idx) => (
        <div
          key={item.path}
          className={`wiki-autocomplete-item ${idx === selectedIndex ? 'selected' : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(item)
          }}
        >
          <span className="wiki-autocomplete-name">{item.name}</span>
          {item.path !== item.name && (
            <span className="wiki-autocomplete-path">{item.path}</span>
          )}
        </div>
      ))}
    </div>
  )
}
