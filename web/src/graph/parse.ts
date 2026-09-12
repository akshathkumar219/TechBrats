/**
 * SyndicateBrain (SIH26189) — Vault to Knowledge Graph Parser.
 * Pure TypeScript, no React, zero DOM dependencies.
 *
 * Implements Six Laws (docs/CASE_MODEL.md §2, §4 & docs/tasks/AKTA.md):
 * - Law 2: Record-derived edges vs AI-proposed edges (isAi, tier).
 * - Law 3: An edge with NO resolvable citation DOES NOT RENDER (console.warn).
 * - Target resolution: wiki-links resolve against known vault notes;
 *   unresolved targets produce distinct unresolved lead nodes (isUnresolved: true).
 */

import type {
  Citation,
  EntityRole,
  EntityType,
  GraphData,
  GraphEdge,
  GraphNode,
  NoteInput,
  ParsedNote,
} from './types.ts'

export * from './types.ts'

/**
 * Regex patterns
 */
// Frontmatter boundary
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

// Unclosed frontmatter fallback (starts with --- but has no closing ---)
const UNCLOSED_FRONTMATTER_REGEX = /^---\r?\n([\s\S]*)$/

// Citation format: ^[source_id locator] e.g. ^[FIR_0142 p:2 l:9] or ^[CDR_9812345678 row:48219]
const CITATION_REGEX = /\^\[\s*([^\s\]]+)\s+([^\]]+?)\s*\]/

// Wiki-link format: [[Target]] or [[Target|Alias]]
const WIKILINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/

// AI marker comment: <!-- ai:<proposal_id> accepted -->
const AI_MARKER_REGEX = /<!--\s*ai:([a-zA-Z0-9_-]+)(?:\s+accepted)?\s*-->/i

// Markdown H1 title
const H1_TITLE_REGEX = /^#\s+(.+)$/m

/**
 * Robust YAML frontmatter parser for browser and node environments.
 * Gracefully tolerates malformed lines, unclosed delimiters, quotes, and inline/block arrays.
 */
export function parseFrontmatterBlock(content: string): {
  frontmatter: Record<string, unknown>
  body: string
} {
  if (!content || typeof content !== 'string') {
    return { frontmatter: {}, body: '' }
  }

  let rawYaml: string | null = null
  let body = content

  const match = content.match(FRONTMATTER_REGEX)
  if (match) {
    rawYaml = match[1]
    body = content.slice(match[0].length)
  } else if (content.startsWith('---')) {
    // Check for unclosed frontmatter before a heading
    const headingIndex = content.search(/\r?\n#{1,6}\s+/)
    if (headingIndex !== -1) {
      rawYaml = content.slice(3, headingIndex).replace(/^\r?\n/, '')
      body = content.slice(headingIndex).replace(/^\r?\n/, '')
    } else {
      // No heading found: check for blank line separation or treat rest as yaml
      const blankLineIndex = content.search(/\r?\n\s*\r?\n/)
      if (blankLineIndex !== -1) {
        rawYaml = content.slice(3, blankLineIndex).replace(/^\r?\n/, '')
        body = content.slice(blankLineIndex).replace(/^\r?\n/, '')
      } else {
        const unclosedMatch = content.match(UNCLOSED_FRONTMATTER_REGEX)
        if (unclosedMatch) {
          rawYaml = unclosedMatch[1]
          body = ''
        }
      }
    }
  }

  if (!rawYaml) {
    return { frontmatter: {}, body }
  }

  const frontmatter: Record<string, unknown> = {}
  const lines = rawYaml.split(/\r?\n/)
  let currentKey: string | null = null
  let currentList: unknown[] | null = null

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trimEnd()
    // Skip empty lines or pure comment lines
    if (!trimmedLine || trimmedLine.trim().startsWith('#')) {
      continue
    }

    // Check for bullet list item: "  - item" or "- item"
    const bulletMatch = trimmedLine.match(/^(\s*)-\s+(.*)$/)
    if (bulletMatch && currentKey) {
      const existingVal = frontmatter[currentKey]
      const keyIsOpenForList =
        currentList !== null ||
        existingVal === '' ||
        Array.isArray(existingVal)

      if (keyIsOpenForList) {
        if (!currentList) {
          currentList = []
          frontmatter[currentKey] = currentList
        }
        const val = parseScalarValue(bulletMatch[2].trim())
        currentList.push(val)
        continue
      }
    }

    // Reset current list if line is not indented and not a bullet
    if (!trimmedLine.startsWith(' ') && !trimmedLine.startsWith('\t')) {
      currentList = null
    }

    // Check for Key: Value
    const colonIdx = trimmedLine.indexOf(':')
    if (colonIdx !== -1) {
      const key = trimmedLine.slice(0, colonIdx).trim()
      const rawVal = trimmedLine.slice(colonIdx + 1).trim()

      if (!key) continue

      currentKey = key
      currentList = null

      if (!rawVal) {
        // Value might follow on next indented lines (e.g. list)
        frontmatter[key] = ''
        continue
      }

      // Inline bracketed list: [a, b, "c"]
      if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        const inner = rawVal.slice(1, -1).trim()
        if (!inner) {
          frontmatter[key] = []
          continue
        }

        // Split by comma ignoring quotes
        const items = splitArrayItems(inner)
        frontmatter[key] = items.map((item) => parseScalarValue(item))
        continue
      }

      // Scalar value
      frontmatter[key] = parseScalarValue(rawVal)
      continue
    }

    // Malformed line without colon or bullet: ignore safely and reset list
    currentList = null
  }

  return { frontmatter, body }
}

/**
 * Parses scalar string/number/boolean from YAML representation.
 */
function parseScalarValue(raw: string): string | number | boolean {
  const trimmed = raw.trim()
  // Check quotes
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }

  // Boolean
  if (trimmed.toLowerCase() === 'true') return true
  if (trimmed.toLowerCase() === 'false') return false

  // Number (only convert if not a phone number / long identifier starting with 0 or length > 12)
  // In criminal investigation, IDs and phone numbers like 9812345678 should ideally be strings
  // but if valid standard number and not looking like a phone/IMEI:
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    // Keep numbers longer than 9 digits as strings to prevent loss of identifier precision
    if (trimmed.length > 9 || (trimmed.length > 1 && trimmed.startsWith('0'))) {
      return trimmed
    }
    const num = Number(trimmed)
    if (!Number.isNaN(num)) return num
  }

  return trimmed
}

/**
 * Splits comma-separated items inside `[...]`, taking quoted strings into account.
 */
function splitArrayItems(inner: string): string[] {
  const items: string[] = []
  let current = ''
  let inQuotes = false
  let quoteChar = ''

  for (let i = 0; i < inner.length; i++) {
    const char = inner[i]
    if ((char === '"' || char === "'") && (i === 0 || inner[i - 1] !== '\\')) {
      if (!inQuotes) {
        inQuotes = true
        quoteChar = char
      } else if (char === quoteChar) {
        inQuotes = false
        quoteChar = ''
      }
      current += char
    } else if (char === ',' && !inQuotes) {
      if (current.trim()) items.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) {
    items.push(current.trim())
  }

  return items
}

/**
 * Extracts the filename without path and without `.md` extension.
 */
function getBasenameWithoutExt(filePath: string): string {
  const cleanPath = filePath.replace(/\\/g, '/')
  const lastSlash = cleanPath.lastIndexOf('/')
  const filename = lastSlash === -1 ? cleanPath : cleanPath.slice(lastSlash + 1)
  return filename.replace(/\.md$/i, '')
}

/**
 * Infers entity type from folder structure if not given in frontmatter.
 */
function inferTypeFromPath(filePath: string): EntityType {
  const lower = filePath.toLowerCase()
  if (lower.includes('01_people') || lower.includes('/people') || lower.includes('/suspects')) {
    return 'person'
  }
  if (
    lower.includes('02_identifiers') ||
    lower.includes('/identifiers') ||
    lower.includes('/phones') ||
    lower.includes('/imeis')
  ) {
    return 'identifier'
  }
  if (lower.includes('03_vehicles') || lower.includes('/vehicles')) {
    return 'vehicle'
  }
  if (lower.includes('04_locations') || lower.includes('/locations') || lower.includes('/towers')) {
    return 'location'
  }
  if (lower.includes('05_organisations') || lower.includes('/organisations') || lower.includes('/orgs')) {
    return 'organisation'
  }
  if (lower.includes('06_events') || lower.includes('/events') || lower.includes('/firs')) {
    return 'event'
  }
  return 'unknown'
}

/**
 * Normalizes an array of string-like values (handles strings or arrays).
 */
function toStringArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean)
  }
  return [String(value).trim()].filter(Boolean)
}

/**
 * Parses a single note's markdown content and frontmatter into a structured ParsedNote.
 */
export function parseNote(
  filePath: string,
  rawContent: string,
  preParsedFrontmatter?: Record<string, unknown>
): ParsedNote {
  const { frontmatter: parsedFm, body } = parseFrontmatterBlock(rawContent)
  const fm = preParsedFrontmatter ? { ...parsedFm, ...preParsedFrontmatter } : parsedFm

  const basename = getBasenameWithoutExt(filePath)

  // Node ID: frontmatter id > entity_id > filename without .md
  const rawId = fm.id ?? fm.entity_id
  const id = rawId !== undefined && rawId !== null && String(rawId).trim() !== ''
    ? String(rawId).trim()
    : basename

  // Type: frontmatter type > folder inference > 'unknown'
  const rawType = fm.type ? String(fm.type).trim().toLowerCase() : ''
  const type: EntityType = rawType || inferTypeFromPath(filePath)

  // Display Name:
  // 1. Frontmatter displayName / display_name / canonical_name / name
  // 2. Markdown # Heading 1
  // 3. First entry of names array
  // 4. Filename without .md
  let displayName = ''
  if (fm.displayName) displayName = String(fm.displayName).trim()
  else if (fm.display_name) displayName = String(fm.display_name).trim()
  else if (fm.canonical_name) displayName = String(fm.canonical_name).trim()
  else if (fm.name) displayName = String(fm.name).trim()

  if (!displayName) {
    const h1Match = body.match(H1_TITLE_REGEX)
    if (h1Match) {
      displayName = h1Match[1].trim()
    }
  }

  const names = toStringArray(fm.names ?? fm.aliases)
  if (!displayName && names.length > 0) {
    displayName = names[0]
  }

  if (!displayName) {
    displayName = basename
  }

  // Role: frontmatter role (accused, witness, complainant, victim, officer)
  const rawRole = fm.role ? String(fm.role).trim().toLowerCase() : undefined
  const role: EntityRole | undefined = rawRole || undefined

  // Identifiers
  const identifiers = toStringArray(fm.identifiers)

  return {
    id,
    type,
    displayName,
    role,
    filePath,
    names,
    identifiers,
    body,
    frontmatter: fm,
  }
}

/**
 * Extracts lines in the `## Links` section from markdown body.
 */
function extractLinksSectionLines(body: string): string[] {
  const lines = body.split(/\r?\n/)
  const linkLines: string[] = []
  let inLinksSection = false

  for (const line of lines) {
    const trimmed = line.trim()

    // Detect heading
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const title = headingMatch[2].trim().toLowerCase()

      if (level >= 2 && (title === 'links' || title.startsWith('links '))) {
        inLinksSection = true
        continue
      } else if (inLinksSection && level <= 2) {
        // Exited ## Links section at next section of level 2 or 1
        inLinksSection = false
      }
    }

    if (inLinksSection) {
      linkLines.push(line)
    }
  }

  return linkLines
}

/**
 * Parses a single line in a note's ## Links section.
 * Returns parsed link attributes, or null if line is not a valid link or lacks citation.
 *
 * Enforces LAW 3: An edge with NO resolvable citation DOES NOT RENDER (logs console warning).
 */
export function parseLinkLine(
  line: string,
  sourceNodeId: string,
  noteIdentifier = sourceNodeId
): {
  target: string
  targetAlias?: string
  reason: string
  citation: Citation
  isAi: boolean
  aiProposalId?: string
  rawText: string
} | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  // Must contain a wiki-link [[Target]]
  const linkMatch = trimmed.match(WIKILINK_REGEX)
  if (!linkMatch) {
    return null
  }

  const rawTarget = linkMatch[1].trim()
  const targetAlias = linkMatch[2]?.trim()

  // LAW 3 CHECK: Citation must match ^[source locator]
  const citMatch = trimmed.match(CITATION_REGEX)
  if (!citMatch || citMatch.index === undefined) {
    console.warn(
      `[Law 3 Violation] Dropping edge without resolvable citation in note "${noteIdentifier}": "${trimmed}"`
    )
    return null
  }

  const sourceId = citMatch[1].trim()
  const locator = citMatch[2].trim()
  const citation: Citation = {
    raw: citMatch[0],
    sourceId,
    sourceDocId: sourceId,
    locator,
  }

  // Parse reason text between end of [[...]] and start of ^[...]
  const linkEnd = linkMatch.index! + linkMatch[0].length
  const citStart = citMatch.index
  let reason = ''
  if (citStart > linkEnd) {
    const rawReason = trimmed.slice(linkEnd, citStart).trim()
    // Strip leading dashes or separators: —, –, --, -, :
    reason = rawReason.replace(/^[\s—–:-]+/, '').trim()
  }

  // Parse AI marker if present: <!-- ai:<proposal_id> accepted -->
  const aiMatch = trimmed.match(AI_MARKER_REGEX)
  const isAi = Boolean(aiMatch)
  const aiProposalId = aiMatch ? aiMatch[1].trim() : undefined

  return {
    target: rawTarget,
    targetAlias,
    reason,
    citation,
    isAi,
    aiProposalId,
    rawText: trimmed,
  }
}

/**
 * Normalizes note inputs into a standard array of { path, content, frontmatter }.
 */
function normalizeInput(
  input: NoteInput[] | Record<string, string>
): Array<{ path: string; content: string; frontmatter?: Record<string, unknown> }> {
  if (Array.isArray(input)) {
    return input.map((item) => ({
      path: item.path,
      content: item.content ?? '',
      frontmatter: item.frontmatter,
    }))
  }

  return Object.entries(input).map(([path, content]) => ({
    path,
    content: content ?? '',
  }))
}

/**
 * Parses a collection of case vault notes into GraphData (nodes and edges).
 *
 * Pure TypeScript function, no React, fully unit-testable.
 *
 * @param input Collection of notes (array of NoteInput or map of path -> content)
 * @returns GraphData containing nodes (including resolved notes and unresolved leads) and edges
 */
export function parseGraph(input: NoteInput[] | Record<string, string>): GraphData {
  const normalizedNotes = normalizeInput(input)

  // Step 1: Parse all entity notes into ParsedNote representations
  const parsedNotes: ParsedNote[] = []
  for (const item of normalizedNotes) {
    // Skip empty paths or non-md non-text entries if any
    if (!item.path) continue
    const parsed = parseNote(item.path, item.content, item.frontmatter)
    parsedNotes.push(parsed)
  }

  // Step 2: Build resolution index to map wiki-link targets to canonical node IDs
  const resolutionMap = new Map<string, string>()

  const registerKey = (key: string | undefined | null, nodeId: string) => {
    if (!key) return
    const cleanKey = key.trim()
    if (!cleanKey) return

    // Exact key
    resolutionMap.set(cleanKey, nodeId)
    // Lowercase key
    resolutionMap.set(cleanKey.toLowerCase(), nodeId)

    // Also strip .md extension if present
    const withoutMd = cleanKey.replace(/\.md$/i, '')
    resolutionMap.set(withoutMd, nodeId)
    resolutionMap.set(withoutMd.toLowerCase(), nodeId)
  }

  for (const note of parsedNotes) {
    registerKey(note.id, note.id)
    registerKey(note.displayName, note.id)
    registerKey(note.filePath, note.id)
    registerKey(getBasenameWithoutExt(note.filePath), note.id)

    // Aliases / names
    for (const name of note.names) {
      registerKey(name, note.id)
    }

    // Identifiers
    for (const ident of note.identifiers) {
      registerKey(ident, note.id)
    }
  }

  // Step 3: Create GraphNodes for all parsed notes
  const nodesMap = new Map<string, GraphNode>()
  for (const note of parsedNotes) {
    nodesMap.set(note.id, {
      id: note.id,
      type: note.type,
      displayName: note.displayName,
      role: note.role,
      filePath: note.filePath,
      isUnresolved: false,
      names: note.names.length > 0 ? note.names : undefined,
      identifiers: note.identifiers.length > 0 ? note.identifiers : undefined,
      metadata: Object.keys(note.frontmatter).length > 0 ? note.frontmatter : undefined,
    })
  }

  // Unresolved target nodes (target note does not exist in vault)
  const unresolvedNodesMap = new Map<string, GraphNode>()

  // Step 4: Parse links from each note's ## Links section into GraphEdges
  const edges: GraphEdge[] = []
  let edgeCounter = 0

  for (const note of parsedNotes) {
    const linkLines = extractLinksSectionLines(note.body)

    for (const line of linkLines) {
      const parsedLink = parseLinkLine(line, note.id, note.filePath)
      if (!parsedLink) {
        // Dropped due to lack of citation (Law 3) or not a link line
        continue
      }

      const targetKey = parsedLink.target.replace(/\.md$/i, '').trim()

      // Resolve target against known notes
      let resolvedTargetId =
        resolutionMap.get(targetKey) ??
        resolutionMap.get(targetKey.toLowerCase()) ??
        resolutionMap.get(parsedLink.target) ??
        resolutionMap.get(parsedLink.target.toLowerCase())

      if (!resolvedTargetId) {
        // Target does not exist in vault notes -> create "unresolved" node
        const unresolvedKey = targetKey.toLowerCase()
        let unresolvedNode = unresolvedNodesMap.get(unresolvedKey)
        if (!unresolvedNode) {
          unresolvedNode = {
            id: targetKey,
            type: 'unknown',
            displayName: targetKey,
            isUnresolved: true,
          }
          unresolvedNodesMap.set(unresolvedKey, unresolvedNode)
        }
        resolvedTargetId = unresolvedNode.id
      }

      edgeCounter++
      const edgeId = `edge_${note.id}_${resolvedTargetId}_${edgeCounter}`

      edges.push({
        id: edgeId,
        source: note.id,
        target: resolvedTargetId,
        reason: parsedLink.reason,
        citation: parsedLink.citation,
        isAi: parsedLink.isAi,
        aiProposalId: parsedLink.aiProposalId,
        tier: parsedLink.isAi ? 'ai-proposed' : 'record-derived',
        rawText: parsedLink.rawText,
      })
    }
  }

  // Combine resolved notes and unresolved leads into final node list
  const allNodes: GraphNode[] = [
    ...Array.from(nodesMap.values()),
    ...Array.from(unresolvedNodesMap.values()),
  ]

  return {
    nodes: allNodes,
    edges,
  }
}

/**
 * Alias for parseGraph.
 */
export const parseVault = parseGraph
