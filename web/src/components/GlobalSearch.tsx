import { useState, useEffect, useRef, useMemo } from 'react'
import type { VaultFile } from '../fs/vault'
import { EmptyState } from '../states'

interface GlobalSearchProps {
  isOpen: boolean
  files: VaultFile[]
  noteContents: Record<string, string>
  onSelectFile: (path: string) => void
  onClose: () => void
}

interface SearchMatch {
  file: VaultFile
  lineNumber: number
  lineText: string
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim().toLowerCase()
  if (!q) return text
  const idx = text.toLowerCase().indexOf(q)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="global-search-highlight">{text.slice(idx, idx + q.length)}</span>
      {highlightMatch(text.slice(idx + q.length), query)}
    </>
  )
}

export function GlobalSearch({
  isOpen, files, noteContents, onSelectFile, onClose,
}: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 20)
    }
  }, [isOpen])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const results: SearchMatch[] = []
    for (const file of files) {
      const content = noteContents[file.path] || ''
      content.split('\n').forEach((line, idx) => {
        if (line.toLowerCase().includes(q)) {
          results.push({ file, lineNumber: idx + 1, lineText: line.trim() })
        }
      })
      if (results.length >= 100) break
    }
    return results
  }, [files, noteContents, query])

  useEffect(() => { setSelectedIndex(0) }, [query])

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('.global-search-item.selected')
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (matches.length > 0) setSelectedIndex((prev) => (prev + 1) % matches.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (matches.length > 0) setSelectedIndex((prev) => (prev - 1 + matches.length) % matches.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (matches.length > 0 && matches[selectedIndex]) {
        onSelectFile(matches[selectedIndex].file.path)
        onClose()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="global-search-box" onClick={(e) => e.stopPropagation()}>
        <div className="global-search-header">
          <input
            ref={inputRef}
            className="input-search global-search-input"
            placeholder="Search across all note contents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query.trim() && (
            <span className="global-search-count">
              {matches.length} {matches.length === 1 ? 'match' : 'matches'}
            </span>
          )}
        </div>
        <div ref={listRef} className="global-search-list">
          {!query.trim() ? (
            <EmptyState
              compact
              headline="Search Case Vault"
              body="Type keywords to search across evidentiary records and entity notes."
            />
          ) : matches.length === 0 ? (
            <EmptyState
              compact
              headline="No Matching Records"
              body="No records found matching the query."
            />
          ) : (
            matches.map((match, idx) => (
              <div
                key={`${match.file.path}:${match.lineNumber}`}
                className={`global-search-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  onSelectFile(match.file.path)
                  onClose()
                }}
              >
                <div className="global-search-item-top">
                  <span className="global-search-filename">{match.file.name.replace(/\.md$/, '')}</span>
                  <span className="global-search-path">{match.file.path.replace(/\.md$/, '')}</span>
                </div>
                <div className="global-search-item-line">
                  <span className="global-search-line-num">{match.lineNumber}</span>
                  <span className="global-search-line-text">{highlightMatch(match.lineText, query)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
