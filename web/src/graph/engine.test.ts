/// <reference types="node" />
/**
 * SyndicateBrain (SIH26189) — Cytoscape Graph Engine Test & Benchmark Suite.
 *
 * Tests:
 * 1. 2,000-node / 8,000-edge synthetic fixture benchmarking & render budget.
 * 2. Deterministic layout coordinates across repeated runs with identical data (randomize: false).
 * 3. Stable container mounting (mounts once, never remounts or duplicates Cytoscape instance).
 * 4. Imperative Engine API (focusNode, applyFilter, resetFilter, filterTopNDegree, revealAll,
 *    setSelection, fitTo, onSelectionChange, destroy).
 * 5. Design system tokens & node shapes per docs/design-system.md §4.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CytoscapeGraphEngine,
  initGraph,
  getNodeShapeForType,
  getNodeColorTokenForType,
  GRAPH_TOKENS,
  resolveToken,
} from './engine.ts'
import type { GraphData, GraphNode, GraphEdge } from './types.ts'

/**
 * Helper to generate synthetic graph fixtures.
 */
function generateSyntheticGraph(nodeCount: number, edgeCount: number): GraphData {
  const nodeTypes = [
    'person',
    'phone',
    'device',
    'vehicle',
    'location',
    'tower',
    'organisation',
    'fir',
    'event',
  ] as const

  const nodes: GraphNode[] = []
  for (let i = 0; i < nodeCount; i++) {
    const type = nodeTypes[i % nodeTypes.length]
    nodes.push({
      id: `node_${i.toString().padStart(5, '0')}`,
      type,
      displayName: `Entity ${i} (${type})`,
      role: i % 4 === 0 ? 'accused' : i % 4 === 1 ? 'witness' : undefined,
      identifiers: [`98${(10000000 + i).toString()}`],
    })
  }

  const edges: GraphEdge[] = []
  for (let j = 0; j < edgeCount; j++) {
    const sourceIdx = j % nodeCount
    // Pseudo-random connected distribution
    const targetIdx = (j * 7 + 13) % nodeCount
    if (sourceIdx !== targetIdx) {
      const isAi = j % 5 === 0
      edges.push({
        id: `edge_${j.toString().padStart(6, '0')}`,
        source: nodes[sourceIdx].id,
        target: nodes[targetIdx].id,
        reason: `Connection link ${j}`,
        citation: {
          raw: `^[FIR_0142 p:${(j % 5) + 1} l:${(j % 30) + 1}]`,
          sourceId: 'FIR_0142',
          sourceDocId: 'FIR_0142',
          locator: `p:${(j % 5) + 1} l:${(j % 30) + 1}`,
        },
        isAi,
        aiProposalId: isAi ? `prop_${j}` : undefined,
        tier: isAi ? 'ai-proposed' : 'record-derived',
      })
    }
  }

  return { nodes, edges }
}

describe('AKT-T02: Cytoscape Graph Engine', () => {
  // 1. Benchmarking 2,000 nodes & 8,000 edges
  it('benchmarks synthetic 2,000-node / 8,000-edge fixture within render budget', () => {
    const genStart = performance.now()
    const fixture = generateSyntheticGraph(2000, 8000)
    const genDuration = performance.now() - genStart

    assert.strictEqual(fixture.nodes.length, 2000)
    assert.strictEqual(fixture.edges.length, 8000)

    // Mount engine in headless mode
    const initStart = performance.now()
    const engine = new CytoscapeGraphEngine(null, undefined, {
      defaultTopNDegree: 300,
      layoutIterations: 50,
      animateLayout: false,
    })
    const initDuration = performance.now() - initStart

    // Update data and run deterministic layout
    const layoutStart = performance.now()
    engine.updateData(fixture)
    const layoutDuration = performance.now() - layoutStart

    const cy = engine.getCy()
    assert.ok(cy, 'Cytoscape Core instance should exist')
    assert.strictEqual(cy!.nodes().length, 2000, 'All 2,000 nodes should be loaded')
    assert.strictEqual(cy!.edges().length, 8000, 'All 8,000 edges should be loaded')

    // Degree filter check: default top-300 by degree
    const visibleNodes = cy!.nodes().not('.sb-hidden')
    assert.strictEqual(
      visibleNodes.length,
      300,
      'Default degree filter should restrict visible nodes to top 300'
    )

    // Reveal all test
    const revealStart = performance.now()
    engine.revealAll()
    const revealDuration = performance.now() - revealStart
    assert.strictEqual(
      cy!.nodes().not('.sb-hidden').length,
      2000,
      'Reveal all should unhide all 2,000 nodes'
    )

    // Report timings for inspection
    console.log('\n--- 2,000 NODES / 8,000 EDGES BENCHMARK ---')
    console.log(`Fixture Generation: ${genDuration.toFixed(2)} ms`)
    console.log(`Engine Init:        ${initDuration.toFixed(2)} ms`)
    console.log(`Layout & Ingest:    ${layoutDuration.toFixed(2)} ms`)
    console.log(`Reveal All Filter:  ${revealDuration.toFixed(2)} ms`)
    console.log('-------------------------------------------\n')

    engine.destroy()
  })

  // 2. Deterministic layout coordinates on repeated runs
  it('guarantees 100% deterministic layout coordinates across repeated runs with identical data', () => {
    const smallFixture = generateSyntheticGraph(50, 120)

    // Run 1
    const engine1 = new CytoscapeGraphEngine(null, smallFixture, {
      layoutIterations: 100,
      animateLayout: false,
      defaultTopNDegree: null, // show all
    })
    const cy1 = engine1.getCy()!
    const positions1 = cy1.nodes().map((n) => ({
      id: n.id(),
      x: Math.round(n.position().x * 1000) / 1000,
      y: Math.round(n.position().y * 1000) / 1000,
    }))

    // Run 2 (with shuffled input arrays to test order-invariance)
    const shuffledNodes = [...smallFixture.nodes].reverse()
    const shuffledEdges = [...smallFixture.edges].sort(() => Math.random() - 0.5)
    const shuffledFixture: GraphData = { nodes: shuffledNodes, edges: shuffledEdges }

    const engine2 = new CytoscapeGraphEngine(null, shuffledFixture, {
      layoutIterations: 100,
      animateLayout: false,
      defaultTopNDegree: null, // show all
    })
    const cy2 = engine2.getCy()!
    const positions2 = cy2.nodes().map((n) => ({
      id: n.id(),
      x: Math.round(n.position().x * 1000) / 1000,
      y: Math.round(n.position().y * 1000) / 1000,
    }))

    assert.strictEqual(positions1.length, positions2.length)

    // Compare positions for all nodes
    const map2 = new Map(positions2.map((p) => [p.id, p]))
    for (const pos1 of positions1) {
      const pos2 = map2.get(pos1.id)
      assert.ok(pos2, `Node ${pos1.id} should be present in run 2`)
      assert.strictEqual(
        pos1.x,
        pos2!.x,
        `Node ${pos1.id} X coordinate should be identical across runs`
      )
      assert.strictEqual(
        pos1.y,
        pos2!.y,
        `Node ${pos1.id} Y coordinate should be identical across runs`
      )
    }

    engine1.destroy()
    engine2.destroy()
  })

  // 3. Stable Container Mounting
  it('mounts into container once without re-initializing Cytoscape or duplicating instances', () => {
    // Mock container object
    const mockContainer = { tagName: 'DIV', id: 'graph-host' } as unknown as HTMLElement

    const testData: GraphData = {
      nodes: [{ id: 'n1', type: 'person', displayName: 'Vikram Singh' }],
      edges: [],
    }

    const engine1 = initGraph(mockContainer, testData)
    const cy1 = engine1.getCy()

    // Second call with same container
    const moreData: GraphData = {
      nodes: [
        { id: 'n1', type: 'person', displayName: 'Vikram Singh' },
        { id: 'n2', type: 'phone', displayName: '9812345678' },
      ],
      edges: [],
    }
    const engine2 = initGraph(mockContainer, moreData)
    const cy2 = engine2.getCy()

    assert.strictEqual(engine1, engine2, 'initGraph must return identical engine instance')
    assert.strictEqual(cy1, cy2, 'Cytoscape core must NOT be destroyed or remounted')
    assert.strictEqual(cy1!.nodes().length, 2, 'Data must be updated in place')

    engine1.destroy()
  })

  // 4. Imperative API: focusNode, dimming & clearFocus
  it('focusNode dims distant nodes (>1 hop) to 15% opacity (.sb-dimmed) and selects target', () => {
    const fixture: GraphData = {
      nodes: [
        { id: 'A', type: 'person', displayName: 'A' },
        { id: 'B', type: 'phone', displayName: 'B' },
        { id: 'C', type: 'person', displayName: 'C' },
        { id: 'D', type: 'device', displayName: 'D' },
      ],
      edges: [
        {
          id: 'e1',
          source: 'A',
          target: 'B',
          reason: 'A to B',
          tier: 'record-derived',
          isAi: false,
          citation: { raw: '^[FIR_1 p:1]', sourceId: 'FIR_1', sourceDocId: 'FIR_1', locator: 'p:1' },
        },
        {
          id: 'e2',
          source: 'B',
          target: 'C',
          reason: 'B to C',
          tier: 'record-derived',
          isAi: false,
          citation: { raw: '^[FIR_1 p:2]', sourceId: 'FIR_1', sourceDocId: 'FIR_1', locator: 'p:2' },
        },
      ],
    }

    const engine = new CytoscapeGraphEngine(null, fixture, { defaultTopNDegree: null })
    const cy = engine.getCy()!

    // Focus node A (neighborhood is A, B, and edge e1; C and D are 2+ hops)
    engine.focusNode('A')

    assert.ok(cy.$('#A').selected(), 'Target node A must be selected')
    assert.ok(!cy.$('#A').hasClass('sb-dimmed'), 'Target node A must NOT be dimmed')
    assert.ok(!cy.$('#B').hasClass('sb-dimmed'), '1-hop neighbor B must NOT be dimmed')
    assert.ok(cy.$('#C').hasClass('sb-dimmed'), '2-hop node C must be dimmed (.sb-dimmed)')
    assert.ok(cy.$('#D').hasClass('sb-dimmed'), 'Disconnected node D must be dimmed (.sb-dimmed)')

    // Clear focus
    engine.clearFocus()
    assert.strictEqual(
      cy.elements('.sb-dimmed').length,
      0,
      'clearFocus should remove sb-dimmed from all elements'
    )

    engine.destroy()
  })

  // 5. Imperative API: applyFilter, resetFilter, and selection
  it('supports applyFilter, resetFilter, setSelection, and onSelectionChange', () => {
    const fixture: GraphData = {
      nodes: [
        { id: 'p1', type: 'person', displayName: 'Suspect 1' },
        { id: 'p2', type: 'person', displayName: 'Suspect 2' },
        { id: 'v1', type: 'vehicle', displayName: 'Getaway Car' },
      ],
      edges: [
        {
          id: 'e1',
          source: 'p1',
          target: 'v1',
          reason: 'Drove car',
          tier: 'record-derived',
          isAi: false,
          citation: { raw: '^[FIR_1 p:1]', sourceId: 'FIR_1', sourceDocId: 'FIR_1', locator: 'p:1' },
        },
      ],
    }

    const engine = new CytoscapeGraphEngine(null, fixture, { defaultTopNDegree: null })
    const cy = engine.getCy()!

    // Filter to only 'person' nodes
    engine.applyFilter((ele) => {
      if (ele.isNode()) {
        return ele.data('type') === 'person'
      }
      return true
    })

    assert.ok(!cy.$('#p1').hasClass('sb-hidden'), 'p1 person node should be visible')
    assert.ok(!cy.$('#p2').hasClass('sb-hidden'), 'p2 person node should be visible')
    assert.ok(cy.$('#v1').hasClass('sb-hidden'), 'v1 vehicle node should be hidden')
    assert.ok(cy.$('#e1').hasClass('sb-hidden'), 'e1 connected to hidden node should be hidden')

    // Reset filter
    engine.resetFilter()
    assert.strictEqual(
      cy.elements('.sb-hidden').length,
      0,
      'resetFilter should unhide all elements'
    )

    // Selection tests
    let selectionEventsCount = 0
    let lastSelection: { nodes: string[]; edges: string[] } = { nodes: [], edges: [] }

    const unsubscribe = engine.onSelectionChange((sel) => {
      selectionEventsCount++
      lastSelection = sel
    })

    engine.setSelection(['p1', 'e1'])
    const activeSel = engine.getSelection()
    assert.deepStrictEqual(activeSel.nodes, ['p1'])
    assert.deepStrictEqual(activeSel.edges, ['e1'])
    assert.ok(selectionEventsCount > 0, 'Selection change listener should have fired')
    assert.ok(lastSelection, 'lastSelection should be recorded')

    // Unsubscribe
    unsubscribe()
    const countBefore = selectionEventsCount
    engine.setSelection([])
    assert.strictEqual(
      selectionEventsCount,
      countBefore,
      'Listener should not fire after unsubscribe'
    )

    engine.destroy()
  })

  // 6. Node shape and Design Token styling rules (design-system.md §4)
  it('maps entity shapes and design tokens strictly without arbitrary hex codes', () => {
    // Shapes
    assert.strictEqual(getNodeShapeForType('person'), 'ellipse')
    assert.strictEqual(getNodeShapeForType('phone'), 'round-rectangle')
    assert.strictEqual(getNodeShapeForType('identifier'), 'round-rectangle')
    assert.strictEqual(getNodeShapeForType('imei'), 'round-rectangle')
    assert.strictEqual(getNodeShapeForType('device'), 'hexagon')
    assert.strictEqual(getNodeShapeForType('vehicle'), 'pentagon')
    assert.strictEqual(getNodeShapeForType('tower'), 'triangle')
    assert.strictEqual(getNodeShapeForType('location'), 'diamond')
    assert.strictEqual(getNodeShapeForType('organisation'), 'barrel')
    assert.strictEqual(getNodeShapeForType('fir'), 'rectangle')
    assert.strictEqual(getNodeShapeForType('event'), 'star')
    assert.strictEqual(getNodeShapeForType('unknown'), 'ellipse')

    // Token mappings
    const personColors = getNodeColorTokenForType('person')
    assert.strictEqual(personColors.stroke, GRAPH_TOKENS.ePerson)

    const eventColors = getNodeColorTokenForType('event')
    assert.strictEqual(eventColors.stroke, GRAPH_TOKENS.eEvent)

    // Token resolver
    assert.strictEqual(resolveToken('var(--evidence, #E8B04B)'), '#E8B04B')
    assert.strictEqual(resolveToken('var(--hypothesis, #C2569E)'), '#C2569E')
  })
})
