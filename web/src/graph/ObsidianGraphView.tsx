import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import ForceGraph from 'force-graph'
import type { GraphData } from './types'
import { EmptyState, LoadingSkeleton, ErrorState } from '../states'
import './obsidian-graph.css'

export interface ObsidianGraphViewProps {
  caseId?: string | null
  data?: GraphData | null
  isLoading?: boolean
  error?: string | null
  onRetry?: () => void
  onSelectNode?: (nodeId: string, filePath?: string) => void
  onSelectEdge?: (edgeId: string, edge?: any) => void
  className?: string
  style?: React.CSSProperties
}

interface ProcessedNode {
  id: string
  name: string
  type: string
  role?: string
  filePath?: string
  isUnresolved?: boolean
  degree: number
  val: number
  x?: number
  y?: number
  vx?: number
  vy?: number
  fx?: number
  fy?: number
}

interface ProcessedLink {
  id: string
  source: string | ProcessedNode
  target: string | ProcessedNode
  tier?: string
  isAi?: boolean
}

/**
 * ObsidianGraphView — 1:1 Obsidian Mind-Map Force-Directed Graph View
 * Uses HTML5 Canvas + d3-force continuous physics simulation.
 */
export function ObsidianGraphView({
  caseId,
  data,
  isLoading = false,
  error = null,
  onRetry,
  onSelectNode,
  onSelectEdge,
  className = '',
  style,
}: ObsidianGraphViewProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null)
  const lastClickRef = useRef<{ id: string; time: number }>({ id: '', time: 0 })
  const onSelectNodeRef = useRef(onSelectNode)
  onSelectNodeRef.current = onSelectNode
  const onSelectEdgeRef = useRef(onSelectEdge)
  onSelectEdgeRef.current = onSelectEdge

  // Interactive Focus / Selection state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Simulation Controls & Display Settings
  const [nodeSizeMult, setNodeSizeMult] = useState(1.0)
  const [linkWidthMult, setLinkWidthMult] = useState(1.0)
  const [chargeStrength, setChargeStrength] = useState(-260)
  const [linkDistance, setLinkDistance] = useState(70)
  const [centerGravity, setCenterGravity] = useState(0.20)
  const [showAllLabels, setShowAllLabels] = useState(false)
  const [hideOrphans, setHideOrphans] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // The node currently causing focus/highlight (hover takes precedence, then selected)
  const activeFocusId = hoveredNodeId || selectedNodeId

  // Transform data into force-graph nodes and links
  const { processedNodes, processedLinks, neighborMap, incidentLinksMap, nodeById } = useMemo(() => {
    if (!data || !data.nodes) {
      return {
        processedNodes: [],
        processedLinks: [],
        neighborMap: new Map<string, Set<string>>(),
        incidentLinksMap: new Map<string, Set<ProcessedLink>>(),
        nodeById: new Map<string, ProcessedNode>(),
      }
    }

    const degMap = new Map<string, number>()
    for (const n of data.nodes) degMap.set(n.id, 0)
    for (const e of data.edges) {
      degMap.set(e.source, (degMap.get(e.source) || 0) + 1)
      degMap.set(e.target, (degMap.get(e.target) || 0) + 1)
    }

    const nById = new Map<string, ProcessedNode>()
    const pNodes: ProcessedNode[] = []

    for (const n of data.nodes) {
      const deg = degMap.get(n.id) || 0
      if (hideOrphans && deg === 0) continue

      const pNode: ProcessedNode = {
        id: n.id,
        name: n.displayName || n.id,
        type: n.type,
        role: n.role,
        filePath: n.filePath,
        isUnresolved: Boolean(n.isUnresolved),
        degree: deg,
        val: Math.max(2.6, Math.min(10.5, 2.4 + Math.sqrt(deg) * 1.6)),
      }
      nById.set(n.id, pNode)
      pNodes.push(pNode)
    }

    // Seed positions: connected in center, orphans in outer orbital ring (Image 2)
    const orphanNodes = pNodes.filter((n) => n.degree === 0)
    const totalOrphans = orphanNodes.length
    orphanNodes.forEach((n, idx) => {
      const angle = (idx / (totalOrphans || 1)) * 2 * Math.PI
      const r = 340 + ((idx * 31) % 45)
      n.x = Math.cos(angle) * r
      n.y = Math.sin(angle) * r
      n.fx = n.x
      n.fy = n.y
    })

    const connectedNodes = pNodes.filter((n) => n.degree > 0)
    connectedNodes.forEach((n, idx) => {
      const angle = (idx / (connectedNodes.length || 1)) * 2 * Math.PI
      const r = Math.min(240, 25 + Math.sqrt(idx) * 26)
      n.x = Math.cos(angle) * r
      n.y = Math.sin(angle) * r
    })

    const nMap = new Map<string, Set<string>>()
    const lMap = new Map<string, Set<ProcessedLink>>()
    for (const n of pNodes) {
      nMap.set(n.id, new Set())
      lMap.set(n.id, new Set())
    }

    const pLinks: ProcessedLink[] = []
    for (const e of data.edges) {
      if (!nById.has(e.source) || !nById.has(e.target)) continue
      const link: ProcessedLink = {
        id: e.id,
        source: e.source,
        target: e.target,
        tier: e.tier,
        isAi: e.isAi,
      }
      pLinks.push(link)

      nMap.get(e.source)?.add(e.target)
      nMap.get(e.target)?.add(e.source)
      lMap.get(e.source)?.add(link)
      lMap.get(e.target)?.add(link)
    }

    return {
      processedNodes: pNodes,
      processedLinks: pLinks,
      neighborMap: nMap,
      incidentLinksMap: lMap,
      nodeById: nById,
    }
  }, [data, hideOrphans])

  // Compute 1-hop highlighted elements
  const { highlightedNodeIds, highlightedLinks } = useMemo(() => {
    const nIds = new Set<string>()
    const lObjs = new Set<ProcessedLink>()

    if (activeFocusId) {
      nIds.add(activeFocusId)
      const neighbors = neighborMap.get(activeFocusId)
      if (neighbors) {
        for (const nid of neighbors) nIds.add(nid)
      }
      const links = incidentLinksMap.get(activeFocusId)
      if (links) {
        for (const l of links) lObjs.add(l)
      }
    }

    // Also highlight search matches if search query is present
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      for (const n of processedNodes) {
        if (n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)) {
          nIds.add(n.id)
        }
      }
    }

    return { highlightedNodeIds: nIds, highlightedLinks: lObjs }
  }, [activeFocusId, neighborMap, incidentLinksMap, searchQuery, processedNodes])

  // Ref to always access fresh highlight state inside canvas paint callbacks without re-initializing
  const stateRef = useRef({
    activeFocusId,
    highlightedNodeIds,
    highlightedLinks,
    nodeSizeMult,
    linkWidthMult,
    showAllLabels,
    searchQuery,
  })

  useEffect(() => {
    stateRef.current = {
      activeFocusId,
      highlightedNodeIds,
      highlightedLinks,
      nodeSizeMult,
      linkWidthMult,
      showAllLabels,
      searchQuery,
    }
    // Request instant repaint when highlight or display options change
    if (fgRef.current) {
      if (typeof fgRef.current.refresh === 'function') {
        fgRef.current.refresh()
      } else if (typeof fgRef.current.d3ReheatSimulation === 'function') {
        fgRef.current.d3ReheatSimulation()
      }
    }
  }, [activeFocusId, highlightedNodeIds, highlightedLinks, nodeSizeMult, linkWidthMult, showAllLabels, searchQuery])

  // Node Color Resolver (Cool Obsidian aesthetic matching Image 2)
  const getNodeColor = useCallback((type: string, isUnresolved?: boolean): string => {
    if (isUnresolved) return '#64748b' // cool slate
    const t = String(type || '').toLowerCase()
    switch (t) {
      case 'person':
        return '#4f46e5' // cool slate-indigo
      case 'phone':
      case 'identifier':
      case 'imei':
        return '#0284c7' // electric sky cyan
      case 'vehicle':
        return '#7c3aed' // cool slate-violet
      case 'location':
      case 'tower':
        return '#0d9488' // cool emerald teal
      case 'organisation':
      case 'org':
        return '#1d4ed8' // deep cobalt blue
      case 'event':
      case 'fir':
        return '#be123c' // cool crimson / ruby
      case 'device':
        return '#0891b2' // cool dark cyan
      default:
        return '#475569' // cool slate / charcoal
    }
  }, [])

  // Mount ForceGraph instance ONCE
  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return

    // Clear previous canvas if any
    containerRef.current.innerHTML = ''

    const elem = containerRef.current
    const fg = new ForceGraph(elem)
      .backgroundColor('#ffffff')
      .nodeId('id')
      .linkSource('source')
      .linkTarget('target')
      .warmupTicks(60)
      .cooldownTicks(200)
      .d3AlphaDecay(0.02)
      .d3VelocityDecay(0.3)

    // Radial gravity force keeping disconnected clusters in a unified spherical constellation (Image 2)
    function radialGravityForce() {
      let nodes: any[] = []
      const force = (alpha: number) => {
        const k = alpha * 0.065
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i]
          if (node.degree === 0) continue
          node.vx = (node.vx || 0) - (node.x || 0) * k
          node.vy = (node.vy || 0) - (node.y || 0) * k
        }
      }
      force.initialize = (_nodes: any[]) => {
        nodes = _nodes
      }
      return force
    }
    fg.d3Force('radialGravity', radialGravityForce())

    // Custom Node Canvas Drawing
    fg.nodeCanvasObject((rawNode: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const node = rawNode as ProcessedNode
        const {
          activeFocusId: curFocus,
          highlightedNodeIds: curHighNodes,
          nodeSizeMult: curSizeMult,
          showAllLabels: curShowAll,
        } = stateRef.current

        const hasFocus = Boolean(curFocus)
        const isTarget = curFocus === node.id
        const isNeighbor = curHighNodes.has(node.id)
        const isDimmed = hasFocus && !isNeighbor

        // Screen-scaled radius ensures dots are always crisp, tactile and never subpixel dust
        const screenR = Math.max(3.2, (node.val || 4) * Math.pow(Math.max(0.15, globalScale), 0.28) * curSizeMult)
        const baseR = screenR / Math.max(0.01, globalScale)
        const r = isTarget ? baseR * 1.35 : baseR

        ctx.save()
        ctx.beginPath()
        ctx.arc(node.x || 0, node.y || 0, Math.max(0.5, r), 0, 2 * Math.PI, false)

        if (isDimmed) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.22)'
          ctx.fill()
        } else if (isTarget) {
          // Glow and target ring matching Image 3 in Light Theme
          ctx.shadowColor = 'rgba(239, 68, 68, 0.55)'
          ctx.shadowBlur = 14
          ctx.fillStyle = '#ef4444'
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.lineWidth = Math.max(1.8 / globalScale, 2.2 / globalScale)
          ctx.strokeStyle = '#ffffff'
          ctx.stroke()
        } else if (isNeighbor) {
          // Connected neighbor
          ctx.fillStyle = getNodeColor(node.type, node.isUnresolved)
          ctx.fill()
          ctx.lineWidth = Math.max(1.2 / globalScale, 1.6 / globalScale)
          ctx.strokeStyle = '#f87171'
          ctx.stroke()
        } else {
          // Normal Obsidian dot
          ctx.fillStyle = getNodeColor(node.type, node.isUnresolved)
          ctx.fill()
          if (node.degree >= 10) {
            ctx.lineWidth = 1.0 / globalScale
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.2)'
            ctx.stroke()
          }
        }

        // Draw Label: When targeted, neighbor, global toggle, or zoomed in
        const shouldShowLabel = isTarget || curShowAll || (isNeighbor && globalScale >= 1.4) || (globalScale >= 2.4 && node.degree > 2)
        if (shouldShowLabel && !isDimmed) {
          const label = node.name || node.id
          const screenFontSize = isTarget ? 13 : Math.max(10, Math.min(14, 11 * Math.pow(Math.max(0.2, globalScale), 0.2)))
          const fontSize = screenFontSize / Math.max(0.01, globalScale)
          ctx.font = `${isTarget ? '600' : '400'} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'top'

          const textWidth = ctx.measureText(label).width
          const padX = 6 / globalScale
          const padY = 3 / globalScale
          const posX = node.x || 0
          const posY = (node.y || 0) + r + (4 / globalScale)

          // Light pill background for readability (Obsidian light theme)
          ctx.fillStyle = isTarget ? 'rgba(255, 255, 255, 0.98)' : 'rgba(248, 250, 252, 0.94)'
          ctx.beginPath()
          ctx.roundRect(posX - textWidth / 2 - padX, posY - padY, textWidth + padX * 2, fontSize + padY * 2, 4 / globalScale)
          ctx.fill()
          ctx.strokeStyle = isTarget ? 'rgba(239, 68, 68, 0.85)' : 'rgba(203, 213, 225, 0.8)'
          ctx.lineWidth = (isTarget ? 1.4 : 1.0) / globalScale
          ctx.stroke()

          // Text fill
          ctx.fillStyle = isTarget ? '#0f172a' : '#334155'
          ctx.fillText(label, posX, posY)
        }

        ctx.restore()
      })
      // Custom Node Pointer Area (Hit Detection) matching screen size
      .nodePointerAreaPaint((rawNode: any, color: string, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const node = rawNode as ProcessedNode
        const screenR = Math.max(8, (node.val || 4) * Math.pow(Math.max(0.15, globalScale), 0.28) * stateRef.current.nodeSizeMult)
        const r = screenR / Math.max(0.01, globalScale)
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.arc(node.x || 0, node.y || 0, r, 0, 2 * Math.PI, false)
        ctx.fill()
      })
      // Custom Link Canvas Drawing (Red highlight on incident links, subtle gray default)
      .linkCanvasObjectMode(() => 'after')
      .linkCanvasObject((rawLink: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
        const link = rawLink as ProcessedLink
        const source = typeof link.source === 'object' ? (link.source as ProcessedNode) : null
        const target = typeof link.target === 'object' ? (link.target as ProcessedNode) : null
        if (!source || !target || source.x === undefined || target.x === undefined) return

        const {
          activeFocusId: curFocus,
          highlightedLinks: curHighLinks,
          linkWidthMult: curWidthMult,
        } = stateRef.current

        const hasFocus = Boolean(curFocus)
        const isHighlighted = curHighLinks.has(link)

        ctx.save()
        ctx.beginPath()
        ctx.moveTo(source.x, source.y!)
        ctx.lineTo(target.x, target.y!)

        if (isHighlighted) {
          // Bright vivid red highlight matching Obsidian Image 3 in Light Theme!
          ctx.strokeStyle = '#ef4444'
          ctx.lineWidth = Math.max(2.4 / globalScale, 2.8 * curWidthMult)
          ctx.shadowColor = 'rgba(239, 68, 68, 0.45)'
          ctx.shadowBlur = 8
          ctx.stroke()
        } else if (hasFocus) {
          // Dimmed non-relevant links
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.28)'
          ctx.lineWidth = Math.max(0.4 / globalScale, 0.5 * curWidthMult)
          ctx.stroke()
        } else {
          // Normal Obsidian hairline edge
          ctx.strokeStyle = link.isAi ? 'rgba(99, 102, 241, 0.35)' : 'rgba(100, 116, 139, 0.22)'
          ctx.lineWidth = Math.max(0.8 / globalScale, 0.95 * curWidthMult)
          ctx.stroke()
        }

        ctx.restore()
      })
      // Interactions
      .onNodeHover((node: any) => {
        setHoveredNodeId(node ? node.id : null)
        if (containerRef.current) {
          containerRef.current.style.cursor = node ? 'pointer' : 'default'
        }
      })
      .onNodeClick((rawNode: any) => {
        const n = rawNode as ProcessedNode
        const now = Date.now()
        const last = lastClickRef.current

        if (last.id === n.id && now - last.time < 350) {
          // Double click: open note in editor
          if (onSelectNodeRef.current && n.filePath) {
            onSelectNodeRef.current(n.id, n.filePath)
          }
        } else {
          // Single click: focus/select node in graph
          setSelectedNodeId((prev) => (prev === n.id ? null : n.id))
        }
        lastClickRef.current = { id: n.id, time: now }
      })
      .onLinkHover((link: any) => {
        if (containerRef.current) {
          containerRef.current.style.cursor = link ? 'pointer' : 'default'
        }
      })
      .onLinkClick((link: any) => {
        if (!link) return
        if (onSelectEdgeRef.current) {
          onSelectEdgeRef.current(link.id, link)
        }
      })
      .onBackgroundClick(() => {
        setSelectedNodeId(null)
      })

    fgRef.current = fg
    if (typeof window !== 'undefined') {
      ;(window as any).__obsidianFg = fg
    }

    // Supply initial graph data immediately
    fg.graphData({
      nodes: processedNodes,
      links: processedLinks,
    })

    // Initial resize to fill container
    const width = elem.clientWidth || 800
    const height = elem.clientHeight || 600
    fg.width(width).height(height)

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 20 && entry.contentRect.height > 20) {
          fg.width(entry.contentRect.width).height(entry.contentRect.height)
        }
      }
    })
    ro.observe(elem)

    // Auto-fit view once nodes stabilize
    let initialZoomed = false
    fg.onEngineStop(() => {
      if (!initialZoomed) {
        initialZoomed = true
        fg.zoomToFit(400, 60)
      }
    })
    const timer = setTimeout(() => {
      if (!initialZoomed) {
        initialZoomed = true
        fgRef.current?.zoomToFit(400, 60)
      }
    }, 450)

    return () => {
      clearTimeout(timer)
      ro.disconnect()
      elem.innerHTML = ''
      fgRef.current = null
    }
  }, [])

  // Update Graph Data when nodes/links change
  useEffect(() => {
    if (!fgRef.current) return
    fgRef.current.graphData({
      nodes: processedNodes,
      links: processedLinks,
    })
  }, [processedNodes, processedLinks])

  // Adjust Physics Forces when parameters change
  useEffect(() => {
    const fg = fgRef.current
    if (!fg) return

    // Many-body repulsion force (spreads out clusters, keeps orphans gentle)
    const charge = fg.d3Force('charge')
    if (charge) {
      charge.strength((node: any) => (node.degree === 0 ? -12 : chargeStrength))
      if (typeof charge.distanceMax === 'function') charge.distanceMax(500)
      if (typeof charge.distanceMin === 'function') charge.distanceMin(8)
    }

    // Link spring force
    const link = fg.d3Force('link')
    if (link) link.distance(linkDistance)

    // Center gravity force
    const center = fg.d3Force('center')
    if (center && typeof center.strength === 'function') {
      center.strength(centerGravity)
    }

    fg.d3ReheatSimulation()
  }, [chargeStrength, linkDistance, centerGravity])


  // Reset simulation settings
  const handleReset = useCallback(() => {
    setChargeStrength(-260)
    setLinkDistance(70)
    setCenterGravity(0.20)
    setNodeSizeMult(1.0)
    setLinkWidthMult(1.0)
    if (fgRef.current) {
      fgRef.current.d3ReheatSimulation()
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 50)
      }, 400)
    }
  }, [])

  // Zoom to fit
  const handleZoomFit = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 40)
    }
  }, [])

  // Keyboard shortcut: Escape clears selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNodeId(null)
        setIsSettingsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Selected node details
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) : null

  // Empty state handling
  if (!caseId) {
    return (
      <div className={`obsidian-graph-root ${className}`} style={style}>
        <EmptyState headline="No Case Open" body="Open an investigation case folder to view its knowledge graph." />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`obsidian-graph-root ${className}`} style={style}>
        <LoadingSkeleton variant="graph" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`obsidian-graph-root ${className}`} style={style}>
        <ErrorState
          title="Graph Load Error"
          message={error}
          retryAction={onRetry}
          retryLabel="Retry Loading"
        />
      </div>
    )
  }

  return (
    <div className={`obsidian-graph-root ${className}`} style={style} role="region" aria-label="Obsidian Graph View">
      {/* Main HTML5 Canvas Container */}
      <div
        ref={containerRef}
        id="obsidian-graph-canvas-host"
        className="obsidian-graph-canvas-container"
      />

      {/* Floating In-Canvas Tools (Top Right) */}
      <div className="obsidian-graph-floating-tools">
        <button
          type="button"
          className="obsidian-graph-tool-btn"
          title="Zoom to Fit"
          onClick={handleZoomFit}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>
        <button
          type="button"
          className={`obsidian-graph-tool-btn ${isSettingsOpen ? 'is-active' : ''}`}
          title="Graph Settings (Filters, Display, Forces)"
          onClick={() => setIsSettingsOpen((prev) => !prev)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>

      {/* Floating Obsidian Settings Drawer */}
      {isSettingsOpen && (
        <aside className="obsidian-graph-settings-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border, #2e3542)', paddingBottom: '8px', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #fff)' }}>Graph Settings</span>
            <button
              type="button"
              className="obsidian-graph-focus-close"
              title="Close settings"
              onClick={() => setIsSettingsOpen(false)}
            >
              ✕
            </button>
          </div>

          {/* Section 1: Filters */}
          <div>
            <div className="obsidian-settings-section-title">Filters</div>
            <div className="obsidian-settings-row">
              <input
                type="text"
                id="graph-settings-search"
                name="graph_search"
                aria-label="Filter notes by query"
                placeholder="Search notes..."
                className="obsidian-settings-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <label className="obsidian-settings-toggle">
              <span>Hide Orphan Notes</span>
              <input
                type="checkbox"
                id="graph-hide-orphans"
                name="hide_orphans"
                aria-label="Hide Orphan Notes"
                checked={hideOrphans}
                onChange={(e) => setHideOrphans(e.target.checked)}
              />
            </label>
          </div>

          {/* Section 2: Display */}
          <div>
            <div className="obsidian-settings-section-title">Display</div>
            <div className="obsidian-settings-row">
              <div className="obsidian-settings-label-row">
                <span>Node Size</span>
                <span className="obsidian-settings-val">{nodeSizeMult.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                id="graph-node-size"
                name="node_size"
                aria-label="Node Size Multiplier"
                min="0.5"
                max="2.5"
                step="0.1"
                className="obsidian-settings-slider"
                value={nodeSizeMult}
                onChange={(e) => setNodeSizeMult(parseFloat(e.target.value))}
              />
            </div>

            <div className="obsidian-settings-row">
              <div className="obsidian-settings-label-row">
                <span>Link Thickness</span>
                <span className="obsidian-settings-val">{linkWidthMult.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                id="graph-link-thickness"
                name="link_thickness"
                aria-label="Link Thickness Multiplier"
                min="0.5"
                max="3.0"
                step="0.2"
                className="obsidian-settings-slider"
                value={linkWidthMult}
                onChange={(e) => setLinkWidthMult(parseFloat(e.target.value))}
              />
            </div>

            <label className="obsidian-settings-toggle">
              <span>Always Show Labels</span>
              <input
                type="checkbox"
                id="graph-always-show-labels"
                name="always_show_labels"
                aria-label="Always Show Labels"
                checked={showAllLabels}
                onChange={(e) => setShowAllLabels(e.target.checked)}
              />
            </label>
          </div>

          {/* Section 3: Forces */}
          <div>
            <div className="obsidian-settings-section-title">
              <span>Forces</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}
                onClick={handleReset}
              >
                Reset
              </button>
            </div>

            <div className="obsidian-settings-row">
              <div className="obsidian-settings-label-row">
                <span>Repulsion (Charge)</span>
                <span className="obsidian-settings-val">{chargeStrength}</span>
              </div>
              <input
                type="range"
                id="graph-repulsion-charge"
                name="charge_strength"
                aria-label="Repulsion Charge Strength"
                min="-350"
                max="-30"
                step="10"
                className="obsidian-settings-slider"
                value={chargeStrength}
                onChange={(e) => setChargeStrength(parseInt(e.target.value, 10))}
              />
            </div>

            <div className="obsidian-settings-row">
              <div className="obsidian-settings-label-row">
                <span>Link Distance</span>
                <span className="obsidian-settings-val">{linkDistance}px</span>
              </div>
              <input
                type="range"
                id="graph-link-distance"
                name="link_distance"
                aria-label="Link Distance"
                min="20"
                max="180"
                step="5"
                className="obsidian-settings-slider"
                value={linkDistance}
                onChange={(e) => setLinkDistance(parseInt(e.target.value, 10))}
              />
            </div>

            <div className="obsidian-settings-row">
              <div className="obsidian-settings-label-row">
                <span>Center Gravity</span>
                <span className="obsidian-settings-val">{centerGravity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                id="graph-center-gravity"
                name="center_gravity"
                aria-label="Center Gravity"
                min="0.05"
                max="0.4"
                step="0.02"
                className="obsidian-settings-slider"
                value={centerGravity}
                onChange={(e) => setCenterGravity(parseFloat(e.target.value))}
              />
            </div>
          </div>
        </aside>
      )}

      {/* Floating Bottom Pill when a node is selected */}
      {selectedNode && (
        <div className="obsidian-graph-focus-pill">
          <span className="obsidian-graph-focus-pill-tag" />
          <span>
            Focused: <strong>{selectedNode.name}</strong> ({selectedNode.degree} connections)
          </span>
          {selectedNode.filePath && (
            <button
              type="button"
              style={{
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                marginLeft: '4px',
                boxShadow: '0 1px 4px rgba(239, 68, 68, 0.3)',
              }}
              onClick={() => onSelectNode?.(selectedNode.id, selectedNode.filePath)}
            >
              Open Note
            </button>
          )}
          <button
            type="button"
            className="obsidian-graph-focus-close"
            title="Clear focus (Esc)"
            onClick={() => setSelectedNodeId(null)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
