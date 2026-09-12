import {
  useState, useEffect, useCallback, useMemo, useRef, type ReactNode,
} from 'react'
import type { VaultFile } from '../fs/vault'
import { StatusBar } from './StatusBar'
import { CopilotPanel } from '../copilot'
import { AnalyseButton } from './AnalyseButton'
import { onOpenFileAt } from '../workspace'
import { ObsidianGraphView } from '../graph/ObsidianGraphView'
import { parseGraph, DEFAULT_GRAPH_DATA } from '../graph'

/* ------------------------------------------------------------------ *
 * Workspace — the Obsidian-style shell. One file, layout only.
 *   ribbon | left sidebar | tabbed centre | copilot sidebar
 * Panes collapse + drag-resize. Tabs are real. Copilot echoes locally.
 * ------------------------------------------------------------------ */

export type ActiveView = 'editor' | 'graph'

/* ---------------------------- icons ---------------------------- */
type IconProps = { d: string }
function Svg({ d }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.split('|').map((seg) => <path key={seg} d={seg} />)}
    </svg>
  )
}
const I = {
  files: 'M3 5a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14|M16 16l4 4',
  bookmark: 'M6 4h12v16l-6-4-6 4z',
  newNote: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6|M12 11v6|M9 14h6',
  newFolder: 'M4 4h5l2 2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z|M12 11v6|M9 14h6',
  sort: 'M3 7l3-3 3 3|M6 4v16|M21 17l-3 3-3-3|M18 20V4',
  collapse: 'M4 14h6v6|M10 14l-7 7|M20 10h-6V4|M14 10l7-7',
  panelLeft: 'M4 5h16v14H4z|M9 5v14',
  panelRight: 'M4 5h16v14H4z|M15 5v14',
  plus: 'M12 5v14|M5 12h14',
  x: 'M18 6L6 18|M6 6l12 12',
  copilot: 'M12 4a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3h1V8a4 4 0 0 1 4-4z|M9.5 14h.01|M14.5 14h.01',
  graph: 'M6 3a3 3 0 1 0 0 6 3 3 0 1 0 0-6|M18 3a3 3 0 1 0 0 6 3 3 0 1 0 0-6|M12 15a3 3 0 1 0 0 6 3 3 0 1 0 0-6|M9 6h6|M7.5 8.5l3 7|M16.5 8.5l-3 7',
  help: 'M9.5 9a2.5 2.5 0 1 1 3 2.5V13|M12 16.5h.01|M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  vault: 'M7 15l5 5 5-5|M7 9l5-5 5 5',
}

/* ---------------------------- tabs ---------------------------- */
interface Tab { id: string; path: string | null }
let tabSeq = 0
const newTab = (path: string | null = null): Tab => ({ id: `t${++tabSeq}`, path })

/* ---------------------------- shell ---------------------------- */
export interface WorkspaceProps {
  vaultName: string | null
  files: VaultFile[]
  activeFile: VaultFile | null
  wordCount: number
  saveStatus: 'saved' | 'unsaved'
  sidebar: ReactNode
  editor: ReactNode
  noteContents?: Record<string, string>
  reopenCandidateName?: string | null
  onReopenVault?: () => void
  activeView?: ActiveView
  onViewChange?: (view: ActiveView) => void
  onSelectFile: (path: string) => void
  onOpenVault: () => void
  onNewNote: () => void
  onNewFolder: () => void
  onQuickSwitcher: () => void
  onSearch: () => void
}

export function Workspace(p: WorkspaceProps) {
  const [leftOpen, setLeftOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('sb_left_open')
    return saved !== null ? saved === 'true' : true
  })
  const [rightOpen, setRightOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('sb_right_open')
    return saved !== null ? saved === 'true' : true
  })
  const [leftView, setLeftView] = useState<'files' | 'search' | 'bookmarks'>('files')
  const [internalView, setInternalView] = useState<ActiveView>(() => {
    return (localStorage.getItem('sb_active_view') as ActiveView) || 'editor'
  })
  const activeView = p.activeView ?? internalView
  const setView = useCallback(
    (v: ActiveView) => {
      setInternalView(v)
      localStorage.setItem('sb_active_view', v)
      p.onViewChange?.(v)
    },
    [p]
  )

function formatCaseDisplayName(id: string | null): string {
  if (!id) return 'Obsidian Vault'
  if (id === 'Case_01_Sonipat_Arms') return 'Case 01 · Sonipat Arms & Extortion'
  if (id === 'Case_02_Rohtak_Hijack') return 'Case 02 · Rohtak Highway Arms Hijack'
  const m = id.match(/^Case_0?(\d+)(?:_(.*))?$/i)
  if (m) {
    const num = m[1].padStart(2, '0')
    const suffix = m[2] ? ` · ${m[2].replace(/_/g, ' ')}` : ''
    return `Case ${num}${suffix}`
  }
  return id.replace(/_/g, ' ')
}

  const graphData = useMemo(() => {
    if (p.noteContents && Object.keys(p.noteContents).length > 0) {
      try {
        let activeContents = p.noteContents
        if (p.vaultName) {
          const filtered: Record<string, string> = {}
          for (const [k, v] of Object.entries(p.noteContents)) {
            if (k.startsWith(`${p.vaultName}/`) || !k.includes('Case_')) {
              filtered[k] = v
            }
          }
          if (Object.keys(filtered).length > 0) {
            activeContents = filtered
          }
        }
        const parsed = parseGraph(activeContents)
        if (parsed && parsed.nodes && parsed.nodes.length > 0) {
          return parsed
        }
      } catch (err) {
        console.warn('Live vault parsing error, using default graph data:', err)
      }
    }
    return DEFAULT_GRAPH_DATA
  }, [p.noteContents, p.vaultName])

  useEffect(() => {
    return onOpenFileAt(({ path }) => {
      if (activeView !== 'editor') {
        setView('editor')
      }
      const matching = p.files.find((f) => f.path === path || f.path.endsWith(path) || path.endsWith(f.name))
      if (matching) {
        p.onSelectFile(matching.path)
      }
    })
  }, [activeView, p, setView])

  const [tabs, setTabs] = useState<Tab[]>(() => [newTab()])
  const [activeTab, setActiveTab] = useState<string>(() => tabs[0].id)
  const [closingTabIds, setClosingTabIds] = useState<string[]>([])
  const path = p.activeFile?.path ?? null

  // Note Navigation History Stack (BUG-03)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  const isNavigatingHistoryRef = useRef(false)

  useEffect(() => {
    if (!path) return
    if (isNavigatingHistoryRef.current) {
      isNavigatingHistoryRef.current = false
      return
    }
    setHistory((prev) => {
      if (historyIndex >= 0 && prev[historyIndex] === path) {
        return prev
      }
      const next = [...prev.slice(0, historyIndex + 1), path]
      setHistoryIndex(next.length - 1)
      return next
    })
  }, [path, historyIndex])

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1]
      isNavigatingHistoryRef.current = true
      setHistoryIndex(historyIndex - 1)
      p.onSelectFile(target)
    }
  }, [history, historyIndex, p])

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1]
      isNavigatingHistoryRef.current = true
      setHistoryIndex(historyIndex + 1)
      p.onSelectFile(target)
    }
  }, [history, historyIndex, p])

  // Subhead More Options Menu State (BUG-04)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const moreMenuRef = useRef<HTMLDivElement | null>(null)

  // Bookmarks State (BUG-06)
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('sb_bookmarks')
      return saved ? JSON.parse(saved) : ['01_People/Vikram Singh.md', '00_Raw_Inputs/FIR/FIR_0142_2026.md']
    } catch {
      return ['01_People/Vikram Singh.md', '00_Raw_Inputs/FIR/FIR_0142_2026.md']
    }
  })

  const toggleBookmark = useCallback((notePath: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(notePath) ? prev.filter((p) => p !== notePath) : [...prev, notePath]
      localStorage.setItem('sb_bookmarks', JSON.stringify(next))
      return next
    })
  }, [])

  useEffect(() => {
    if (!isMoreMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setIsMoreMenuOpen(false)
      }
    }
    window.addEventListener('pointerdown', handleClickOutside)
    return () => window.removeEventListener('pointerdown', handleClickOutside)
  }, [isMoreMenuOpen])
  useEffect(() => {
    if (!path) return
    setView('editor')
    setTabs((prev) => {
      if (prev.some((t) => t.path === path)) {
        setActiveTab(prev.find((t) => t.path === path)!.id)
        return prev
      }
      const cur = prev.find((t) => t.id === activeTab)
      if (cur && cur.path === null) {
        return prev.map((t) => (t.id === cur.id ? { ...t, path } : t))
      }
      const t = newTab(path)
      setActiveTab(t.id)
      return [...prev, t]
    })
  }, [activeTab, path])

  const openEmptyTab = () => {
    const t = newTab()
    setTabs((prev) => [...prev, t])
    setActiveTab(t.id)
  }

  const closeTab = useCallback((id: string) => {
    setClosingTabIds((prev) => (prev.includes(id) ? prev : [...prev, id]))

    setTimeout(() => {
      setTabs((prev) => {
        if (prev.length <= 1) {
          setClosingTabIds((c) => c.filter((x) => x !== id))
          return [newTab()]
        }
        const i = prev.findIndex((t) => t.id === id)
        const next = prev.filter((t) => t.id !== id)
        if (id === activeTab) {
          const focus = next[Math.min(i, next.length - 1)]
          setActiveTab(focus.id)
          if (focus.path && focus.path !== path) p.onSelectFile(focus.path)
        }
        setClosingTabIds((c) => c.filter((x) => x !== id))
        return next
      })
    }, 160)
  }, [activeTab, p, path])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey
      if (isCmdOrCtrl && e.key.toLowerCase() === 'g') {
        e.preventDefault()
        setView(activeView === 'editor' ? 'graph' : 'editor')
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 't') {
        e.preventDefault()
        openEmptyTab()
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'w') {
        const target = e.target as HTMLElement | null
        const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
        if (!isInput) {
          e.preventDefault()
          closeTab(activeTab)
        }
      } else if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        goBack()
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault()
        goForward()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, activeView, closeTab, setView, goBack, goForward])

  useEffect(() => {
    localStorage.setItem('sb_left_open', String(leftOpen))
  }, [leftOpen])

  useEffect(() => {
    localStorage.setItem('sb_right_open', String(rightOpen))
  }, [rightOpen])

  const selectTab = (t: Tab) => {
    setActiveTab(t.id)
    if (t.path && t.path !== path) p.onSelectFile(t.path)
  }

  const current = tabs.find((t) => t.id === activeTab) ?? tabs[0]
  const showEditor = current?.path !== null && current?.path === path

  const copyCurrentPath = useCallback(() => {
    if (current?.path) {
      void navigator.clipboard.writeText(current.path)
      setCopyFeedback(true)
      setTimeout(() => {
        setCopyFeedback(false)
        setIsMoreMenuOpen(false)
      }, 1200)
    }
  }, [current?.path])

  return (
    <div className="ws">
      {/* Left Vertical Shortcuts Ribbon */}
        <nav className="ws-ribbon" aria-label="Shortcuts">
          <button
            type="button"
            className={`ws-ico${activeView === 'graph' ? ' is-active' : ''}`}
            title={activeView === 'graph' ? 'Show Editor (⌘G)' : 'Evidence Graph (⌘G)'}
            aria-label={activeView === 'graph' ? 'Show Editor' : 'Evidence Graph'}
            onClick={() => setView(activeView === 'graph' ? 'editor' : 'graph')}
          >
            <Svg d={I.graph} />
          </button>

          <button
            type="button"
            className={`ws-ico${rightOpen ? ' is-active' : ''}`}
            title={rightOpen ? 'Close Copilot' : 'Open Copilot'}
            aria-label="Toggle Copilot"
            onClick={() => setRightOpen((v) => !v)}
          >
            <Svg d={I.copilot} />
          </button>

          <AnalyseButton
            variant="ribbon"
            vaultName={p.vaultName}
            caseId={p.vaultName || 'Case_01_Sonipat_Arms'}
          />

          <div className="ws-ribbon-spacer" />

          <button
            type="button"
            className="ws-ico"
            title="Help & Shortcuts (⌘/)"
            aria-label="Help & Shortcuts"
            onClick={() => window.dispatchEvent(new CustomEvent('syndicate-brain:open-shortcuts'))}
          >
            <Svg d={I.help} />
          </button>

          <button
            type="button"
            className="ws-ico"
            title="Settings (⌘,)"
            aria-label="Settings"
            onClick={() => window.dispatchEvent(new CustomEvent('syndicate-brain:open-settings'))}
          >
            <Svg d={I.settings} />
          </button>
        </nav>

        {/* Left Sidebar Pane */}
        {leftOpen && (
          <aside className="ws-pane ws-pane-left">
            {/* Tier 1: View tabs & collapse */}
            <div className="ws-pane-head-tier1">
              <button
                type="button"
                className={`ws-topbar-tab${leftView === 'files' ? ' is-active' : ''}`}
                title="Files"
                aria-label="Files"
                onClick={() => setLeftView('files')}
              >
                <Svg d={I.files} />
              </button>
              <button
                type="button"
                className="ws-topbar-tab"
                title="Search in all notes (⌘⇧F)"
                aria-label="Search"
                onClick={p.onSearch}
              >
                <Svg d={I.search} />
              </button>
              <button
                type="button"
                className={`ws-topbar-tab${leftView === 'bookmarks' ? ' is-active' : ''}`}
                title="Bookmarks"
                aria-label="Bookmarks"
                onClick={() => setLeftView('bookmarks')}
              >
                <Svg d={I.bookmark} />
              </button>
              <span className="ws-grow" />
              <button
                type="button"
                className="ws-pane-action-btn"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                onClick={() => setLeftOpen(false)}
              >
                <Svg d={I.panelLeft} />
              </button>
            </div>

            {/* Tier 2: Document action row — only in 'files' mode */}
            {leftView === 'files' ? (
              <div className="ws-pane-head-tier2">
                <button
                  type="button"
                  className="ws-pane-action-btn"
                  title="New note"
                  aria-label="New note"
                  onClick={p.onNewNote}
                >
                  <Svg d={I.newNote} />
                </button>
                <button
                  type="button"
                  className="ws-pane-action-btn"
                  title="New folder"
                  aria-label="New folder"
                  onClick={p.onNewFolder}
                >
                  <Svg d={I.newFolder} />
                </button>
                <button
                  type="button"
                  className="ws-pane-action-btn"
                  title="Change sort order"
                  aria-label="Change sort order"
                  onClick={() => window.dispatchEvent(new CustomEvent('syndicate-brain:toggle-sort'))}
                >
                  <Svg d={I.sort} />
                </button>
                <button
                  type="button"
                  className="ws-pane-action-btn"
                  title="Collapse all folders"
                  aria-label="Collapse all folders"
                  onClick={() => window.dispatchEvent(new CustomEvent('syndicate-brain:collapse-all-folders'))}
                >
                  <Svg d={I.collapse} />
                </button>
              </div>
            ) : leftView === 'bookmarks' ? (
              <div className="ws-pane-head-tier2" style={{ justifyContent: 'space-between', padding: '0 var(--s3)' }}>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bookmarks ({bookmarks.length})
                </span>
                {bookmarks.length > 0 && (
                  <button
                    type="button"
                    className="ws-pane-action-btn"
                    title="Clear all bookmarks"
                    aria-label="Clear all bookmarks"
                    onClick={() => {
                      setBookmarks([])
                      localStorage.setItem('sb_bookmarks', JSON.stringify([]))
                    }}
                  >
                    <Svg d={I.x} />
                  </button>
                )}
              </div>
            ) : null}

            {/* Pane body (File tree or Bookmarks) */}
            <div className="ws-pane-body">
              {leftView === 'files' && p.sidebar}
              {leftView === 'bookmarks' && (
                bookmarks.length === 0 ? (
                  <div style={{ padding: 'var(--s4)', color: 'var(--text-faint)', fontSize: 'var(--fs-sm)', textAlign: 'center', lineHeight: 1.5 }}>
                    <div style={{ fontSize: 24, marginBottom: 'var(--s2)' }}>🔖</div>
                    <strong>No bookmarks yet</strong>
                    <p style={{ marginTop: 4, fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                      Bookmark important evidence or suspects from the note subhead or 'More options' menu.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: 'var(--s1) 0' }}>
                    {bookmarks.map((bPath) => {
                      const noteName = bPath.split('/').pop()!.replace(/\.md$/, '')
                      const isSelected = path === bPath
                      return (
                        <div
                          key={bPath}
                          className={`tree-item-row${isSelected ? ' is-selected' : ''}`}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--s1) var(--s3)', cursor: 'pointer' }}
                          onClick={() => {
                            p.onSelectFile(bPath)
                            setView('editor')
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)', minWidth: 0, overflow: 'hidden' }}>
                            <span style={{ color: 'var(--color-amber)', fontSize: 13 }}>★</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--fs-sm)' }}>
                              {noteName}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="ws-pane-action-btn"
                            title={`Remove ${noteName} from bookmarks`}
                            aria-label={`Remove ${noteName} from bookmarks`}
                            style={{ width: 20, height: 20 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleBookmark(bPath)
                            }}
                          >
                            <Svg d={I.x} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              )}
            </div>

            {/* Pane foot: Vault info & settings */}
            <div className="ws-pane-foot">
              <button
                type="button"
                className="ws-vault"
                onClick={p.onOpenVault}
                title="Open another vault folder"
              >
                <Svg d={I.vault} />
                <span style={{ marginLeft: 'var(--s1)' }}>{formatCaseDisplayName(p.vaultName)}</span>
              </button>
              <span className="ws-grow" />
              <button
                type="button"
                className="ws-pane-action-btn"
                title="Help & Shortcuts (⌘/)"
                aria-label="Help & Shortcuts"
                onClick={() => window.dispatchEvent(new CustomEvent('syndicate-brain:open-shortcuts'))}
              >
                <Svg d={I.help} />
              </button>
              <button
                type="button"
                className="ws-pane-action-btn"
                title="Settings (⌘,)"
                aria-label="Settings"
                onClick={() => window.dispatchEvent(new CustomEvent('syndicate-brain:open-settings'))}
              >
                <Svg d={I.settings} />
              </button>
            </div>
          </aside>
        )}

        {/* Main Workspace Area */}
        <div className="ws-main-area">
          <div className="ws-panes-row">
            {/* Center Main Tabbed Area */}
            <main className="ws-main">
              <div className="ws-tabbar">
                {!leftOpen && (
                  <div className="ws-tabbar-actions">
                    <button
                      type="button"
                      className="ws-pane-action-btn"
                      title="Expand sidebar"
                      aria-label="Expand sidebar"
                      onClick={() => setLeftOpen(true)}
                    >
                      <Svg d={I.panelLeft} />
                    </button>
                  </div>
                )}
                <div className="ws-tabs">
                  {activeView === 'graph' && (
                    <div
                      className="ws-tab is-active"
                      role="tab"
                      aria-selected={true}
                    >
                      <span style={{ marginRight: '6px', display: 'inline-flex', alignItems: 'center' }}>
                        <Svg d={I.graph} />
                      </span>
                      <span className="ws-tab-label">Graph view</span>
                      <button
                        type="button"
                        className="ws-tab-x"
                        title="Close graph view"
                        aria-label="Close graph view"
                        onClick={(e) => {
                          e.stopPropagation()
                          setView('editor')
                        }}
                      >
                        <Svg d={I.x} />
                      </button>
                    </div>
                  )}
                  {tabs.map((t) => (
                    <div
                      key={t.id}
                      className={`ws-tab${activeView === 'editor' && t.id === activeTab ? ' is-active' : ''}${closingTabIds.includes(t.id) ? ' is-closing' : ''}`}
                      onClick={() => {
                        if (activeView !== 'editor') setView('editor')
                        if (!closingTabIds.includes(t.id)) selectTab(t)
                      }}
                      onAuxClick={(e) => {
                        if (e.button === 1) {
                          e.preventDefault()
                          closeTab(t.id)
                        }
                      }}
                      role="tab"
                      tabIndex={0}
                      aria-selected={t.id === activeTab}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') selectTab(t)
                      }}
                    >
                      <span className="ws-tab-label">
                        {t.path ? t.path.split('/').pop()!.replace(/\.md$/, '') : 'New tab'}
                      </span>
                      <button
                        type="button"
                        className="ws-tab-x"
                        title="Close tab"
                        aria-label={`Close ${t.path ? t.path.split('/').pop()!.replace(/\.md$/, '') : 'tab'}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          closeTab(t.id)
                        }}
                      >
                        <Svg d={I.x} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="ws-tabbar-actions">
                  <button
                    type="button"
                    className="ws-pane-action-btn"
                    title="New tab (⌘T)"
                    aria-label="New tab"
                    onClick={openEmptyTab}
                  >
                    <Svg d={I.plus} />
                  </button>
                </div>
                <span className="ws-grow" />
                {!rightOpen && (
                  <div className="ws-tabbar-actions">
                    <button
                      type="button"
                      className="ws-pane-action-btn"
                      title="Open Copilot"
                      aria-label="Open Copilot"
                      onClick={() => setRightOpen(true)}
                    >
                      <Svg d={I.panelRight} />
                    </button>
                  </div>
                )}
              </div>

              {/* Obsidian Pane Navigation Subhead Bar */}
              <div className="ws-subhead">
                <div className="ws-subhead-nav">
                  <button
                    type="button"
                    className="ws-pane-action-btn"
                    title="Back (Alt+Left)"
                    aria-label="Back"
                    disabled={historyIndex <= 0}
                    onClick={goBack}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="ws-pane-action-btn"
                    title="Forward (Alt+Right)"
                    aria-label="Forward"
                    disabled={historyIndex >= history.length - 1 || historyIndex === -1}
                    onClick={goForward}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
                <div className="ws-subhead-title">
                  {activeView === 'graph' ? 'Evidence Graph' : (current?.path ? current.path.split('/').pop()!.replace(/\.md$/, '') : 'New tab')}
                </div>
                <span className="ws-grow" />

                {/* Bookmark Toggle Button (BUG-06) */}
                {current?.path && activeView !== 'graph' && (
                  <button
                    type="button"
                    className={`ws-pane-action-btn${bookmarks.includes(current.path) ? ' is-active' : ''}`}
                    title={bookmarks.includes(current.path) ? 'Remove bookmark' : 'Bookmark note'}
                    aria-label={bookmarks.includes(current.path) ? 'Remove bookmark' : 'Bookmark note'}
                    style={{ color: bookmarks.includes(current.path) ? 'var(--color-amber, #f59e0b)' : undefined, marginRight: 4 }}
                    onClick={() => toggleBookmark(current.path!)}
                  >
                    <Svg d={I.bookmark} />
                  </button>
                )}

                {/* Subhead More Options Dropdown (BUG-04) */}
                <div className="ws-topbar-dropdown-wrap" ref={moreMenuRef}>
                  <button
                    type="button"
                    className={`ws-pane-action-btn${isMoreMenuOpen ? ' is-active' : ''}`}
                    title="More options"
                    aria-label="More options"
                    aria-haspopup="true"
                    aria-expanded={isMoreMenuOpen}
                    onClick={() => setIsMoreMenuOpen((v) => !v)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="19" cy="12" r="1" />
                      <circle cx="5" cy="12" r="1" />
                    </svg>
                  </button>
                  {isMoreMenuOpen && (
                    <div className="ws-topbar-menu" style={{ right: 0, left: 'auto', minWidth: 210 }}>
                      <button
                        type="button"
                        className="ws-topbar-menu-item"
                        onClick={copyCurrentPath}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>{copyFeedback ? '✓ Copied path!' : 'Copy note path'}</span>
                      </button>
                      {current?.path && (
                        <button
                          type="button"
                          className="ws-topbar-menu-item"
                          onClick={() => {
                            setIsMoreMenuOpen(false)
                            toggleBookmark(current.path!)
                          }}
                        >
                          <Svg d={I.bookmark} />
                          <span>{bookmarks.includes(current.path) ? 'Remove bookmark' : 'Bookmark note'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="ws-topbar-menu-item"
                        onClick={() => {
                          setIsMoreMenuOpen(false)
                          setView(activeView === 'graph' ? 'editor' : 'graph')
                        }}
                      >
                        <Svg d={I.graph} />
                        <span>{activeView === 'graph' ? 'Switch to Editor' : 'Show in Evidence Graph'}</span>
                      </button>
                      <button
                        type="button"
                        className="ws-topbar-menu-item"
                        onClick={() => {
                          setIsMoreMenuOpen(false)
                          p.onQuickSwitcher()
                        }}
                      >
                        <Svg d={I.search} />
                        <span>Quick Switcher (⌘O)</span>
                      </button>
                      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                      <button
                        type="button"
                        className="ws-topbar-menu-item"
                        style={{ color: 'var(--color-red)' }}
                        onClick={() => {
                          setIsMoreMenuOpen(false)
                          closeTab(activeTab)
                        }}
                      >
                        <Svg d={I.x} />
                        <span>Close tab</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="ws-content">
                <div
                  id="editor-pane-container"
                  className="ws-editor-host w-full h-full"
                  hidden={activeView !== 'editor'}
                >
                  {showEditor ? p.editor : (
                    <div className="ws-empty-obsidian">
                      <button type="button" className="ws-empty-action" onClick={p.onNewNote}>
                        Create new note <span className="ws-empty-kbd">(⌘ N)</span>
                      </button>
                      <button type="button" className="ws-empty-action" onClick={p.onQuickSwitcher}>
                        Go to file <span className="ws-empty-kbd">(⌘ O)</span>
                      </button>
                      <button type="button" className="ws-empty-action ws-empty-close" onClick={() => closeTab(activeTab)}>
                        Close
                      </button>
                    </div>
                  )}
                </div>

                {activeView === 'graph' && (
                  <div
                    id="graph-canvas-container"
                    className="graph-canvas-host w-full h-full"
                    role="region"
                    aria-label="Evidence Graph Canvas"
                  >
                    <ObsidianGraphView
                      caseId={p.vaultName || 'Case_01_Sonipat_Arms'}
                      data={graphData}
                      onSelectNode={(_nodeId, filePath) => {
                        if (filePath) {
                          p.onSelectFile(filePath)
                          setView('editor')
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </main>

            {/* Right Rail Pane — Dedicated Copilot Panel */}
            {rightOpen && (
              <aside className="ws-pane ws-pane-right ws-pane-copilot">
                <div className="ws-pane-copilot-head">
                  <div className="ws-copilot-title">
                    <Svg d={I.copilot} />
                    <span>Copilot</span>
                  </div>
                  <span className="ws-grow" />
                  <button
                    type="button"
                    className="ws-pane-action-btn"
                    title="Close Copilot"
                    aria-label="Close Copilot"
                    onClick={() => setRightOpen(false)}
                  >
                    <Svg d={I.x} />
                  </button>
                </div>
                <CopilotPanel
                  caseId={p.vaultName || 'Case_01_Sonipat_Arms'}
                  isCaseOpen={true}
                  onClose={() => setRightOpen(false)}
                  onCitationClick={(source) => {
                    const matching = p.files.find((f) => f.path.includes(source) || source.includes(f.name))
                    if (matching) p.onSelectFile(matching.path)
                  }}
                  onNoteClick={(notePath) => p.onSelectFile(notePath)}
                />
              </aside>
            )}
          </div>

          <StatusBar
            caseName={p.vaultName ?? 'Obsidian Vault'}
            filePath={path}
            wordCount={p.wordCount}
            saveStatus={p.saveStatus}
            noteCount={p.files.filter((f) => f.path.endsWith('.md')).length}
            linkCount={graphData?.edges?.length}
            activeView={activeView}
            nodeCount={graphData?.nodes?.length}
            edgeCount={graphData?.edges?.length}
          />
        </div>
      </div>
    )
  }
