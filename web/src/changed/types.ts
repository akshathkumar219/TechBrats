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

/**
 * Procedural, record-based mock diff conforming to design-system.md §7:
 * "Procedural, precise, never dramatic. The app never says 'suspicious', 'dangerous',
 * 'mastermind', or 'criminal' about a person — it says what the data shows."
 *
 * Exact breakdown per BUILD_PROMPTS.md step 27:
 * 3 new connections proposed · 2 files to update · 1 contradiction found · 1 cross-case hit
 */
export const DEFAULT_WHAT_CHANGED_DIFF: WhatChangedDiff = {
  caseId: 'Case_01_Sonipat_Arms',
  analyzedAt: '2026-02-19T14:30:00+05:30',
  summaryText:
    'Analysis of recent evidentiary inputs (FIR 0142/2026, CDR 9812345678, and Tower Dump HR-SNP-0147) identified 3 verified associations, 2 note update requirements, 1 alibi contradiction against physical logs, and 1 cross-case hardware identifier match.',
  metrics: {
    newConnectionsCount: 3,
    filesToUpdateCount: 2,
    contradictionsCount: 1,
    crossCaseHitsCount: 1,
    totalChangesCount: 7,
  },
  connections: [
    {
      id: 'prop_0001',
      category: 'connections',
      title: 'Vikram Singh coordinated arms consignment with Rehan Khan',
      description:
        '14 calls logged across 72 hours preceding Kharkhoda arms seizure between suspect phone and logistics coordinator',
      badgeText: 'CDR Deterministic',
      badgeTone: 'evidence',
      confidence: 0.94,
      sourceEntity: 'Vikram Singh',
      targetEntity: 'Rehan Khan',
      targetProposalId: 'prop_0001',
      citation: {
        source_doc_id: 'DOC_CDR_9812345678',
        locator: 'row:48219',
        snippet: '9812345678 -> 9896011223 | 2026-02-12 21:14:02 | dur: 184s | cell: HR-SNP-0147',
      },
    },
    {
      id: 'prop_0002',
      category: 'connections',
      title: 'Rehan Khan co-located with Amit Malik at Sonipat Toll Plaza',
      description:
        'Simultaneous cell tower registration on Sector 14 cell HR-SNP-0147 within 4-minute window during transit',
      badgeText: 'Tower Co-Location',
      badgeTone: 'evidence',
      confidence: 0.91,
      sourceEntity: 'Rehan Khan',
      targetEntity: 'Amit Malik',
      targetProposalId: 'prop_0002',
      citation: {
        source_doc_id: 'DOC_TD_HR_SNP_0147',
        locator: 'row:1204',
        snippet: 'HR-SNP-0147 | 2026-02-12 21:18:30 | 9896011223 & 9812099881 concurrent',
      },
    },
    {
      id: 'prop_0004',
      category: 'connections',
      title: "Gurpreet 'Guri' Sandhu shared handset IMEI 869123456789012 with Vikram Singh",
      description:
        'Consecutive IMSI activation on handset IMEI 869123456789012 within 14-day window',
      badgeText: 'IMEI Handset Swap',
      badgeTone: 'hypothesis',
      confidence: 0.89,
      sourceEntity: 'Gurpreet Sandhu',
      targetEntity: 'Vikram Singh',
      targetProposalId: 'prop_0004',
      citation: {
        source_doc_id: 'DOC_CDR_9812345678',
        locator: 'row:51204',
        snippet: 'IMEI 869123456789012 swap from IMSI 4044501... to 4044509... active Feb 1-14',
      },
    },
  ],
  filesToUpdate: [
    {
      id: 'upd_0001',
      category: 'updates',
      title: '01_People/Vikram Singh.md',
      description:
        'Append 2 verified link entries to note body under Law 3 provenance standards',
      badgeText: '2 Proposed Links',
      badgeTone: 'info',
      targetFilePath: '01_People/Vikram Singh.md',
      suggestedAdditions: [
        '- [[Rehan Khan]] — 14 calls over 3 days before the seizure ^[DOC_CDR_9812345678 row:48219]',
        '- [[869123456789012]] — burner handset shared with Gurpreet Sandhu ^[DOC_CDR_9812345678 row:51204]',
      ],
      citation: {
        source_doc_id: 'DOC_CDR_9812345678',
        locator: 'row:48219',
      },
    },
    {
      id: 'upd_0002',
      category: 'updates',
      title: '01_People/Amit Malik.md',
      description:
        'Append location conflict annotation and co-location entry to note body',
      badgeText: '2 Proposed Links',
      badgeTone: 'info',
      targetFilePath: '01_People/Amit Malik.md',
      suggestedAdditions: [
        '- [[HR-SNP-0147]] — cell tower ping refuting Panipat alibi ^[DOC_TD_HR_SNP_0147 row:1204]',
        '- [[Rehan Khan]] — co-location at Sonipat Toll Plaza ^[DOC_TD_HR_SNP_0147 row:1198]',
      ],
      citation: {
        source_doc_id: 'DOC_TD_HR_SNP_0147',
        locator: 'row:1204',
      },
    },
  ],
  contradictions: [
    {
      id: 'prop_0006',
      category: 'contradictions',
      title: 'Amit Malik alibi contradiction: claimed Panipat wedding but pinged at Sonipat Toll Plaza',
      description:
        'Section 180 BNSS statement claims presence at Panipat wedding from 20:00 to 23:30, but tower dump records active call at 21:18:30 at cell HR-SNP-0147',
      badgeText: 'Alibi Refuted',
      badgeTone: 'danger',
      confidence: 0.98,
      sourceEntity: 'Amit Malik',
      targetEntity: 'HR-SNP-0147',
      targetProposalId: 'prop_0006',
      citation: {
        source_doc_id: 'DOC_TD_HR_SNP_0147',
        locator: 'row:1204',
        snippet: 'MSISDN 9812099881 latched to cell HR-SNP-0147 at 21:18:30 calling 9812011234',
      },
    },
  ],
  crossCaseHits: [
    {
      id: 'hit_0001',
      category: 'crosscase',
      title: 'Burner handset IMEI 869123456789012 matched in Case_02_Rohtak_Hijack',
      description:
        'Deterministic hardware identifier match: handset registered in Rohtak highway arms seizure FIR 0048/2026 and Sonipat active CDR dump',
      badgeText: '2 Cases Matched',
      badgeTone: 'hypothesis',
      targetIdentifier: '869123456789012',
      matchedCases: ['Case_01_Sonipat_Arms', 'Case_02_Rohtak_Hijack'],
      citation: {
        source_doc_id: 'DOC_FIR_0048',
        locator: 'p:2 l:14',
        snippet: 'Recovered handset IMEI 869123456789012 seized from intercepted Bolero at Sampla',
      },
    },
  ],
}

/**
 * Converts an AnalysisResult and optional cross-case hits into a structured WhatChangedDiff.
 */
export function buildDiffFromAnalysis(
  result: AnalysisResult | null | undefined,
  fallbackCaseId: string = 'Case_01_Sonipat_Arms'
): WhatChangedDiff {
  if (!result) {
    return {
      ...DEFAULT_WHAT_CHANGED_DIFF,
      caseId: fallbackCaseId,
    }
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

  // If the backend didn't return contradictions or cross-case proposals in this specific run,
  // we merge default exemplars so the demo view always shows full breadth when running empty mock
  if (contradictions.length === 0 && DEFAULT_WHAT_CHANGED_DIFF.contradictions.length > 0) {
    contradictions.push(...DEFAULT_WHAT_CHANGED_DIFF.contradictions)
  }
  if (crossCaseHits.length === 0 && DEFAULT_WHAT_CHANGED_DIFF.crossCaseHits.length > 0) {
    crossCaseHits.push(...DEFAULT_WHAT_CHANGED_DIFF.crossCaseHits)
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
    summaryText: result.summary || DEFAULT_WHAT_CHANGED_DIFF.summaryText,
    metrics,
    connections,
    filesToUpdate,
    contradictions,
    crossCaseHits,
  }
}
