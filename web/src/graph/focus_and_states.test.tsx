/// <reference types="node" />
/**
 * SyndicateBrain (SIH26189) — Unit Tests for Graph Focus Mode & States (AKT-T05).
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
void React
import { renderToStaticMarkup } from 'react-dom/server'
import { register } from 'node:module'

// Register in-process CSS mock for node testing
register(
  'data:text/javascript,export async function load(url, c, next) { if (url.endsWith(".css")) return { format: "module", shortCircuit: true, source: "export default {}" }; return next(url, c); }',
  import.meta.url
)

const { CytoscapeGraphEngine } = await import('./engine.ts')
const { GraphPane } = await import('./GraphPane.tsx')
const { EdgeInspector } = await import('../inspector/EdgeInspector.tsx')

describe('AKT-T05: Graph Focus Mode & Engine Focus Controls', () => {
  const sampleData = {
    nodes: [
      { id: 'node_1', label: 'Vikram Singh', displayName: 'Vikram Singh', type: 'person' as const },
      { id: 'node_2', label: '9896011223', displayName: '9896011223', type: 'phone' as const },
      { id: 'node_3', label: 'Rehan Khan', displayName: 'Rehan Khan', type: 'person' as const },
      { id: 'node_4', label: 'Suresh Goel', displayName: 'Suresh Goel', type: 'person' as const },
    ],
    edges: [
      {
        id: 'edge_1',
        source: 'node_1',
        target: 'node_2',
        reason: 'Monitored call',
        citation: { raw: '^[DOC_CDR row:1]', sourceId: 'DOC_CDR', sourceDocId: 'DOC_CDR', locator: 'row:1' },
        isAi: false,
        tier: 'record-derived' as const,
      },
      {
        id: 'edge_2',
        source: 'node_2',
        target: 'node_3',
        reason: 'Owner link',
        citation: { raw: '^[DOC_FIR p:1 l:5]', sourceId: 'DOC_FIR', sourceDocId: 'DOC_FIR', locator: 'p:1 l:5' },
        isAi: false,
        tier: 'record-derived' as const,
      },
    ],
  }

  it('focusNode dims nodes and edges beyond 1 hop and sets isFocusActive to true', () => {
    const mockContainer = {
      clientWidth: 800,
      clientHeight: 600,
      offsetWidth: 800,
      offsetHeight: 600,
      querySelectorAll: () => [],
      querySelector: () => null,
      appendChild: () => {},
      removeChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as HTMLElement

    const engine = new CytoscapeGraphEngine(mockContainer, sampleData)

    assert.strictEqual(engine.isFocusActive(), false, 'Focus initially inactive')
    engine.focusNode('node_1')
    assert.strictEqual(engine.isFocusActive(), true, 'Focus active after focusNode')

    engine.clearFocus()
    assert.strictEqual(engine.isFocusActive(), false, 'Focus cleared after clearFocus')

    engine.destroy()
  })

  it('renders No Case Open empty state when caseId is null or undefined', () => {
    const html = renderToStaticMarkup(<GraphPane caseId={null} />)
    assert.ok(html.includes('No Case Open'), 'Displays No Case Open headline')
    assert.ok(html.includes('sb-empty-state'), 'Uses shared EmptyState component')
  })

  it('renders LoadingSkeleton when isLoading is true', () => {
    const html = renderToStaticMarkup(<GraphPane caseId="Case_01_Sonipat_Arms" isLoading={true} />)
    assert.ok(html.includes('sb-skeleton-graph'), 'Renders graph skeleton variant')
    assert.ok(!html.includes('spinner'), 'Zero spinners rule enforced')
  })

  it('renders ErrorState when error is passed, including failedFile badge', () => {
    const html = renderToStaticMarkup(
      <GraphPane
        caseId="Case_01_Sonipat_Arms"
        error="Invalid YAML syntax encountered"
        failedFile="01_People/Broken_Note.md"
      />
    )
    assert.ok(html.includes('Graph Parse Error'), 'Renders error title')
    assert.ok(html.includes('Broken_Note.md'), 'Names the file that broke it')
    assert.ok(html.includes('role="alert"'), 'Accessible alert attribute present')
  })

  it('renders No Links empty state when case has 0 edges', () => {
    const emptyData = {
      nodes: [{ id: 'n1', label: 'Solitary Person', displayName: 'Solitary Person', type: 'person' as const }],
      edges: [],
    }
    const html = renderToStaticMarkup(
      <GraphPane caseId="Case_01_Sonipat_Arms" data={emptyData} />
    )
    assert.ok(html.includes('No Links In Case'), 'Displays No Links headline')
    assert.ok(html.includes('sb-empty-state'), 'Uses shared EmptyState component')
  })

  it('EdgeInspector renders clickable locator chip button', () => {
    const mockEdge = {
      id: 'e1',
      source: 'Vikram Singh',
      target: 'Rehan Khan',
      reason: '14 calls observed prior to seizure',
      citation: {
        source_doc_id: 'DOC_CDR_9812345678',
        locator: 'row:48219',
        snippet: 'Matched line in CDR',
      },
      sourceDoc: {
        id: 'doc_cdr_1',
        filename: 'DOC_CDR_9812345678.csv',
        type: 'CDR',
      },
    }

    const html = renderToStaticMarkup(<EdgeInspector selectedEdge={mockEdge} />)
    assert.ok(html.includes('edge-inspector-locator-chip is-clickable'), 'Renders clickable locator chip')
    assert.ok(html.includes('row:48219'), 'Displays locator text')
    assert.ok(html.includes('Open in Source'), 'Renders action button')
  })
})
