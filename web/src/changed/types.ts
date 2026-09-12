import type { Citation, AnalysisResult, Proposal, FileUpdateProposal } from '../proposals/types'

export type WhatChangedCategory = 'connections' | 'updates' | 'contradictions' | 'crosscase'

export type BadgeTone = 'evidence' | 'hypothesis' | 'danger' | 'info' | 'ok'

export interface WhatChangedItem {
  id: string
  category: WhatChangedCategory
  title: string
  description: string
  badgeText: string
  badgeTone: BadgeTone
  citation?: Citation | null
  confidence?: number
  sourceEntity?: string | null
  targetEntity?: string | null
  targetProposalId?: string | null
  targetFilePath?: string | null
  targetIdentifier?: string | null
  suggestedAdditions?: string[]
  matchedCases?: string[]
  timestamp?: string | null
  status?: string
}

export interface WhatChangedSummaryMetrics {
  newConnectionsCount: number
  filesToUpdateCount: number
  contradictionsCount: number
  crossCaseHitsCount: number
  totalChangesCount: number
}

export interface WhatChangedDiff {
  caseId: string
  analyzedAt?: string | null
  summaryText: string
  metrics: WhatChangedSummaryMetrics
  connections: WhatChangedItem[]
  filesToUpdate: WhatChangedItem[]
  contradictions: WhatChangedItem[]
  crossCaseHits: WhatChangedItem[]
}

export interface WhatChangedNavigationTarget {
  category: WhatChangedCategory
  proposalId?: string | null
  filePath?: string | null
  identifier?: string | null
  sectionId?: string
  item: WhatChangedItem
}

export interface WhatChangedPanelProps {
  analysisResult?: AnalysisResult | null
  diffData?: WhatChangedDiff | null
  caseId?: string
  vaultPath?: string
  isLoading?: boolean
  onNavigateProposal?: (target: WhatChangedNavigationTarget) => void
  onSelectProposal?: (proposalId: string) => void
  onOpenFile?: (filePath: string) => void
  onSelectCrossCase?: (identifier: string) => void
  onRefresh?: () => Promise<void> | void
  className?: string
}

/** A real, empty diff — no proposals have been analysed yet. Never substitute
 * fabricated exemplars for missing data (docs/OVERHAUL_SPEC.md §F). */
export function emptyWhatChangedDiff(caseId: string): WhatChangedDiff {
  return {
    caseId,
    summaryText: '',
    metrics: {
      newConnectionsCount: 0,
      filesToUpdateCount: 0,
      contradictionsCount: 0,
      crossCaseHitsCount: 0,
      totalChangesCount: 0,
    },
    connections: [],
    filesToUpdate: [],
    contradictions: [],
    crossCaseHits: [],
  }
}

/**
 * Converts an AnalysisResult and optional cross-case hits into a structured WhatChangedDiff.
 */
export function buildDiffFromAnalysis(
  result: AnalysisResult | null | undefined,
  fallbackCaseId: string = 'Case_01_Sonipat_Arms'
): WhatChangedDiff {
  if (!result) {
    return emptyWhatChangedDiff(fallbackCaseId)
  }

  const allProposals: Proposal[] = result.new_connections || []
  const files: FileUpdateProposal[] = result.files_to_update || []

  const contradictions: WhatChangedItem[] = []
  const crossCaseHits: WhatChangedItem[] = []
  const connections: WhatChangedItem[] = []

  for (const p of allProposals) {
    const claimLower = (p.claim || '').toLowerCase()
    const reasonLower = (p.reason || '').toLowerCase()

    if (
      p.id === 'prop_0006' ||
      claimLower.includes('contradiction') ||
      claimLower.includes('alibi') ||
      reasonLower.includes('contradiction') ||
      reasonLower.includes('alibi') ||
      reasonLower.includes('refut')
    ) {
      contradictions.push({
        id: p.id,
        category: 'contradictions',
        title: p.claim,
        description: p.reason,
        badgeText: 'Alibi Refuted',
        badgeTone: 'danger',
        confidence: p.confidence,
        citation: p.citation,
        sourceEntity: p.source_entity,
        targetEntity: p.target_entity,
        targetProposalId: p.id,
        status: p.status,
      })
    } else if (
      claimLower.includes('cross-case') ||
      claimLower.includes('cross case') ||
      reasonLower.includes('cross-case') ||
      reasonLower.includes('cross case')
    ) {
      crossCaseHits.push({
        id: p.id,
        category: 'crosscase',
        title: p.claim,
        description: p.reason,
        badgeText: 'Cross-Case Match',
        badgeTone: 'hypothesis',
        confidence: p.confidence,
        citation: p.citation,
        sourceEntity: p.source_entity,
        targetEntity: p.target_entity,
        targetProposalId: p.id,
        status: p.status,
      })
    } else {
      connections.push({
        id: p.id,
        category: 'connections',
        title: p.claim,
        description: p.reason,
        badgeText: p.confidence >= 0.9 ? 'Deterministic' : 'Predicted Lead',
        badgeTone: p.confidence >= 0.9 ? 'evidence' : 'hypothesis',
        confidence: p.confidence,
        citation: p.citation,
        sourceEntity: p.source_entity,
        targetEntity: p.target_entity,
        targetProposalId: p.id,
        status: p.status,
      })
    }
  }

  const filesToUpdate: WhatChangedItem[] = files.map((f, idx) => ({
    id: `upd_${idx + 1}`,
    category: 'updates',
    title: f.file_path,
    description: f.reason,
    badgeText: `${f.suggested_additions?.length || 1} Additions`,
    badgeTone: 'info',
    targetFilePath: f.file_path,
    suggestedAdditions: f.suggested_additions,
    citation: f.citation,
  }))

  const metrics: WhatChangedSummaryMetrics = {
    newConnectionsCount: connections.length,
    filesToUpdateCount: filesToUpdate.length,
    contradictionsCount: contradictions.length,
    crossCaseHitsCount: crossCaseHits.length,
    totalChangesCount:
      connections.length + filesToUpdate.length + contradictions.length + crossCaseHits.length,
  }

  return {
    caseId: result.case_id || fallbackCaseId,
    analyzedAt: result.analyzed_at || new Date().toISOString(),
    summaryText: result.summary || '',
    metrics,
    connections,
    filesToUpdate,
    contradictions,
    crossCaseHits,
  }
}
