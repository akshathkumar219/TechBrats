/**
 * SyndicateBrain (SIH26189) — Edge Inspector Module
 * Right-rail panel component for edge provenance and verbatim source inspection.
 */

export { EdgeInspector, EdgeInspector as default } from './EdgeInspector'
export { formatLocator, parseLocatorLine, inferDocType, normalizeEdge } from './types'
export type {
  EdgeInspectorProps,
  InspectableEdge,
  EdgeCitation,
  SnippetLine,
  SourceDocInfo,
  SourceDocType,
  EvidentiaryTier,
} from './types'
