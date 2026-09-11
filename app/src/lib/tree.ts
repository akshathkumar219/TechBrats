import type { VaultFile } from '../fs/vault'

export interface TreeNode {
  name: string
  displayName: string
  path: string
  isFolder: boolean
  children: TreeNode[]
  file?: VaultFile
}

export function buildFileTree(files: VaultFile[]): TreeNode[] {
  const root: TreeNode = {
    name: '',
    displayName: '',
    path: '',
    isFolder: true,
    children: [],
  }

  for (const file of files) {
    const parts = file.path.split('/')
    // Skip any dot-directories / hidden files
    if (parts.some((p) => p.startsWith('.'))) continue

    let current = root
    let currentPath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      currentPath = currentPath ? `${currentPath}/${part}` : part

      if (isLast) {
        // Strip .md extension for display
        const displayName = part.endsWith('.md') ? part.slice(0, -3) : part
        current.children.push({
          name: part,
          displayName,
          path: file.path,
          isFolder: false,
          children: [],
          file,
        })
      } else {
        let folderNode = current.children.find(
          (c) => c.isFolder && c.name === part
        )
        if (!folderNode) {
          folderNode = {
            name: part,
            displayName: part,
            path: currentPath,
            isFolder: true,
            children: [],
          }
          current.children.push(folderNode)
        }
        current = folderNode
      }
    }
  }

  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1
      }
      return a.displayName.localeCompare(b.displayName, undefined, {
        numeric: true,
        sensitivity: 'base',
      })
    })
    for (const node of nodes) {
      if (node.isFolder) {
        sortNodes(node.children)
      }
    }
  }

  sortNodes(root.children)
  return root.children
}
