import { useMemo } from 'react'
import { renderMarkdown } from '../lib/markdown'
import type { VaultFile } from '../fs/vault'

interface PreviewProps {
  content: string
  activeFile: VaultFile | null
  files?: VaultFile[]
}

export function Preview({ content, activeFile, files = [] }: PreviewProps) {
  const html = useMemo(() => renderMarkdown(content, files), [content, files])

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
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
