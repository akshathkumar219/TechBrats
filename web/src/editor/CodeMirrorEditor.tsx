import { useEffect, useRef } from 'react'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { buildExtensions } from './extensions'
import type { VaultFile } from '../fs/vault'

interface Props {
  content: string
  files: VaultFile[]
  readOnly: boolean
  placeholder: string
  onChange: (value: string) => void
}

/**
 * React wrapper around a CM6 EditorView.
 *
 * The view is created ONCE and kept for the life of the component. Switching
 * notes dispatches a document-replacing transaction rather than tearing the
 * editor down — that keeps undo history sane and avoids a full remount on
 * every file click.
 */
export function CodeMirrorEditor({ content, files, readOnly, placeholder, onChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  // Refs so the extensions never go stale without rebuilding the editor
  const filesRef = useRef(files)
  const onChangeRef = useRef(onChange)
  filesRef.current = files
  onChangeRef.current = onChange

  const readOnlyCompartment = useRef(new Compartment())

  useEffect(() => {
    if (!hostRef.current || viewRef.current) return

    const state = EditorState.create({
      doc: content,
      extensions: [
        ...buildExtensions({
          getFiles: () => filesRef.current,
          placeholder,
        }),
        readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString())
          }
        }),
      ],
    })

    viewRef.current = new EditorView({ state, parent: hostRef.current })

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
    // Created once on mount, deliberately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // External content change (file switch, or an edit from elsewhere)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === content) return
    view.dispatch({
      changes: { from: 0, to: current.length, insert: content },
      selection: { anchor: 0 },
      scrollIntoView: true,
    })
  }, [content])

  // Toggle read-only without rebuilding the editor
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: readOnlyCompartment.current.reconfigure(EditorState.readOnly.of(readOnly)),
    })
  }, [readOnly])

  return <div ref={hostRef} className="cm-host" />
}
