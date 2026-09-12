/// <reference types="node" />
/**
 * Unit tests for SyndicateBrain Law 4 Citation Validator & Citation Chips (HER-T05).
 * Tests all requirements from:
 * - docs/BUILD_PROMPTS.md Step 30
 * - docs/CASE_MODEL.md §2 Law 4
 * - brain/agents/validator.py parity
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  splitIntoSentences,
  extractCitations,
  isSourceResolvable,
  sentenceHasCitation,
  validateText,
  validateParagraphs,
  CITATION_REGEX,
} from './validator.ts'
import {
  parseLocator,
  resolveCitationPath,
  openFileAt,
} from './navigation.ts'

describe('HER-T05: Law 4 Client-Side Citation Validator & Chips', () => {
  it('extracts single and multiple citations accurately', () => {
    assert.ok(new RegExp(CITATION_REGEX.source).test('^[DOC_FIR_0142 p:2 l:9]'))
    const text = 'Vikram Singh was sighted ^[DOC_FIR_0142 p:2 l:9] near Kharkhoda bypass ^[DOC_CDR_9812345678 row:48219].'
    const citations = extractCitations(text)

    assert.strictEqual(citations.length, 2)
    assert.strictEqual(citations[0].source_id, 'DOC_FIR_0142')
    assert.strictEqual(citations[0].locator, 'p:2 l:9')
    assert.strictEqual(citations[1].source_id, 'DOC_CDR_9812345678')
    assert.strictEqual(citations[1].locator, 'row:48219')
  })

  it('splits text into sentences preserving attached citations', () => {
    const input = `Vikram Singh coordinated arms consignment with Rehan Khan. ^[DOC_CDR_9812345678 row:48219]
This sentence is completely uncited and must be dropped by the validator.
Balwinder Singh procured munitions documented in Kharkhoda seizure FIR 0142/2026. ^[DOC_FIR_0142 p:3 l:14]
Another uncited claim about suspect operations here.`

    const sentences = splitIntoSentences(input)
    assert.strictEqual(sentences.length, 4)
    assert.match(sentences[0], /\^\[DOC_CDR_9812345678 row:48219\]/)
    assert.strictEqual(sentences[1], 'This sentence is completely uncited and must be dropped by the validator.')
    assert.match(sentences[2], /\^\[DOC_FIR_0142 p:3 l:14\]/)
    assert.strictEqual(sentences[3], 'Another uncited claim about suspect operations here.')
  })

  it('enforces Law 4: drops uncited sentences before render matching brain/agents/validator.py', () => {
    const sampleInput = `Vikram Singh coordinated arms consignment with Rehan Khan. ^[DOC_CDR_9812345678 row:48219]
This sentence is completely uncited and must be dropped by the validator.
Balwinder Singh procured munitions documented in Kharkhoda seizure FIR 0142/2026. ^[DOC_FIR_0142 p:3 l:14]
Another uncited claim about suspect operations here.`

    const result = validateText(sampleInput)

    assert.strictEqual(result.is_valid, false)
    assert.strictEqual(result.surviving_sentences.length, 2)
    assert.strictEqual(result.dropped_sentences.length, 2)
    assert.strictEqual(result.dropped_count, 2)

    // Verify surviving sentences contain citations
    assert.ok(result.surviving_sentences[0].includes('DOC_CDR_9812345678'))
    assert.ok(result.surviving_sentences[1].includes('DOC_FIR_0142'))

    // Verify dropped sentences
    assert.strictEqual(result.dropped_sentences[0], 'This sentence is completely uncited and must be dropped by the validator.')
    assert.strictEqual(result.dropped_sentences[1], 'Another uncited claim about suspect operations here.')

    // Verify combined surviving text
    assert.ok(!result.surviving_text.includes('completely uncited'))
    assert.ok(!result.surviving_text.includes('Another uncited claim'))
    assert.ok(result.surviving_text.includes('Vikram Singh coordinated arms consignment'))
    assert.ok(result.surviving_text.includes('Balwinder Singh procured munitions'))
  })

  it('resolves source identifiers with and without DOC_ prefix or matching path', () => {
    const validSources = new Set([
      '00_Raw_Inputs/FIR/FIR_0142_Kharkhoda.md',
      'DOC_CDR_9812345678',
      'TD_HR_SNP_0147',
    ])

    // Direct match
    assert.strictEqual(isSourceResolvable('DOC_CDR_9812345678', validSources), true)
    // Normalized without prefix
    assert.strictEqual(isSourceResolvable('CDR_9812345678', validSources), true)
    // Normalized with prefix
    assert.strictEqual(isSourceResolvable('DOC_TD_HR_SNP_0147', validSources), true)
    assert.strictEqual(isSourceResolvable('TD_HR_SNP_0147', validSources), true)
    // Path substring match
    assert.strictEqual(isSourceResolvable('DOC_FIR_0142', validSources), true)
    assert.strictEqual(isSourceResolvable('FIR_0142', validSources), true)

    // Unresolvable source
    assert.strictEqual(isSourceResolvable('DOC_NON_EXISTENT', validSources), false)
  })

  it('parses locators across CDR rows, document lines, and line ranges', () => {
    // 1. CDR row
    const cdr = parseLocator('row:48219')
    assert.strictEqual(cdr.line, 48219)
    assert.strictEqual(cdr.row, 48219)

    // 2. Document page and line
    const doc = parseLocator('p:2 l:9')
    assert.strictEqual(doc.line, 9)

    // 3. Line range
    const range = parseLocator('p:1 l:4-12')
    assert.strictEqual(range.line, 4)
    assert.deepStrictEqual(range.span, [4, 12])

    // 4. Standalone line range
    const range2 = parseLocator('l:14-25')
    assert.strictEqual(range2.line, 14)
    assert.deepStrictEqual(range2.span, [14, 25])

    // 5. Page only
    const page = parseLocator('p:3')
    assert.strictEqual(page.line, 3)
    assert.strictEqual(page.page, 3)
  })

  it('resolves citation paths to vault filepaths correctly', () => {
    const retrievedNotes = [
      '01_People/Vikram Singh.md',
      '00_Raw_Inputs/FIR/FIR_0142_2026_Kharkhoda.md',
      '00_Raw_Inputs/CDR/CDR_9812345678.md',
    ]

    // From retrieved notes
    assert.strictEqual(
      resolveCitationPath('DOC_FIR_0142', retrievedNotes),
      '00_Raw_Inputs/FIR/FIR_0142_2026_Kharkhoda.md'
    )
    assert.strictEqual(
      resolveCitationPath('DOC_CDR_9812345678', retrievedNotes),
      '00_Raw_Inputs/CDR/CDR_9812345678.md'
    )

    // Direct path
    assert.strictEqual(
      resolveCitationPath('01_People/Vikram Singh.md'),
      '01_People/Vikram Singh.md'
    )

    // Fallback prefix heuristic
    assert.strictEqual(
      resolveCitationPath('DOC_TD_HR_SNP_0147'),
      '00_Raw_Inputs/TowerDump/TD_HR_SNP_0147.md'
    )
  })

  it('openFileAt dispatches syndicate-brain:open-file-at and invokes window.openFileAt if defined', () => {
    let windowCalledWith: { path: string; line?: number; span?: [number, number] } | null = null
    let eventDetail: any = null

    // Mock window environment
    const originalWin = (globalThis as any).window
    const eventTarget = new EventTarget()

    const mockWindow = {
      openFileAt: (path: string, line?: number, span?: [number, number]) => {
        windowCalledWith = { path, line, span }
      },
      dispatchEvent: (event: CustomEvent) => {
        if (event.type === 'syndicate-brain:open-file-at') {
          eventDetail = event.detail
        }
        return eventTarget.dispatchEvent(event)
      },
    }

    ;(globalThis as any).window = mockWindow
    ;(globalThis as any).CustomEvent = class CustomEvent extends Event {
      detail: any
      constructor(type: string, opts?: any) {
        super(type, opts)
        this.detail = opts?.detail
      }
    }

    try {
      openFileAt('00_Raw_Inputs/FIR/FIR_0142_2026_Kharkhoda.md', 9, [9, 15])

      assert.deepStrictEqual(windowCalledWith, {
        path: '00_Raw_Inputs/FIR/FIR_0142_2026_Kharkhoda.md',
        line: 9,
        span: [9, 15],
      })
      assert.deepStrictEqual(eventDetail, {
        path: '00_Raw_Inputs/FIR/FIR_0142_2026_Kharkhoda.md',
        line: 9,
        span: [9, 15],
      })
    } finally {
      ;(globalThis as any).window = originalWin
    }
  })

  it('sentenceHasCitation detects both inline ^[source] and rendered chips', () => {
    assert.strictEqual(
      sentenceHasCitation('Claim with inline citation. ^[DOC_FIR_0142 p:2 l:9]'),
      true
    )
    assert.strictEqual(
      sentenceHasCitation('Claim with rendered chip <button class="copilot-citation-chip">§ DOC_FIR_0142</button>'),
      true
    )
    assert.strictEqual(
      sentenceHasCitation('Claim with no citation whatsoever.'),
      false
    )
  })

  it('validateParagraphs preserves markdown paragraphs with only cited sentences', () => {
    const input = `Paragraph 1 sentence 1. ^[DOC_001] Paragraph 1 sentence 2 uncited.

Paragraph 2 with only uncited sentence.

Paragraph 3 sentence 1. ^[DOC_002]`

    const result = validateParagraphs(input)
    const paras = result.split('\n\n')

    assert.strictEqual(paras.length, 2)
    assert.strictEqual(paras[0], 'Paragraph 1 sentence 1. ^[DOC_001]')
    assert.strictEqual(paras[1], 'Paragraph 3 sentence 1. ^[DOC_002]')
  })
})
