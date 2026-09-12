import type React from 'react'

/**
 * Action button configuration for <EmptyState>.
 */
export interface EmptyStateActionConfig {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}

export type EmptyStateAction = EmptyStateActionConfig | React.ReactNode

/**
 * Props for <EmptyState>.
 * Enforces procedural, factual, objective copy tone per docs/design-system.md §7.
 */
export interface EmptyStateProps {
  /** Optional icon or badge representing the state */
  icon?: React.ReactNode
  /** Factual headline (e.g. "Named as accused in 3 FIRs", "No predictions generated") */
  headline: string
  /** Procedural explanation in var(--text-muted) */
  body: string
  /** Optional action button or custom action node */
  action?: EmptyStateAction
  /** Additional CSS classes */
  className?: string
  /** Compact mode for narrow sidebars, inspectors, or popovers */
  compact?: boolean
  /** Accessible role override (defaults to 'status') */
  role?: string
}

/**
 * Supported structural skeleton variants (shaped placeholders, never spinners).
 */
export type SkeletonVariant =
  | 'text'
  | 'card'
  | 'graph'
  | 'table'
  | 'pill'
  | 'detail'

/**
 * Props for <LoadingSkeleton>.
 * Shaped placeholders waiting for real data with shimmer/pulse animations.
 */
export interface LoadingSkeletonProps {
  /** Placeholder shape variant (defaults to 'text') */
  variant?: SkeletonVariant
  /** Number of text/row lines to generate */
  lines?: number
  /** Additional CSS classes */
  className?: string
  /** Optional explicit height override */
  height?: string | number
  /** Optional explicit width override */
  width?: string | number
  /** Accessible label describing loading context */
  ariaLabel?: string
}

/**
 * Props for <ErrorState>.
 * Used for failed backend calls, unreadable files, or integrity failures.
 */
export interface ErrorStateProps {
  /** Factual title of error state (defaults to "Operation failed") */
  title?: string
  /** Clear, factual error explanation */
  message: string
  /** Expandable technical details, traceback, or response payload */
  details?: string
  /** Path or identifier of broken file (e.g. "DOC_FIR_0142.pdf", "00_Raw_Inputs/...") */
  failedFile?: string
  /** Callback to re-attempt the failed operation */
  retryAction?: () => void
  /** Label for the retry button (defaults to "Retry") */
  retryLabel?: string
  /** Additional CSS classes */
  className?: string
  /** Compact mode for narrow panes */
  compact?: boolean
}

/**
 * Standard procedural copy constants matching docs/design-system.md §7.
 * Use these across SyndicateBrain workbench features.
 */
export const PROCEDURAL_EMPTY_COPY = {
  SANDBOX: {
    headline: 'No predictions generated',
    body: 'Predictions are investigative leads only and are never used as evidence.',
  },
  PROVENANCE: {
    headline: 'No entity selected',
    body: 'Select a node or edge to inspect verified source records and locators.',
  },
  SEARCH: {
    headline: 'No matching records',
    body: '0 notes, identifiers, or citations matched the search query.',
  },
  BACKLINKS: {
    headline: 'No backlinks recorded',
    body: 'No existing notes in this vault reference the current note.',
  },
  ADJUDICATION: {
    headline: 'Queue clear',
    body: 'All pending entity resolution pairs have been reviewed and adjudicated.',
  },
  CROSS_CASE: {
    headline: 'No cross-case hits',
    body: '0 shared identifiers detected across external case folders.',
  },
} as const
