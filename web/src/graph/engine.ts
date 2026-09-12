/**
 * SyndicateBrain (SIH26189) — Cytoscape Graph Engine.
 *
 * Implements:
 * - Deterministic layout with fixed seed (randomize: false) across demo runs.
 * - Render budget: hideEdgesOnViewport: true, textureOnViewport: true, pixelRatio: 1.
 * - Degree filtering: default top-N nodes by degree with reveal-all toggle.
 * - Stable mounting: container is mounted once without remounting or re-initialization.
 * - Imperative API: focusNode, applyFilter, resetFilter, setSelection, fitTo, onSelectionChange.
 * - Strict design-system.md §4 tokens and node shapes (no arbitrary hex codes).
 */

import cytoscape, {
  type Core,
  type EventObject,
  type NodeSingular,
  type EdgeSingular,
  type ElementDefinition,
  type StylesheetStyle,
} from 'cytoscape'
// @ts-expect-error cytoscape-cose-bilkent untyped
import coseBilkent from 'cytoscape-cose-bilkent'

import type { GraphData, EntityType } from './types.ts'

// Register cose-bilkent layout once safely
let coseBilkentRegistered = false
export function registerCoseBilkent(): void {
  if (!coseBilkentRegistered && typeof cytoscape !== 'undefined') {
    cytoscape.use(coseBilkent)
    coseBilkentRegistered = true
  }
}
registerCoseBilkent()

/**
 * Design system tokens from docs/design-system.md §1 & §4.
 * Centralized token registry — no arbitrary hex codes in styling.
 */
export const GRAPH_TOKENS = {
  // Evidentiary semantic status
  evidence: 'var(--evidence, #E8B04B)',
  evidenceDim: 'var(--evidence-dim, #8A6B2E)',
  evidenceBg: 'var(--evidence-bg, rgba(232, 176, 75, 0.18))',
  hypothesis: 'var(--hypothesis, #C2569E)',
  hypothesisBg: 'var(--hypothesis-bg, rgba(194, 86, 158, 0.18))',
  danger: 'var(--danger, #D4574E)',
  dangerBg: 'var(--danger-bg, rgba(212, 87, 78, 0.18))',
  ok: 'var(--ok, #5FA774)',
  info: 'var(--info, #5B8FC7)',

  // Surfaces & lines
  bgBase: 'var(--bg-base, #131519)',
  border: 'var(--border, #2A2F36)',
  borderStrong: 'var(--border-strong, #3A414A)',
  borderFocus: 'var(--border-focus, #E8B04B)',

  // Text
  textPrimary: 'var(--text-primary, #E6E8EA)',
  textBody: 'var(--text-body, #C4C9CF)',
  textMuted: 'var(--text-muted, #8A9099)',
  textFaint: 'var(--text-faint, #5A616B)',

  // Entity type accents
  ePerson: 'var(--e-person, #E8B04B)',
  ePhone: 'var(--e-phone, #7FB3D5)',
  eDevice: 'var(--e-device, #6FA8A0)',
  eVehicle: 'var(--e-vehicle, #B08CD9)',
  eLocation: 'var(--e-location, #8FBF7F)',
  eTower: 'var(--e-tower, #5FA774)',
  eOrg: 'var(--e-org, #D98C5F)',
  eFir: 'var(--e-fir, #9AA3AD)',
  eEvent: 'var(--e-event, #D4574E)',
  eUnknown: 'var(--text-faint, #5A616B)',
} as const

/**
 * Resolves a CSS variable token to a concrete color value if needed.
 * Works seamlessly in both browser (reads computed style) and headless/Node environments.
 * Correctly handles nested parentheses such as `rgba(...)`.
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
 * Node color token mapping per design-system.md §4
 */
export function getNodeColorTokenForType(type: EntityType | string): {
  stroke: string
  fill: string
} {
  const norm = String(type || '').toLowerCase().trim()
  switch (norm) {
    case 'person':
      return { stroke: GRAPH_TOKENS.ePerson, fill: GRAPH_TOKENS.evidenceBg }
    case 'phone':
    case 'identifier':
    case 'imei':
      return { stroke: GRAPH_TOKENS.ePhone, fill: 'rgba(127, 179, 213, 0.18)' }
    case 'device':
      return { stroke: GRAPH_TOKENS.eDevice, fill: 'rgba(111, 168, 160, 0.18)' }
    case 'vehicle':
      return { stroke: GRAPH_TOKENS.eVehicle, fill: 'rgba(176, 140, 217, 0.18)' }
    case 'tower':
      return { stroke: GRAPH_TOKENS.eTower, fill: 'rgba(95, 167, 116, 0.18)' }
    case 'location':
      return { stroke: GRAPH_TOKENS.eLocation, fill: 'rgba(143, 191, 127, 0.18)' }
    case 'org':
    case 'organisation':
    case 'organization':
      return { stroke: GRAPH_TOKENS.eOrg, fill: 'rgba(217, 140, 95, 0.18)' }
    case 'fir':
    case 'doc':
    case 'document':
      return { stroke: GRAPH_TOKENS.eFir, fill: 'rgba(154, 163, 173, 0.18)' }
    case 'event':
      return { stroke: GRAPH_TOKENS.eEvent, fill: GRAPH_TOKENS.dangerBg }
    default:
      return { stroke: GRAPH_TOKENS.eUnknown, fill: 'rgba(90, 97, 107, 0.18)' }
  }
}

/**
 * Builds the Cytoscape stylesheet adhering strictly to design-system.md §4.
 */
export function createGraphStylesheet(container?: HTMLElement | null): StylesheetStyle[] {
  const resolved = {
    evidence: resolveToken(GRAPH_TOKENS.evidence, container),
    evidenceBg: resolveToken(GRAPH_TOKENS.evidenceBg, container),
    hypothesis: resolveToken(GRAPH_TOKENS.hypothesis, container),
    danger: resolveToken(GRAPH_TOKENS.danger, container),
    border: resolveToken(GRAPH_TOKENS.border, container),
    textPrimary: resolveToken(GRAPH_TOKENS.textPrimary, container),
    textFaint: resolveToken(GRAPH_TOKENS.textFaint, container),
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
      selector: 'node[?isUnresolved]',
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
        'transition-property': 'line-color, opacity, width',
        'transition-duration': 0.15,
      },
    },
    // Record-derived edge (verified)
    {
      selector: 'edge[tier = "record-derived"]',
      style: {
        'line-color': resolved.evidence,
        'target-arrow-color': resolved.evidence,
        'line-style': 'solid',
        'line-opacity': 0.85,
      },
    },
    // AI-proposed edge (hypothesis): dashed, magenta (NON-EVIDENTIARY)
    {
      selector: 'edge[tier = "ai-proposed"], edge[?isAi]',
      style: {
        'line-color': resolved.hypothesis,
        'target-arrow-color': resolved.hypothesis,
        'line-style': 'dashed',
        'line-dash-pattern': [6, 4],
        'line-opacity': 0.9,
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
  ] as unknown as StylesheetStyle[]
}

/**
 * Options for configuring the CytoscapeGraphEngine.
 */
export interface EngineOptions {
  /**
   * Default degree threshold for top-N degree filter.
   * If total nodes exceed this number, lower-degree nodes are hidden by default.
   * Default: 300. Set to 0 or null to reveal all immediately.
   */
  defaultTopNDegree?: number | null
  /**
   * Layout animation toggle.
   * Headless environments require false; default is false for deterministic instant layout.
   */
  animateLayout?: boolean
  /**
   * Number of layout iterations for cose-bilkent. Default: 2500 for smaller graphs, adaptive for large graphs.
   */
  layoutIterations?: number
  /**
   * Custom zoom sensitivity.
   */
  wheelSensitivity?: number
}

/**
 * Selection change event payload.
 */
export interface SelectionChangeEvent {
  nodes: string[]
  edges: string[]
}

/**
 * Container registry to ensure each container is mounted ONCE and never remounted.
 */
const containerRegistry = new WeakMap<object, CytoscapeGraphEngine>()

/**
 * Check if element is a real browser DOM node with window and document context.
 */
function isRealDomElement(el: unknown): el is HTMLElement {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    Boolean(el) &&
    typeof el === 'object' &&
    'nodeType' in (el as Record<string, unknown>) &&
    Boolean((el as HTMLElement).ownerDocument?.defaultView)
  )
}

/**
 * Imperative Graph Engine wrapping Cytoscape.js for SyndicateBrain.
 */
export class CytoscapeGraphEngine {
  private cy: Core | null = null
  private container: HTMLElement | null = null
  private options: Required<EngineOptions>
  private selectionListeners: Set<(selected: SelectionChangeEvent) => void> = new Set()
  private isDestroyed = false
  private currentRawData: GraphData = { nodes: [], edges: [] }
  private activeFilterPredicate: ((element: NodeSingular | EdgeSingular) => boolean) | null = null
  private activeTopNLimit: number | null = null

  constructor(container?: HTMLElement | null, data?: GraphData, options?: EngineOptions) {
    this.options = {
      defaultTopNDegree: options?.defaultTopNDegree !== undefined ? options.defaultTopNDegree : 300,
      animateLayout: options?.animateLayout ?? false,
      layoutIterations: options?.layoutIterations ?? 2500,
      wheelSensitivity: options?.wheelSensitivity ?? 1,
    }
    this.activeTopNLimit = this.options.defaultTopNDegree

    if (container !== undefined) {
      this.initGraph(container, data)
    }
  }

  /**
   * Factory / static initializer ensuring stable single-mount per container.
   */
  public static initGraph(
    container: HTMLElement,
    data?: GraphData,
    options?: EngineOptions
  ): CytoscapeGraphEngine {
    if (container && typeof container === 'object') {
      const existing = containerRegistry.get(container)
      if (existing && !existing.isDestroyed) {
        if (data) {
          existing.updateData(data)
        }
        return existing
      }
    }

    const engine = new CytoscapeGraphEngine(container, data, options)
    if (container && typeof container === 'object') {
      containerRegistry.set(container, engine)
    }
    return engine
  }

  /**
   * Mounts into the container element ONCE.
   * Never re-initializes or destroys Cytoscape if already mounted into the same container.
   */
  public initGraph(container?: HTMLElement | null, data?: GraphData): CytoscapeGraphEngine {
    if (container && this.container === container && this.cy && !this.isDestroyed) {
      if (data) {
        this.updateData(data)
      }
      return this
    }

    // Check if another engine instance was registered on this container
    if (container && typeof container === 'object') {
      const existing = containerRegistry.get(container)
      if (existing && existing !== this && !existing.isDestroyed) {
        if (data) {
          existing.updateData(data)
        }
        return existing
      }
    }

    this.container = container ?? null
    if (container && typeof container === 'object') {
      containerRegistry.set(container, this)
    }

    const stylesheet = createGraphStylesheet(container)
    const isDom = isRealDomElement(container)

    // Render budget before styling:
    // hideEdgesOnViewport: true, textureOnViewport: true, pixelRatio: 1
    this.cy = cytoscape({
      container: isDom ? container! : undefined,
      headless: !isDom,
      styleEnabled: true,
      boxSelectionEnabled: true,
      selectionType: 'additive',
      pixelRatio: 1,
      hideEdgesOnViewport: true,
      textureOnViewport: true,
      motionBlur: false,
      style: stylesheet,
      elements: [],
    })

    this.bindEvents()

    if (data) {
      this.updateData(data)
    }

    return this
  }

  /**
   * Binds Cytoscape interaction listeners.
   */
  private bindEvents(): void {
    if (!this.cy) return

    const emitSelection = () => {
      if (!this.cy || this.isDestroyed) return
      const selectedNodes = this.cy.nodes(':selected').map((n) => n.id())
      const selectedEdges = this.cy.edges(':selected').map((e) => e.id())
      const event: SelectionChangeEvent = {
        nodes: selectedNodes,
        edges: selectedEdges,
      }
      for (const listener of this.selectionListeners) {
        try {
          listener(event)
        } catch (err) {
          console.error('[CytoscapeGraphEngine] Error in selection change listener:', err)
        }
      }
    }

    this.cy.on('select unselect', 'node, edge', (_evt: EventObject) => {
      emitSelection()
    })
  }

  /**
   * Converts GraphData into Cytoscape element definitions with deterministic sorting
   * and seeded positions to guarantee 100% deterministic layout across repeated demo runs.
   */
  private buildElements(data: GraphData): ElementDefinition[] {
    const sortedNodes = [...data.nodes].sort((a, b) => a.id.localeCompare(b.id))
    const sortedEdges = [...data.edges].sort((a, b) => a.id.localeCompare(b.id))

    // Precalculate degree map for degree-based sizing and filtering
    const degreeMap = new Map<string, number>()
    for (const node of sortedNodes) {
      degreeMap.set(node.id, 0)
    }
    for (const edge of sortedEdges) {
      if (degreeMap.has(edge.source)) {
        degreeMap.set(edge.source, degreeMap.get(edge.source)! + 1)
      }
      if (degreeMap.has(edge.target)) {
        degreeMap.set(edge.target, degreeMap.get(edge.target)! + 1)
      }
    }

    // Maximum degree for normalization
    let maxDegree = 1
    for (const deg of degreeMap.values()) {
      if (deg > maxDegree) maxDegree = deg
    }

    const totalNodes = sortedNodes.length
    const elementDefs: ElementDefinition[] = []

    // Map nodes with deterministic seed positions (Fibonacci spiral distribution)
    for (let i = 0; i < totalNodes; i++) {
      const node = sortedNodes[i]
      const deg = degreeMap.get(node.id) ?? 0
      const colors = getNodeColorTokenForType(node.type)
      const shape = getNodeShapeForType(node.type)

      // Clamped size: 12px + 28px * normalized degree (12px to 40px)
      const normalizedRank = deg / maxDegree
      const size = Math.round(12 + 28 * normalizedRank)

      // Compact deterministic spiral placement coordinates as fixed seed
      const goldenAngle = 2.399963229728653 // pi * (3 - sqrt(5))
      const radius = 8 * Math.sqrt(i + 1)
      const theta = i * goldenAngle
      const seedX = Math.round(radius * Math.cos(theta) * 100) / 100
      const seedY = Math.round(radius * Math.sin(theta) * 100) / 100

      elementDefs.push({
        group: 'nodes',
        data: {
          id: node.id,
          label: node.displayName || node.id,
          type: node.type,
          shape,
          size,
          degree: deg,
          borderColor: resolveToken(colors.stroke, this.container),
          bgColor: resolveToken(colors.fill, this.container),
          isUnresolved: Boolean(node.isUnresolved),
          role: node.role,
          filePath: node.filePath,
          names: node.names,
          identifiers: node.identifiers,
          metadata: node.metadata,
        },
        position: { x: seedX, y: seedY },
      })
    }

    // Map edges
    for (const edge of sortedEdges) {
      elementDefs.push({
        group: 'edges',
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          reason: edge.reason,
          citation: edge.citation,
          isAi: edge.isAi,
          aiProposalId: edge.aiProposalId,
          tier: edge.tier,
          rawText: edge.rawText,
          weight: edge.tier === 'ai-proposed' ? 1.5 : 2.0,
        },
      })
    }

    return elementDefs
  }

  /**
   * Updates graph data smoothly without destroying the Cytoscape core.
   * Runs cose-bilkent layout deterministically.
   */
  public updateData(data: GraphData): void {
    if (!this.cy || this.isDestroyed) {
      this.currentRawData = data
      return
    }

    this.currentRawData = data
    const elements = this.buildElements(data)

    this.cy.batch(() => {
      this.cy!.elements().remove()
      this.cy!.add(elements)
    })

    this.reapplyActiveFilters()
    this.runDeterministicLayout()
  }

  /**
   * Executes the deterministic cose-bilkent layout with fixed seed.
   */
  public runDeterministicLayout(): void {
    if (!this.cy || this.isDestroyed) return
    const allNodes = this.cy.nodes()
    const totalCount = allNodes.length
    if (totalCount === 0) return

    // If top-N filter is active and total count exceeds topN, layout the visible active subgraph
    const visibleNodes = allNodes.not('.sb-hidden')
    const targetNodes = visibleNodes.length > 0 ? visibleNodes : allNodes

    if (targetNodes.length <= 800) {
      try {
        const layoutEles = targetNodes.union(targetNodes.edgesWith(targetNodes))
        const effectiveIters =
          targetNodes.length > 300
            ? Math.min(this.options.layoutIterations, 300)
            : this.options.layoutIterations

        const layout = layoutEles.layout({
          name: 'cose-bilkent',
          // Non-negotiable: randomize MUST be false for deterministic demo runs
          randomize: false,
          animate: this.options.animateLayout ? 'end' : false,
          nodeDimensionsIncludeLabels: true,
          refresh: 30,
          fit: true,
          padding: 40,
          idealEdgeLength: 80,
          nodeRepulsion: 4500,
          edgeElasticity: 0.45,
          nestingFactor: 0.1,
          gravity: 0.25,
          numIter: effectiveIters,
          tile: false,
          initialEnergyOnIncremental: 0.3,
        } as unknown as cytoscape.LayoutOptions)

        layout.run()
        return
      } catch (err) {
        console.warn('[CytoscapeGraphEngine] Layout execution warning:', err)
      }
    }
  }

  /**
   * Center and focus on a specific node by ID, highlighting it and dimming
   * elements more than 1 hop away per design-system.md §4 (15% opacity).
   */
  public focusNode(id: string): void {
    if (!this.cy || this.isDestroyed) return

    const target = this.cy.getElementById(id)
    if (!target || target.length === 0) return

    this.cy.batch(() => {
      // 1-hop neighborhood
      const neighborhood = target.closedNeighborhood()
      this.cy!.elements().addClass('sb-dimmed')
      neighborhood.removeClass('sb-dimmed')

      // Select target
      this.cy!.elements().unselect()
      target.select()
    })

    // Center camera if viewport available
    try {
      this.cy.animate(
        {
          center: { eles: target },
          zoom: Math.max(this.cy.zoom(), 1.2),
        },
        { duration: 250 }
      )
    } catch {
      // Ignore animation in headless mode
    }
  }

  /**
   * Clear focus mode (removes sb-dimmed from all elements).
   */
  public clearFocus(): void {
    if (!this.cy || this.isDestroyed) return
    this.cy.batch(() => {
      this.cy!.elements().removeClass('sb-dimmed')
    })
  }

  /**
   * Applies an imperative filter predicate. Elements where predicate returns false are hidden.
   */
  public applyFilter(predicate: (element: NodeSingular | EdgeSingular) => boolean): void {
    this.activeFilterPredicate = predicate
    this.reapplyActiveFilters()
  }

  /**
   * Resets any applied predicate filter and top-N degree filter.
   */
  public resetFilter(): void {
    this.activeFilterPredicate = null
    this.activeTopNLimit = null
    this.reapplyActiveFilters()
  }

  /**
   * Reveal all nodes and edges (clears top-N degree limit).
   */
  public revealAll(): void {
    this.activeTopNLimit = null
    this.reapplyActiveFilters()
  }

  /**
   * Filter graph to top-N nodes by degree with connected edges.
   */
  public filterTopNDegree(n?: number): void {
    this.activeTopNLimit = n ?? this.options.defaultTopNDegree
    this.reapplyActiveFilters()
  }

  /**
   * Internal filter re-evaluation preserving positions.
   */
  private reapplyActiveFilters(): void {
    if (!this.cy || this.isDestroyed) return

    const nodes = this.cy.nodes()
    const edges = this.cy.edges()

    // 1. Evaluate top-N degree filter if active
    let allowedNodeIds: Set<string> | null = null
    if (this.activeTopNLimit !== null && this.activeTopNLimit > 0 && nodes.length > this.activeTopNLimit) {
      const sortedByDegree = nodes
        .toArray()
        .sort((a, b) => (b.data('degree') || 0) - (a.data('degree') || 0))
      const topSlice = sortedByDegree.slice(0, this.activeTopNLimit)
      allowedNodeIds = new Set(topSlice.map((n) => n.id()))
    }

    this.cy.batch(() => {
      // Filter nodes
      for (const node of nodes) {
        let isVisible = true
        if (allowedNodeIds && !allowedNodeIds.has(node.id())) {
          isVisible = false
        }
        if (isVisible && this.activeFilterPredicate) {
          isVisible = this.activeFilterPredicate(node)
        }

        if (isVisible) {
          node.removeClass('sb-hidden')
        } else {
          node.addClass('sb-hidden')
        }
      }

      // Filter edges (hide if either endpoint is hidden, or if predicate rejects edge)
      for (const edge of edges) {
        const sourceVisible = !edge.source().hasClass('sb-hidden')
        const targetVisible = !edge.target().hasClass('sb-hidden')
        let isVisible = sourceVisible && targetVisible

        if (isVisible && this.activeFilterPredicate) {
          isVisible = this.activeFilterPredicate(edge)
        }

        if (isVisible) {
          edge.removeClass('sb-hidden')
        } else {
          edge.addClass('sb-hidden')
        }
      }
    })
  }

  /**
   * Sets programmatic selection to specific element IDs.
   */
  public setSelection(ids: string[]): void {
    if (!this.cy || this.isDestroyed) return

    const idSet = new Set(ids)
    this.cy.batch(() => {
      this.cy!.elements().unselect()
      if (ids.length > 0) {
        this.cy!.elements()
          .filter((ele) => idSet.has(ele.id()))
          .select()
      }
    })
  }

  /**
   * Returns current active selection.
   */
  public getSelection(): SelectionChangeEvent {
    if (!this.cy || this.isDestroyed) return { nodes: [], edges: [] }
    return {
      nodes: this.cy.nodes(':selected').map((n) => n.id()),
      edges: this.cy.edges(':selected').map((e) => e.id()),
    }
  }

  /**
   * Fits graph viewport to specified IDs or entire visible graph.
   */
  public fitTo(ids?: string[]): void {
    if (!this.cy || this.isDestroyed) return

    try {
      if (ids && ids.length > 0) {
        const idSet = new Set(ids)
        const targetEles = this.cy.elements().filter((ele) => idSet.has(ele.id()))
        if (targetEles.length > 0) {
          this.cy.fit(targetEles, 50)
          return
        }
      }

      const visibleNodes = this.cy.nodes().not('.sb-hidden')
      if (visibleNodes.length > 0) {
        this.cy.fit(visibleNodes, 40)
      } else {
        this.cy.fit(undefined, 40)
      }
    } catch {
      // Ignore fit in headless environments
    }
  }

  /**
   * Subscribes to selection changes.
   * Returns unsubscribe cleanup function.
   */
  public onSelectionChange(
    callback: (selected: SelectionChangeEvent) => void
  ): () => void {
    this.selectionListeners.add(callback)
    return () => {
      this.selectionListeners.delete(callback)
    }
  }

  /**
   * Access underlying Cytoscape Core instance if needed.
   */
  public getCy(): Core | null {
    return this.cy
  }

  /**
   * Returns raw graph data currently loaded.
   */
  public getData(): GraphData {
    return this.currentRawData
  }

  /**
   * Destroys engine instance and cleans up listeners.
   */
  public destroy(): void {
    if (this.isDestroyed) return
    this.isDestroyed = true

    this.selectionListeners.clear()
    if (this.container) {
      containerRegistry.delete(this.container)
      this.container = null
    }

    if (this.cy) {
      this.cy.destroy()
      this.cy = null
    }
  }
}

/**
 * Top-level imperative factory function matching prompt signature.
 */
export function initGraph(
  container: HTMLElement,
  data?: GraphData,
  options?: EngineOptions
): CytoscapeGraphEngine {
  return CytoscapeGraphEngine.initGraph(container, data, options)
}
