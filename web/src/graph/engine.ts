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
} from 'cytoscape'
// @ts-expect-error cytoscape-cose-bilkent untyped
import coseBilkent from 'cytoscape-cose-bilkent'

import type { GraphData } from './types.ts'

// Register cose-bilkent layout once safely
let coseBilkentRegistered = false
export function registerCoseBilkent(): void {
  if (!coseBilkentRegistered && typeof cytoscape !== 'undefined') {
    cytoscape.use(coseBilkent)
    coseBilkentRegistered = true
  }
}
registerCoseBilkent()

export * from './styles.ts'
import {
  resolveToken,
  getNodeShapeForType,
  getNodeColorTokenForType,
  createGraphStylesheet,
} from './styles.ts'

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
  /**
   * Initial visibility of investigative leads (AI-proposed edges). Default: true.
   */
  leadsVisible?: boolean
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
  private leadsVisible = true

  constructor(container?: HTMLElement | null, data?: GraphData, options?: EngineOptions) {
    this.options = {
      defaultTopNDegree: options?.defaultTopNDegree !== undefined ? options.defaultTopNDegree : 300,
      animateLayout: options?.animateLayout ?? false,
      layoutIterations: options?.layoutIterations ?? 2500,
      wheelSensitivity: options?.wheelSensitivity ?? 1,
      leadsVisible: options?.leadsVisible !== undefined ? options.leadsVisible : true,
    }
    this.activeTopNLimit = this.options.defaultTopNDegree
    this.leadsVisible = this.options.leadsVisible

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

      const nodeClasses: string[] = [`type-${node.type}`]
      if (node.isUnresolved) {
        nodeClasses.push('unresolved')
      }
      if (node.role) {
        nodeClasses.push(`role-${node.role}`)
      }

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
        classes: nodeClasses.join(' '),
        position: { x: seedX, y: seedY },
      })
    }

    // Map edges
    for (const edge of sortedEdges) {
      const isAi = Boolean(edge.isAi || edge.aiProposalId || edge.tier === 'ai-proposed')
      const isContradiction = Boolean(
        (edge as unknown as Record<string, unknown>).isContradiction ||
        (edge as unknown as Record<string, unknown>).isDisputed ||
        (edge as unknown as Record<string, unknown>).status === 'contradiction' ||
        (edge as unknown as Record<string, unknown>).status === 'disputed' ||
        (edge as unknown as Record<string, unknown>).tier === 'contradiction' ||
        (edge as unknown as Record<string, unknown>).tier === 'disputed'
      )
      const sourceCount = Array.isArray((edge as unknown as Record<string, unknown>).sources)
        ? ((edge as unknown as Record<string, unknown>).sources as unknown[]).length
        : Array.isArray((edge as unknown as Record<string, unknown>).citations)
        ? ((edge as unknown as Record<string, unknown>).citations as unknown[]).length
        : typeof (edge as unknown as Record<string, unknown>).sourceCount === 'number'
        ? ((edge as unknown as Record<string, unknown>).sourceCount as number)
        : (edge as unknown as Record<string, unknown>).corroborated
        ? 2
        : 1
      const isMultiSource = sourceCount > 1

      const edgeClasses: string[] = []
      if (isAi) {
        edgeClasses.push('ai-proposed', 'is-ai')
      } else {
        edgeClasses.push('record-derived')
      }
      if (isMultiSource) {
        edgeClasses.push('multi-source', 'corroborated')
      }
      if (isContradiction) {
        edgeClasses.push('contradiction', 'disputed')
      }

      const weight = isContradiction ? 2.0 : isAi ? 1.5 : (isMultiSource ? 2.5 : 1.5)

      elementDefs.push({
        group: 'edges',
        data: {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          reason: edge.reason,
          citation: edge.citation,
          isAi,
          aiProposalId: edge.aiProposalId,
          tier: isContradiction
            ? (((edge as unknown as Record<string, unknown>).tier as string) ?? 'record-derived')
            : (isAi ? 'ai-proposed' : 'record-derived'),
          rawText: edge.rawText,
          isDisputed: isContradiction,
          isContradiction,
          sourceCount,
          isMultiSource,
          weight,
        },
        classes: edgeClasses.join(' '),
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

      // Filter edges (hide if either endpoint is hidden, or if predicate rejects edge, or if leads are hidden)
      for (const edge of edges) {
        const sourceVisible = !edge.source().hasClass('sb-hidden')
        const targetVisible = !edge.target().hasClass('sb-hidden')
        let isVisible = sourceVisible && targetVisible

        if (isVisible && !this.leadsVisible) {
          const isAi = edge.hasClass('ai-proposed') || edge.hasClass('is-ai') || Boolean(edge.data('isAi'))
          if (isAi) {
            isVisible = false
          }
        }

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
   * Toggles visibility of AI-proposed leads/edges (Leads layer toggle).
   */
  public setLeadsVisible(visible: boolean): void {
    this.leadsVisible = visible
    this.reapplyActiveFilters()
  }

  /**
   * Returns current visibility state of AI-proposed leads.
   */
  public isLeadsVisible(): boolean {
    return this.leadsVisible
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
   * Alias for getCy() for test assertions.
   */
  public getUnderlyingCore(): Core | null {
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
