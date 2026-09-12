/**
 * SyndicateBrain (SIH26189) — Knowledge Graph Styling & Design Tokens.
 * Offline criminal-investigation workbench for Indian police.
 *
 * Implements:
 * - docs/CASE_MODEL.md §2 Law 2: Record-derived vs AI-proposed edges.
 * - docs/design-system.md §4: Edge styles, node styles, and CSS tokens.
 * - ZERO raw hex codes — every value references design system CSS tokens.
 */

import type { StylesheetStyle } from 'cytoscape'
import type { EntityType } from './types.ts'

/**
 * Design system tokens from docs/design-system.md §1 & §4.
 * Centralized token registry — every value references CSS variables.
 * ZERO raw hex codes allowed in configurations.
 */
export const GRAPH_TOKENS = {
  // Evidentiary semantic status
  evidence: 'var(--evidence)',
  evidenceDim: 'var(--evidence-dim)',
  evidenceBg: 'var(--evidence-bg, rgba(232, 176, 75, 0.18))',
  hypothesis: 'var(--hypothesis)',
  hypothesisBg: 'var(--hypothesis-bg, rgba(194, 86, 158, 0.18))',
  danger: 'var(--danger)',
  dangerBg: 'var(--danger-bg, rgba(212, 87, 78, 0.18))',
  ok: 'var(--ok)',
  info: 'var(--info)',

  // Surfaces & lines
  bgVoid: 'var(--bg-void)',
  bgBase: 'var(--bg-base)',
  bgRaised: 'var(--bg-raised)',
  bgOverlay: 'var(--bg-overlay)',
  bgInset: 'var(--bg-inset)',
  border: 'var(--border)',
  borderStrong: 'var(--border-strong)',
  borderFocus: 'var(--border-focus)',

  // Text
  textPrimary: 'var(--text-primary)',
  textBody: 'var(--text-body)',
  textMuted: 'var(--text-muted)',
  textFaint: 'var(--text-faint)',
  textInverse: 'var(--text-inverse)',

  // Entity type accents (graph nodes + note icons)
  ePerson: 'var(--e-person)',
  ePhone: 'var(--e-phone)',
  eDevice: 'var(--e-device)',
  eVehicle: 'var(--e-vehicle)',
  eLocation: 'var(--e-location)',
  eTower: 'var(--e-tower)',
  eOrg: 'var(--e-org)',
  eFir: 'var(--e-fir)',
  eEvent: 'var(--e-event)',
  eUnknown: 'var(--text-faint)',

  // Entity type background fills (18% opacity per design-system.md §4)
  ePersonBg: 'var(--evidence-bg, rgba(232, 176, 75, 0.18))',
  ePhoneBg: 'var(--e-phone-bg, rgba(127, 179, 213, 0.18))',
  eDeviceBg: 'var(--e-device-bg, rgba(111, 168, 160, 0.18))',
  eVehicleBg: 'var(--e-vehicle-bg, rgba(176, 140, 217, 0.18))',
  eLocationBg: 'var(--e-location-bg, rgba(143, 191, 127, 0.18))',
  eTowerBg: 'var(--e-tower-bg, rgba(95, 167, 116, 0.18))',
  eOrgBg: 'var(--e-org-bg, rgba(217, 140, 95, 0.18))',
  eFirBg: 'var(--e-fir-bg, rgba(154, 163, 173, 0.18))',
  eEventBg: 'var(--danger-bg, rgba(212, 87, 78, 0.18))',
  eUnknownBg: 'var(--e-unknown-bg, rgba(90, 97, 107, 0.18))',
} as const

/**
 * Resolves a CSS variable token to a concrete color string.
 * In a browser DOM context: reads computed style from container or documentElement.
 * In Node / headless context: extracts the fallback token value.
 */
export function resolveToken(token: string, container?: HTMLElement | null): string {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const el = container || document.documentElement
    const varMatch = token.match(/^var\((--[a-zA-Z0-9_-]+)/)
    if (varMatch) {
      const computed = getComputedStyle(el).getPropertyValue(varMatch[1]).trim()
      if (computed) return computed
    }
  }

  // Parse fallback value: var(--name, fallback)
  if (token.startsWith('var(') && token.endsWith(')')) {
    const commaIndex = token.indexOf(',')
    if (commaIndex !== -1) {
      return token.slice(commaIndex + 1, -1).trim()
    }
  }
  return token
}

/**
 * Entity shapes mapping per design-system.md §4:
 * Person = circle/ellipse · Phone/identifier = rounded rectangle · Device = hexagon
 * Vehicle = pentagon · Tower = triangle · Location = diamond · Org = barrel/ring
 * FIR = rectangle · Event = star · Unknown = ellipse
 */
export function getNodeShapeForType(type: EntityType | string): string {
  const norm = String(type || '').toLowerCase().trim()
  switch (norm) {
    case 'person':
      return 'ellipse'
    case 'phone':
    case 'identifier':
    case 'imei':
    case 'account':
      return 'round-rectangle'
    case 'device':
      return 'hexagon'
    case 'vehicle':
      return 'pentagon'
    case 'tower':
      return 'triangle'
    case 'location':
      return 'diamond'
    case 'org':
    case 'organisation':
    case 'organization':
      return 'barrel'
    case 'fir':
    case 'doc':
    case 'document':
      return 'rectangle'
    case 'event':
      return 'star'
    default:
      return 'ellipse'
  }
}

/**
 * Node color token mapping per design-system.md §4:
 * Returns design system CSS tokens (stroke and fill at 18% opacity).
 */
export function getNodeColorTokenForType(type: EntityType | string): {
  stroke: string
  fill: string
} {
  const norm = String(type || '').toLowerCase().trim()
  switch (norm) {
    case 'person':
      return { stroke: GRAPH_TOKENS.ePerson, fill: GRAPH_TOKENS.ePersonBg }
    case 'phone':
    case 'identifier':
    case 'imei':
    case 'account':
      return { stroke: GRAPH_TOKENS.ePhone, fill: GRAPH_TOKENS.ePhoneBg }
    case 'device':
      return { stroke: GRAPH_TOKENS.eDevice, fill: GRAPH_TOKENS.eDeviceBg }
    case 'vehicle':
      return { stroke: GRAPH_TOKENS.eVehicle, fill: GRAPH_TOKENS.eVehicleBg }
    case 'tower':
      return { stroke: GRAPH_TOKENS.eTower, fill: GRAPH_TOKENS.eTowerBg }
    case 'location':
      return { stroke: GRAPH_TOKENS.eLocation, fill: GRAPH_TOKENS.eLocationBg }
    case 'org':
    case 'organisation':
    case 'organization':
      return { stroke: GRAPH_TOKENS.eOrg, fill: GRAPH_TOKENS.eOrgBg }
    case 'fir':
    case 'doc':
    case 'document':
      return { stroke: GRAPH_TOKENS.eFir, fill: GRAPH_TOKENS.eFirBg }
    case 'event':
      return { stroke: GRAPH_TOKENS.eEvent, fill: GRAPH_TOKENS.eEventBg }
    default:
      return { stroke: GRAPH_TOKENS.eUnknown, fill: GRAPH_TOKENS.eUnknownBg }
  }
}

/**
 * Declarative node styles per entity type.
 */
export const NODE_STYLES = {
  person: {
    shape: 'ellipse',
    stroke: GRAPH_TOKENS.ePerson,
    fill: GRAPH_TOKENS.ePersonBg,
  },
  identifier: {
    shape: 'round-rectangle',
    stroke: GRAPH_TOKENS.ePhone,
    fill: GRAPH_TOKENS.ePhoneBg,
  },
  phone: {
    shape: 'round-rectangle',
    stroke: GRAPH_TOKENS.ePhone,
    fill: GRAPH_TOKENS.ePhoneBg,
  },
  imei: {
    shape: 'round-rectangle',
    stroke: GRAPH_TOKENS.ePhone,
    fill: GRAPH_TOKENS.ePhoneBg,
  },
  device: {
    shape: 'hexagon',
    stroke: GRAPH_TOKENS.eDevice,
    fill: GRAPH_TOKENS.eDeviceBg,
  },
  vehicle: {
    shape: 'pentagon',
    stroke: GRAPH_TOKENS.eVehicle,
    fill: GRAPH_TOKENS.eVehicleBg,
  },
  tower: {
    shape: 'triangle',
    stroke: GRAPH_TOKENS.eTower,
    fill: GRAPH_TOKENS.eTowerBg,
  },
  location: {
    shape: 'diamond',
    stroke: GRAPH_TOKENS.eLocation,
    fill: GRAPH_TOKENS.eLocationBg,
  },
  organisation: {
    shape: 'barrel',
    stroke: GRAPH_TOKENS.eOrg,
    fill: GRAPH_TOKENS.eOrgBg,
  },
  organization: {
    shape: 'barrel',
    stroke: GRAPH_TOKENS.eOrg,
    fill: GRAPH_TOKENS.eOrgBg,
  },
  org: {
    shape: 'barrel',
    stroke: GRAPH_TOKENS.eOrg,
    fill: GRAPH_TOKENS.eOrgBg,
  },
  fir: {
    shape: 'rectangle',
    stroke: GRAPH_TOKENS.eFir,
    fill: GRAPH_TOKENS.eFirBg,
  },
  doc: {
    shape: 'rectangle',
    stroke: GRAPH_TOKENS.eFir,
    fill: GRAPH_TOKENS.eFirBg,
  },
  document: {
    shape: 'rectangle',
    stroke: GRAPH_TOKENS.eFir,
    fill: GRAPH_TOKENS.eFirBg,
  },
  event: {
    shape: 'star',
    stroke: GRAPH_TOKENS.eEvent,
    fill: GRAPH_TOKENS.eEventBg,
  },
  unknown: {
    shape: 'ellipse',
    stroke: GRAPH_TOKENS.eUnknown,
    fill: GRAPH_TOKENS.eUnknownBg,
  },
} as const

/**
 * Declarative edge visual encodings per design-system.md §4:
 *
 * RECORD-DERIVED: Solid, amber (var(--evidence)), width 1.5px (single source) to 2.5px (multi-source).
 * AI-PROPOSED: Dashed (line-style: dashed), magenta (var(--hypothesis)), line-dash-pattern: [6, 3].
 * CONTRADICTION / DISPUTED: Red (var(--danger)), solid, 2px.
 */
export const EDGE_STYLES = {
  recordDerived: {
    color: GRAPH_TOKENS.evidence,
    lineStyle: 'solid' as const,
    widthSingle: 1.5,
    widthMulti: 2.5,
    opacitySingle: 0.7,
    opacityMulti: 1.0,
  },
  aiProposed: {
    color: GRAPH_TOKENS.hypothesis,
    lineStyle: 'dashed' as const,
    dashPattern: [6, 3] as [number, number],
    width: 1.5,
    opacity: 0.9,
  },
  contradiction: {
    color: GRAPH_TOKENS.danger,
    lineStyle: 'solid' as const,
    width: 2.0,
    opacity: 1.0,
  },
} as const

/**
 * Query interface to resolve edge style configuration.
 */
export interface EdgeStyleQuery {
  isAi?: boolean
  aiProposalId?: string
  tier?: string
  isDisputed?: boolean
  isContradiction?: boolean
  sourceCount?: number
  isMultiSource?: boolean
}

/**
 * Resolved edge style representation.
 */
export interface ResolvedEdgeStyle {
  color: string
  lineStyle: 'solid' | 'dashed'
  width: number
  opacity: number
  lineDashPattern?: [number, number]
  tier: 'record-derived' | 'ai-proposed' | 'contradiction'
}

/**
 * Maps edge attributes to exact visual encoding parameters.
 */
export function getEdgeStyle(edge: EdgeStyleQuery): ResolvedEdgeStyle {
  const isContradiction = Boolean(
    edge.isContradiction ||
    edge.isDisputed ||
    edge.tier === 'contradiction' ||
    edge.tier === 'disputed'
  )
  if (isContradiction) {
    return {
      color: EDGE_STYLES.contradiction.color,
      lineStyle: EDGE_STYLES.contradiction.lineStyle,
      width: EDGE_STYLES.contradiction.width,
      opacity: EDGE_STYLES.contradiction.opacity,
      tier: 'contradiction',
    }
  }

  const isAi = Boolean(
    edge.isAi ||
    edge.aiProposalId ||
    edge.tier === 'ai-proposed'
  )
  if (isAi) {
    return {
      color: EDGE_STYLES.aiProposed.color,
      lineStyle: EDGE_STYLES.aiProposed.lineStyle,
      lineDashPattern: EDGE_STYLES.aiProposed.dashPattern,
      width: EDGE_STYLES.aiProposed.width,
      opacity: EDGE_STYLES.aiProposed.opacity,
      tier: 'ai-proposed',
    }
  }

  const isMulti = Boolean(
    edge.isMultiSource ||
    (typeof edge.sourceCount === 'number' && edge.sourceCount > 1)
  )
  return {
    color: EDGE_STYLES.recordDerived.color,
    lineStyle: EDGE_STYLES.recordDerived.lineStyle,
    width: isMulti ? EDGE_STYLES.recordDerived.widthMulti : EDGE_STYLES.recordDerived.widthSingle,
    opacity: isMulti ? EDGE_STYLES.recordDerived.opacityMulti : EDGE_STYLES.recordDerived.opacitySingle,
    tier: 'record-derived',
  }
}

/**
 * Consolidated design system style configuration dictionary.
 * Contains ZERO arbitrary hex codes — only references design system tokens.
 */
export const GRAPH_STYLE_CONFIG = {
  tokens: GRAPH_TOKENS,
  nodes: NODE_STYLES,
  edges: EDGE_STYLES,
} as const

/**
 * Builds the complete Cytoscape stylesheet adhering strictly to design-system.md §4.
 */
export function createGraphStylesheet(container?: HTMLElement | null): StylesheetStyle[] {
  const resolved = {
    evidence: resolveToken(GRAPH_TOKENS.evidence, container),
    evidenceBg: resolveToken(GRAPH_TOKENS.evidenceBg, container),
    hypothesis: resolveToken(GRAPH_TOKENS.hypothesis, container),
    danger: resolveToken(GRAPH_TOKENS.danger, container),
    border: resolveToken(GRAPH_TOKENS.border, container),
    borderStrong: resolveToken(GRAPH_TOKENS.borderStrong, container),
    borderFocus: resolveToken(GRAPH_TOKENS.borderFocus, container),
    textPrimary: resolveToken(GRAPH_TOKENS.textPrimary, container),
    textFaint: resolveToken(GRAPH_TOKENS.textFaint, container),
    ePerson: resolveToken(GRAPH_TOKENS.ePerson, container),
    ePersonBg: resolveToken(GRAPH_TOKENS.ePersonBg, container),
    ePhone: resolveToken(GRAPH_TOKENS.ePhone, container),
    ePhoneBg: resolveToken(GRAPH_TOKENS.ePhoneBg, container),
    eDevice: resolveToken(GRAPH_TOKENS.eDevice, container),
    eDeviceBg: resolveToken(GRAPH_TOKENS.eDeviceBg, container),
    eVehicle: resolveToken(GRAPH_TOKENS.eVehicle, container),
    eVehicleBg: resolveToken(GRAPH_TOKENS.eVehicleBg, container),
    eLocation: resolveToken(GRAPH_TOKENS.eLocation, container),
    eLocationBg: resolveToken(GRAPH_TOKENS.eLocationBg, container),
    eTower: resolveToken(GRAPH_TOKENS.eTower, container),
    eTowerBg: resolveToken(GRAPH_TOKENS.eTowerBg, container),
    eOrg: resolveToken(GRAPH_TOKENS.eOrg, container),
    eOrgBg: resolveToken(GRAPH_TOKENS.eOrgBg, container),
    eFir: resolveToken(GRAPH_TOKENS.eFir, container),
    eFirBg: resolveToken(GRAPH_TOKENS.eFirBg, container),
    eEvent: resolveToken(GRAPH_TOKENS.eEvent, container),
    eEventBg: resolveToken(GRAPH_TOKENS.eEventBg, container),
    eUnknown: resolveToken(GRAPH_TOKENS.eUnknown, container),
    eUnknownBg: resolveToken(GRAPH_TOKENS.eUnknownBg, container),
  }

  return [
    // Base node style
    {
      selector: 'node',
      style: {
        'label': 'data(label)',
        'shape': 'data(shape)',
        'background-color': resolved.evidenceBg,
        'border-color': resolved.evidence,
        'border-width': 1.5,
        'width': 'data(size)',
        'height': 'data(size)',
        'color': resolved.textPrimary,
        'font-family': 'Inter, system-ui, sans-serif',
        'font-size': 12,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 6,
        'min-zoomed-font-size': 8,
        'transition-property': 'background-color, border-color, opacity, border-width',
        'transition-duration': 0.15,
      },
    },
    // Entity type node styles
    {
      selector: 'node[type = "person"], node.type-person',
      style: {
        'shape': 'ellipse',
        'border-color': resolved.ePerson,
        'background-color': resolved.ePersonBg,
      },
    },
    {
      selector: 'node[type = "identifier"], node[type = "phone"], node[type = "imei"], node[type = "account"], node.type-identifier, node.type-phone',
      style: {
        'shape': 'round-rectangle',
        'border-color': resolved.ePhone,
        'background-color': resolved.ePhoneBg,
      },
    },
    {
      selector: 'node[type = "vehicle"], node.type-vehicle',
      style: {
        'shape': 'pentagon',
        'border-color': resolved.eVehicle,
        'background-color': resolved.eVehicleBg,
      },
    },
    {
      selector: 'node[type = "location"], node.type-location',
      style: {
        'shape': 'diamond',
        'border-color': resolved.eLocation,
        'background-color': resolved.eLocationBg,
      },
    },
    {
      selector: 'node[type = "organisation"], node[type = "organization"], node[type = "org"], node.type-organisation, node.type-org',
      style: {
        'shape': 'barrel',
        'border-color': resolved.eOrg,
        'background-color': resolved.eOrgBg,
      },
    },
    {
      selector: 'node[type = "event"], node.type-event',
      style: {
        'shape': 'star',
        'border-color': resolved.eEvent,
        'background-color': resolved.eEventBg,
      },
    },
    {
      selector: 'node[type = "device"], node.type-device',
      style: {
        'shape': 'hexagon',
        'border-color': resolved.eDevice,
        'background-color': resolved.eDeviceBg,
      },
    },
    {
      selector: 'node[type = "tower"], node.type-tower',
      style: {
        'shape': 'triangle',
        'border-color': resolved.eTower,
        'background-color': resolved.eTowerBg,
      },
    },
    {
      selector: 'node[type = "fir"], node[type = "doc"], node[type = "document"], node.type-fir',
      style: {
        'shape': 'rectangle',
        'border-color': resolved.eFir,
        'background-color': resolved.eFirBg,
      },
    },
    // Dynamic background and border color data attributes
    {
      selector: 'node[bgColor]',
      style: {
        'background-color': 'data(bgColor)',
      },
    },
    {
      selector: 'node[borderColor]',
      style: {
        'border-color': 'data(borderColor)',
      },
    },
    // Unresolved node style (design-system & parser requirement)
    {
      selector: 'node[?isUnresolved], node.unresolved',
      style: {
        'border-style': 'dashed',
        'border-color': resolved.textFaint,
        'color': resolved.textFaint,
        'opacity': 0.85,
      },
    },
    // Selected node: 2px --evidence ring + outer glow
    {
      selector: 'node:selected',
      style: {
        'border-color': resolved.evidence,
        'border-width': 3,
        'overlay-color': resolved.evidence,
        'overlay-opacity': 0.22,
        'overlay-padding': 6,
      },
    },
    // Base edge style: verified single source by default
    {
      selector: 'edge',
      style: {
        'width': 'data(weight)',
        'line-color': resolved.evidence,
        'line-opacity': 0.7,
        'curve-style': 'bezier',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': resolved.evidence,
        'arrow-scale': 0.85,
        'line-style': 'solid',
        'transition-property': 'line-color, opacity, width',
        'transition-duration': 0.15,
      },
    },
    // Record-derived edge (verified): Solid, amber (var(--evidence)), width 1.5px (single source)
    {
      selector: 'edge[tier = "record-derived"], edge.record-derived',
      style: {
        'line-color': resolved.evidence,
        'target-arrow-color': resolved.evidence,
        'line-style': 'solid',
        'width': 1.5,
        'line-opacity': 0.7,
      },
    },
    // Corroborated record-derived edge (multi-source: 2+ sources): width 2.5px, 100% opacity
    {
      selector: 'edge.multi-source, edge.corroborated, edge[sourceCount > 1], edge[?isMultiSource]',
      style: {
        'width': 2.5,
        'line-opacity': 1.0,
      },
    },
    // AI-proposed edge (hypothesis): Dashed, magenta (var(--hypothesis)), line-dash-pattern: [6, 3]
    {
      selector: 'edge[tier = "ai-proposed"], edge.ai-proposed, edge.is-ai, edge[?isAi], edge[aiProposalId]',
      style: {
        'line-color': resolved.hypothesis,
        'target-arrow-color': resolved.hypothesis,
        'line-style': 'dashed',
        'line-dash-pattern': [6, 3],
        'width': 1.5,
        'line-opacity': 0.9,
      },
    },
    // Contradiction / Disputed edge: Red (var(--danger)), width 2px
    {
      selector: 'edge.contradiction, edge.disputed, edge[?isDisputed], edge[?isContradiction], edge[tier = "contradiction"], edge[tier = "disputed"]',
      style: {
        'line-color': resolved.danger,
        'target-arrow-color': resolved.danger,
        'line-style': 'solid',
        'width': 2.0,
        'line-opacity': 1.0,
      },
    },
    // Selected edge
    {
      selector: 'edge:selected',
      style: {
        'width': 3.5,
        'line-color': resolved.evidence,
        'target-arrow-color': resolved.evidence,
        'line-opacity': 1.0,
        'overlay-color': resolved.evidence,
        'overlay-opacity': 0.2,
        'overlay-padding': 4,
      },
    },
    // Dimmed element (focus / local-graph mode) — 15% opacity
    {
      selector: '.sb-dimmed',
      style: {
        'opacity': 0.15,
      },
    },
    // Hidden element (filtered out)
    {
      selector: '.sb-hidden',
      style: {
        'display': 'none',
      },
    },
    // Hidden leads (AI-proposed edges toggled off)
    {
      selector: 'edge.sb-lead-hidden, edge.lead-hidden',
      style: {
        'display': 'none',
      },
    },
  ] as unknown as StylesheetStyle[]
}
