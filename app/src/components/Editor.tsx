import { useRef, type ChangeEvent, type MouseEvent, type KeyboardEvent } from 'react'
import type { VaultFile } from '../fs/vault'
import { Preview } from './Preview'
import { WikiAutocomplete } from './WikiAutocomplete'
import { useWikiAutocomplete } from '../state/useWikiAutocomplete'

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    isOpen,
    candidates,
    selectedIndex,
    caretPos,
    checkAutocomplete,
    handleKeyDown,
    handleSelectCandidate,
    updateCaretPosition,
  } = useWikiAutocomplete({ files, onChange, textareaRef })

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value)
    checkAutocomplete(e.target)
  }

  const handleClick = (e: MouseEvent<HTMLTextAreaElement>) => {
    checkAutocomplete(e.currentTarget)
  }

  const handleKeyUp = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (['ArrowLeft', 'ArrowRight', 'Backspace', 'Delete'].includes(e.key)) {
      checkAutocomplete(e.currentTarget)
    }
  }

  return (
    <main className="center">
      <div className={`center-split ${isPreviewOnly ? 'preview-only' : ''}`}>
        <section className="editor-pane">
          <div className="pane-inner">
            <textarea
              ref={textareaRef}
              className="editor-textarea"
              placeholder={
                activeFile
                  ? 'Start typing markdown...'
                  : 'Select a note from the left tree to begin...'
              }
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onClick={handleClick}
              onKeyUp={handleKeyUp}
              onScroll={updateCaretPosition}
              disabled={!activeFile}
              spellCheck={false}
            />
          </div>
          {isOpen && caretPos && (
            <WikiAutocomplete
              candidates={candidates}
              selectedIndex={selectedIndex}
              position={caretPos}
              onSelect={handleSelectCandidate}
            />
          )}
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
