/// <reference types="node" />
/**
 * Tests for SyndicateBrain graph edge classes and leads toggle (AKT-T03).
 *
 * Implements:
 * - CASE_MODEL.md §2 Law 2: Record-derived vs AI-proposed edges.
 * - design-system.md §4: Edge styles and tokens.
 * - Leads layer toggle functionality.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  GRAPH_TOKENS,
  createGraphStylesheet,
  getEdgeStyle,
  getNodeShapeForType,
  getNodeColorTokenForType,
} from './styles.ts'
import { CytoscapeGraphEngine } from './engine.ts'
import type { GraphData } from './types.ts'

describe('AKT-T03: Edge Classes and Leads Toggle', () => {
  it('strictly maps record-derived and AI-proposed edge styles', () => {
    const recordDerivedStyle = getEdgeStyle({ isAi: false })
    assert.strictEqual(recordDerivedStyle.lineStyle, 'solid')
    assert.strictEqual(recordDerivedStyle.color, GRAPH_TOKENS.evidence)
    assert.strictEqual(recordDerivedStyle.width, 1.5)

    const aiProposedStyle = getEdgeStyle({ isAi: true })
    assert.strictEqual(aiProposedStyle.lineStyle, 'dashed')
    assert.strictEqual(aiProposedStyle.color, GRAPH_TOKENS.hypothesis)
    assert.strictEqual(aiProposedStyle.width, 1.5)

    const multiSourceStyle = getEdgeStyle({ isAi: false, isMultiSource: true })
    assert.strictEqual(multiSourceStyle.lineStyle, 'solid')
    assert.strictEqual(multiSourceStyle.width, 2.5)

    const contradictionStyle = getEdgeStyle({ isContradiction: true })
    assert.strictEqual(contradictionStyle.color, GRAPH_TOKENS.danger)
  })

  it('verifies all tokens reference CSS variables with zero arbitrary hex values', () => {
    for (const [key, value] of Object.entries(GRAPH_TOKENS)) {
      assert.ok(
        value.startsWith('var(--'),
        `Token ${key} should reference a CSS variable (got ${value})`
      )
    }
  })

  it('verifies stylesheet contains selectors for record-derived and AI-proposed edges', () => {
    const sheet = createGraphStylesheet()
    assert.ok(Array.isArray(sheet))
    const selectors = sheet.map((rule) => (rule as { selector?: string }).selector).filter(Boolean)
    
    const hasAiEdge = selectors.some((s) => s && s.includes('edge.ai-proposed'))
    const hasRecordEdge = selectors.some((s) => s && s.includes('edge.record-derived'))
    const hasDimmed = selectors.some((s) => s && s.includes('.sb-dimmed'))
    const hasHidden = selectors.some((s) => s && s.includes('.sb-hidden'))

    assert.ok(hasAiEdge, 'Stylesheet should define AI-proposed edge style')
    assert.ok(hasRecordEdge, 'Stylesheet should define record-derived edge style')
    assert.ok(hasDimmed, 'Stylesheet should define dimmed state (15% opacity)')
    assert.ok(hasHidden, 'Stylesheet should define hidden state')
  })

  it('verifies Leads layer toggle hides and shows AI-proposed edges', () => {
    const testData: GraphData = {
      nodes: [
        { id: 'node_1', type: 'person', displayName: 'Suspect 1' },
        { id: 'node_2', type: 'person', displayName: 'Suspect 2' },
        { id: 'node_3', type: 'identifier', displayName: '9812345678' },
      ],
      edges: [
        {
          id: 'edge_record',
          source: 'node_1',
          target: 'node_2',
          reason: 'FIR record link',
          isAi: false,
          tier: 'record-derived',
          citation: { raw: '^[FIR_1 p:1]', sourceId: 'FIR_1', sourceDocId: 'FIR_1', locator: 'p:1' },
        },
        {
          id: 'edge_ai',
          source: 'node_2',
          target: 'node_3',
          reason: 'AI-proposed lead',
          isAi: true,
          aiProposalId: 'prop_001',
          tier: 'ai-proposed',
          citation: { raw: '^[CDR_1 row:10]', sourceId: 'CDR_1', sourceDocId: 'CDR_1', locator: 'row:10' },
        },
      ],
    }

    const engine = new CytoscapeGraphEngine(null, testData, { defaultTopNDegree: null })
    const cy = engine.getUnderlyingCore()
    assert.ok(cy)

    // Initially leadsVisible is true
    assert.strictEqual(engine.isLeadsVisible(), true)
    const aiEdge = cy.$('#edge_ai')
    const recordEdge = cy.$('#edge_record')
    assert.strictEqual(aiEdge.hasClass('sb-hidden'), false)
    assert.strictEqual(recordEdge.hasClass('sb-hidden'), false)

    // Toggle leads OFF
    engine.setLeadsVisible(false)
    assert.strictEqual(engine.isLeadsVisible(), false)
    assert.strictEqual(aiEdge.hasClass('sb-hidden'), true, 'AI edge should be hidden when leads toggled off')
    assert.strictEqual(recordEdge.hasClass('sb-hidden'), false, 'Record edge must remain visible')

    // Toggle leads ON
    engine.setLeadsVisible(true)
    assert.strictEqual(engine.isLeadsVisible(), true)
    assert.strictEqual(aiEdge.hasClass('sb-hidden'), false, 'AI edge should be revealed when leads toggled on')
    assert.strictEqual(recordEdge.hasClass('sb-hidden'), false)

    engine.destroy()
  })

  it('correctly maps entity types to shapes and colors per design-system.md §4', () => {
    assert.strictEqual(getNodeShapeForType('person'), 'ellipse')
    assert.strictEqual(getNodeShapeForType('phone'), 'round-rectangle')
    assert.strictEqual(getNodeShapeForType('device'), 'hexagon')
    assert.strictEqual(getNodeShapeForType('vehicle'), 'pentagon')
    assert.strictEqual(getNodeShapeForType('tower'), 'triangle')
    assert.strictEqual(getNodeShapeForType('location'), 'diamond')
    assert.strictEqual(getNodeShapeForType('event'), 'star')

    assert.strictEqual(getNodeColorTokenForType('person').stroke, GRAPH_TOKENS.ePerson)
    assert.strictEqual(getNodeColorTokenForType('vehicle').stroke, GRAPH_TOKENS.eVehicle)
  })
})
