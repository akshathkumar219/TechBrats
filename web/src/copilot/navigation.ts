/**
 * Navigation helpers for copilot evidentiary citations (HER-T05 / HAR-T06).
 *
 * Provides:
 * 1. openFileAt(path: string, line?: number, span?: [number, number])
 *    Re-exported from the canonical HAR-T06 implementation in
 *    ../workspace/navigation.ts — the single source of truth for opening a
 *    file, switching to the editor pane, scrolling to a line, and
 *    highlighting a span. Do not reimplement here.
 * 2. parseLocator(locator?: string | null)
 *    Deterministic locator parser for CDR ("row:48219"), documents ("p:2 l:9"),
 *    and line ranges ("p:1 l:4-12", "l:14-25").
 * 3. resolveCitationPath(source: string, retrievedNotes?: string[])
 *    Maps evidentiary source identifiers (e.g. DOC_FIR_0142) to target note files.
 */

export { openFileAt } from '../workspace/navigation.ts'

export interface ParsedLocator {
  line?: number
  span?: [number, number]
  page?: number
  row?: number
}

/**
 * Parse locator string into line and optional span.
 * Supported formats:
 * - "row:48219" (CDR) -> line: 48219
 * - "p:2 l:9" (document) -> line: 9
 * - "p:1 l:4-12" (range) -> line: 4, span: [4, 12]
 * - "l:14" -> line: 14
 * - "l:14-25" -> line: 14, span: [14, 25]
 * - "p:3" -> line: 3
 */
export function parseLocator(locator?: string | null): ParsedLocator {
  if (!locator || !locator.trim()) {
    return {}
  }

  const loc = locator.trim()

  // 1. CDR row format: row:48219
  const rowMatch = /row:\s*(\d+)/i.exec(loc)
  if (rowMatch) {
    const rowNum = parseInt(rowMatch[1], 10)
    return { line: rowNum, row: rowNum }
  }

  // 2. Line range format: p:1 l:4-12 or l:4-12 or l:4..12
  const lineRangeMatch = /l:\s*(\d+)\s*[-–—..]+\s*(?:(?:p:\s*\d+\s+)?l:\s*)?(\d+)/i.exec(loc)
  if (lineRangeMatch) {
    const startLine = parseInt(lineRangeMatch[1], 10)
    const endLine = parseInt(lineRangeMatch[2], 10)
    return { line: startLine, span: [startLine, endLine] }
  }

  // 3. Single line format: p:2 l:9 or l:9
  const singleLineMatch = /l:\s*(\d+)/i.exec(loc)
  if (singleLineMatch) {
    const lineNum = parseInt(singleLineMatch[1], 10)
    return { line: lineNum }
  }

  // 4. Page only: p:3
  const pageMatch = /p:\s*(\d+)/i.exec(loc)
  if (pageMatch) {
    const pageNum = parseInt(pageMatch[1], 10)
    return { line: pageNum, page: pageNum }
  }

  // 5. Bare numeric string
  const bareNumMatch = /^\d+$/.exec(loc)
  if (bareNumMatch) {
    const num = parseInt(bareNumMatch[0], 10)
    return { line: num }
  }

  return {}
}

/**
 * Resolve a citation source ID (e.g. DOC_FIR_0142) to a note filepath.
 */
export function resolveCitationPath(source: string, retrievedNotes?: string[]): string {
  if (!source) return ''

  // Already a relative or full note path
  if (source.endsWith('.md') || source.includes('/')) {
    return source
  }

  // Check retrieved notes list for matching path
  if (retrievedNotes && retrievedNotes.length > 0) {
    const cleanSource = source.replace(/^DOC_/, '')
    const matched = retrievedNotes.find(
      (n) =>
        n.includes(source) ||
        n.includes(cleanSource) ||
        n.toLowerCase().includes(cleanSource.toLowerCase())
    )
    if (matched) return matched
  }

  // Common prefix heuristics matching case vault structure
  if (source.startsWith('DOC_FIR_') || source.startsWith('FIR_')) {
    const num = source.match(/\d+/)?.[0]
    if (num) return `00_Raw_Inputs/FIR/FIR_${num}_2026_Kharkhoda.md`
  }

  if (source.startsWith('DOC_CDR_') || source.startsWith('CDR_')) {
    const num = source.match(/\d+/)?.[0]
    if (num) return `00_Raw_Inputs/CDR/CDR_${num}.md`
  }

  if (source.startsWith('DOC_TD_') || source.startsWith('TD_')) {
    const stem = source.replace(/^DOC_/, '')
    return `00_Raw_Inputs/TowerDump/${stem}.md`
  }

  if (source.startsWith('DOC_STMT_') || source.startsWith('STMT_')) {
    const stem = source.replace(/^DOC_/, '')
    return `00_Raw_Inputs/Statement/Statement_${stem}.md`
  }

  // Default to source as path/id
  return source
}

