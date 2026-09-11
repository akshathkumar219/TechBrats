import { type ChangeEvent } from 'react'
import type { VaultFile } from '../fs/vault'
import { Preview } from './Preview'

interface EditorProps {
  content: string
  activeFile: VaultFile | null
  files?: VaultFile[]
  isPreviewOnly: boolean
  onChange: (value: string) => void
}

export function Editor({
  content,
  activeFile,
  files = [],
  isPreviewOnly,
  onChange,
}: EditorProps) {
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  return (
    <main className="center">
      <div className={`center-split ${isPreviewOnly ? 'preview-only' : ''}`}>
        <section className="editor-pane">
          <div className="pane-inner">
            <textarea
              className="editor-textarea"
              placeholder={
                activeFile
                  ? 'Start typing markdown...'
                  : 'Select a note from the left tree to begin...'
              }
              value={content}
              onChange={handleChange}
              disabled={!activeFile}
              spellCheck={false}
            />
          </div>
        </section>
        <Preview content={content} activeFile={activeFile} files={files} />
      </div>
    </main>
  )
}
