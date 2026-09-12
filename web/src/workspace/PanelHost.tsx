/**
 * SyndicateBrain Right-Rail Panel Host (HAR-T06)
 *
 * Public Signature:
 * export function PanelHost(props: PanelHostProps): JSX.Element
 *
 * Props:
 * - activePanel: PanelId ('copilot' | 'proposals' | 'inspector' | 'changed' | string)
 * - onSelectPanel: (panelId: PanelId) => void
 * - panelList?: (PanelId | PanelItem)[] (or panels?: (PanelId | PanelItem)[])
 * - collapseToggle?: () => void (or onCollapse?: () => void, onToggleCollapse?: () => void)
 * - isCollapsed?: boolean
 * - width?: number | string
 * - style?: CSSProperties
 * - className?: string
 * - children?: ReactNode
 *
 * Modular host component for the right rail where 'copilot', 'proposals',
 * 'inspector', and 'changed' panels can be hosted and switched between tabs cleanly.
 * Styling: zero hex codes, 100% token styling from web/src/index.css.
 */

import { useMemo, type ReactNode, type CSSProperties } from 'react'

export type StandardPanelId = 'copilot' | 'proposals' | 'inspector' | 'changed'
export type PanelId = StandardPanelId | (string & {})

export interface PanelItem {
  id: PanelId
  label: string
  icon?: ReactNode
  badge?: string | number
  content?: ReactNode
  disabled?: boolean
  ariaLabel?: string
  accentColor?: string
}

export interface PanelHostProps {
  activePanel: PanelId
  onSelectPanel: (panelId: PanelId) => void
  panelList?: (PanelId | PanelItem)[]
  panels?: (PanelId | PanelItem)[]
  collapseToggle?: () => void
  onCollapse?: () => void
  onToggleCollapse?: () => void
  isCollapsed?: boolean
  width?: number | string
  style?: CSSProperties
  className?: string
  children?: ReactNode
}

const PANEL_HOST_CSS = `
.panel-host {
  background-color: var(--bg-base);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  position: relative;
  font-family: var(--font-ui);
  font-size: var(--fs-base);
  color: var(--text-primary);
}
.panel-host-head {
  height: var(--ws-tabbar, 36px);
  flex: 0 0 var(--ws-tabbar, 36px);
  display: flex;
  align-items: center;
  gap: var(--s1);
  padding: 0 var(--s2);
  border-bottom: 1px solid var(--border);
  background-color: var(--bg-base);
  user-select: none;
  overflow-x: auto;
  scrollbar-width: none;
}
.panel-host-head::-webkit-scrollbar {
  display: none;
}
.panel-host-tab {
  display: flex;
  align-items: center;
  gap: var(--s1);
  height: 100%;
  padding: 0 var(--s2);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-family: var(--font-ui);
  font-size: var(--fs-sm);
  font-weight: 400;
  white-space: nowrap;
  cursor: pointer;
  transition: color var(--t-fast), border-color var(--t-fast), background var(--t-fast);
}
.panel-host-tab:hover:not(:disabled) {
  background-color: var(--bg-raised);
  color: var(--text-primary);
}
.panel-host-tab.is-active {
  font-weight: 600;
}
.panel-host-tab:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.panel-host-tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}
.panel-host-badge {
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
  padding: 1px var(--s1);
  border-radius: var(--r-sm);
  background-color: var(--bg-overlay);
  color: var(--text-body);
  border: 1px solid var(--border);
  line-height: 1.2;
}
.panel-host-collapse-btn {
  width: var(--s6);
  height: var(--s6);
  display: grid;
  place-items: center;
  border-radius: var(--r-sm);
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  transition: background var(--t-fast), color var(--t-fast);
  margin-left: auto;
}
.panel-host-collapse-btn:hover {
  background-color: var(--bg-overlay);
  color: var(--text-primary);
}
.panel-host-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-base);
}
.panel-host-empty {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--s5);
  gap: var(--s2);
  text-align: center;
  color: var(--text-muted);
}
.panel-host-empty-icon {
  width: var(--s6);
  height: var(--s6);
  color: var(--text-faint);
  margin-bottom: var(--s2);
}
.panel-host-empty-title {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--text-primary);
}
.panel-host-empty-desc {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  max-width: 260px;
  line-height: 1.5;
}
`

function CopilotIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3h1V8a4 4 0 0 1 4-4z" />
      <path d="M9.5 14h.01" />
      <path d="M14.5 14h.01" />
    </svg>
  )
}

function ProposalsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  )
}

function InspectorIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 21l-4.35-4.35" />
      <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
      <path d="M11 8v6" />
      <path d="M8 11h6" />
    </svg>
  )
}

function ChangedIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 15" />
    </svg>
  )
}

function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16v14H4z" />
      <path d="M14 5v14" />
    </svg>
  )
}

function getDefaultLabel(id: PanelId): string {
  switch (id) {
    case 'copilot':
      return 'Copilot'
    case 'proposals':
      return 'Proposals'
    case 'inspector':
      return 'Inspector'
    case 'changed':
      return 'Changed'
    default:
      return String(id).charAt(0).toUpperCase() + String(id).slice(1)
  }
}

function getDefaultIcon(id: PanelId): ReactNode {
  switch (id) {
    case 'copilot':
      return <CopilotIcon />
    case 'proposals':
      return <ProposalsIcon />
    case 'inspector':
      return <InspectorIcon />
    case 'changed':
      return <ChangedIcon />
    default:
      return null
  }
}

function getDefaultAccentColor(id: PanelId): string {
  switch (id) {
    case 'copilot':
      return 'var(--accent)'
    case 'proposals':
      return 'var(--hypothesis, var(--accent))'
    case 'inspector':
      return 'var(--info, var(--accent))'
    case 'changed':
      return 'var(--ok, var(--accent))'
    default:
      return 'var(--accent)'
  }
}

function renderDefaultEmptyState(id: PanelId) {
  switch (id) {
    case 'copilot':
      return (
        <div className="panel-host-empty">
          <div className="panel-host-empty-icon"><CopilotIcon /></div>
          <div className="panel-host-empty-title">Investigation Copilot</div>
          <div className="panel-host-empty-desc">
            Ask questions about the case with source verification on every claim.
          </div>
        </div>
      )
    case 'proposals':
      return (
        <div className="panel-host-empty">
          <div className="panel-host-empty-icon"><ProposalsIcon /></div>
          <div className="panel-host-empty-title">Adjudication Queue</div>
          <div className="panel-host-empty-desc">
            Review proposed entity connections, files to update, and contradictions.
          </div>
        </div>
      )
    case 'inspector':
      return (
        <div className="panel-host-empty">
          <div className="panel-host-empty-icon"><InspectorIcon /></div>
          <div className="panel-host-empty-title">Provenance Inspector</div>
          <div className="panel-host-empty-desc">
            Select an entity node or edge in the graph canvas to inspect evidentiary provenance.
          </div>
        </div>
      )
    case 'changed':
      return (
        <div className="panel-host-empty">
          <div className="panel-host-empty-icon"><ChangedIcon /></div>
          <div className="panel-host-empty-title">What Changed</div>
          <div className="panel-host-empty-desc">
            Run an analysis to inspect newly proposed connections and updated evidence files.
          </div>
        </div>
      )
    default:
      return (
        <div className="panel-host-empty">
          <div className="panel-host-empty-title">{getDefaultLabel(id)}</div>
          <div className="panel-host-empty-desc">Panel is ready.</div>
        </div>
      )
  }
}

const DEFAULT_PANEL_IDS: StandardPanelId[] = ['copilot', 'proposals', 'inspector', 'changed']

/**
 * Right-rail panel host component.
 *
 * Modular container for the right rail where copilot, proposals, inspector,
 * and changed panels can be hosted and switched between tabs cleanly.
 */
export function PanelHost({
  activePanel,
  onSelectPanel,
  panelList,
  panels,
  collapseToggle,
  onCollapse,
  onToggleCollapse,
  isCollapsed = false,
  width,
  style,
  className,
  children,
}: PanelHostProps) {
  const handleCollapse = collapseToggle ?? onCollapse ?? onToggleCollapse

  const normalizedPanels: PanelItem[] = useMemo(() => {
    const rawList = panelList ?? panels ?? DEFAULT_PANEL_IDS
    return rawList.map((item) => {
      if (typeof item === 'string') {
        return {
          id: item,
          label: getDefaultLabel(item),
          icon: getDefaultIcon(item),
          accentColor: getDefaultAccentColor(item),
        }
      }
      return {
        ...item,
        label: item.label || getDefaultLabel(item.id),
        icon: item.icon ?? getDefaultIcon(item.id),
        accentColor: item.accentColor ?? getDefaultAccentColor(item.id),
      }
    })
  }, [panelList, panels])

  if (isCollapsed) {
    return null
  }

  const activeItem = normalizedPanels.find((p) => p.id === activePanel)
  const activeAccent = activeItem?.accentColor ?? getDefaultAccentColor(activePanel)

  return (
    <aside
      className={`panel-host ${className || ''}`}
      style={{
        width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        flex: width !== undefined ? (typeof width === 'number' ? `0 0 ${width}px` : `0 0 ${width}`) : undefined,
        ...style,
      }}
      aria-label="Right Rail Panel Host"
    >
      <style>{PANEL_HOST_CSS}</style>

      {/* Tab bar header */}
      <div className="panel-host-head" role="tablist">
        {normalizedPanels.map((panel) => {
          const isActive = panel.id === activePanel
          const tabAccent = panel.accentColor || getDefaultAccentColor(panel.id)

          return (
            <button
              key={panel.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={panel.ariaLabel || panel.label}
              disabled={panel.disabled}
              className={`panel-host-tab${isActive ? ' is-active' : ''}`}
              style={{
                color: isActive ? tabAccent : 'var(--text-muted)',
                borderBottomColor: isActive ? tabAccent : 'transparent',
              }}
              onClick={() => {
                if (!panel.disabled) {
                  onSelectPanel(panel.id)
                }
              }}
            >
              {panel.icon && <span className="panel-host-tab-icon">{panel.icon}</span>}
              <span>{panel.label}</span>
              {panel.badge !== undefined && panel.badge !== null && (
                <span className="panel-host-badge">{panel.badge}</span>
              )}
            </button>
          )
        })}

        <div style={{ flex: '1 1 auto' }} />

        {handleCollapse && (
          <button
            type="button"
            className="panel-host-collapse-btn"
            onClick={handleCollapse}
            title="Collapse right rail"
            aria-label="Collapse right rail"
          >
            <CollapseIcon />
          </button>
        )}
      </div>

      {/* Panel body container */}
      <div
        className="panel-host-body"
        role="tabpanel"
        aria-label={`${activeItem?.label || activePanel} Panel`}
        style={{
          borderTop: `1px solid var(--border)`,
          '--active-panel-accent': activeAccent,
        } as CSSProperties}
      >
        {activeItem?.content ?? children ?? renderDefaultEmptyState(activePanel)}
      </div>
    </aside>
  )
}
