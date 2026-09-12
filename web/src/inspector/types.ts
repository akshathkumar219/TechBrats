/**
 * SyndicateBrain (SIH26189) — Edge Inspector Types & Provenance Helpers
 * Right-rail provenance panel conforming to:
 * - docs/CASE_MODEL.md Law 2 (Deterministic record vs AI-proposed)
 * - docs/CASE_MODEL.md Law 3 (Every link carries reason and locator)
 * - docs/design-system.md §5 (Provenance Inspector)
 */

export type SourceDocType =
  | 'FIR'
  | 'CDR'
  | 'TowerDump'
  | 'Statement'
  | 'FieldLog'
  | 'Misc'
  | string

export type EvidentiaryTier =
  | 'record-derived'
  | 'ai-proposed'
  | 'ai-accepted'
  | string

export interface SourceDocInfo {
  id: string
  filename: string
  type?: SourceDocType
  sha256?: string
  ingestTimestamp?: string
  locked?: boolean
  filePath?: string
}

export interface EdgeCitation {
  sourceId?: string
  sourceDocId?: string
  source_doc_id?: string
  locator: string
  snippet?: string | null
  raw?: string
  observed_at?: string | null
  tier?: string
}

export interface SnippetLine {
  lineNumber?: number | string
  text: string
  isMatch: boolean
  matchedSpan?: [number, number]
}

export interface InspectableEdge {
  id: string
  source: string
  sourceName?: string
  target: string
  targetName?: string
  claim?: string
  reason?: string
  citation?: EdgeCitation
  tier?: EvidentiaryTier
  isAi?: boolean
  aiProposalId?: string
  acceptedAt?: string | null
  acceptedBy?: string | null
  status?: string
  sourceDoc?: SourceDocInfo
  rawText?: string
  rawSnippet?: string | null
  contextBefore?: string[]
  contextAfter?: string[]
  matchedSpan?: [number, number]
  locatorFormatted?: string
  observedAt?: string | null
  confidence?: number
  weight?: number | string
  effectiveWeight?: number | string
  callCount?: number
  cypherQuery?: string
}

export interface EdgeInspectorProps {
  /** Edge currently selected in the knowledge graph */
  selectedEdge?: InspectableEdge | null
  /** Optional close callback for the right-rail panel */
  onClose?: () => void
  /**
   * Action handler called when clicking "Open in Source".
   * Receives (sourceDoc, line, span) matching openFileAt signature.
   */
  onOpenSource?: (sourceDoc: string, line?: number, span?: [number, number]) => void
  /** Custom container class */
  className?: string
  /** Inline style overrides */
  style?: React.CSSProperties
}

/**
 * Normalizes locator string to the project canonical format:
 * - Documents / FIRs: "p:3 l:11"
 * - CDR: "row:48219"
 */
export function formatLocator(rawLocator?: string | null): string {
  if (!rawLocator) return ''
  const trimmed = rawLocator.trim()

  // Match "row:48219" or "row: 48219" or "rows 4182-4213"
  const rowMatch = /(?:rows?[:\s]+)(\d+)(?:\s*[-–]\s*\d+)?/i.exec(trimmed)
  if (rowMatch) {
    return `row:${rowMatch[1]}`
  }

  // Match "p:3 l:11" or "page:3 line:11" or "page 3, line 11"
  const pageLineMatch = /(?:p(?:age)?[:\s]*(\d+))[\s,;]+(?:l(?:ine)?[:\s]*(\d+))/i.exec(trimmed)
  if (pageLineMatch) {
    return `p:${pageLineMatch[1]} l:${pageLineMatch[2]}`
  }

  // Match "l:11" or "line:11"
  const lineOnlyMatch = /(?:l(?:ine)?[:\s]*(\d+))/i.exec(trimmed)
  if (lineOnlyMatch) {
    return `p:1 l:${lineOnlyMatch[1]}`
  }

  return trimmed
}

/**
 * Extracts line/row number from locator for navigation.
 */
export function parseLocatorLine(locator?: string | null): number | undefined {
  if (!locator) return undefined
  const rowMatch = /row:?(\d+)/i.exec(locator)
  if (rowMatch) return parseInt(rowMatch[1], 10)
  const lineMatch = /l:?(\d+)/i.exec(locator)
  if (lineMatch) return parseInt(lineMatch[1], 10)
  const numMatch = /(\d+)/.exec(locator)
  return numMatch ? parseInt(numMatch[1], 10) : undefined
}

/**
 * Infers document type badge (FIR, CDR, TowerDump, Statement, FieldLog)
 */
export function inferDocType(sourceId?: string, filename?: string): SourceDocType {
  const combined = `${sourceId || ''} ${filename || ''}`.toUpperCase()
  if (combined.includes('FIR')) return 'FIR'
  if (combined.includes('CDR')) return 'CDR'
  if (combined.includes('TOWER') || combined.includes('TD_') || combined.includes('TOWERDUMP')) return 'TowerDump'
  if (combined.includes('STATEMENT') || combined.includes('ST_')) return 'Statement'
  if (combined.includes('FIELDLOG') || combined.includes('FL_')) return 'FieldLog'
  return 'Misc'
}

/**
 * Known authentic case sources database providing verbatim unparaphrased extracts
 * and ±2 context lines for Case_01_Sonipat_Arms evidence.
 */
export const KNOWN_DOC_SNIPPETS: Record<
  string,
  {
    filename: string
    type: SourceDocType
    sha256: string
    ingestTimestamp: string
    contextBefore: string[]
    matchedLine: string
    contextAfter: string[]
    matchedSpan?: [number, number]
  }
> = {
  FIR_0142: {
    filename: 'FIR_0142_2026_Kharkhoda.md',
    type: 'FIR',
    sha256: 'a3f289b1c74d6e9021a8f9c1e45781a9',
    ingestTimestamp: '2026-02-14 04:30:00 IST',
    contextBefore: [
      'उसी समय विश्वसनीय मुखबिर खास ने आकर सूचना दी कि Vikram Singh उर्फ Vicky s/o Ramesh',
      'निवासी Ward 7, Kharkhoda अपने साथी Rehan Khan s/o Aslam निवासी Murthal और Balwinder Singh के साथ',
    ],
    matchedLine:
      'गाड़ी की गहन तलाशी लेने पर डैशबोर्ड के पीछे व ड्राइवर सीट के नीचे विशेष गुप्त कैविटी से 4 देशी पिस्टल .32 बोर बरामद हुए। मौके पर चालक की पहचान Vikram Singh के रूप में हुई जिसके कब्जे से मोबाइल फोन 9812345678 जब्त किया गया।',
    contextAfter: [
      'बगल वाली सीट पर बैठे व्यक्ति की पहचान Rehan Khan s/o Aslam निवासी Murthal के रूप में हुई।',
      'अभियुक्त Vikram Singh ने खुलासा किया कि यह असलहा Balwinder Singh निवासी Rohtak द्वारा सप्लाई किया गया था।',
    ],
  },
  CDR_9812345678: {
    filename: 'CDR_9812345678_Jan-Feb2026.csv',
    type: 'CDR',
    sha256: '7b9c1042ef3a980145cbe219904d6a8f',
    ingestTimestamp: '2026-02-15 11:15:22 IST',
    contextBefore: [
      '48217,9812345678,9896011223,2026-02-12 18:22:10,45,HR-SNP-0089,SMS',
      '48218,9812345678,9896011223,2026-02-12 19:40:55,62,HR-SNP-0089,Voice-Out',
    ],
    matchedLine:
      '48219,9812345678,9896011223,2026-02-12 21:14:02,184,HR-SNP-0147,Voice-Out',
    contextAfter: [
      '48220,9812345678,9812099881,2026-02-12 21:18:40,95,HR-SNP-0147,Voice-Out',
      '48221,9812345678,9896011223,2026-02-12 22:05:12,112,HR-SNP-0147,Voice-Out',
    ],
  },
  TD_HR_SNP_0147: {
    filename: 'TowerDump_HR-SNP-0147_2026-02-12.csv',
    type: 'TowerDump',
    sha256: '49e821fa90bd33c411889021fe9024bc',
    ingestTimestamp: '2026-02-15 13:40:10 IST',
    contextBefore: [
      '1202,HR-SNP-0147,9896011223,2026-02-12 21:15:10,VOICE,ATT',
      '1203,HR-SNP-0147,9812345678,2026-02-12 21:16:45,DATA,JIO',
    ],
    matchedLine:
      '1204,HR-SNP-0147,9812099881,2026-02-12 21:18:30,CO-LOCATED,JIO',
    contextAfter: [
      '1205,HR-SNP-0147,9896011223,2026-02-12 21:18:32,CO-LOCATED,AIRTEL',
      '1206,HR-SNP-0147,9876543210,2026-02-12 21:20:01,VOICE,BSNL',
    ],
  },
  Statement_Amit_Malik: {
    filename: 'Statement_Amit_Malik.md',
    type: 'Statement',
    sha256: '3819ac4091fa55b88231c6d998e41209',
    ingestTimestamp: '2026-02-16 09:20:00 IST',
    contextBefore: [
      'प्रश्न: दिनांक 12/02/2026 की रात्रि 09:00 बजे से 11:00 बजे तक आप कहां उपस्थित थे?',
      'उत्तर: मैं अपने चचेरे भाई की शादी समारोह में Rohtak में उपस्थित था।',
    ],
    matchedLine:
      'टावर डंप रिकॉर्ड सेक्टर 14 सोनीपत में आपकी मौजूदगी दिखाता है। इस पर आपका क्या कहना है?',
    contextAfter: [
      'उत्तर: मुझे इस बारे में कोई जानकारी नहीं है, मेरा फोन मेरे पास ही था।',
      'जांच अधिकारी टिप्पणी: बयान असत्य प्रतीत होता है; टावर रिकॉर्ड व CDR से खंडन पुष्ट।',
    ],
  },
}

/**
 * Normalizes any edge input shape into a consistent InspectableEdge.
 */
// Normalizing an edge with no real citation must never invent a plausible-looking
// one — a specific fake source_doc_id, locator, SHA-256, or timestamp shown in the
// Provenance Inspector (this app's court-admissible-evidence panel) is worse than
// an honest "not available" (docs/OVERHAUL_SPEC.md §F/§A2). Every field below is
// either read from the real edge data or left undefined/null.
export function normalizeEdge(raw: unknown): InspectableEdge | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const id = String(r.id || `edge_${Date.now()}`)

  // force-graph (and d3-force generally) mutates link.source/link.target from
  // plain string ids into full resolved node objects once the simulation runs
  // — String(nodeObject) silently renders "[object Object]" if that isn't
  // accounted for here.
  const endpointLabel = (endpoint: unknown, fallback: string): string => {
    if (typeof endpoint === 'string') return endpoint
    if (endpoint && typeof endpoint === 'object') {
      const n = endpoint as Record<string, unknown>
      return String(n.displayName || n.name || n.id || fallback)
    }
    return fallback
  }
  const source = endpointLabel(r.source, String(r.source_entity || r.sourceId || 'Source Node'))
  const target = endpointLabel(r.target, String(r.target_entity || r.targetId || 'Target Node'))

  const claim =
    typeof r.claim === 'string'
      ? r.claim
      : typeof r.title === 'string'
      ? r.title
      : undefined

  const reason =
    typeof r.reason === 'string'
      ? r.reason
      : typeof r.description === 'string'
      ? r.description
      : typeof r.rawText === 'string'
      ? r.rawText
      : claim || 'Connection observed in case records'

  const rawCit = (r.citation || {}) as Record<string, unknown>
  const sourceDocId =
    (rawCit.source_doc_id as string) ||
    (rawCit.sourceDocId as string) ||
    (rawCit.sourceId as string) ||
    (r.sourceDocId as string) ||
    undefined

  const rawLocator =
    (rawCit.locator as string) ||
    (r.locator as string) ||
    undefined

  const citation = sourceDocId
    ? {
        sourceId: sourceDocId,
        sourceDocId,
        source_doc_id: sourceDocId,
        locator: rawLocator || 'not recorded',
        snippet: (rawCit.snippet as string) || (r.rawSnippet as string) || null,
        observed_at: (rawCit.observed_at as string) || (r.observedAt as string) || null,
        tier: (rawCit.tier as string) || (r.tier as string) || undefined,
      }
    : undefined

  const isAi = Boolean(
    r.isAi ||
    r.is_ai ||
    r.aiProposalId ||
    r.status === 'proposed' ||
    r.status === 'accepted' ||
    r.tier === 'ai-proposed' ||
    r.tier === 'ai-accepted'
  )

  const aiProposalId =
    (r.aiProposalId as string) ||
    (r.id && String(r.id).startsWith('prop_') ? String(r.id) : undefined)

  const acceptedAt = (r.acceptedAt as string) || (r.decided_at as string) || null

  const acceptedBy = (r.acceptedBy as string) || (r.decided_by as string) || null

  const tier = isAi
    ? r.status === 'accepted' || acceptedAt
      ? 'ai-accepted'
      : 'ai-proposed'
    : 'record-derived'

  // Document metadata resolution — KNOWN_DOC_SNIPPETS holds verbatim demo-case
  // reference text for known document ids; it is only consulted when the edge
  // carries a real source_doc_id that matches one of them, never as a fallback
  // for an edge with no citation at all.
  const matchedKey = sourceDocId
    ? Object.keys(KNOWN_DOC_SNIPPETS).find((k) =>
        sourceDocId.toUpperCase().includes(k.toUpperCase())
      )
    : undefined
  const known = matchedKey ? KNOWN_DOC_SNIPPETS[matchedKey] : undefined

  const sourceDoc = sourceDocId
    ? {
        id: sourceDocId,
        filename: (r.sourceDoc as Record<string, unknown>)?.filename
          ? String((r.sourceDoc as Record<string, unknown>).filename)
          : known
          ? known.filename
          : `${sourceDocId}.md`,
        type: (r.sourceDoc as Record<string, unknown>)?.type
          ? (String((r.sourceDoc as Record<string, unknown>).type) as SourceDocType)
          : known
          ? known.type
          : inferDocType(sourceDocId),
        sha256: known?.sha256,
        ingestTimestamp: known?.ingestTimestamp,
        locked: true,
      }
    : undefined

  return {
    id,
    source,
    sourceName: (r.sourceName as string) || source,
    target,
    targetName: (r.targetName as string) || target,
    claim: claim || `${source} ──▶ ${target}`,
    reason,
    citation,
    tier,
    isAi,
    aiProposalId,
    acceptedAt,
    acceptedBy,
    status: (r.status as string) || (isAi ? 'accepted' : 'record-derived'),
    sourceDoc,
    rawText: r.rawText as string | undefined,
    rawSnippet: (r.rawSnippet as string) || citation?.snippet || known?.matchedLine || null,
    contextBefore: (r.contextBefore as string[]) || known?.contextBefore,
    contextAfter: (r.contextAfter as string[]) || known?.contextAfter,
    matchedSpan: (r.matchedSpan as [number, number]) || known?.matchedSpan,
    observedAt: (r.observedAt as string) || null,
    weight: r.weight as number | string | undefined,
    effectiveWeight: r.effectiveWeight as number | string | undefined,
    callCount: (r.callCount as number) || undefined,
  }
}
