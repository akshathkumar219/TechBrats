import { marked } from 'marked'
import type { VaultFile } from '../fs/vault'
import { isWikiLinkResolved } from './links'

marked.setOptions({
  gfm: true,
  breaks: true,
})

export function preprocessWikiLinks(
  markdown: string,
  files: VaultFile[]
): string {
  if (!markdown) return ''

  const codePattern = /(```[\s\S]*?```|`[^`\n]+`)/g
  const linkPattern = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g

  return markdown
    .split(codePattern)
    .map((segment) => {
      if (
        segment.startsWith('```') ||
        (segment.startsWith('`') && segment.endsWith('`'))
      ) {
        return segment
      }
      return segment.replace(linkPattern, (_, target, alias) => {
        const cleanTarget = (target as string).trim()
        const cleanAlias = alias ? (alias as string).trim() : cleanTarget
        const resolved = isWikiLinkResolved(cleanTarget, files)
        const className = resolved
          ? 'wiki-link wiki-link-resolved'
          : 'wiki-link wiki-link-unresolved'
        const title = resolved
          ? cleanTarget
          : `${cleanTarget} (unresolved - click to create)`
        return `<a class="${className}" data-target="${cleanTarget}" title="${title}">${cleanAlias}</a>`
      })
    })
    .join('')
}

export function renderMarkdown(content: string, files: VaultFile[] = []): string {
  if (!content) return ''
  const preprocessed = preprocessWikiLinks(content, files)
  return marked.parse(preprocessed) as string
}
