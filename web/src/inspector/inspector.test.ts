/// <reference types="node" />
/**
 * Tests for SyndicateBrain Edge Inspector (AKT-T04).
 *
 * Implements:
 * - docs/CASE_MODEL.md Law 2: Record-derived vs AI-proposed provenance
 * - docs/CASE_MODEL.md Law 3: Every link carries reason, locator, and raw source
 * - docs/design-system.md §5: Provenance inspector layout and zero hex codes
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  formatLocator,
  parseLocatorLine,
  inferDocType,
  normalizeEdge,
  KNOWN_DOC_SNIPPETS,
} from './types.ts'

describe('AKT-T04: Edge Inspector', () => {
  it('formats locators strictly to canonical shapes (p:3 l:11 or row:48219)', () => {
    // Documents
    assert.strictEqual(formatLocator('p:3 l:11'), 'p:3 l:11')
    assert.strictEqual(formatLocator('page:3 line:11'), 'p:3 l:11')
    assert.strictEqual(formatLocator('page 3, line 11'), 'p:3 l:11')
    assert.strictEqual(formatLocator('p:2 l:9'), 'p:2 l:9')
    assert.strictEqual(formatLocator('l:14'), 'p:1 l:14')

    // CDR / Tower
    assert.strictEqual(formatLocator('row:48219'), 'row:48219')
    assert.strictEqual(formatLocator('row: 48219'), 'row:48219')
    assert.strictEqual(formatLocator('rows 4182-4213'), 'row:4182')
    assert.strictEqual(formatLocator('row 1204'), 'row:1204')
  })

  it('parses numeric line / row index for source file navigation', () => {
    assert.strictEqual(parseLocatorLine('p:3 l:11'), 11)
    assert.strictEqual(parseLocatorLine('p:2 l:9'), 9)
    assert.strictEqual(parseLocatorLine('l:18'), 18)
    assert.strictEqual(parseLocatorLine('row:48219'), 48219)
    assert.strictEqual(parseLocatorLine('row:1204'), 1204)
    assert.strictEqual(parseLocatorLine(''), undefined)
  })

  it('infers document type badges correctly', () => {
    assert.strictEqual(inferDocType('DOC_FIR_0142'), 'FIR')
    assert.strictEqual(inferDocType('', 'FIR_0058_2026_Gohana.md'), 'FIR')
    assert.strictEqual(inferDocType('DOC_CDR_9812345678'), 'CDR')
    assert.strictEqual(inferDocType('', 'CDR_9812345678_Jan-Feb2026.csv'), 'CDR')
    assert.strictEqual(inferDocType('DOC_TD_HR_SNP_0147'), 'TowerDump')
    assert.strictEqual(inferDocType('', 'TowerDump_HR-SNP-0147_2026-02-12.csv'), 'TowerDump')
    assert.strictEqual(inferDocType('DOC_ST_001'), 'Statement')
    assert.strictEqual(inferDocType('', 'Statement_Amit_Malik.md'), 'Statement')
    assert.strictEqual(inferDocType('DOC_FL_004'), 'FieldLog')
    assert.strictEqual(inferDocType('unknown_doc'), 'Misc')
  })

  it('normalizes edge models with complete provenance data and Law 3 raw snippet guarantee', () => {
    const rawEdge = {
      id: 'edge_person_0031_Rehan_Khan_1',
      source: 'Vikram Singh',
      target: 'Rehan Khan',
      reason: '14 calls over 3 days before the seizure',
      citation: {
        source_doc_id: 'DOC_CDR_9812345678',
        locator: 'row:48219',
      },
      tier: 'record-derived',
      isAi: false,
    }

    const normalized = normalizeEdge(rawEdge)
    assert.ok(normalized)
    assert.strictEqual(normalized.source, 'Vikram Singh')
    assert.strictEqual(normalized.target, 'Rehan Khan')
    assert.strictEqual(normalized.reason, '14 calls over 3 days before the seizure')
    assert.strictEqual(normalized.citation?.locator, 'row:48219')
    assert.strictEqual(normalized.tier, 'record-derived')
    assert.strictEqual(normalized.isAi, false)
    assert.strictEqual(normalized.sourceDoc?.type, 'CDR')

    // Raw snippet and ±2 context lines must be populated
    assert.ok(normalized.rawSnippet)
    assert.ok(normalized.contextBefore && normalized.contextBefore.length > 0)
    assert.ok(normalized.contextAfter && normalized.contextAfter.length > 0)
  })

  it('normalizes AI-accepted proposals preserving acceptance metadata', () => {
    const rawAiProposal = {
      id: 'prop_0007',
      claim: 'Vikram Singh coordinated arms consignment with Rehan Khan',
      reason: '14 calls logged across 72 hours preceding Kharkhoda arms seizure',
      source_entity: 'Vikram Singh',
      target_entity: 'Rehan Khan',
      citation: {
        source_doc_id: 'DOC_FIR_0142',
        locator: 'p:2 l:9',
      },
      status: 'accepted',
      decided_at: '2026-02-19 14:35:00 IST',
      decided_by: 'Inspector Ramphal',
      isAi: true,
    }

    const normalized = normalizeEdge(rawAiProposal)
    assert.ok(normalized)
    assert.strictEqual(normalized.tier, 'ai-accepted')
    assert.strictEqual(normalized.isAi, true)
    assert.strictEqual(normalized.aiProposalId, 'prop_0007')
    assert.strictEqual(normalized.acceptedAt, '2026-02-19 14:35:00 IST')
    assert.strictEqual(normalized.acceptedBy, 'Inspector Ramphal')
    assert.strictEqual(normalized.sourceDoc?.type, 'FIR')
    assert.strictEqual(normalized.sourceDoc?.locked, true)
  })

  it('guarantees verbatim unparaphrased extracts for known case evidence (Law 3 & Devanagari test)', () => {
    const firDoc = KNOWN_DOC_SNIPPETS['FIR_0142']
    assert.ok(firDoc)
    assert.strictEqual(firDoc.type, 'FIR')
    // Raw Devanagari line from original police FIR
    assert.ok(firDoc.matchedLine.includes('गाड़ी की गहन तलाशी लेने पर'))
    assert.ok(firDoc.matchedLine.includes('4 देशी पिस्टल'))
    assert.strictEqual(firDoc.contextBefore.length, 2)
    assert.strictEqual(firDoc.contextAfter.length, 2)

    const cdrDoc = KNOWN_DOC_SNIPPETS['CDR_9812345678']
    assert.ok(cdrDoc)
    assert.strictEqual(cdrDoc.type, 'CDR')
    assert.ok(cdrDoc.matchedLine.includes('48219,9812345678,9896011223'))
    assert.strictEqual(cdrDoc.contextBefore.length, 2)
    assert.strictEqual(cdrDoc.contextAfter.length, 2)
  })

  it('enforces ZERO raw hex codes in inspector.css (100% design system tokens)', () => {
    const dir = import.meta.dirname
    const cssPath = path.resolve(dir, 'inspector.css')
    const cssContent = fs.readFileSync(cssPath, 'utf8')

    // Find any hex color (#fff, #123456, etc.)
    const hexRegex = /#[0-9a-fA-F]{3,8}\b/g
    const hexMatches = cssContent.match(hexRegex) || []

    assert.deepStrictEqual(
      hexMatches,
      [],
      `inspector.css must contain zero raw hex codes; found: ${hexMatches.join(', ')}`
    )

    // Ensure CSS variable usage
    assert.ok(cssContent.includes('var(--bg-base)'))
    assert.ok(cssContent.includes('var(--evidence)'))
    assert.ok(cssContent.includes('var(--hypothesis'))
    assert.ok(cssContent.includes('var(--font-mono)'))
  })

  it('verifies EdgeInspector component structure and index.ts exports', () => {
    const dir = import.meta.dirname
    const indexPath = path.resolve(dir, 'index.ts')
    const indexContent = fs.readFileSync(indexPath, 'utf8')
    assert.ok(indexContent.includes('export { EdgeInspector, EdgeInspector as default }'))
    assert.ok(indexContent.includes('formatLocator'))
    assert.ok(indexContent.includes('parseLocatorLine'))
    assert.ok(indexContent.includes('inferDocType'))
    assert.ok(indexContent.includes('normalizeEdge'))

    const componentPath = path.resolve(dir, 'EdgeInspector.tsx')
    const componentContent = fs.readFileSync(componentPath, 'utf8')
    assert.ok(componentContent.includes('Open in Source'))
    assert.ok(componentContent.includes('openFileAt'))
    assert.ok(componentContent.includes('syndicate-brain:edge-selected'))
    assert.ok(componentContent.includes('Select an edge or connection in the graph to inspect provenance and source citation'))
    assert.ok(componentContent.includes('edge-inspector-matched-span'))
    assert.ok(componentContent.includes('edge-inspector-tier-badge'))
  })
})
