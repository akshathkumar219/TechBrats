/**
 * Deterministic Client-Side Citation Validator (Law 4: Nothing is asserted without a citation).
 *
 * Direct TypeScript port matching brain/agents/validator.py byte-for-byte and regex-for-regex.
 * Enforces Case Model Law 4 across all copilot answers:
 * Any sentence lacking a resolvable `^[source locator]` or citation chip is dropped before render.
 */

export const CITATION_REGEX = /\^\[\s*([^\s\]]+)(?:\s+([^\]]+))?\s*\]/g

export interface CitationRef {
  raw: string
  source_id: string
  locator: string | null
}

export interface ValidationResult {
  surviving_text: string
  surviving_sentences: string[]
  dropped_sentences: string[]
  citations: CitationRef[]
  is_valid: boolean
  dropped_count: number
}

export interface ProposalCitation {
  source_doc_id: string
  locator: string
}

export interface ProposalLike {
  citation?: ProposalCitation | null
}

/**
 * Extract all ^[source_id locator] citations from arbitrary text.
 */
export function extractCitations(text: string): CitationRef[] {
  if (!text) return []
  const matches: CitationRef[] = []
  const regex = new RegExp(CITATION_REGEX.source, 'g')
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const sourceId = match[1]?.trim() || ''
    const locator = match[2]?.trim() || null
    matches.push({
      raw: match[0],
      source_id: sourceId,
      locator,
    })
  }

  return matches
}

/**
 * Check if a sentence contains an existing rendered citation chip (HTML/JSX markup).
 */
export function hasRenderedCitationChip(text: string): boolean {
  if (!text) return false
  return (
    /class=["'][^"']*citation-chip[^"']*["']/i.test(text) ||
    /<button[^>]*copilot-citation-chip/i.test(text) ||
    /data-citation/i.test(text)
  )
}

/**
 * Check if a source_id is resolvable.
 * If valid_sources is provided, source_id must exist in valid_sources (with or without DOC_ prefix,
 * or matching note path).
 * If valid_sources is null or undefined, any non-empty source_id is considered resolvable.
 */
export function isSourceResolvable(
  sourceId: string,
  validSources?: Iterable<string> | null
): boolean {
  if (!sourceId || !sourceId.trim()) {
    return false
  }

  if (!validSources) {
    return true
  }

  const sourcesSet = validSources instanceof Set ? validSources : new Set(validSources)
  if (sourcesSet.size === 0) {
    return true
  }

  // 1. Direct match
  if (sourcesSet.has(sourceId)) {
    return true
  }

  // 2. Normalized with DOC_ prefix
  const withDoc = sourceId.startsWith('DOC_') ? sourceId : `DOC_${sourceId}`
  if (sourcesSet.has(withDoc)) {
    return true
  }

  // 3. Normalized without DOC_ prefix
  const withoutDoc = sourceId.startsWith('DOC_') ? sourceId.slice(4) : sourceId
  if (sourcesSet.has(withoutDoc)) {
    return true
  }

  // 4. Substring / note path match (e.g. '00_Raw_Inputs/FIR/FIR_0142_Kharkhoda.md' matches 'DOC_FIR_0142')
  for (const item of sourcesSet) {
    if (
      item === sourceId ||
      item === withDoc ||
      item === withoutDoc ||
      item.includes(sourceId) ||
      item.includes(withoutDoc)
    ) {
      return true
    }
  }

  return false
}

/**
 * Tokenize text into distinct sentences while keeping attached citations
 * (both preceding and succeeding sentence terminal punctuation) attached to
 * the correct sentence.
 *
 * Matches Python validator.py:
 * r"([^\n.!?]+(?:[.!?]+(?:\s*\^\[[^\]]+\])*|\^\[[^\]]+\]))(?=\s+|$)"
 */
export function splitIntoSentences(text: string): string[] {
  if (!text || !text.trim()) {
    return []
  }

  const sentencePattern = /([^\n.!?]+(?:[.!?]+(?:\s*\^\[[^\]]+\])*|\^\[[^\]]+\]))(?=\s+|$)/g
  const sentences: string[] = []

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const matches: string[] = []
    let match: RegExpExecArray | null
    sentencePattern.lastIndex = 0

    while ((match = sentencePattern.exec(line)) !== null) {
      const sentence = match[1]?.trim()
      if (sentence) {
        matches.push(sentence)
      }
    }

    if (matches.length > 0) {
      sentences.push(...matches)
    } else {
      sentences.push(line)
    }
  }

  return sentences
}

/**
 * Check if a single sentence contains at least one resolvable citation or citation chip.
 */
export function sentenceHasCitation(
  sentence: string,
  validSources?: Iterable<string> | null
): boolean {
  if (!sentence || !sentence.trim()) return false

  // Check rendered chip tag
  if (hasRenderedCitationChip(sentence)) {
    return true
  }

  const citations = extractCitations(sentence)
  if (citations.length === 0) {
    return false
  }

  return citations.some((c) => isSourceResolvable(c.source_id, validSources))
}

/**
 * Validate arbitrary text against Case Model Law 4:
 * - Splits text into individual sentences.
 * - Inspects each sentence for resolvable ^[source_id locator] citations or citation chips.
 * - Drops any sentence lacking a resolvable citation before the user ever sees it.
 * - Returns surviving text, surviving list, and dropped list.
 */
export function validateText(
  text: string,
  validSources?: Iterable<string> | null
): ValidationResult {
  const sentences = splitIntoSentences(text)
  const surviving: string[] = []
  const dropped: string[] = []
  const allCitations: CitationRef[] = []

  for (const sentence of sentences) {
    const citations = extractCitations(sentence)
    const resolvable = citations.filter((c) => isSourceResolvable(c.source_id, validSources))

    if (resolvable.length > 0 || hasRenderedCitationChip(sentence)) {
      surviving.push(sentence)
      allCitations.push(...resolvable)
    } else {
      dropped.push(sentence)
    }
  }

  const survivingText = surviving.join(' ')
  const isValid = dropped.length === 0

  return {
    surviving_text: survivingText,
    surviving_sentences: surviving,
    dropped_sentences: dropped,
    citations: allCitations,
    is_valid: isValid,
    dropped_count: dropped.length,
  }
}

/**
 * Preserves paragraph structure while dropping uncited sentences from each paragraph.
 */
export function validateParagraphs(
  text: string,
  validSources?: Iterable<string> | null
): string {
  if (!text || !text.trim()) return ''

  const paras = text.split(/\n\n+/)
  const survivingParas: string[] = []

  for (const para of paras) {
    const result = validateText(para, validSources)
    if (result.surviving_sentences.length > 0) {
      survivingParas.push(result.surviving_sentences.join(' '))
    }
  }

  return survivingParas.join('\n\n')
}

/**
 * Validate a single proposal against Law 3 & 4.
 */
export function validateProposal<T extends ProposalLike>(
  proposal: T,
  validSources?: Iterable<string> | null
): boolean {
  if (!proposal.citation) return false
  if (!proposal.citation.source_doc_id || !proposal.citation.locator) return false
  return isSourceResolvable(proposal.citation.source_doc_id, validSources)
}

/**
 * Filter a list of proposals into { surviving, dropped }.
 */
export function validateProposals<T extends ProposalLike>(
  proposals: T[],
  validSources?: Iterable<string> | null
): { surviving: T[]; dropped: T[] } {
  const surviving: T[] = []
  const dropped: T[] = []

  for (const p of proposals) {
    if (validateProposal(p, validSources)) {
      surviving.push(p)
    } else {
      dropped.push(p)
    }
  }

  return { surviving, dropped }
}
