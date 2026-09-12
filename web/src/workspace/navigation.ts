/**
 * SyndicateBrain Workspace Navigation (HAR-T06)
 *
 * Public Signatures:
 * 1. openFileAt(path: string, line: number, span?: [number, number]): void
 *    - Opens the file in the editor, scrolls to the line, highlights the span.
 *    - Works whether or not the file is currently open, and whether or not the editor
 *      is the visible centre pane (switches from graph to editor if needed).
 *    - Dispatches a global CustomEvent `syndicate-brain:open-file-at` with `{ path, line, span }`.
 *
 * 2. onOpenFileAt(handler: (detail: OpenFileAtDetail) => void): () => void
 *    - Subscribes to the global `syndicate-brain:open-file-at` event.
 *    - Returns an unsubscribe cleanup function.
 */

import { useEffect } from 'react'

export interface OpenFileAtDetail {
  path: string
  line: number
  span?: [number, number]
}

export type OpenFileAtHandler = (detail: OpenFileAtDetail) => void

export const OPEN_FILE_AT_EVENT = 'syndicate-brain:open-file-at'

/**
 * Injects token-based line/span highlight keyframes and classes into document head.
 * 100% token-styled with zero hex codes.
 */
function injectHighlightStyles(): void {
  if (typeof document === 'undefined') return
  const styleId = 'sb-open-file-at-style'
  if (document.getElementById(styleId)) return

  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    @keyframes sb-line-highlight-pulse {
      0% {
        background-color: var(--accent-bg);
        box-shadow: inset 3px 0 0 var(--border-focus);
      }
      70% {
        background-color: var(--accent-bg);
        box-shadow: inset 3px 0 0 var(--border-focus);
      }
      100% {
        background-color: transparent;
        box-shadow: inset 3px 0 0 transparent;
      }
    }
    .sb-open-file-highlight {
      animation: sb-line-highlight-pulse 2.4s ease-out forwards;
      border-radius: var(--r-sm);
    }
    .sb-open-span-highlight {
      background-color: var(--evidence-bg) !important;
      outline: 1px solid var(--border-focus) !important;
      border-radius: var(--r-sm);
      color: var(--text-primary) !important;
    }
  `
  document.head.appendChild(style)
}

/**
 * Ensures the editor view is active in the centre pane.
 * If the graph canvas or another view is active, triggers switch back to editor.
 */
function ensureEditorViewActive(): void {
  if (typeof document === 'undefined') return

  const editorHost = document.getElementById('editor-pane-container')
  const graphHost = document.getElementById('graph-canvas-container')

  const isGraphActive =
    (graphHost && !graphHost.hidden) ||
    (editorHost && editorHost.hidden) ||
    Boolean(
      document.querySelector(
        '.ws-ico.is-active[aria-label*="Show Editor"], .ws-ico.is-active[aria-label*="Evidence Graph"]'
      )
    )

  if (isGraphActive) {
    const graphButton = document.querySelector<HTMLButtonElement>(
      'button[aria-label*="Show Editor"], button[aria-label*="Evidence Graph"]'
    )
    if (graphButton) {
      graphButton.click()
    } else {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'g',
          code: 'KeyG',
          metaKey: true,
          ctrlKey: true,
          bubbles: true,
        })
      )
    }
  }
}

/**
 * Attempts to select a file in the workspace via open tabs or the file tree.
 */
function selectFileInWorkspace(filePath: string): boolean {
  if (typeof document === 'undefined') return false

  const cleanPath = filePath.trim().replace(/^\/+/, '')
  const filename = cleanPath.split('/').pop() || cleanPath

  // 1. Check existing open tabs
  const tabs = Array.from(document.querySelectorAll<HTMLElement>('.ws-tab'))
  for (const tab of tabs) {
    const label = tab.querySelector('.ws-tab-label')?.textContent?.trim()
    const rawName = filename.replace(/\.md$/, '')
    if (label === rawName || label === filename) {
      tab.click()
      return true
    }
  }

  // 2. Check file tree rows
  let treeRow = document.querySelector<HTMLElement>(`.tree-file-row[title="${cleanPath}"]`)
  if (!treeRow) {
    const allFileRows = Array.from(document.querySelectorAll<HTMLElement>('.tree-file-row'))
    treeRow =
      allFileRows.find((row) => {
        const title = row.getAttribute('title') || ''
        const label = row.querySelector('.tree-label')?.textContent?.trim() || ''
        return (
          title === cleanPath ||
          title.endsWith(cleanPath) ||
          title.includes(cleanPath) ||
          label === filename ||
          label === cleanPath
        )
      }) || null
  }

  if (treeRow) {
    treeRow.click()
    return true
  }

  // 3. Expand collapsed parent folders if needed
  const pathParts = cleanPath.split('/')
  if (pathParts.length > 1) {
    const folderRows = Array.from(document.querySelectorAll<HTMLElement>('.tree-folder-row'))
    for (const folderRow of folderRows) {
      const chevron = folderRow.querySelector('.tree-chevron')
      if (chevron && !chevron.classList.contains('open')) {
        const folderLabel = folderRow.querySelector('.tree-label')?.textContent?.trim()
        if (folderLabel && pathParts.includes(folderLabel)) {
          folderRow.click()
        }
      }
    }

    setTimeout(() => {
      const retryRow = document.querySelector<HTMLElement>(`.tree-file-row[title="${cleanPath}"]`)
      if (retryRow) retryRow.click()
    }, 60)
  }

  return false
}

/**
 * Highlights a character span within a target line element.
 */
function highlightSpanInLine(lineEl: HTMLElement, startCol: number, endCol: number): void {
  try {
    const text = lineEl.textContent || ''
    if (startCol >= text.length) return
    const clampedEnd = Math.min(endCol, text.length)
    if (clampedEnd <= startCol) return

    const range = document.createRange()
    let currentOffset = 0
    let startNode: Node | null = null
    let startNodeOffset = 0
    let endNode: Node | null = null
    let endNodeOffset = 0

    const walk = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT)
    let currentNode = walk.nextNode()

    while (currentNode) {
      const nodeLen = currentNode.textContent?.length || 0
      if (!startNode && currentOffset + nodeLen >= startCol) {
        startNode = currentNode
        startNodeOffset = startCol - currentOffset
      }
      if (!endNode && currentOffset + nodeLen >= clampedEnd) {
        endNode = currentNode
        endNodeOffset = clampedEnd - currentOffset
        break
      }
      currentOffset += nodeLen
      currentNode = walk.nextNode()
    }

    if (startNode && endNode) {
      range.setStart(startNode, startNodeOffset)
      range.setEnd(endNode, endNodeOffset)
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        selection.addRange(range)
      }
    }
  } catch {
    // Ignore range / selection failures gracefully
  }
}

/**
 * Scrolls the editor to the specified line number (1-based) and applies highlight.
 */
function scrollAndHighlight(line: number, span?: [number, number]): boolean {
  if (typeof document === 'undefined') return false
  injectHighlightStyles()

  const scroller = document.querySelector<HTMLElement>('.cm-scroller')
  if (!scroller) return false

  const lines = Array.from(scroller.querySelectorAll<HTMLElement>('.cm-line'))
  const targetLineIdx = line - 1

  let targetLineEl: HTMLElement | null = null
  if (targetLineIdx >= 0 && targetLineIdx < lines.length) {
    targetLineEl = lines[targetLineIdx]
  }

  const sampleLine = lines[0] || scroller.querySelector<HTMLElement>('.cm-line')
  const lineHeight = sampleLine && sampleLine.offsetHeight > 0 ? sampleLine.offsetHeight : 24
  const targetScrollTop = Math.max(0, targetLineIdx * lineHeight - scroller.clientHeight / 3)

  scroller.scrollTo({
    top: targetScrollTop,
    behavior: 'smooth',
  })

  const applyHighlight = (el: HTMLElement) => {
    scroller.querySelectorAll('.sb-open-file-highlight').forEach((node) => {
      node.classList.remove('sb-open-file-highlight')
    })
    scroller.querySelectorAll('.sb-open-span-highlight').forEach((node) => {
      node.classList.remove('sb-open-span-highlight')
    })

    el.classList.add('sb-open-file-highlight')

    if (span && span.length === 2 && span[1] > span[0]) {
      const [start, end] = span
      highlightSpanInLine(el, start, end)
    }

    setTimeout(() => {
      el.classList.remove('sb-open-file-highlight')
    }, 2500)
  }

  if (targetLineEl) {
    applyHighlight(targetLineEl)
    return true
  }

  requestAnimationFrame(() => {
    setTimeout(() => {
      const recheckedLines = Array.from(scroller.querySelectorAll<HTMLElement>('.cm-line'))
      if (targetLineIdx >= 0 && targetLineIdx < recheckedLines.length) {
        applyHighlight(recheckedLines[targetLineIdx])
      }
    }, 60)
  })

  return true
}

/**
 * Opens a file in the editor, scrolls to the specified 1-based line number,
 * and highlights the character span.
 *
 * Works whether or not the file is currently open, and whether or not the editor
 * is the visible centre pane.
 *
 * @param path File path in vault (e.g. '01_Evidence/FIR_128_2026.md')
 * @param line 1-based line number (defaults to 1 if omitted)
 * @param span Optional [startCol, endCol] character span to highlight
 */
export function openFileAt(path: string, line?: number, span?: [number, number]): void {
  if (typeof window === 'undefined') return

  const targetLine = typeof line === 'number' && !isNaN(line) && line > 0 ? line : 1
  const detail: OpenFileAtDetail = {
    path,
    line: targetLine,
    ...(span ? { span } : {}),
  }

  // 1. Dispatch official global event
  window.dispatchEvent(
    new CustomEvent<OpenFileAtDetail>(OPEN_FILE_AT_EVENT, {
      detail,
      bubbles: true,
      cancelable: true,
    })
  )

  // 2. Dispatch legacy open-file event for existing listeners
  window.dispatchEvent(
    new CustomEvent('syndicate-brain:open-file', {
      detail: { path, line: targetLine, span },
      bubbles: true,
      cancelable: true,
    })
  )

  // 3. Switch centre pane to editor if graph is active
  ensureEditorViewActive()

  // 4. Select file if not active
  selectFileInWorkspace(path)

  // 5. Scroll and highlight immediately and on subsequent render ticks
  const handled = scrollAndHighlight(targetLine, span)
  if (!handled) {
    const retries = [60, 150, 350, 700]
    for (const delay of retries) {
      setTimeout(() => {
        scrollAndHighlight(targetLine, span)
      }, delay)
    }
  }
}

/**
 * Subscribes to the global `syndicate-brain:open-file-at` event.
 *
 * @param handler Callback invoked whenever openFileAt is called
 * @returns Unsubscribe cleanup callback
 */
export function onOpenFileAt(handler: OpenFileAtHandler): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<OpenFileAtDetail>
    if (customEvent && customEvent.detail) {
      handler(customEvent.detail)
    }
  }
  window.addEventListener(OPEN_FILE_AT_EVENT, listener)
  return () => {
    window.removeEventListener(OPEN_FILE_AT_EVENT, listener)
  }
}

/**
 * React hook helper to listen for openFileAt events.
 */
export function useOpenFileAt(handler: OpenFileAtHandler): void {
  useEffect(() => {
    return onOpenFileAt(handler)
  }, [handler])
}

// Bind to window for global access across modules and vanilla scripts
if (typeof window !== 'undefined') {
  ;(window as unknown as { openFileAt?: typeof openFileAt }).openFileAt = openFileAt
}
