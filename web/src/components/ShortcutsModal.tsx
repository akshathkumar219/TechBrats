import { useState, useEffect, useRef, useMemo } from 'react'
import { SHORTCUTS, CATEGORIES, type ShortcutCategory } from '../lib/shortcuts'

export interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  const [activeTab, setActiveTab] = useState<'guide' | 'shortcuts'>('guide')
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      if (activeTab === 'shortcuts') {
        setTimeout(() => inputRef.current?.focus(), 20)
      }
    }
  }, [isOpen, activeTab])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const filteredShortcuts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SHORTCUTS
    return SHORTCUTS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.key.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q))
    )
  }, [query])

  const grouped = useMemo(() => {
    const map = new Map<ShortcutCategory, typeof filteredShortcuts>()
    for (const cat of CATEGORIES) {
      const items = filteredShortcuts.filter((s) => s.category === cat)
      if (items.length > 0) {
        map.set(cat, items)
      }
    }
    return map
  }, [filteredShortcuts])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="How to Use & Shortcuts">
      <div className="command-palette-box" onClick={(e) => e.stopPropagation()} style={{ width: 600 }}>
        <div className="shortcuts-modal-head">
          <div className="shortcuts-modal-tabs">
            <button
              type="button"
              className={`shortcuts-tab-btn${activeTab === 'guide' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('guide')}
            >
              How to Use Guide
            </button>
            <button
              type="button"
              className={`shortcuts-tab-btn${activeTab === 'shortcuts' ? ' is-active' : ''}`}
              onClick={() => setActiveTab('shortcuts')}
            >
              Keyboard Shortcuts
            </button>
          </div>
          <button
            type="button"
            className="shortcuts-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {activeTab === 'guide' ? (
          <div className="guide-modal-body">
            <div className="guide-card">
              <div className="guide-card-icon">🔒</div>
              <div className="guide-card-content">
                <h4>00_Raw_Inputs (Immutable Evidence)</h4>
                <p>
                  Place raw case files (FIRs, Call Detail Records, Tower Dumps, Statements) into <code>00_Raw_Inputs/</code>.
                  Files are SHA-256 hashed upon ingestion and write-locked (read-only) to preserve legal chain of custody.
                </p>
              </div>
            </div>

            <div className="guide-card">
              <div className="guide-card-icon">👤</div>
              <div className="guide-card-content">
                <h4>Entity Dossiers & Wikilinks</h4>
                <p>
                  Entities are tracked in <code>01_People/</code>, <code>02_Identifiers/</code>, <code>03_Vehicles/</code>, <code>04_Locations/</code>.
                  Cross-reference entities using Wikilinks like <code>[[Vikram Singh]]</code> to establish verifiable investigation connections.
                </p>
              </div>
            </div>

            <div className="guide-card">
              <div className="guide-card-icon">🕸️</div>
              <div className="guide-card-content">
                <h4>Evidence Graph View (⌘G)</h4>
                <p>
                  Toggle between the Markdown editor and interactive Evidence Graph to visually inspect communication networks, co-location events, and suspect topologies.
                </p>
              </div>
            </div>

            <div className="guide-card">
              <div className="guide-card-icon">🤖</div>
              <div className="guide-card-content">
                <h4>RAG Agent</h4>
                <p>
                  Query the evidentiary vault in the right Copilot rail. Every assertion is strictly grounded in case memory with verifiable sentence-level source citations.
                </p>
              </div>
            </div>

            <div className="guide-card">
              <div className="guide-card-icon">⚡</div>
              <div className="guide-card-content">
                <h4>Quick Navigation</h4>
                <p>
                  Press <kbd className="command-shortcut-badge">⌘O</kbd> for Quick Switcher to jump between files, <kbd className="command-shortcut-badge">⌘N</kbd> for new notes, and <kbd className="command-shortcut-badge">⌘⇧F</kbd> for full search.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              type="text"
              className="input-search command-palette-input"
              placeholder="Filter shortcuts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <div className="shortcuts-modal-body">
              {grouped.size === 0 ? (
                <div className="command-palette-empty">No matching shortcuts found</div>
              ) : (
                Array.from(grouped.entries()).map(([category, items]) => (
                  <div key={category} className="shortcuts-group">
                    <div className="shortcuts-group-title">{category}</div>
                    <div className="shortcuts-grid">
                      {items.map((item) => (
                        <div key={item.key + item.label} className="shortcuts-row">
                          <div className="shortcuts-row-left">
                            <span className="shortcuts-row-label">{item.label}</span>
                            {item.description && (
                              <span className="shortcuts-row-desc">{item.description}</span>
                            )}
                          </div>
                          <kbd className="command-shortcut-badge">{item.key}</kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        <div className="shortcuts-modal-foot">
          <span>Press <kbd className="command-shortcut-badge">⌘/</kbd> anywhere to open guide</span>
          <span><kbd className="command-shortcut-badge">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  )
}
