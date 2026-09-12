import { useState, useMemo, useCallback, useRef, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react'
import type { VaultFile } from '../fs/vault'
import { buildFileTree, type TreeNode } from '../lib/tree'
import { IngestDropZone } from './IngestDropZone'
import { EmptyState, LoadingSkeleton, ErrorState } from '../states'

export interface FileTreeProps {
  files: VaultFile[]
  folders?: string[]
  selectedPath: string | null
  reopenCandidateName?: string | null
  noteContents?: Record<string, string>
  onSelectFile: (path: string) => void
  onReopenVault?: () => void
  isLoading: boolean
  error: string | null
}

const FILE_TREE_CSS = `
.file-tree-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.tree-row.is-locked-file {
  color: var(--text-muted) !important;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  opacity: 0.82;
  border-left: 2px solid transparent;
}

.tree-row.is-locked-file:hover {
  background-color: rgba(232, 176, 75, 0.06);
  color: var(--text-body) !important;
  opacity: 1;
}

.tree-row.is-locked-file.active {
  background-color: var(--accent-bg);
  border-left-color: var(--accent);
  color: var(--accent) !important;
  opacity: 1;
}

.tree-row.is-locked-folder {
  color: var(--text-primary);
  font-weight: 600;
}

.tree-row.is-drag-over-raw {
  background-color: var(--accent-bg) !important;
  border: 1px dashed var(--accent) !important;
}

.locked-glyph-badge {
  font-size: 9px;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 4px;
  border-radius: var(--r-sm);
  background: rgba(232, 176, 75, 0.12);
  color: var(--evidence);
  border: 1px solid rgba(232, 176, 75, 0.25);
  margin-left: auto;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.locked-action-trigger {
  opacity: 0;
  margin-left: var(--s1);
  padding: 1px 4px;
  font-size: 10px;
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--text-muted);
  border: none;
  cursor: pointer;
  transition: opacity var(--t-fast);
}

.tree-row:hover .locked-action-trigger {
  opacity: 0.8;
}

.locked-action-trigger:hover {
  color: var(--danger);
}

.tree-raw-inputs-zone {
  margin: var(--s1) var(--s2) var(--s2) var(--s4);
  padding: var(--s2);
  background: var(--bg-inset);
  border: 1px dashed var(--border-strong);
  border-radius: var(--r-sm);
  display: flex;
  flex-direction: column;
  gap: var(--s1);
  font-size: var(--fs-xs);
  color: var(--text-muted);
  text-align: center;
  cursor: pointer;
  transition: all var(--t-fast);
}

.tree-raw-inputs-zone:hover,
.tree-raw-inputs-zone.is-dragover {
  border-color: var(--accent);
  background: var(--accent-bg);
  color: var(--text-primary);
}

.tree-refusal-toast {
  position: absolute;
  bottom: var(--s3);
  left: var(--s2);
  right: var(--s2);
  background: var(--bg-overlay);
  border: 1px solid var(--danger);
  box-shadow: var(--shadow-pop);
  border-radius: var(--r-sm);
  padding: var(--s2) var(--s3);
  z-index: 100;
  display: flex;
  align-items: flex-start;
  gap: var(--s2);
  font-size: var(--fs-xs);
  line-height: 1.4;
  color: var(--text-primary);
  animation: slide-up 0.15s ease-out;
}

@keyframes slide-up {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.tree-refusal-badge {
  background: var(--danger);
  color: var(--text-inverse);
  font-size: 9px;
  font-weight: 700;
  padding: 1px 4px;
  border-radius: 2px;
  text-transform: uppercase;
  flex-shrink: 0;
  margin-top: 1px;
}

.tree-refusal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0 2px;
  font-size: var(--fs-sm);
  margin-left: auto;
  line-height: 1;
}

.tree-refusal-close:hover {
  color: var(--text-primary);
}
`

export function FileTree({
  files,
  folders = [],
  selectedPath,
  reopenCandidateName,
  noteContents,
  onSelectFile,
  onReopenVault,
  isLoading,
  error,
}: FileTreeProps) {
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set())
  const [refusalToast, setRefusalToast] = useState<string | null>(null)
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null)
  const [showInlineDropZone, setShowInlineDropZone] = useState<string | null>(null)

  const toastTimerRef = useRef<number | null>(null)

  const tree = useMemo(
    () => buildFileTree(files, folders, noteContents),
    [files, folders, noteContents]
  )

  const triggerRefusalToast = useCallback((msg?: string) => {
    const text = msg || 'Evidence is immutable. Files in 00_Raw_Inputs are write-locked (Law 1).'
    setRefusalToast(text)
    // Dispatch global event for Workspace and other components
    window.dispatchEvent(new CustomEvent('sb:refusal-toast', { detail: text }))

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      setRefusalToast(null)
    }, 4500)
  }, [])

  const handleToggleFolder = (folderPath: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(folderPath)) {
        next.delete(folderPath)
      } else {
        next.add(folderPath)
      }
      return next
    })
  }

  const handleFileKeyDown = (e: KeyboardEvent<HTMLDivElement>, node: TreeNode) => {
    if (node.isLocked && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault()
      triggerRefusalToast()
    }
  }

  const handleContextMenu = (e: MouseEvent<HTMLDivElement>, node: TreeNode) => {
    if (node.isLocked) {
      e.preventDefault()
      triggerRefusalToast()
    }
  }

  const handleFolderDragOver = (e: DragEvent<HTMLDivElement>, folderPath: string) => {
    if (folderPath.includes('00_Raw_Inputs')) {
      e.preventDefault()
      e.stopPropagation()
      setDragOverFolder(folderPath)
    }
  }

  const handleFolderDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolder(null)
  }

  const handleFolderDrop = (e: DragEvent<HTMLDivElement>, folderPath: string) => {
    if (folderPath.includes('00_Raw_Inputs')) {
      e.preventDefault()
      e.stopPropagation()
      setDragOverFolder(null)
      setShowInlineDropZone(folderPath)
      // Select the folder to trigger workspace intake
      onSelectFile(folderPath)
    }
  }

  const renderNode = (node: TreeNode, depth: number) => {
    const isCollapsed = collapsedPaths.has(node.path)
    const isSelected = !node.isFolder && selectedPath === node.path
    const isRawFolder = node.isFolder && node.path.includes('00_Raw_Inputs')

    if (node.isFolder) {
      const icon = node.icon || '📁'
      const isDragOver = dragOverFolder === node.path

      return (
        <div key={node.path} className="tree-branch">
          <div
            className={`tree-row tree-folder-row ${node.isLocked ? 'is-locked-folder' : ''} ${isDragOver ? 'is-drag-over-raw' : ''}`}
            style={{ paddingLeft: `${depth * 14 + 6}px` }}
            onClick={() => {
              handleToggleFolder(node.path)
              if (isRawFolder) {
                onSelectFile(node.path)
              }
            }}
            onDragOver={(e) => handleFolderDragOver(e, node.path)}
            onDragLeave={handleFolderDragLeave}
            onDrop={(e) => handleFolderDrop(e, node.path)}
            role="button"
            tabIndex={0}
            title={node.isLocked ? '00_Raw_Inputs: Evidence Intake (Drop files here)' : node.displayName}
          >
            <span className={`tree-chevron ${isCollapsed ? '' : 'open'}`}>▶</span>
            <span className="tree-icon" aria-hidden="true">{icon}</span>
            <span className="tree-label">{node.displayName}</span>
            {node.isLocked && (
              <span className="locked-glyph-badge" title="Law 1: Write-locked immutable store">
                0444
              </span>
            )}
            <span className="tree-folder-count">{node.children.length}</span>
          </div>

          {!isCollapsed && (
            <div className="tree-children">
              {/* Quick inline drop target for 00_Raw_Inputs */}
              {isRawFolder && (
                <div
                  className="tree-raw-inputs-zone"
                  onClick={() => setShowInlineDropZone((v) => (v === node.path ? null : node.path))}
                  title="Click to toggle inline evidence dropzone"
                >
                  <span>📥 Drag files here or click to ingest</span>
                </div>
              )}

              {/* Inline Ingest Drop Zone */}
              {isRawFolder && showInlineDropZone === node.path && (
                <div style={{ padding: '0 var(--s2) var(--s2) var(--s2)' }}>
                  <IngestDropZone
                    casePath={node.path.split('/')[0]}
                    compact
                    onIngestSuccess={() => {
                      // Keep open for feedback
                    }}
                  />
                </div>
              )}

              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    const icon = node.icon || (node.isLocked ? '🔒' : '📄')

    return (
      <div
        key={node.path}
        className={`tree-row tree-file-row ${isSelected ? 'active' : ''} ${node.isLocked ? 'is-locked-file' : ''}`}
        style={{ paddingLeft: `${depth * 14 + 20}px` }}
        onClick={() => onSelectFile(node.path)}
        onKeyDown={(e) => handleFileKeyDown(e, node)}
        onContextMenu={(e) => handleContextMenu(e, node)}
        title={node.isLocked ? `🔒 Locked Evidence: ${node.path}\nEvidence is immutable (Law 1)` : node.path}
        role="button"
        tabIndex={0}
      >
        <span className="tree-icon" aria-hidden="true">{icon}</span>
        <span className="tree-label">{node.displayName}</span>

        {node.isLocked && (
          <>
            <span className="locked-glyph-badge" title="Write-locked (Law 1)">
              🔒 LOCKED
            </span>
            <button
              type="button"
              className="locked-action-trigger"
              onClick={(e) => {
                e.stopPropagation()
                triggerRefusalToast()
              }}
              title="Delete or edit evidence file"
              aria-label="Delete or edit evidence file"
            >
              ✕
            </button>
          </>
        )}

        {node.role && (
          <span className={`role-badge role-${node.role}`} title={`Role: ${node.role}`}>
            {node.role}
          </span>
        )}
      </div>
    )
  }

  return (
    <aside className="left file-tree-wrapper">
      <style>{FILE_TREE_CSS}</style>

      <div className="left-search-box">
        <input
          type="text"
          className="input-search"
          placeholder="Search case notes..."
          disabled={tree.length === 0}
        />
      </div>
      <div className="panel-header">
        <span>Cases &amp; Vault {files.length > 0 ? `(${files.length} files)` : '(Demo Cases)'}</span>
      </div>

      {error && (
        <ErrorState
          title="Case Vault Error"
          message={error}
        />
      )}

      {isLoading ? (
        <div style={{ padding: 'var(--s3)' }}>
          <LoadingSkeleton variant="text" lines={6} />
        </div>
      ) : tree.length === 0 ? (
        reopenCandidateName && onReopenVault ? (
          <EmptyState
            compact
            headline={`Vault "${reopenCandidateName}" detected`}
            body="A previous case vault was detected on disk."
            action={{ label: `Reopen "${reopenCandidateName}"`, onClick: onReopenVault }}
          />
        ) : (
          <EmptyState
            compact
            headline="No Case Open"
            body="Click 'Open Case' in the top bar to inspect files."
          />
        )
      ) : (
        <div className="tree-container">
          {tree.map((node) => renderNode(node, 0))}
        </div>
      )}

      {/* Refusal Toast inside FileTree */}
      {refusalToast && (
        <div className="tree-refusal-toast" role="alert">
          <span className="tree-refusal-badge">Law 1</span>
          <span>{refusalToast}</span>
          <button
            type="button"
            className="tree-refusal-close"
            onClick={() => setRefusalToast(null)}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </aside>
  )
}
