/**
 * SyndicateBrain Shared UI States (MEH-T05)
 *
 * Provides standardized:
 * - <EmptyState> with objective, procedural copy tone (design-system.md §7)
 * - <LoadingSkeleton> shaped structural placeholders (no spinners)
 * - <ErrorState> factual failure surfaces with file/trace inspection & retry
 */

import './states.css'

export { EmptyState } from './EmptyState'
export { LoadingSkeleton } from './LoadingSkeleton'
export { ErrorState } from './ErrorState'

export {
  PROCEDURAL_EMPTY_COPY,
  type EmptyStateProps,
  type EmptyStateAction,
  type EmptyStateActionConfig,
  type LoadingSkeletonProps,
  type SkeletonVariant,
  type ErrorStateProps,
} from './types'
