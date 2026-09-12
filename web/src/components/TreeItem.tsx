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
          className="tree-row"
          style={{ paddingLeft: `${depth * 14 + 6}px` }}
          onClick={() => onToggleFolder(node.path)}
          role="button"
          tabIndex={0}
        >
          <span className={`tree-chevron ${isCollapsed ? '' : 'open'}`}>▶</span>
          <span className="tree-icon">📁</span>
          <span className="tree-label">{node.displayName}</span>
          <span className="tree-folder-count">{node.children.length}</span>
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

  return (
    <div
      className={`tree-row ${isSelected ? 'active' : ''}`}
      style={{ paddingLeft: `${depth * 14 + 20}px` }}
      onClick={() => onSelectFile(node.path)}
      title={node.path}
      role="button"
      tabIndex={0}
    >
      <span className="tree-icon">📄</span>
      <span className="tree-label">{node.displayName}</span>
    </div>
  )
}
