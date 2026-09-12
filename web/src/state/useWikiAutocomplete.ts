import { useState, useMemo, useCallback } from 'react'
import type { VaultFile } from '../fs/vault'
import { getCaretCoordinates, type CaretCoordinates } from '../lib/caret'
import type { AutocompleteCandidate } from '../components/WikiAutocomplete'

interface UseWikiAutocompleteProps {
  files: VaultFile[]
  onChange: (value: string) => void
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
}

export function useWikiAutocomplete({ files, onChange, textareaRef }: UseWikiAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [bracketPos, setBracketPos] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [caretPos, setCaretPos] = useState<CaretCoordinates | null>(null)
  const [dismissedBracketPos, setDismissedBracketPos] = useState<number | null>(null)

  const candidates: AutocompleteCandidate[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of files) {
      const base = f.name.replace(/\.md$/, '')
      counts.set(base, (counts.get(base) || 0) + 1)
    }

    const all = files.map((f) => {
      const name = f.name.replace(/\.md$/, '')
      const path = f.path.replace(/\.md$/, '')
      const isDuplicate = (counts.get(name) || 0) > 1
      return { name, path, insertText: isDuplicate ? path : name }
    })

    if (!query) return all.slice(0, 15)
    const q = query.toLowerCase()
    return all
      .filter((c) => c.name.toLowerCase().includes(q) || c.path.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q)
        const bStarts = b.name.toLowerCase().startsWith(q)
        return aStarts !== bStarts ? (aStarts ? -1 : 1) : a.name.localeCompare(b.name)
      })
      .slice(0, 15)
  }, [files, query])

  const checkAutocomplete = useCallback(
    (textarea: HTMLTextAreaElement) => {
      const pos = textarea.selectionStart
      const text = textarea.value
      const before = text.slice(0, pos)
      const lastBracket = before.lastIndexOf('[[')

      if (lastBracket === -1) {
        setIsOpen(false)
        return
      }

      const afterBracket = before.slice(lastBracket + 2)
      if (afterBracket.includes('\n') || afterBracket.includes(']]')) {
        setIsOpen(false)
        return
      }

      if (dismissedBracketPos === lastBracket) {
        setIsOpen(false)
        return
      }

      setQuery(afterBracket)
      setBracketPos(lastBracket)
      setSelectedIndex(0)
      setCaretPos(getCaretCoordinates(textarea, pos))
      setIsOpen(true)
    },
    [dismissedBracketPos]
  )

  const handleSelectCandidate = useCallback(
    (candidate: AutocompleteCandidate) => {
      const textarea = textareaRef.current
      if (!textarea) return
      const text = textarea.value
      const cursorPos = textarea.selectionStart
      const afterCursor = text.slice(cursorPos)
      const alreadyHasClosing = afterCursor.startsWith(']]')
      const prefix = text.slice(0, bracketPos)
      const suffix = text.slice(cursorPos + (alreadyHasClosing ? 2 : 0))
      const replacement = `[[${candidate.insertText}]]`

      onChange(prefix + replacement + suffix)
      setIsOpen(false)
      setDismissedBracketPos(null)

      const newCursorPos = bracketPos + replacement.length
      requestAnimationFrame(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.focus()
      })
    },
    [bracketPos, onChange, textareaRef]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isOpen) return false
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (candidates.length > 0) setSelectedIndex((prev) => (prev + 1) % candidates.length)
        return true
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (candidates.length > 0) setSelectedIndex((prev) => (prev - 1 + candidates.length) % candidates.length)
        return true
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (candidates.length > 0 && candidates[selectedIndex]) {
          e.preventDefault()
          handleSelectCandidate(candidates[selectedIndex])
          return true
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
        setDismissedBracketPos(bracketPos)
        return true
      }
      return false
    },
    [isOpen, candidates, selectedIndex, handleSelectCandidate, bracketPos]
  )

  const updateCaretPosition = useCallback(() => {
    if (isOpen && textareaRef.current) {
      setCaretPos(getCaretCoordinates(textareaRef.current, textareaRef.current.selectionStart))
    }
  }, [isOpen, textareaRef])

  return {
    isOpen, candidates, selectedIndex, caretPos,
    checkAutocomplete, handleKeyDown, handleSelectCandidate, updateCaretPosition,
  }
}
