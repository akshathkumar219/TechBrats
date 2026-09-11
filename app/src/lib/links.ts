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
