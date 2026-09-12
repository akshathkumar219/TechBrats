/**
 * Types for SyndicateBrain Proposals System (HAR-T05).
 * Conforms to docs/CASE_MODEL.md §6 and brain/schemas.py.
 */

export interface Citation {
  source_doc_id: string
  locator: string // e.g. "row:48219" for CDR, "p:3 l:11" for documents
  snippet?: string | null
  observed_at?: string | null
  tier?: string // 'deterministic' | 'ai-proposed'
}

export type ProposalStatus = 'proposed' | 'accepted' | 'rejected'

export interface Proposal {
  id: string
  claim: string
  reason: string
  citation: Citation
  confidence: number // 0.0 to 1.0 (e.g. 0.94)
  source_entity?: string | null
  target_entity?: string | null
  status?: ProposalStatus | string
  created_at?: string | null
  decided_at?: string | null
  decided_by?: string | null
}

export interface FileUpdateProposal {
  file_path: string
  note_id?: string | null
  reason: string
  suggested_additions: string[]
  citation?: Citation | null
}

export interface AnalysisResult {
  case_id: string
  summary: string
  new_connections?: Proposal[]
  files_to_update?: FileUpdateProposal[]
  dropped_proposals_count?: number
  analyzed_at?: string | null
  /** True when served from the backend's 07_AI_Synthesis fixture, not a live run. */
  cache_used?: boolean
}

export interface CitationChipProps {
  citation: Citation
  inline?: boolean
  onClick?: (citation: Citation) => void
  className?: string
}

export interface ProposalCardProps {
  proposal: Proposal
  onAccept?: (id: string) => Promise<void> | void
  onReject?: (id: string) => Promise<void> | void
  onOpenCitation?: (citation: Citation) => void
  className?: string
}

export interface ProposalPanelProps {
  analysisResult?: AnalysisResult | null
  caseId?: string
  vaultPath?: string
  isLoading?: boolean
  onAcceptProposal?: (id: string) => Promise<void> | void
  onRejectProposal?: (id: string) => Promise<void> | void
  onOpenCitation?: (citation: Citation) => void
  onOpenFile?: (filePath: string, line?: number) => void
  onRefresh?: () => void
  className?: string
}
