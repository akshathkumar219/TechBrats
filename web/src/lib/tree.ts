import type { VaultFile } from '../fs/vault'
import { parseFrontmatter } from './frontmatter'

export interface TreeNode {
  name: string
  displayName: string
  path: string
  isFolder: boolean
  children: TreeNode[]
  file?: VaultFile
  icon?: string
  role?: string | null
  isLocked?: boolean
}

export function getFolderIcon(name: string): string {
  if (name.startsWith('00_Raw_Inputs')) return '🔒'
  if (name.startsWith('01_People')) return '👤'
  if (name.startsWith('02_Identifiers')) return '🔑'
  if (name.startsWith('03_Vehicles')) return '🚗'
  if (name.startsWith('04_Locations')) return '📍'
  if (name.startsWith('05_Organisations')) return '🏢'
  if (name.startsWith('06_Events')) return '📅'
  if (name.startsWith('07_AI_Synthesis')) return '✨'
  if (name.startsWith('Case_')) return '🗂️'
  return '📁'
}

export function getFileIcon(filePath: string): string {
  if (filePath.includes('/00_Raw_Inputs/') || filePath.startsWith('00_Raw_Inputs/')) return '🔒'
  if (filePath.includes('/01_People/') || filePath.startsWith('01_People/')) return '👤'
  if (filePath.includes('/02_Identifiers/') || filePath.startsWith('02_Identifiers/')) return '📱'
  if (filePath.includes('/03_Vehicles/') || filePath.startsWith('03_Vehicles/')) return '🚗'
  if (filePath.includes('/04_Locations/') || filePath.startsWith('04_Locations/')) return '📍'
  if (filePath.includes('/05_Organisations/') || filePath.startsWith('05_Organisations/')) return '🏢'
  if (filePath.includes('/06_Events/') || filePath.startsWith('06_Events/')) return '📅'
  if (filePath.includes('/07_AI_Synthesis/') || filePath.startsWith('07_AI_Synthesis/')) return '✨'
  if (filePath.endsWith('_Case_Index.md')) return '🧠'
  if (filePath.endsWith('Case_Config.yaml')) return '⚙️'
  return '📄'
}

export function extractRole(filePath: string, content?: string): string | null {
  if (content) {
    const { properties } = parseFrontmatter(content)
    if (properties && typeof properties.role === 'string') {
      const r = properties.role.toLowerCase().trim()
      if (['accused', 'witness', 'complainant', 'victim', 'officer'].includes(r)) {
        return r
      }
    }
  }
  // Inferred roles for known case data if content not yet loaded
  const base = filePath.split('/').pop()?.replace(/\.md$/, '') || ''
  if (base === 'Vikram Singh' || base === 'Rehan Khan' || base === 'Sandeep Malik') return 'accused'
  if (base === 'Ramesh Chander') return 'witness'
  if (base === 'Suresh Goel') return 'complainant'
  if (base === 'Baldev Raj') return 'victim'
  if (base.includes('Inspector') || base.includes('Officer')) return 'officer'
  return null
}

export function getMockCaseTree(): TreeNode[] {
  return [
    {
      name: 'Case_01_Sonipat_Arms',
      displayName: 'Case 01 · Sonipat Arms & Extortion',
      path: 'Case_01_Sonipat_Arms',
      isFolder: true,
      icon: '🗂️',
      children: [
        {
          name: '00_Raw_Inputs',
          displayName: '00_Raw_Inputs',
          path: 'Case_01_Sonipat_Arms/00_Raw_Inputs',
          isFolder: true,
          icon: '🔒',
          isLocked: true,
          children: [
            { name: 'FIR_0142_2026_Kharkhoda.pdf', displayName: 'FIR_0142_2026_Kharkhoda.pdf', path: 'Case_01_Sonipat_Arms/00_Raw_Inputs/FIR_0142_2026_Kharkhoda.pdf', isFolder: false, icon: '🔒', isLocked: true, children: [] },
            { name: 'CDR_9812345678_Jan-Feb2026.csv', displayName: 'CDR_9812345678_Jan-Feb2026.csv', path: 'Case_01_Sonipat_Arms/00_Raw_Inputs/CDR_9812345678_Jan-Feb2026.csv', isFolder: false, icon: '🔒', isLocked: true, children: [] },
            { name: 'TowerDump_HR-SNP-0147.csv', displayName: 'TowerDump_HR-SNP-0147.csv', path: 'Case_01_Sonipat_Arms/00_Raw_Inputs/TowerDump_HR-SNP-0147.csv', isFolder: false, icon: '🔒', isLocked: true, children: [] },
          ],
        },
        {
          name: '01_People',
          displayName: '01_People',
          path: 'Case_01_Sonipat_Arms/01_People',
          isFolder: true,
          icon: '👤',
          children: [
            { name: 'Vikram Singh.md', displayName: 'Vikram Singh', path: 'Case_01_Sonipat_Arms/01_People/Vikram Singh.md', isFolder: false, icon: '👤', role: 'accused', children: [] },
            { name: 'Rehan Khan.md', displayName: 'Rehan Khan', path: 'Case_01_Sonipat_Arms/01_People/Rehan Khan.md', isFolder: false, icon: '👤', role: 'accused', children: [] },
            { name: 'Sandeep Malik.md', displayName: 'Sandeep Malik', path: 'Case_01_Sonipat_Arms/01_People/Sandeep Malik.md', isFolder: false, icon: '👤', role: 'accused', children: [] },
            { name: 'Ramesh Chander.md', displayName: 'Ramesh Chander', path: 'Case_01_Sonipat_Arms/01_People/Ramesh Chander.md', isFolder: false, icon: '👤', role: 'witness', children: [] },
            { name: 'Inspector Rajesh Kumar.md', displayName: 'Inspector Rajesh Kumar', path: 'Case_01_Sonipat_Arms/01_People/Inspector Rajesh Kumar.md', isFolder: false, icon: '👤', role: 'officer', children: [] },
          ],
        },
        {
          name: '02_Identifiers',
          displayName: '02_Identifiers',
          path: 'Case_01_Sonipat_Arms/02_Identifiers',
          isFolder: true,
          icon: '🔑',
          children: [
            { name: '9812345678.md', displayName: '9812345678', path: 'Case_01_Sonipat_Arms/02_Identifiers/9812345678.md', isFolder: false, icon: '📱', children: [] },
            { name: '9896011223.md', displayName: '9896011223', path: 'Case_01_Sonipat_Arms/02_Identifiers/9896011223.md', isFolder: false, icon: '📱', children: [] },
            { name: 'IMEI_869123456789012.md', displayName: 'IMEI_869123456789012', path: 'Case_01_Sonipat_Arms/02_Identifiers/IMEI_869123456789012.md', isFolder: false, icon: '🔑', children: [] },
          ],
        },
        {
          name: '03_Vehicles',
          displayName: '03_Vehicles',
          path: 'Case_01_Sonipat_Arms/03_Vehicles',
          isFolder: true,
          icon: '🚗',
          children: [
            { name: 'HR-26-AB-1234.md', displayName: 'HR-26-AB-1234', path: 'Case_01_Sonipat_Arms/03_Vehicles/HR-26-AB-1234.md', isFolder: false, icon: '🚗', children: [] },
          ],
        },
        {
          name: '04_Locations',
          displayName: '04_Locations',
          path: 'Case_01_Sonipat_Arms/04_Locations',
          isFolder: true,
          icon: '📍',
          children: [
            { name: 'Kharkhoda Warehouse.md', displayName: 'Kharkhoda Warehouse', path: 'Case_01_Sonipat_Arms/04_Locations/Kharkhoda Warehouse.md', isFolder: false, icon: '📍', children: [] },
            { name: 'Sonipat Toll Plaza.md', displayName: 'Sonipat Toll Plaza', path: 'Case_01_Sonipat_Arms/04_Locations/Sonipat Toll Plaza.md', isFolder: false, icon: '📍', children: [] },
          ],
        },
        {
          name: '05_Organisations',
          displayName: '05_Organisations',
          path: 'Case_01_Sonipat_Arms/05_Organisations',
          isFolder: true,
          icon: '🏢',
          children: [
            { name: 'Sonipat Arms Ring.md', displayName: 'Sonipat Arms Ring', path: 'Case_01_Sonipat_Arms/05_Organisations/Sonipat Arms Ring.md', isFolder: false, icon: '🏢', children: [] },
          ],
        },
        {
          name: '06_Events',
          displayName: '06_Events',
          path: 'Case_01_Sonipat_Arms/06_Events',
          isFolder: true,
          icon: '📅',
          children: [
            { name: '2026-02-12 Arms Drop.md', displayName: '2026-02-12 Arms Drop', path: 'Case_01_Sonipat_Arms/06_Events/2026-02-12 Arms Drop.md', isFolder: false, icon: '📅', children: [] },
          ],
        },
        {
          name: '07_AI_Synthesis',
          displayName: '07_AI_Synthesis',
          path: 'Case_01_Sonipat_Arms/07_AI_Synthesis',
          isFolder: true,
          icon: '✨',
          children: [
            { name: 'decisions.jsonl', displayName: 'decisions.jsonl', path: 'Case_01_Sonipat_Arms/07_AI_Synthesis/decisions.jsonl', isFolder: false, icon: '✨', children: [] },
          ],
        },
        { name: '_Case_Index.md', displayName: '_Case_Index', path: 'Case_01_Sonipat_Arms/_Case_Index.md', isFolder: false, icon: '🧠', children: [] },
        { name: 'Case_Config.yaml', displayName: 'Case_Config.yaml', path: 'Case_01_Sonipat_Arms/Case_Config.yaml', isFolder: false, icon: '⚙️', children: [] },
      ],
    },
    {
      name: 'Case_02_Rohtak_Hijack',
      displayName: 'Case 02 · Rohtak Highway Arms Hijack',
      path: 'Case_02_Rohtak_Hijack',
      isFolder: true,
      icon: '🗂️',
      children: [
        {
          name: '00_Raw_Inputs',
          displayName: '00_Raw_Inputs',
          path: 'Case_02_Rohtak_Hijack/00_Raw_Inputs',
          isFolder: true,
          icon: '🔒',
          isLocked: true,
          children: [
            { name: 'FIR_0088_2026_Rohtak.pdf', displayName: 'FIR_0088_2026_Rohtak.pdf', path: 'Case_02_Rohtak_Hijack/00_Raw_Inputs/FIR_0088_2026_Rohtak.pdf', isFolder: false, icon: '🔒', isLocked: true, children: [] },
          ],
        },
        {
          name: '01_People',
          displayName: '01_People',
          path: 'Case_02_Rohtak_Hijack/01_People',
          isFolder: true,
          icon: '👤',
          children: [
            { name: 'Suresh Goel.md', displayName: 'Suresh Goel', path: 'Case_02_Rohtak_Hijack/01_People/Suresh Goel.md', isFolder: false, icon: '👤', role: 'complainant', children: [] },
            { name: 'Baldev Raj.md', displayName: 'Baldev Raj', path: 'Case_02_Rohtak_Hijack/01_People/Baldev Raj.md', isFolder: false, icon: '👤', role: 'victim', children: [] },
          ],
        },
        {
          name: '02_Identifiers',
          displayName: '02_Identifiers',
          path: 'Case_02_Rohtak_Hijack/02_Identifiers',
          isFolder: true,
          icon: '🔑',
          children: [
            { name: '9896011223.md', displayName: '9896011223', path: 'Case_02_Rohtak_Hijack/02_Identifiers/9896011223.md', isFolder: false, icon: '📱', children: [] },
          ],
        },
        { name: '_Case_Index.md', displayName: '_Case_Index', path: 'Case_02_Rohtak_Hijack/_Case_Index.md', isFolder: false, icon: '🧠', children: [] },
        { name: 'Case_Config.yaml', displayName: 'Case_Config.yaml', path: 'Case_02_Rohtak_Hijack/Case_Config.yaml', isFolder: false, icon: '⚙️', children: [] },
      ],
    },
  ]
}

export function buildFileTree(
  files: VaultFile[],
  folders: string[] = [],
  noteContents?: Record<string, string>
): TreeNode[] {
  if (files.length === 0 && folders.length === 0) {
    return getMockCaseTree()
  }

  const root: TreeNode = {
    name: '',
    displayName: '',
    path: '',
    isFolder: true,
    children: [],
  }

  for (const file of files) {
    const parts = file.path.split('/')
    if (parts.some((p) => p.startsWith('.'))) continue

    let current = root
    let currentPath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      currentPath = currentPath ? `${currentPath}/${part}` : part

      if (isLast) {
        const displayName = part.endsWith('.md') ? part.slice(0, -3) : part
        const role = extractRole(file.path, noteContents?.[file.path])
        current.children.push({
          name: part,
          displayName,
          path: file.path,
          isFolder: false,
          children: [],
          file,
          icon: getFileIcon(file.path),
          role,
          isLocked: file.path.includes('00_Raw_Inputs'),
        })
      } else {
        let folderNode = current.children.find(
          (c) => c.isFolder && c.name === part
        )
        if (!folderNode) {
          folderNode = {
            name: part,
            displayName: part.replace(/_/g, ' '),
            path: currentPath,
            isFolder: true,
            icon: getFolderIcon(part),
            isLocked: part.startsWith('00_Raw_Inputs'),
            children: [],
          }
          current.children.push(folderNode)
        }
        current = folderNode
      }
    }
  }

  for (const folderPath of folders) {
    const parts = folderPath.split('/').filter(Boolean)
    if (parts.some((p) => p.startsWith('.'))) continue

    let current = root
    let currentPath = ''

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part
      let folderNode = current.children.find(
        (c) => c.isFolder && c.name === part
      )
      if (!folderNode) {
        folderNode = {
          name: part,
          displayName: part.replace(/_/g, ' '),
          path: currentPath,
          isFolder: true,
          icon: getFolderIcon(part),
          isLocked: part.startsWith('00_Raw_Inputs'),
          children: [],
        }
        current.children.push(folderNode)
      }
      current = folderNode
    }
  }

  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) {
        return a.isFolder ? -1 : 1
      }
      return a.name.localeCompare(b.name, undefined, {
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

