/**
 * Graph data models for SyndicateBrain (SIH26189).
 * Offline criminal-investigation workbench for Indian police.
 */

/**
 * Entity types supported in SyndicateBrain case vaults.
 */
export type EntityType =
  | 'person'
  | 'identifier'
  | 'vehicle'
  | 'location'
  | 'organisation'
  | 'event'
  | 'unknown'
  | string

/**
 * Entity roles under Indian criminal procedure / BSA / case notes.
 */
export type EntityRole =
  | 'accused'
  | 'witness'
  | 'complainant'
  | 'victim'
  | 'officer'
  | string

/**
 * Citation representing provenance for an edge or claim.
 * Fixed locator format:
 * - Documents / FIRs: 'p:3 l:11'
 * - CDR: 'row:48219'
 */
export interface Citation {
  /** Raw citation string as written in note, e.g. "^[FIR_0142 p:2 l:9]" */
  raw: string
  /** Source document ID, e.g. "FIR_0142" or "CDR_9812345678" */
  sourceId: string
  /** Alias for sourceId matching Python brain schemas */
  sourceDocId: string
  /** Specific locator within source, e.g. "p:2 l:9" or "row:48219" */
  locator: string
}

/**
 * A node in the investigation knowledge graph.
 */
export interface GraphNode {
  /** Unique entity identifier, e.g. "person_0031" or note filename */
  id: string
  /** Entity category */
  type: EntityType
  /** Display label for graph visualization */
  displayName: string
  /** Frontmatter role (accused, witness, complainant, victim, officer) */
  role?: EntityRole
  /** Vault relative file path, e.g. "01_People/Vikram Singh.md" */
  filePath?: string
  /** True if link points to an entity note that does not exist in vault */
  isUnresolved?: boolean
  /** Known aliases or variant names */
  names?: string[]
  /** Associated identifiers (phone numbers, IMEIs, registrations) */
  identifiers?: string[]
  /** Frontmatter properties preserved for inspection */
  metadata?: Record<string, unknown>
}

/**
 * An edge connecting two entities in the knowledge graph.
 */
export interface GraphEdge {
  /** Unique edge identifier */
  id: string
  /** Source entity node ID */
  source: string
  /** Target entity node ID */
  target: string
  /** Reason / claim text explaining connection */
  reason: string
  /** Verified citation backing this connection (LAW 3) */
  citation: Citation
  /** Whether link was proposed by AI and human-accepted */
  isAi: boolean
  /** AI proposal ID if isAi is true, e.g. "prop_0007" */
  aiProposalId?: string
  /** Evidentiary tier: 'record-derived' vs 'ai-proposed' */
  tier: 'record-derived' | 'ai-proposed'
  /** Original line from the ## Links section */
  rawText?: string
}

/**
 * Parsed knowledge graph output.
 */
export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

/**
 * Note input object accepted by the graph parser.
 */
export interface NoteInput {
  /** Vault path of note, e.g. "01_People/Vikram Singh.md" */
  path: string
  /** Raw markdown note content (including frontmatter) */
  content?: string
  /** Pre-parsed frontmatter if already parsed */
  frontmatter?: Record<string, unknown>
}

/**
 * Intermediate parsed representation of an entity note.
 */
export interface ParsedNote {
  id: string
  type: EntityType
  displayName: string
  role?: EntityRole
  filePath: string
  names: string[]
  identifiers: string[]
  body: string
  frontmatter: Record<string, unknown>
}
