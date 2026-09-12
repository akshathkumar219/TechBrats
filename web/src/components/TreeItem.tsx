import type { TreeNode } from '../lib/tree'

interface TreeItemProps {
  node: TreeNode
  depth: number
  selectedPath: string | null
  collapsedPaths: Set<string>
  onToggleFolder: (path: string) => void
  onSelectFile: (path: string) => void
}

export function TreeItem({
  node,
  depth,
  selectedPath,
  collapsedPaths,
  onToggleFolder,
  onSelectFile,
}: TreeItemProps) {
  const isCollapsed = collapsedPaths.has(node.path)
  const isSelected = !node.isFolder && selectedPath === node.path

  if (node.isFolder) {
    return (
      <div className="tree-branch">
        <div
          className={`tree-row tree-folder-row ${node.isLocked ? 'is-locked-folder' : ''}`}
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          onClick={() => onToggleFolder(node.path)}
          role="button"
          tabIndex={0}
        >
          <svg
            className={`tree-chevron ${isCollapsed ? '' : 'open'}`}
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
        {!isCollapsed && (
          <div className="tree-children">
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                collapsedPaths={collapsedPaths}
                onToggleFolder={onToggleFolder}
                onSelectFile={onSelectFile}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  const cleanDisplayName = node.displayName.replace(/\.md$/, '')

  return (
    <div
      className={`tree-row tree-file-row ${isSelected ? 'active' : ''} ${node.isLocked ? 'is-locked-file' : ''}`}
      style={{ paddingLeft: `${depth * 14 + 24}px` }}
      onClick={() => onSelectFile(node.path)}
      title={node.path}
      role="button"
      tabIndex={0}
    >
      <span className="tree-label">{cleanDisplayName}</span>
    </div>
  )
}

