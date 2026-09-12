import type { VaultFile } from '../fs/vault'
import { Preview } from './Preview'
import { CodeMirrorEditor } from '../editor/CodeMirrorEditor'

interface EditorProps {
  content: string
  activeFile: VaultFile | null
  files?: VaultFile[]
  isPreviewOnly: boolean
  onChange: (value: string) => void
  onNavigateWikiLink?: (target: string) => void
}

export function Editor({
  content,
  activeFile,
  files = [],
  isPreviewOnly,
  onChange,
  onNavigateWikiLink,
}: EditorProps) {
  return (
    <main className="center">
      <div className={`center-split ${isPreviewOnly ? 'preview-only' : ''}`}>
        <section className="editor-pane">
          <div className="pane-inner">
            <CodeMirrorEditor
              content={content}
              files={files}
              readOnly={!activeFile}
              placeholder={
                activeFile
                  ? 'Start typing markdown...'
                  : 'Select a note from the left tree to begin...'
              }
              onChange={onChange}
            />
          </div>
        </section>
        <Preview
          content={content}
          activeFile={activeFile}
          files={files}
          onNavigateWikiLink={onNavigateWikiLink}
        />
      </div>
    </main>
  )
}
