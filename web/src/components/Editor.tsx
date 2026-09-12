import type { VaultFile } from '../fs/vault'
import { Preview } from './Preview'
import { CodeMirrorEditor } from '../editor/CodeMirrorEditor'

export type EditorMode = 'live-preview' | 'source' | 'reading' | 'split'

export interface EditorProps {
  content: string
  activeFile: VaultFile | null
  files?: VaultFile[]
  mode?: EditorMode
  isPreviewOnly?: boolean
  onChange: (value: string) => void
  onNavigateWikiLink?: (target: string) => void
}

export function Editor({
  content,
  activeFile,
  files = [],
  mode,
  isPreviewOnly,
  onChange,
  onNavigateWikiLink,
}: EditorProps) {
  // Resolve effective mode: default to single-frame Live Preview
  const effectiveMode: EditorMode =
    mode ?? (isPreviewOnly ? 'reading' : 'live-preview')

  // Reading mode: full-width rendered HTML preview with frontmatter table
  if (effectiveMode === 'reading') {
    return (
      <main className="center center-single">
        <section className="preview-pane">
          <div className="pane-inner">
            <Preview
              content={content}
              activeFile={activeFile}
              files={files}
              onNavigateWikiLink={onNavigateWikiLink}
            />
          </div>
        </section>
      </main>
    )
  }

  // Optional side-by-side split view
  if (effectiveMode === 'split') {
    return (
      <main className="center">
        <div className="center-split">
          <section className="editor-pane">
            <div className="pane-inner">
              <CodeMirrorEditor
                content={content}
                files={files}
                readOnly={!activeFile || Boolean(activeFile.isLocked)}
                placeholder={
                  activeFile?.isLocked
                    ? '🔒 Locked evidentiary document (read-only — Law 1: Evidence is immutable)'
                    : activeFile
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

  // Default: Live Preview (or Source) — one single frame, CodeMirror only, centered 72ch
  return (
    <main className="center center-single">
      <section className="editor-pane">
        <div className="pane-inner">
          <CodeMirrorEditor
            content={content}
            files={files}
            readOnly={!activeFile || Boolean(activeFile.isLocked)}
            placeholder={
              activeFile?.isLocked
                ? '🔒 Locked evidentiary document (read-only — Law 1: Evidence is immutable)'
                : activeFile
                ? 'Start typing markdown...'
                : 'Select a note from the left tree to begin...'
            }
            onChange={onChange}
          />
        </div>
      </section>
    </main>
  )
}
