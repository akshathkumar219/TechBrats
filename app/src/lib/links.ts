import type { VaultFile } from '../fs/vault'

export interface WikiLinkMatch {
  raw: string
  target: string
  alias?: string
}

export function resolveWikiLink(
  target: string,
  files: VaultFile[]
): VaultFile | null {
  const norm = target.trim().toLowerCase().replace(/\.md$/, '')
  if (!norm) return null

  // 1. Check matching path without .md extension
  const pathMatch = files.find(
    (f) => f.path.toLowerCase().replace(/\.md$/, '') === norm
  )
  if (pathMatch) return pathMatch

  // 2. Check matching filename without .md extension
  const nameMatch = files.find(
    (f) => f.name.toLowerCase().replace(/\.md$/, '') === norm
  )
  if (nameMatch) return nameMatch

  return null
}

export function isWikiLinkResolved(
  target: string,
  files: VaultFile[]
): boolean {
  return resolveWikiLink(target, files) !== null
}

export function extractWikiLinks(content: string): WikiLinkMatch[] {
  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  const matches: WikiLinkMatch[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    matches.push({
      raw: match[0],
      target: match[1].trim(),
      alias: match[2] ? match[2].trim() : undefined,
    })
  }

  return matches
}

export interface BacklinkOccurrence {
  lineNumber: number
  lineText: string
  rawMatch: string
}

export interface BacklinkGroup {
  sourceFile: VaultFile
  occurrences: BacklinkOccurrence[]
}

export function findBacklinks(
  activeFile: VaultFile | null,
  files: VaultFile[],
  contents: Record<string, string>
): BacklinkGroup[] {
  if (!activeFile) return []

  const targetPath = activeFile.path.toLowerCase().replace(/\.md$/, '')
  const targetName = activeFile.name.toLowerCase().replace(/\.md$/, '')
  const results: BacklinkGroup[] = []

  for (const file of files) {
    if (file.path === activeFile.path) continue
    const text = contents[file.path]
    if (!text) continue

    const lines = text.split('\n')
    const occurrences: BacklinkOccurrence[] = []

    lines.forEach((line, idx) => {
      const links = extractWikiLinks(line)
      for (const link of links) {
        const resolved = resolveWikiLink(link.target, files)
        const normTarget = link.target.toLowerCase().replace(/\.md$/, '')
        if (
          (resolved && resolved.path === activeFile.path) ||
          normTarget === targetPath ||
          normTarget === targetName
        ) {
          occurrences.push({
            lineNumber: idx + 1,
            lineText: line.trim(),
            rawMatch: link.raw,
          })
          break
        }
      }
    })

    if (occurrences.length > 0) {
      results.push({ sourceFile: file, occurrences })
    }
  }

  return results
}
