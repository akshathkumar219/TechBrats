import {
  useState, useEffect, useRef, useCallback, type ReactNode, type PointerEvent as RPointerEvent,
} from 'react'
import type React from 'react'
import type { VaultFile } from '../fs/vault'
import { StatusBar } from './StatusBar'

/* ------------------------------------------------------------------ *
 * Workspace — the Obsidian-style shell. One file, layout only.
 *   ribbon | left sidebar | tabbed centre | copilot sidebar
 * Panes collapse + drag-resize. Tabs are real. Copilot echoes locally.
 * ------------------------------------------------------------------ */

const CSS = `
.ws {
  --ws-ribbon: 44px;
  --ws-tabbar: 36px;
  --ws-head: 34px;
  --ws-handle: 5px;
  --ws-icon: 28px;
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: var(--bg-void);
  color: var(--text-primary);
  font-family: var(--font-ui);
  font-size: var(--fs-base);
}
.ws-body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}
.ws button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }

/* ---- ribbon ---- */
.ws-ribbon {
  width: var(--ws-ribbon);
  flex: 0 0 var(--ws-ribbon);
  background: var(--bg-base);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--s2) 0;
  gap: var(--s1);
}
.ws-ribbon-spacer { flex: 1 1 auto; }
.ws-ico {
  width: var(--ws-icon);
  height: var(--ws-icon);
  display: grid;
  place-items: center;
  border-radius: var(--r-sm);
  color: var(--text-muted);
  transition: background var(--t-fast), color var(--t-fast);
}
.ws-ico:hover { background: var(--bg-raised); color: var(--text-primary); }
.ws-ico.is-active { background: var(--bg-overlay); color: var(--accent); }
.ws-ico:disabled { opacity: 0.35; cursor: default; }
.ws-ico:disabled:hover { background: none; color: var(--text-muted); }

/* ---- generic side pane ---- */
.ws-pane {
  background: var(--bg-base);
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
.ws-pane-left { border-right: 1px solid var(--border); }
.ws-pane-right { border-left: 1px solid var(--border); }
.ws-pane-head {
  height: var(--ws-tabbar);
  flex: 0 0 var(--ws-tabbar);
  display: flex;
  align-items: center;
  gap: var(--s1);
  padding: 0 var(--s2);
  border-bottom: 1px solid var(--border);
  user-select: none;
}
.ws-pane-title {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-left: var(--s1);
}
.ws-grow { flex: 1 1 auto; }
.ws-pane-body { flex: 1 1 auto; overflow: auto; min-height: 0; }
.ws-pane-body .left {
  border-right: 0;
  background: transparent;
  height: 100%;
}
.ws-pane-body .left > .left-search-box,
.ws-pane-body .left > .panel-header { display: none; }
.ws-pane-foot {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: var(--s1);
  padding: var(--s2);
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-size: var(--fs-sm);
}
.ws-vault {
  flex: 1 1 auto;
  text-align: left;
  padding: var(--s1) var(--s2);
  border-radius: var(--r-sm);
  color: var(--text-body);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ws-vault:hover { background: var(--bg-raised); color: var(--text-primary); }

/* ---- drag handle ---- */
.ws-handle {
  flex: 0 0 var(--ws-handle);
  width: var(--ws-handle);
  cursor: col-resize;
  background: transparent;
  transition: background var(--t-fast);
}
.ws-handle:hover, .ws-handle.is-dragging { background: var(--accent-dim); }

/* ---- centre ---- */
.ws-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-void);
  position: relative;
}
.ws-tabbar {
  height: var(--ws-tabbar);
  flex: 0 0 var(--ws-tabbar);
  display: flex;
  align-items: stretch;
  background: var(--bg-base);
  border-bottom: 1px solid var(--border);
  user-select: none;
}
.ws-tabs { display: flex; align-items: stretch; overflow-x: auto; scrollbar-width: none; }
.ws-tabs::-webkit-scrollbar { display: none; }
.ws-tab {
  display: flex;
  align-items: center;
  gap: var(--s2);
  max-width: 200px;
  padding: 0 var(--s2) 0 var(--s3);
  border-right: 1px solid var(--border);
  color: var(--text-muted);
  white-space: nowrap;
  transition: background var(--t-fast), color var(--t-fast);
}
.ws-tab:hover { background: var(--bg-raised); color: var(--text-body); }
.ws-tab.is-active { background: var(--bg-void); color: var(--text-primary); }
.ws-tab-label { overflow: hidden; text-overflow: ellipsis; }
.ws-tab-x {
  width: var(--fs-md);
  height: var(--fs-md);
  display: grid;
  place-items: center;
  border-radius: var(--r-sm);
  opacity: 0;
  color: var(--text-muted);
}
.ws-tab:hover .ws-tab-x, .ws-tab.is-active .ws-tab-x { opacity: 1; }
.ws-tab-x:hover { background: var(--bg-overlay); color: var(--text-primary); }
.ws-tabbar-actions { display: flex; align-items: center; padding: 0 var(--s1); gap: var(--s1); }

.ws-notehead {
  height: var(--ws-head);
  flex: 0 0 var(--ws-head);
  display: flex;
  align-items: center;
  gap: var(--s1);
  padding: 0 var(--s2);
  color: var(--text-muted);
  user-select: none;
}
.ws-notehead-title {
  flex: 1 1 auto;
  text-align: center;
  color: var(--text-body);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ws-content { flex: 1 1 auto; min-height: 0; overflow: hidden; display: flex; }
.ws-content > .center { flex: 1 1 auto; min-width: 0; }

.ws-empty {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--s4);
  color: var(--text-faint);
}
.ws-empty button {
  color: var(--accent);
  padding: var(--s1) var(--s2);
  border-radius: var(--r-sm);
}
.ws-empty button:hover { background: var(--accent-bg); }

.ws-status {
  position: absolute;
  right: var(--s3);
  bottom: var(--s2);
  display: flex;
  align-items: center;
  gap: var(--s2);
  font-size: var(--fs-xs);
  color: var(--text-faint);
  pointer-events: none;
  user-select: none;
}
.ws-dot { width: var(--s2); height: var(--s2); border-radius: 50%; background: var(--ok); }
.ws-dot.is-unsaved { background: var(--accent); }

/* ---- copilot ---- */
.ws-chat { display: flex; flex-direction: column; height: 100%; }
.ws-chat-log {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: var(--s3);
  display: flex;
  flex-direction: column;
  gap: var(--s3);
  min-height: 0;
}
.ws-chat-empty { margin: auto; text-align: center; color: var(--text-faint); padding: var(--s4); }
.ws-msg {
  max-width: 90%;
  padding: var(--s2) var(--s3);
  border-radius: var(--r-md);
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}
.ws-msg.is-user { align-self: flex-end; background: var(--accent-bg); color: var(--text-primary); }
.ws-msg.is-bot { align-self: flex-start; background: var(--bg-raised); color: var(--text-body); }
.ws-chat-form {
  flex: 0 0 auto;
  border-top: 1px solid var(--border);
  padding: var(--s2);
  display: flex;
  gap: var(--s2);
  align-items: flex-end;
}
.ws-chat-input {
  flex: 1 1 auto;
  resize: none;
  min-height: var(--s6);
  max-height: calc(var(--s6) * 4);
  padding: var(--s2);
  border-radius: var(--r-sm);
  border: 1px solid var(--border);
  background: var(--bg-inset);
  color: var(--text-primary);
  font: inherit;
  outline: none;
}
.ws-chat-input:focus { border-color: var(--border-strong); }
.ws-send {
  padding: var(--s2) var(--s3);
  border-radius: var(--r-sm);
  background: var(--bg-raised);
  color: var(--text-body);
}
.ws-send:hover:not(:disabled) { background: var(--bg-overlay); color: var(--text-primary); }
.ws-send:disabled { opacity: 0.4; cursor: default; }
`

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
  newNote: 'M4 4h10l6 6v10H4z|M14 4v6h6|M12 12v5|M9.5 14.5h5',
  newFolder: 'M3 6h6l2 2h10v10H3z|M12 11v5|M9.5 13.5h5',
  sort: 'M6 5v14|M3.5 15.5L6 19l2.5-3.5|M11 7h9|M11 12h6|M11 17h3',
  collapse: 'M5 8l4 4-4 4|M13 8l4 4-4 4',
  chevron: 'M9 6l6 6-6 6',
  panelLeft: 'M4 5h16v14H4z|M10 5v14',
  panelRight: 'M4 5h16v14H4z|M14 5v14',
  back: 'M15 6l-6 6 6 6',
  forward: 'M9 6l6 6-6 6',
  dots: 'M6 12h.01|M12 12h.01|M18 12h.01',
  plus: 'M12 5v14|M5 12h14',
  x: 'M6 6l12 12|M18 6L6 18',
  copilot: 'M12 4a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3h1V8a4 4 0 0 1 4-4z|M9.5 14h.01|M14.5 14h.01',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6|M4 12h2|M18 12h2|M12 4v2|M12 18v2',
  help: 'M9.5 9a2.5 2.5 0 1 1 3 2.5V13|M12 16.5h.01|M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
  send: 'M4 12l16-8-6 8 6 8z',
}

function IconBtn(props: {
  icon: string; label: string; active?: boolean; disabled?: boolean; onClick?: () => void
}) {
  return (
    <button type="button" className={`ws-ico${props.active ? ' is-active' : ''}`}
      title={props.label} aria-label={props.label}
      disabled={props.disabled} onClick={props.onClick}>
      <Svg d={props.icon} />
    </button>
  )
}

/* ---------------------------- tabs ---------------------------- */
interface Tab { id: string; path: string | null }
let tabSeq = 0
const newTab = (path: string | null = null): Tab => ({ id: `t${++tabSeq}`, path })

/* ---------------------------- copilot ---------------------------- */
interface ChatMsg { id: string; role: 'user' | 'bot'; text: string }
let msgSeq = 0

interface CopilotProps {
  messages: ChatMsg[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMsg[]>>
  draft: string
  setDraft: (v: string) => void
}

function Copilot({ messages, setMessages, draft, setDraft }: CopilotProps) {
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [messages])

  const send = () => {
    const text = draft.trim()
    if (!text) return
    const user: ChatMsg = { id: `m${++msgSeq}`, role: 'user', text }
    const bot: ChatMsg = {
      id: `m${++msgSeq}`, role: 'bot',
      text: 'Copilot is not wired to a model yet — this is a local echo.\n\nYou said: ' + text,
    }
    setMessages((prev) => [...prev, user])
    setDraft('')
    window.setTimeout(() => setMessages((prev) => [...prev, bot]), 250)
  }

  return (
    <div className="ws-chat">
      <div className="ws-chat-log" ref={logRef}>
        {messages.length === 0 ? (
          <div className="ws-chat-empty">
            <p>Ask Copilot about the open note.</p>
            <p style={{ marginTop: 'var(--s2)', fontSize: 'var(--fs-sm)' }}>
              Not connected to a model yet.
            </p>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`ws-msg is-${m.role}`}>{m.text}</div>
          ))
        )}
      </div>
      <form
        className="ws-chat-form"
        onSubmit={(e) => { e.preventDefault(); send() }}
      >
        <textarea
          className="ws-chat-input"
          rows={1}
          value={draft}
          placeholder="Message Copilot..."
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
          }}
        />
        <button type="submit" className="ws-send" disabled={!draft.trim()} title="Send">
          <Svg d={I.send} />
        </button>
      </form>
    </div>
  )
}

/* ---------------------------- resize ---------------------------- */
function useResizer(set: (px: number) => void, from: 'left' | 'right') {
  const [dragging, setDragging] = useState(false)
  const onPointerDown = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
    const move = (ev: PointerEvent) => {
      set(from === 'left' ? ev.clientX : window.innerWidth - ev.clientX)
    }
    const up = () => {
      setDragging(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [set, from])
  return { dragging, onPointerDown }
}

/* ---------------------------- shell ---------------------------- */
export interface WorkspaceProps {
  vaultName: string | null
  files: VaultFile[]
  activeFile: VaultFile | null
  wordCount: number
  saveStatus: 'saved' | 'unsaved'
  sidebar: ReactNode
  editor: ReactNode
  onSelectFile: (path: string) => void
  onOpenVault: () => void
  onNewNote: () => void
  onNewFolder: () => void
  onQuickSwitcher: () => void
  onSearch: () => void
}

const LEFT_MIN = 180, LEFT_MAX = 460, RIGHT_MIN = 220, RIGHT_MAX = 520

export function Workspace(p: WorkspaceProps) {
  const [leftOpen, setLeftOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('sb_left_open')
    return saved !== null ? saved === 'true' : true
  })
  const [rightOpen, setRightOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem('sb_right_open')
    return saved !== null ? saved === 'true' : true
  })
  const [leftW, setLeftW] = useState<number>(() => {
    const saved = localStorage.getItem('sb_left_w')
    if (saved !== null) {
      const parsed = Number(saved)
      if (!isNaN(parsed) && parsed >= LEFT_MIN && parsed <= LEFT_MAX) return parsed
    }
    return 250
  })
  const [rightW, setRightW] = useState<number>(() => {
    const saved = localStorage.getItem('sb_right_w')
    if (saved !== null) {
      const parsed = Number(saved)
      if (!isNaN(parsed) && parsed >= RIGHT_MIN && parsed <= RIGHT_MAX) return parsed
    }
    return 300
  })
  const [leftView, setLeftView] = useState<'files' | 'search' | 'bookmarks'>('files')

  useEffect(() => {
    localStorage.setItem('sb_left_open', String(leftOpen))
  }, [leftOpen])

  useEffect(() => {
    localStorage.setItem('sb_right_open', String(rightOpen))
  }, [rightOpen])

  useEffect(() => {
    localStorage.setItem('sb_left_w', String(leftW))
  }, [leftW])

  useEffect(() => {
    localStorage.setItem('sb_right_w', String(rightW))
  }, [rightW])

  const [chat, setChat] = useState<ChatMsg[]>([])
  const [chatDraft, setChatDraft] = useState('')

  const [tabs, setTabs] = useState<Tab[]>(() => [newTab()])
  const [activeTab, setActiveTab] = useState<string>(() => tabs[0].id)
  const [history, setHistory] = useState<string[]>([])
  const [histAt, setHistAt] = useState(-1)
  const navigating = useRef(false)

  const clampL = useCallback(
    (px: number) => setLeftW(Math.min(LEFT_MAX, Math.max(LEFT_MIN, px - 44))), [])
  const clampR = useCallback(
    (px: number) => setRightW(Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, px))), [])
  const leftDrag = useResizer(clampL, 'left')
  const rightDrag = useResizer(clampR, 'right')

  /* external navigation (wiki link, quick switcher, tree click) lands in a tab */
  const path = p.activeFile?.path ?? null
  useEffect(() => {
    if (!path) return
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
    if (navigating.current) { navigating.current = false; return }
    setHistory((h) => {
      const cut = h.slice(0, histAt + 1)
      if (cut[cut.length - 1] === path) return cut
      setHistAt(cut.length)
      return [...cut, path]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  const go = (delta: number) => {
    const i = histAt + delta
    if (i < 0 || i >= history.length) return
    navigating.current = true
    setHistAt(i)
    p.onSelectFile(history[i])
  }

  const openEmptyTab = () => {
    const t = newTab()
    setTabs((prev) => [...prev, t])
    setActiveTab(t.id)
  }

  const closeTab = (id: string) => {
    setTabs((prev) => {
      if (prev.length === 1) return [newTab()]
      const i = prev.findIndex((t) => t.id === id)
      const next = prev.filter((t) => t.id !== id)
      if (id === activeTab) {
        const focus = next[Math.min(i, next.length - 1)]
        setActiveTab(focus.id)
        if (focus.path && focus.path !== path) p.onSelectFile(focus.path)
      }
      return next
    })
  }

  const selectTab = (t: Tab) => {
    setActiveTab(t.id)
    if (t.path && t.path !== path) p.onSelectFile(t.path)
  }

  const current = tabs.find((t) => t.id === activeTab) ?? tabs[0]
  const showEditor = current?.path !== null && current?.path === path
  const title = current?.path ? current.path.split('/').pop()!.replace(/\.md$/, '') : 'New tab'

  const leftTitle =
    leftView === 'files' ? 'Files' : leftView === 'search' ? 'Search' : 'Bookmarks'

  return (
    <div className="ws">
      <style>{CSS}</style>

      <div className="ws-body">
        {/* ribbon */}
        <nav className="ws-ribbon">
          <IconBtn icon={I.files} label="Files" active={leftOpen && leftView === 'files'}
            onClick={() => { setLeftView('files'); setLeftOpen(true) }} />
          <IconBtn icon={I.search} label="Search (⌘⇧F)" onClick={p.onSearch} />
          <IconBtn icon={I.bookmark} label="Bookmarks" active={leftOpen && leftView === 'bookmarks'}
            onClick={() => { setLeftView('bookmarks'); setLeftOpen(true) }} />
          <IconBtn icon={I.newNote} label="New note" onClick={p.onNewNote} />
          <IconBtn icon={I.copilot} label="Toggle Copilot" active={rightOpen}
            onClick={() => setRightOpen((v) => !v)} />
          <div className="ws-ribbon-spacer" />
          <IconBtn icon={I.settings} label="Settings (not wired)" disabled />
        </nav>

        {/* left sidebar */}
        {leftOpen && (
          <>
            <aside className="ws-pane ws-pane-left" style={{ width: leftW, flex: `0 0 ${leftW}px` }}>
              <div className="ws-pane-head">
                <span className="ws-pane-title">{leftTitle}</span>
                <span className="ws-grow" />
                <IconBtn icon={I.newNote} label="New note" onClick={p.onNewNote} />
                <IconBtn icon={I.newFolder} label="New folder" onClick={p.onNewFolder} />
                <IconBtn icon={I.sort} label="Sort (not wired)" disabled />
                <IconBtn icon={I.panelLeft} label="Collapse sidebar"
                  onClick={() => setLeftOpen(false)} />
              </div>
              <div className="ws-pane-body">
                {leftView === 'files' ? p.sidebar : (
                  <div style={{ padding: 'var(--s4)', color: 'var(--text-faint)' }}>
                    {leftTitle} view is not built yet.
                  </div>
                )}
              </div>
              <div className="ws-pane-foot">
                <button type="button" className="ws-vault" onClick={p.onOpenVault}
                  title="Open another vault folder">
                  {p.vaultName ?? 'Open folder...'}
                </button>
                <IconBtn icon={I.help} label="Help (not wired)" disabled />
                <IconBtn icon={I.settings} label="Settings (not wired)" disabled />
              </div>
            </aside>
            <div className={`ws-handle${leftDrag.dragging ? ' is-dragging' : ''}`}
              onPointerDown={leftDrag.onPointerDown} />
          </>
        )}

        {/* centre */}
        <main className="ws-main">
          <div className="ws-tabbar">
            {!leftOpen && (
              <div className="ws-tabbar-actions">
                <IconBtn icon={I.panelLeft} label="Expand sidebar" onClick={() => setLeftOpen(true)} />
              </div>
            )}
            <div className="ws-tabs">
              {tabs.map((t) => (
                <div key={t.id}
                  className={`ws-tab${t.id === activeTab ? ' is-active' : ''}`}
                  onClick={() => selectTab(t)}
                  onAuxClick={(e) => { if (e.button === 1) { e.preventDefault(); closeTab(t.id) } }}
                  role="tab" tabIndex={0} aria-selected={t.id === activeTab}
                  onKeyDown={(e) => { if (e.key === 'Enter') selectTab(t) }}
                >
                  <span className="ws-tab-label">
                    {t.path ? t.path.split('/').pop()!.replace(/\.md$/, '') : 'New tab'}
                  </span>
                  <button type="button" className="ws-tab-x" title="Close tab"
                    onClick={(e) => { e.stopPropagation(); closeTab(t.id) }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="ws-tabbar-actions">
              <IconBtn icon={I.plus} label="New tab" onClick={openEmptyTab} />
              <span className="ws-grow" />
            </div>
            <span className="ws-grow" />
            <div className="ws-tabbar-actions">
              {!rightOpen && (
                <IconBtn icon={I.panelRight} label="Expand Copilot"
                  onClick={() => setRightOpen(true)} />
              )}
            </div>
          </div>

          <div className="ws-notehead">
            <IconBtn icon={I.back} label="Back" disabled={histAt <= 0} onClick={() => go(-1)} />
            <IconBtn icon={I.forward} label="Forward"
              disabled={histAt >= history.length - 1} onClick={() => go(1)} />
            <span className="ws-notehead-title">{title}</span>
            <IconBtn icon={I.dots} label="More (not wired)" disabled />
          </div>

          <div className="ws-content">
            {showEditor ? p.editor : (
              <div className="ws-empty">
                <button type="button" onClick={p.onNewNote}>Create new note</button>
                <button type="button" onClick={p.onQuickSwitcher}>Go to file (⌘O)</button>
                <button type="button" onClick={() => closeTab(current.id)}>Close</button>
              </div>
            )}
          </div>
        </main>

        {/* copilot */}
        {rightOpen && (
          <>
            <div className={`ws-handle${rightDrag.dragging ? ' is-dragging' : ''}`}
              onPointerDown={rightDrag.onPointerDown} />
            <aside className="ws-pane ws-pane-right" style={{ width: rightW, flex: `0 0 ${rightW}px` }}>
              <div className="ws-pane-head">
                <Svg d={I.copilot} />
                <span className="ws-pane-title">Copilot</span>
                <span className="ws-grow" />
                <IconBtn icon={I.panelRight} label="Collapse Copilot"
                  onClick={() => setRightOpen(false)} />
              </div>
              <div className="ws-pane-body" style={{ overflow: 'hidden' }}>
                <Copilot messages={chat} setMessages={setChat}
                  draft={chatDraft} setDraft={setChatDraft} />
              </div>
            </aside>
          </>
        )}
      </div>

      <StatusBar
        caseName={p.vaultName ?? 'Case_01_Sonipat_Arms'}
        filePath={path}
        wordCount={p.wordCount}
        saveStatus={p.saveStatus}
        noteCount={p.files.filter((f) => f.path.endsWith('.md')).length || 42}
        linkCount={36}
      />
    </div>
  )
}
