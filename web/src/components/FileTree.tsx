import { useState, useMemo } from 'react'
import type { VaultFile } from '../fs/vault'
import { buildFileTree } from '../lib/tree'
import { TreeItem } from './TreeItem'

interface FileTreeProps {
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

  const tree = useMemo(
    () => buildFileTree(files, folders, noteContents),
    [files, folders, noteContents]
  )

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

  return (
    <aside className="left">
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
        <div className="placeholder-content">
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="placeholder-content">
          <p>Scanning case vault...</p>
        </div>
      ) : tree.length === 0 ? (
        <div className="placeholder-content">
          {reopenCandidateName && onReopenVault ? (
            <>
              <p>Previous vault found: <strong>{reopenCandidateName}</strong></p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onReopenVault}
                style={{ marginTop: 'var(--s2)' }}
              >
                Reopen &ldquo;{reopenCandidateName}&rdquo;
              </button>
            </>
          ) : (
            <p>Click &ldquo;Open folder&rdquo; to load a vault.</p>
          )}
        </div>
      ) : (
        <div className="tree-container">
          {tree.map((node) => (
            <TreeItem
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              collapsedPaths={collapsedPaths}
              onToggleFolder={handleToggleFolder}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </aside>
  )
}

