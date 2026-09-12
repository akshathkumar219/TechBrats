/// <reference types="node" />
/**
 * Unit tests for SyndicateBrain vault-to-graph parser (web/src/graph/parse.ts).
 * Tests all requirements from docs/CASE_MODEL.md §4 and AKT-T01.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseGraph,
  parseVault,
  parseNote,
  parseLinkLine,
  parseFrontmatterBlock,
  type NoteInput,
} from './parse.ts'

describe('AKT-T01: Vault to Graph Parser', () => {
  // 1. Well-formed note with record-derived link and citation
  it('parses well-formed note with record-derived link and citation', () => {
    const rawNote = `---
id: person_0031
type: person
role: accused
names: [Vikram Singh, "विक्रम सिंह", V. Singh]
identifiers: [9812345678, 869123456789012]
case: Case_01_Sonipat_Arms
created: 2026-02-14
updated: 2026-02-19
---

# Vikram Singh

Named as accused in FIR 0142/2026, Kharkhoda. ^[FIR_0142 p:2 l:9]

## Links
- [[9812345678]] — registered to him ^[FIR_0142 p:2 l:11]
`

    const identifierNote = `---
id: phone_9812345678
type: identifier
identifiers: [9812345678]
---
# 9812345678
`

    const notes: NoteInput[] = [
      { path: '01_People/Vikram Singh.md', content: rawNote },
      { path: '02_Identifiers/9812345678.md', content: identifierNote },
    ]
    const graph = parseGraph(notes)

    // Node verification
    assert.strictEqual(graph.nodes.length, 2)
    const personNode = graph.nodes.find((n) => n.id === 'person_0031')
    assert.ok(personNode, 'Person node should exist')
    assert.strictEqual(personNode!.type, 'person')
    assert.strictEqual(personNode!.role, 'accused')
    assert.strictEqual(personNode!.displayName, 'Vikram Singh')
    assert.strictEqual(personNode!.filePath, '01_People/Vikram Singh.md')
    assert.strictEqual(personNode!.isUnresolved, false)
    assert.deepStrictEqual(personNode!.names, ['Vikram Singh', 'विक्रम सिंह', 'V. Singh'])
    assert.deepStrictEqual(personNode!.identifiers, ['9812345678', '869123456789012'])

    // Edge verification
    assert.strictEqual(graph.edges.length, 1)
    const edge = graph.edges[0]
    assert.strictEqual(edge.source, 'person_0031')
    assert.strictEqual(edge.target, 'phone_9812345678')
    assert.strictEqual(edge.reason, 'registered to him')
    assert.strictEqual(edge.isAi, false)
    assert.strictEqual(edge.aiProposalId, undefined)
    assert.strictEqual(edge.tier, 'record-derived')

    // Citation verification
    assert.strictEqual(edge.citation.sourceId, 'FIR_0142')
    assert.strictEqual(edge.citation.sourceDocId, 'FIR_0142')
    assert.strictEqual(edge.citation.locator, 'p:2 l:11')
    assert.strictEqual(edge.citation.raw, '^[FIR_0142 p:2 l:11]')
  })

  // 2. AI-marked accepted link
  it('parses AI-marked accepted link with proposal ID and ai-proposed tier', () => {
    const rawNote = `---
id: person_0031
type: person
role: accused
---
# Vikram Singh

## Links
- [[Rehan Khan]] — 14 calls over 3 days before the seizure ^[CDR_9812345678 row:48219] <!-- ai:prop_0007 accepted -->
`

    const targetNote = `---
id: person_0045
type: person
role: accused
---
# Rehan Khan
`

    const graph = parseGraph([
      { path: '01_People/Vikram Singh.md', content: rawNote },
      { path: '01_People/Rehan Khan.md', content: targetNote },
    ])

    assert.strictEqual(graph.edges.length, 1)
    const edge = graph.edges[0]
    assert.strictEqual(edge.source, 'person_0031')
    assert.strictEqual(edge.target, 'person_0045')
    assert.strictEqual(edge.reason, '14 calls over 3 days before the seizure')
    assert.strictEqual(edge.isAi, true)
    assert.strictEqual(edge.aiProposalId, 'prop_0007')
    assert.strictEqual(edge.tier, 'ai-proposed')
    assert.strictEqual(edge.citation.sourceId, 'CDR_9812345678')
    assert.strictEqual(edge.citation.locator, 'row:48219')
  })

  // 3. Law 3 enforcement: Edge dropped when citation is missing
  it('LAW 3 ENFORCEMENT: drops edge and logs warning when citation is missing', () => {
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (msg: string) => {
      warnings.push(msg)
    }

    try {
      const rawNote = `---
id: person_0031
type: person
---
# Vikram Singh

## Links
- [[Rehan Khan]] — met at Kharkhoda bypass
- [[Balwinder Singh]] — supplier ^[DOC_FIR_0142 p:2 l:12]
- [[Uncited Target]] ^[]
`
      const targetNote = `---
id: person_0045
type: person
---
# Rehan Khan
`

      const graph = parseGraph([
        { path: '01_People/Vikram Singh.md', content: rawNote },
        { path: '01_People/Rehan Khan.md', content: targetNote },
      ])

      // Only the cited edge to Balwinder Singh should be rendered
      assert.strictEqual(graph.edges.length, 1)
      assert.strictEqual(graph.edges[0].source, 'person_0031')
      assert.strictEqual(graph.edges[0].target, 'Balwinder Singh')
      assert.strictEqual(graph.edges[0].reason, 'supplier')

      // Warnings should have been logged for the uncited links
      assert.ok(warnings.length >= 2, 'Should have logged warnings for dropped links')
      assert.ok(warnings.some((w) => w.includes('met at Kharkhoda bypass')))
      assert.ok(warnings.some((w) => w.includes('Uncited Target')))

      // Uncited target without a valid edge should NOT produce an unresolved node
      const uncitedNode = graph.nodes.find((n) => n.id === 'Uncited Target')
      assert.strictEqual(uncitedNode, undefined, 'Uncited dropped link should not create unresolved node')
    } finally {
      console.warn = originalWarn
    }
  })

  // 4. Unresolved wiki-link target becomes unresolved node
  it('creates an unresolved node with isUnresolved: true when link target does not exist in vault', () => {
    const noteContent = `---
id: fir_0142_2026
type: event
role: complainant
---
# FIR 0142/2026

## Links
- [[Balwinder Singh]] — supplier of seized munitions from Rohtak ^[DOC_FIR_0142 p:2 l:12]
- [[Balwinder Singh]] — second reference ^[DOC_FIR_0142 p:2 l:15]
`

    const graph = parseGraph([
      { path: '06_Events/FIR 0142.md', content: noteContent },
    ])

    // Should create FIR node + ONE unresolved node for Balwinder Singh
    assert.strictEqual(graph.nodes.length, 2)
    const firNode = graph.nodes.find((n) => n.id === 'fir_0142_2026')
    assert.ok(firNode)
    assert.strictEqual(firNode!.isUnresolved, false)

    const unresolvedNode = graph.nodes.find((n) => n.id === 'Balwinder Singh')
    assert.ok(unresolvedNode, 'Unresolved node should be created')
    assert.strictEqual(unresolvedNode!.isUnresolved, true)
    assert.strictEqual(unresolvedNode!.displayName, 'Balwinder Singh')
    assert.strictEqual(unresolvedNode!.type, 'unknown')
    assert.strictEqual(unresolvedNode!.filePath, undefined)

    // Both edges should point to the unresolved node
    assert.strictEqual(graph.edges.length, 2)
    assert.strictEqual(graph.edges[0].target, 'Balwinder Singh')
    assert.strictEqual(graph.edges[1].target, 'Balwinder Singh')
  })

  // 5. Malformed frontmatter handling
  it('handles malformed frontmatter gracefully without throwing', () => {
    // Note A: Missing closing delimiter ---
    const unclosedFmNote = `---
id: unclosed_note
type: person
role: witness
some broken line without colon
# Title From Heading

## Links
- [[Target 1]] — witnessed meeting ^[STMT_001 p:1 l:4]
`

    // Note B: Corrupt YAML syntax
    const corruptYamlNote = `---
id: corrupt_note
type: vehicle
[invalid: yaml [unbalanced
role: : : :
---
# Scorpio HR26

## Links
- [[Target 1]] — observed near scene ^[LOG_002 p:3 l:8]
`

    // Note C: No frontmatter at all
    const noFmNote = `# Plain Markdown Note

Just a note with no YAML frontmatter.

## Links
- [[Target 1]] — mentioned in statement ^[FIR_0142 p:1 l:2]
`

    // Note D: Empty content
    const emptyNote = ``

    const graph = parseGraph([
      { path: '01_People/Unclosed.md', content: unclosedFmNote },
      { path: '03_Vehicles/Corrupt.md', content: corruptYamlNote },
      { path: '04_Locations/Plain Note.md', content: noFmNote },
      { path: '05_Organisations/Empty.md', content: emptyNote },
    ])

    // Should not crash and should parse valid nodes and fallback IDs
    assert.ok(graph.nodes.length >= 4)

    const unclosedNode = graph.nodes.find((n) => n.id === 'unclosed_note')
    assert.ok(unclosedNode)
    assert.strictEqual(unclosedNode!.type, 'person')
    assert.strictEqual(unclosedNode!.role, 'witness')

    const corruptNode = graph.nodes.find((n) => n.id === 'corrupt_note')
    assert.ok(corruptNode)
    assert.strictEqual(corruptNode!.type, 'vehicle')
    assert.strictEqual(corruptNode!.displayName, 'Scorpio HR26')

    const plainNode = graph.nodes.find((n) => n.id === 'Plain Note')
    assert.ok(plainNode)
    assert.strictEqual(plainNode!.displayName, 'Plain Markdown Note')
    assert.strictEqual(plainNode!.type, 'location') // inferred from 04_Locations

    const emptyNodeObj = graph.nodes.find((n) => n.id === 'Empty')
    assert.ok(emptyNodeObj)
    assert.strictEqual(emptyNodeObj!.type, 'organisation') // inferred from 05_Organisations

    // Edges from malformed notes should still resolve
    assert.strictEqual(graph.edges.length, 3)
    for (const edge of graph.edges) {
      assert.strictEqual(edge.target, 'Target 1')
    }

    // Single unresolved node for Target 1
    const target1Node = graph.nodes.find((n) => n.id === 'Target 1')
    assert.ok(target1Node)
    assert.strictEqual(target1Node!.isUnresolved, true)
  })

  // 6. Record input format support: Record<string, string>
  it('supports Record<string, string> as input', () => {
    const input: Record<string, string> = {
      '01_People/Vikram Singh.md': `---
id: person_0031
type: person
---
# Vikram Singh
## Links
- [[Rehan Khan]] — associate ^[FIR_0142 p:1 l:5]
`,
      '01_People/Rehan Khan.md': `---
id: person_0045
type: person
---
# Rehan Khan
`,
    }

    const graph = parseVault(input)
    assert.strictEqual(graph.nodes.length, 2)
    assert.strictEqual(graph.edges.length, 1)
    assert.strictEqual(graph.edges[0].source, 'person_0031')
    assert.strictEqual(graph.edges[0].target, 'person_0045')
  })

  // 7. Wiki-link aliases: [[Target|Alias]]
  it('resolves wiki-links with display aliases [[Target|Alias]]', () => {
    const rawNote = `---
id: person_0031
type: person
---
# Vikram Singh
## Links
- [[Rehan Khan|Vicky]] — alias link test ^[DOC_001 p:1 l:1]
`
    const targetNote = `---
id: person_0045
type: person
---
# Rehan Khan
`

    const graph = parseGraph([
      { path: '01_People/Vikram Singh.md', content: rawNote },
      { path: '01_People/Rehan Khan.md', content: targetNote },
    ])

    assert.strictEqual(graph.edges.length, 1)
    assert.strictEqual(graph.edges[0].target, 'person_0045')
  })

  // 8. Robust citation locators (multi-page/range, CDR rows, etc.)
  it('parses complex locators for document ranges and CDR row spans', () => {
    const note = `---
id: fir_0142
type: event
---
# FIR 0142
## Links
- [[Target 1]] — range locator test ^[DOC_FIR_0142 p:1 l:1-p:2 l:24]
- [[Target 2]] — multi-row CDR test ^[CDR_9812345678.csv rows:4182-4213]
`
    const graph = parseGraph([{ path: '06_Events/FIR.md', content: note }])
    assert.strictEqual(graph.edges.length, 2)

    assert.strictEqual(graph.edges[0].citation.sourceId, 'DOC_FIR_0142')
    assert.strictEqual(graph.edges[0].citation.locator, 'p:1 l:1-p:2 l:24')

    assert.strictEqual(graph.edges[1].citation.sourceId, 'CDR_9812345678.csv')
    assert.strictEqual(graph.edges[1].citation.locator, 'rows:4182-4213')
  })

  // 9. Directly tests standalone helper functions (parseNote, parseLinkLine, parseFrontmatterBlock)
  it('tests parseNote, parseLinkLine, and parseFrontmatterBlock standalone utilities', () => {
    const { frontmatter, body } = parseFrontmatterBlock(`---
id: test_note
type: person
names:
  - Person A
  - Person B
---
# Header Title
Some content
`)
    assert.strictEqual(frontmatter.id, 'test_note')
    assert.strictEqual(frontmatter.type, 'person')
    assert.deepStrictEqual(frontmatter.names, ['Person A', 'Person B'])
    assert.ok(body.includes('# Header Title'))

    const parsedNote = parseNote('01_People/Test.md', `---
id: person_test
type: person
role: officer
displayName: Inspector Test
---
# Fallback Header
`)
    assert.strictEqual(parsedNote.id, 'person_test')
    assert.strictEqual(parsedNote.displayName, 'Inspector Test')
    assert.strictEqual(parsedNote.role, 'officer')

    const parsedLink = parseLinkLine(
      '- [[TargetEntity]] — strong correlation ^[CDR_01 row:99] <!-- ai:prop_0010 accepted -->',
      'source_01'
    )
    assert.ok(parsedLink)
    assert.strictEqual(parsedLink!.target, 'TargetEntity')
    assert.strictEqual(parsedLink!.reason, 'strong correlation')
    assert.strictEqual(parsedLink!.citation.sourceId, 'CDR_01')
    assert.strictEqual(parsedLink!.citation.locator, 'row:99')
    assert.strictEqual(parsedLink!.isAi, true)
    assert.strictEqual(parsedLink!.aiProposalId, 'prop_0010')
  })
})
