import { useMemo } from 'react'
import { renderMarkdown } from '../lib/markdown'
import type { VaultFile } from '../fs/vault'

interface PreviewProps {
  content: string
  activeFile: VaultFile | null
  files?: VaultFile[]
  onNavigateWikiLink?: (target: string) => void
}

export function Preview({
  content,
  activeFile,
  files = [],
  onNavigateWikiLink,
}: PreviewProps) {
  const html = useMemo(() => renderMarkdown(content, files), [content, files])

  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const link = (e.target as HTMLElement).closest('a.wiki-link')
    if (link) {
      e.preventDefault()
      const target = link.getAttribute('data-target')
      if (target && onNavigateWikiLink) {
        onNavigateWikiLink(target)
      }
    }
  }

  if (!activeFile) {
    return (
      <div className="preview-pane">
        <div className="pane-inner">
          <div className="preview-content preview-empty">
            <h1 className="note-h1">Investigation Workbench</h1>
            <p className="note-body">
              Select a note from the left tree or create a new note to begin reading and editing.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="preview-pane">
      <div className="pane-inner">
        <div
          className="preview-content markdown-body"
          onClick={handleContentClick}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}

