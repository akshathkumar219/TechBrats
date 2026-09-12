import { useState, useEffect, useMemo, useCallback, useRef, type KeyboardEvent, type MouseEvent } from 'react'
import type { VaultFile } from '../fs/vault'
import { buildFileTree, type TreeNode } from '../lib/tree'
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

.tree-row.is-locked-folder {
  color: var(--text-primary);
  font-weight: 500;
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
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(['Case_01_Sonipat_Arms'])
  )
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [refusalToast, setRefusalToast] = useState<string | null>(null)

  const toastTimerRef = useRef<number | null>(null)

  const tree = useMemo(
    () => buildFileTree(files, folders, noteContents),
    [files, folders, noteContents]
  )

  const sortedTree = useMemo(() => {
    function sortSubtree(nodes: TreeNode[]): TreeNode[] {
      const clone = [...nodes].sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
        const cmp = a.displayName.localeCompare(b.displayName, undefined, { numeric: true, sensitivity: 'base' })
        return sortOrder === 'asc' ? cmp : -cmp
      })
      return clone.map((node) => {
        if (node.isFolder && node.children) {
          return { ...node, children: sortSubtree(node.children) }
        }
        return node
      })
    }
    return sortSubtree(tree)
  }, [tree, sortOrder])

  useEffect(() => {
    const handleCollapseAll = () => {
      setExpandedPaths(new Set())
    }
    const handleToggleSort = () => {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    }
    window.addEventListener('syndicate-brain:collapse-all-folders', handleCollapseAll)
    window.addEventListener('syndicate-brain:toggle-sort', handleToggleSort)
    return () => {
      window.removeEventListener('syndicate-brain:collapse-all-folders', handleCollapseAll)
      window.removeEventListener('syndicate-brain:toggle-sort', handleToggleSort)
    }
  }, [])

  useEffect(() => {
    if (!selectedPath) return
    const parts = selectedPath.split('/')
    if (parts.length > 1) {
      let cur = ''
      setExpandedPaths((prev) => {
        const next = new Set(prev)
        for (let i = 0; i < parts.length - 1; i++) {
          cur = cur ? `${cur}/${parts[i]}` : parts[i]
          next.add(cur)
        }
        return next
      })
    }
  }, [selectedPath])

  const triggerRefusalToast = useCallback((msg?: string) => {
    const text = msg || 'Evidence is immutable. Files in 00_Raw_Inputs are write-locked (Law 1).'
    setRefusalToast(text)
    window.dispatchEvent(new CustomEvent('sb:refusal-toast', { detail: text }))

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current)
    }
    toastTimerRef.current = window.setTimeout(() => {
      setRefusalToast(null)
    }, 4500)
  }, [])

  const handleToggleFolder = (folderPath: string) => {
    setExpandedPaths((prev) => {
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


  const renderNode = (node: TreeNode, depth: number) => {
    const isExpanded = expandedPaths.has(node.path)
    const isSelected = !node.isFolder && selectedPath === node.path

    if (node.isFolder) {
      return (
        <div key={node.path} className="tree-branch">
          <div
            className={`tree-row tree-folder-row ${node.isLocked ? 'is-locked-folder' : ''}`}
            style={{ paddingLeft: `${depth * 14 + 6}px` }}
            onClick={() => {
              handleToggleFolder(node.path)
            }}
            role="button"
            tabIndex={0}
            title={node.displayName}
          >
            <svg
              className={`tree-chevron ${isExpanded ? 'open' : ''}`}
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="tree-label">{node.displayName}</span>
          </div>

          {isExpanded && (
            <div className="tree-children">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    const cleanDisplayName = node.displayName.replace(/\.md$/, '')

    return (
      <div
        key={node.path}
        className={`tree-row tree-file-row ${isSelected ? 'active' : ''} ${node.isLocked ? 'is-locked-file' : ''}`}
        style={{ paddingLeft: `${depth * 14 + 24}px` }}
        onClick={() => onSelectFile(node.path)}
        onKeyDown={(e) => handleFileKeyDown(e, node)}
        onContextMenu={(e) => handleContextMenu(e, node)}
        title={node.path}
        role="button"
        tabIndex={0}
      >
        <span className="tree-label">{cleanDisplayName}</span>
      </div>
    )
  }

  return (
    <aside className="left file-tree-wrapper">
      <style>{FILE_TREE_CSS}</style>

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
          {sortedTree.map((node) => renderNode(node, 0))}
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
