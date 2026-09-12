import { useState, useEffect, useRef, useMemo } from 'react'
import type { VaultFile } from '../fs/vault'
import { EmptyState } from '../states'

interface QuickSwitcherProps {
  isOpen: boolean
  files: VaultFile[]
  onSelectFile: (path: string) => void
  onClose: () => void
}

export function QuickSwitcher({ isOpen, files, onSelectFile, onClose }: QuickSwitcherProps) {
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return files.slice(0, 30)

    return files
      .filter((f) => {
        const name = f.name.replace(/\.md$/, '').toLowerCase()
        const path = f.path.replace(/\.md$/, '').toLowerCase()
        return name.includes(q) || path.includes(q)
      })
      .sort((a, b) => {
        const aName = a.name.replace(/\.md$/, '').toLowerCase()
        const bName = b.name.replace(/\.md$/, '').toLowerCase()
        const aStarts = aName.startsWith(q)
        const bStarts = bName.startsWith(q)
        if (aStarts !== bStarts) return aStarts ? -1 : 1
        return aName.localeCompare(bName)
      })
      .slice(0, 30)
  }, [files, query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('.quick-switcher-item.selected')
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (filtered.length > 0) setSelectedIndex((prev) => (prev + 1) % filtered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (filtered.length > 0) setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0 && filtered[selectedIndex]) {
        onSelectFile(filtered[selectedIndex].path)
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
      <div className="quick-switcher-box" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="input-search quick-switcher-input"
          placeholder="Open note... (type to search)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div ref={listRef} className="quick-switcher-list">
          {filtered.length === 0 ? (
            <EmptyState
              compact
              headline="No Matching Notes"
              body="No entity notes or records found matching the query."
            />
          ) : (
            filtered.map((file, idx) => (
              <div
                key={file.path}
                className={`quick-switcher-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  onSelectFile(file.path)
                  onClose()
                }}
              >
                <span className="quick-switcher-name">{file.name.replace(/\.md$/, '')}</span>
                {file.path.includes('/') && (
                  <span className="quick-switcher-path">{file.path.replace(/\.md$/, '')}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
