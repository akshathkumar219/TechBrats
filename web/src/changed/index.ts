/**
 * SyndicateBrain What Changed Module (MEH-T04).
 * Self-contained summary diff view after an Analyse run.
 */

export { WhatChangedPanel } from './WhatChangedPanel'
export { buildDiffFromAnalysis, emptyWhatChangedDiff } from './types'

export type {
  WhatChangedCategory,
  BadgeTone,
  WhatChangedItem,
  WhatChangedSummaryMetrics,
  WhatChangedDiff,
  WhatChangedNavigationTarget,
  WhatChangedPanelProps,
} from './types'
