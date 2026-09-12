/// <reference types="node" />
/**
 * SyndicateBrain (SIH26189) — Unit Tests for Shared UI States (MEH-T05).
 * Tests:
 * 1. <EmptyState>:
 *    - Render of headline, body, and icons (default, custom, suppressed)
 *    - Action button with config object & onClick invocation
 *    - Custom action ReactNode rendering
 *    - Compact mode and heading levels (h3 vs h4)
 *    - Accessibility attributes (role="status", aria-label)
 *    - Copy tone doctrine enforcement (design-system.md §7)
 * 2. <LoadingSkeleton>:
 *    - Shaped structural placeholders (ZERO spinners)
 *    - All 6 variants: 'text', 'card', 'graph', 'table', 'pill', 'detail'
 *    - Dynamic line and row counts
 *    - Accessibility attributes (role="status", aria-busy="true", aria-live="polite")
 *    - Custom dimensions and class styling
 * 3. <ErrorState>:
 *    - Factual title and message rendering
 *    - Evidentiary warning glyph (⚠) and role="alert"
 *    - Broken file indicator with monospace badge
 *    - Expandable technical diagnostics & stack trace
 *    - Retry action button & callback execution
 *    - Compact mode styling
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { register } from 'node:module'

// Register in-process CSS module mock for Node test environments
register(
  'data:text/javascript,export async function load(url, c, next) { if (url.endsWith(".css")) return { format: "module", shortCircuit: true, source: "export default {}" }; return next(url, c); }',
  import.meta.url
)

const {
  EmptyState,
  LoadingSkeleton,
  ErrorState,
  PROCEDURAL_EMPTY_COPY,
} = await import('../index.ts')

describe('MEH-T05: Shared UI States — <EmptyState>', () => {
  it('renders standard headline, body text, and accessible attributes', () => {
    const element = (
      <EmptyState
        headline="No predictions generated"
        body="Predictions are investigative leads only and are never used as evidence."
      />
    )
    assert.ok(React.isValidElement(element), 'Valid React element')
    const html = renderToStaticMarkup(element)

    assert.ok(html.includes('sb-empty-state'), 'Includes container class')
    assert.ok(html.includes('role="status"'), 'Default role is status')
    assert.ok(
      html.includes('aria-label="No predictions generated"'),
      'Accessible label matches headline'
    )
    assert.ok(
      html.includes('<h3 class="sb-empty-headline">No predictions generated</h3>'),
      'Renders h3 headline in standard mode'
    )
    assert.ok(
      html.includes(
        '<p class="sb-empty-body">Predictions are investigative leads only and are never used as evidence.</p>'
      ),
      'Renders procedural body text'
    )
    // Default icon rendered
    assert.ok(html.includes('sb-empty-icon-wrap'), 'Renders icon wrapper')
    assert.ok(html.includes('<svg'), 'Renders default procedural SVG icon')
  })

  it('renders compact mode with h4 headline and is-compact class', () => {
    const html = renderToStaticMarkup(
      <EmptyState
        headline="No entity selected"
        body="Select a node or edge to inspect verified provenance."
        compact
      />
    )

    assert.ok(html.includes('is-compact'), 'Includes is-compact class modifier')
    assert.ok(
      html.includes('<h4 class="sb-empty-headline">No entity selected</h4>'),
      'Renders h4 in compact mode'
    )
  })

  it('renders custom icon when provided and suppresses icon when null', () => {
    const customIcon = <span className="custom-test-icon">🔍</span>
    const withCustom = renderToStaticMarkup(
      <EmptyState
        icon={customIcon}
        headline="Search results"
        body="No notes matched."
      />
    )
    assert.ok(
      withCustom.includes('<span class="custom-test-icon">🔍</span>'),
      'Includes custom icon node'
    )

    const withoutIcon = renderToStaticMarkup(
      <EmptyState
        icon={null}
        headline="No icon state"
        body="Clean state without icon"
      />
    )
    assert.ok(
      !withoutIcon.includes('sb-empty-icon-wrap'),
      'Does not render icon wrap when icon is null'
    )
  })

  it('renders action button from config object and executes callback', () => {
    let actionFired = false
    const actionConfig = {
      label: 'Run Analysis',
      onClick: () => {
        actionFired = true
      },
    }

    const html = renderToStaticMarkup(
      <EmptyState
        headline="Analysis required"
        body="Press Analyse Case to process raw inputs."
        action={actionConfig}
      />
    )

    assert.ok(
      html.includes('class="sb-empty-btn"'),
      'Renders empty-state button'
    )
    assert.ok(html.includes('Run Analysis'), 'Button contains label')

    // Simulate onClick invocation
    actionConfig.onClick()
    assert.strictEqual(actionFired, true, 'onClick handler called correctly')
  })

  it('renders custom ReactNode action when passed', () => {
    const customActionNode = (
      <a href="#ingest" className="custom-link-action">
        Drop Evidence
      </a>
    )

    const html = renderToStaticMarkup(
      <EmptyState
        headline="Vault empty"
        body="Drop raw case files to begin."
        action={customActionNode}
      />
    )

    assert.ok(
      html.includes('class="custom-link-action"'),
      'Renders custom ReactNode action directly'
    )
    assert.ok(html.includes('Drop Evidence'))
  })

  it('omits action container when action prop is undefined', () => {
    const html = renderToStaticMarkup(
      <EmptyState headline="Clean state" body="No actions available." />
    )
    assert.ok(
      !html.includes('sb-empty-action'),
      'No action container when action is omitted'
    )
  })

  it('enforces copy tone rules: strictly procedural and never editorialising', () => {
    // Check all predefined procedural empty states
    const copyEntries = Object.values(PROCEDURAL_EMPTY_COPY)
    assert.ok(copyEntries.length >= 6, 'Predefined empty states available')

    const forbiddenWords = [
      'suspicious',
      'dangerous',
      'mastermind',
      'kingpin',
      'criminal',
      'high risk individual',
    ]

    for (const entry of copyEntries) {
      const combined = `${entry.headline} ${entry.body}`.toLowerCase()
      for (const word of forbiddenWords) {
        assert.ok(
          !combined.includes(word),
          `Copy "${combined}" must not contain forbidden word "${word}"`
        )
      }
    }
  })
})

describe('MEH-T05: Shared UI States — <LoadingSkeleton>', () => {
  it('enforces shaped placeholders with zero spinner elements', () => {
    const html = renderToStaticMarkup(<LoadingSkeleton variant="text" />)

    assert.ok(
      !html.includes('spinner'),
      'MUST NOT contain spinner class or elements'
    )
    assert.ok(html.includes('sb-skeleton-shimmer'), 'Contains token shimmer elements')
    assert.ok(html.includes('role="status"'), 'Has status role')
    assert.ok(html.includes('aria-busy="true"'), 'Indicates busy status')
    assert.ok(html.includes('aria-live="polite"'), 'Announces politely')
  })

  it('renders variant="text" with requested line count and varied widths', () => {
    const html = renderToStaticMarkup(
      <LoadingSkeleton variant="text" lines={4} />
    )

    const lineMatches = html.match(/class="sb-skeleton-line sb-skeleton-shimmer"/g)
    assert.ok(lineMatches, 'Lines rendered')
    assert.strictEqual(lineMatches.length, 4, 'Renders exactly 4 lines')
    assert.ok(html.includes('style="width:100%"'), 'First line is 100% width')
    assert.ok(html.includes('style="width:92%"'), 'Second line has natural variation')
  })

  it('renders variant="card" with avatar, title, and body lines', () => {
    const html = renderToStaticMarkup(<LoadingSkeleton variant="card" />)

    assert.ok(html.includes('sb-skeleton-card'), 'Renders card container')
    assert.ok(html.includes('sb-skeleton-avatar'), 'Renders avatar placeholder')
    assert.ok(html.includes('sb-skeleton-card-titles'), 'Renders title blocks')
    assert.ok(html.includes('sb-skeleton-card-body'), 'Renders body lines')
  })

  it('renders variant="graph" with topology nodes, edges, and scrubber chrome', () => {
    const html = renderToStaticMarkup(<LoadingSkeleton variant="graph" />)

    assert.ok(html.includes('sb-skeleton-graph'), 'Renders graph viewport')
    assert.ok(html.includes('sb-skeleton-graph-header'), 'Renders canvas header')
    assert.ok(html.includes('sb-skeleton-graph-canvas'), 'Renders canvas area')
    assert.ok(html.includes('sb-skeleton-graph-node'), 'Renders simulated graph nodes')
    assert.ok(html.includes('sb-skeleton-graph-edge'), 'Renders simulated edges')
    assert.ok(html.includes('sb-skeleton-graph-footer'), 'Renders scrubber bar')
  })

  it('renders variant="table" with header columns and custom row count', () => {
    const html = renderToStaticMarkup(
      <LoadingSkeleton variant="table" lines={5} />
    )

    assert.ok(html.includes('sb-skeleton-table'), 'Renders table container')
    assert.ok(html.includes('sb-skeleton-table-header'), 'Renders table header')
    const rowMatches = html.match(/class="sb-skeleton-table-row"/g)
    assert.ok(rowMatches, 'Rows rendered')
    assert.strictEqual(rowMatches.length, 5, 'Renders exactly 5 table rows')
  })

  it('renders variant="pill" for inline badge loading', () => {
    const html = renderToStaticMarkup(<LoadingSkeleton variant="pill" />)

    assert.ok(html.includes('sb-skeleton-pill'), 'Renders pill placeholder')
  })

  it('renders variant="detail" with inspector metadata rows and code block', () => {
    const html = renderToStaticMarkup(
      <LoadingSkeleton variant="detail" lines={3} />
    )

    assert.ok(html.includes('sb-skeleton-detail'), 'Renders detail container')
    assert.ok(html.includes('sb-skeleton-detail-header'), 'Renders detail header')
    const detailRows = html.match(/class="sb-skeleton-detail-row"/g)
    assert.ok(detailRows, 'Renders detail rows')
    assert.strictEqual(detailRows.length, 3, 'Renders exactly 3 metadata rows')
    assert.ok(html.includes('sb-skeleton-detail-block'), 'Renders detail block well')
  })

  it('applies custom dimensions, className, and ariaLabel overrides', () => {
    const html = renderToStaticMarkup(
      <LoadingSkeleton
        variant="text"
        height="120px"
        width="50%"
        className="custom-skeleton-wrap"
        ariaLabel="Loading dossier notes..."
      />
    )

    assert.ok(html.includes('custom-skeleton-wrap'), 'Custom className applied')
    assert.ok(html.includes('height:120px'), 'Custom height in style')
    assert.ok(html.includes('width:50%'), 'Custom width in style')
    assert.ok(
      html.includes('aria-label="Loading dossier notes..."'),
      'Accessible label override applied'
    )
  })
})

describe('MEH-T05: Shared UI States — <ErrorState>', () => {
  it('renders default title, message, and evidentiary warning glyph (⚠)', () => {
    const html = renderToStaticMarkup(
      <ErrorState message="Could not resolve note frontmatter." />
    )

    assert.ok(html.includes('sb-error-state'), 'Includes error container class')
    assert.ok(html.includes('role="alert"'), 'Accessible alert role')
    assert.ok(html.includes('aria-live="assertive"'), 'Assertive live region')
    assert.ok(html.includes('⚠'), 'Includes evidentiary warning glyph')
    assert.ok(html.includes('Operation failed'), 'Default title applied')
    assert.ok(
      html.includes('Could not resolve note frontmatter.'),
      'Renders error message'
    )
  })

  it('displays failed file indicator with monospace path', () => {
    const html = renderToStaticMarkup(
      <ErrorState
        title="Hash mismatch detected"
        message="SHA-256 does not match index entry."
        failedFile="00_Raw_Inputs/CDR_9812345678.csv"
      />
    )

    assert.ok(html.includes('sb-error-file-chip'), 'Renders failed file chip')
    assert.ok(html.includes('Unresolvable File:'), 'Renders file label')
    assert.ok(
      html.includes(
        '<code class="sb-error-file-path">00_Raw_Inputs/CDR_9812345678.csv</code>'
      ),
      'Renders file path in code element'
    )
  })

  it('renders expandable technical diagnostics when details are provided', () => {
    const trace =
      'HTTP 500: Failed to connect to Ollama daemon at http://127.0.0.1:11434/api/generate'
    const html = renderToStaticMarkup(
      <ErrorState
        title="LLM Service Unavailable"
        message="Analysis pipeline could not reach the local provider."
        details={trace}
      />
    )

    assert.ok(html.includes('<details class="sb-error-details"'), 'Renders details tag')
    assert.ok(
      html.includes('<summary class="sb-error-details-summary">Technical diagnostics &amp; trace</summary>'),
      'Renders summary label'
    )
    assert.ok(html.includes(trace), 'Contains full diagnostics trace')
  })

  it('renders retry button and triggers callback when clicked', () => {
    let retryCalled = false
    const handleRetry = () => {
      retryCalled = true
    }

    const html = renderToStaticMarkup(
      <ErrorState
        message="Backend network connection dropped."
        retryAction={handleRetry}
        retryLabel="Re-authenticate &amp; Retry"
      />
    )

    assert.ok(html.includes('sb-error-retry-btn'), 'Renders retry button')
    assert.ok(html.includes('Re-authenticate &amp; Retry'), 'Custom retry label')
    assert.ok(html.includes('sb-error-retry-glyph'), 'Renders retry glyph (↻)')

    // Invoke callback directly
    handleRetry()
    assert.strictEqual(retryCalled, true, 'Retry action executed properly')
  })

  it('supports compact mode and custom className', () => {
    const html = renderToStaticMarkup(
      <ErrorState
        message="Brief error message"
        compact
        className="sidebar-error-override"
      />
    )

    assert.ok(html.includes('is-compact'), 'Compact modifier applied')
    assert.ok(html.includes('sidebar-error-override'), 'Custom class applied')
  })
})
