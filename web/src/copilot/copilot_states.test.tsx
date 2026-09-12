/// <reference types="node" />
/**
 * SyndicateBrain (SIH26189) — Unit Tests for Copilot States (HER-T06).
 * Tests:
 * 1. No case open state: CopilotPanel with isCaseOpen={false} or caseId={null} renders <EmptyState>
 * 2. Thinking state: CopilotMessage with isLoading={true} renders <LoadingSkeleton variant="detail" />
 * 3. Provider unreachable state: CopilotMessage with isError={true} renders <ErrorState>
 * 4. NO ANSWER FOUND ("I don't know" state): CopilotMessage renders .copilot-no-answer-card with Law 4 badge
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

const { CopilotPanel } = await import('./CopilotPanel.tsx')
const { CopilotMessage } = await import('./CopilotMessage.tsx')
const { isNoAnswerFound } = await import('./utils.ts')

describe('HER-T06: Copilot States Verification', () => {
  it('1. Renders EmptyState when no case is open (caseId=null or isCaseOpen=false)', () => {
    const el = <CopilotPanel caseId={null} isCaseOpen={false} />
    assert.ok(React.isValidElement(el), 'Valid React element')
    const htmlNoCase = renderToStaticMarkup(el)
    assert.ok(htmlNoCase.includes('sb-empty-state'), 'Includes EmptyState container')
    assert.ok(htmlNoCase.includes('No Case Open'), 'Displays No Case Open headline')
    assert.ok(
      htmlNoCase.includes('Open a case vault to query the copilot'),
      'Displays helpful explanation'
    )
    assert.ok(
      htmlNoCase.includes('Open a case to query copilot...'),
      'Textarea is disabled with helpful placeholder'
    )
    assert.ok(htmlNoCase.includes('disabled=""'), 'Form input is disabled')
  })

  it('2. Renders LoadingSkeleton and thinking status tag when copilot is thinking', () => {
    const thinkingMsg = {
      id: 'bot-thinking-1',
      role: 'assistant' as const,
      content: '',
      isLoading: true,
      timestamp: '14:20',
    }

    const html = renderToStaticMarkup(<CopilotMessage message={thinkingMsg} />)
    assert.ok(html.includes('copilot-thinking'), 'Renders copilot-thinking container')
    assert.ok(html.includes('Searching Case Memory'), 'Status tag reflects searching')
    assert.ok(html.includes('sb-skeleton'), 'Renders LoadingSkeleton instead of spinner')
    assert.ok(
      html.includes('Thinking... scanning _Case_Index.md'),
      'Displays scanning message'
    )
  })

  it('3. Renders ErrorState when provider is unreachable', () => {
    const errorMsg = {
      id: 'bot-err-1',
      role: 'assistant' as const,
      content: '',
      isError: true,
      isProviderUnreachable: true,
      errorTitle: 'Model Provider Unreachable',
      errorMessage: 'Could not connect to configured model provider (Ollama / Gemini Flash).',
      errorDetails:
        'Ensure Ollama is running at http://127.0.0.1:11434 with model loaded, or switch to Gemini Flash in Case_Config.yaml. The local provider is available offline.',
      timestamp: '14:21',
    }

    const html = renderToStaticMarkup(<CopilotMessage message={errorMsg} />)
    assert.ok(html.includes('sb-error-state'), 'Renders ErrorState component')
    assert.ok(html.includes('Model Provider Unreachable'), 'Renders title')
    assert.ok(
      html.includes('Could not connect to configured model provider'),
      'Renders error message'
    )
    assert.ok(
      html.includes('Ensure Ollama is running at http://127.0.0.1:11434'),
      'Renders offline troubleshooting guidance'
    )
  })

  it('4. Renders deliberate NO ANSWER FOUND card for "I don\'t know" / negative response', () => {
    const noAnswerMsg = {
      id: 'bot-notfound-1',
      role: 'assistant' as const,
      content: 'Nothing in this case mentions that.',
      timestamp: '14:22',
    }

    assert.ok(isNoAnswerFound(noAnswerMsg), 'Detected as no answer found')

    const html = renderToStaticMarkup(<CopilotMessage message={noAnswerMsg} />)
    assert.ok(
      html.includes('copilot-no-answer-card'),
      'Renders deliberate .copilot-no-answer-card'
    )
    assert.ok(
      html.includes('Record Absence Verified (Law 4)'),
      'Displays Law 4 badge'
    )
    assert.ok(
      html.includes('Nothing in this case mentions that'),
      'Displays dignified headline'
    )
    assert.ok(
      html.includes('A full scan of all case notes, FIRs, statements, and CDR records yielded no surviving citations'),
      'Displays evidentiary scan details'
    )
    // Must NOT look like an error
    assert.ok(!html.includes('sb-error-state'), 'Not rendered as an ErrorState')
  })

  it('5. Correctly handles isNotFound flag on message', () => {
    const explicitNotFoundMsg = {
      id: 'bot-notfound-2',
      role: 'assistant' as const,
      content: 'I don\'t know.',
      isNotFound: true,
      timestamp: '14:23',
    }

    assert.ok(isNoAnswerFound(explicitNotFoundMsg), 'Detected as no answer found')
    const html = renderToStaticMarkup(<CopilotMessage message={explicitNotFoundMsg} />)
    assert.ok(html.includes('copilot-no-answer-card'), 'Renders no answer card')
  })
})
