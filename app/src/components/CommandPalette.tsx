import { useState, useEffect, useRef, useMemo } from 'react'

export interface WorkbenchCommand {
  id: string
  label: string
  category?: string
  shortcut?: string
  action: () => void
}

interface CommandPaletteProps {
  isOpen: boolean
  commands: WorkbenchCommand[]
  onClose: () => void
}

export function CommandPalette({ isOpen, commands, onClose }: CommandPaletteProps) {
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
    if (!q) return commands
    return commands
      .filter((cmd) => cmd.label.toLowerCase().includes(q) || cmd.category?.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(q)
        const bStarts = b.label.toLowerCase().startsWith(q)
        if (aStarts !== bStarts) return aStarts ? -1 : 1
        return a.label.localeCompare(b.label)
      })
  }, [commands, query])

  useEffect(() => { setSelectedIndex(0) }, [query])

  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('.command-palette-item.selected')
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
        filtered[selectedIndex].action()
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
      <div className="command-palette-box" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="input-search command-palette-input"
          placeholder="Type a command..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div ref={listRef} className="command-palette-list">
          {filtered.length === 0 ? (
            <div className="command-palette-empty">No matching commands found</div>
          ) : (
            filtered.map((cmd, idx) => (
              <div
                key={cmd.id}
                className={`command-palette-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  cmd.action()
                  onClose()
                }}
              >
                <div className="command-palette-item-left">
                  {cmd.category && <span className="command-category">{cmd.category}:</span>}
                  <span className="command-label">{cmd.label}</span>
                </div>
                {cmd.shortcut && <span className="command-shortcut-badge">{cmd.shortcut}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
