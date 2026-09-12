import React, { useState, useRef, useEffect, useCallback } from 'react'
import './copilot.css'
import { CopilotMessage } from './CopilotMessage'
import { EmptyState, ErrorState } from '../states'
import type {
  ChatMessage,
  CopilotPanelProps,
  CopilotRequest,
  CopilotResponse,
} from './types'
import { getOfflineCaseResponse } from './utils'
import { validateText } from './validator'

const SUGGESTED_PROMPTS = [
  'Who is Vikram Singh?',
  'What vehicles are linked to Rehan Khan?',
  'Summarize Sonipat arms seizure',
] as const

/**
 * CopilotPanel — Right-rail investigative copilot panel.
 * Grounded in Case Model Law 3 (locators) and Law 4 (sentence-level citations).
 * Streaming answer simulation at 25ms cadence with collapsible retrieved notes.
 */
export function CopilotPanel({
  caseId = 'Case_01_Sonipat_Arms',
  isCaseOpen = true,
  isProviderUnreachable = false,
  providerErrorDetails,
  initialMessages = [],
  messages: externalMessages,
  setMessages: externalSetMessages,
  onMessagesChange,
  onCitationClick,
  onNoteClick,
  onRetryProvider,
  draft: externalDraft,
  setDraft: externalSetDraft,
  className,
  style,
  onClose,
}: CopilotPanelProps): React.JSX.Element {
  // State management: supports both controlled and uncontrolled usage
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>(initialMessages)
  const [internalDraft, setInternalDraft] = useState('')
  const [isStreamingActive, setIsStreamingActive] = useState(false)

  const messages = externalMessages !== undefined ? externalMessages : internalMessages
  const draft = externalDraft !== undefined ? externalDraft : internalDraft

  const logRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const activeIntervalsRef = useRef<Map<string, number>>(new Map())

  // Helper to update messages
  const updateMessages = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      if (externalSetMessages) {
        externalSetMessages(updater)
      } else {
        setInternalMessages((prev) => {
          const next = updater(prev)
          onMessagesChange?.(next)
          return next
        })
      }
    },
    [externalSetMessages, onMessagesChange]
  )

  const updateDraft = useCallback(
    (value: string) => {
      if (externalSetDraft) {
        externalSetDraft(value)
      } else {
        setInternalDraft(value)
      }
    },
    [externalSetDraft]
  )

  // Clear all running intervals on unmount
  useEffect(() => {
    const intervals = activeIntervalsRef.current
    return () => {
      intervals.forEach((timerId) => window.clearInterval(timerId))
      intervals.clear()
    }
  }, [])

  // Auto-scroll to bottom as messages stream or are added
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [messages])

  // Progressive streaming reveal engine (~25ms intervals)
  const streamResponse = useCallback(
    (botMsgId: string, copilotData: CopilotResponse) => {
      // Clear any prior interval for this message
      if (activeIntervalsRef.current.has(botMsgId)) {
        window.clearInterval(activeIntervalsRef.current.get(botMsgId)!)
        activeIntervalsRef.current.delete(botMsgId)
      }

      // Tokenize answer into atomic citation blocks ^[...], whitespace, or word chunks
      const tokenRegex = /(\^\[[^\]\n]+\]|\s+|\S+)/g
      const tokens = copilotData.answer.match(tokenRegex) || [copilotData.answer]

      setIsStreamingActive(true)

      let currentTokenIdx = 0
      const intervalMs = 25

      // Calculate step size so very long texts don't make the user wait forever (>3s)
      const stepSize = Math.max(1, Math.ceil(tokens.length / 100))

      const timerId = window.setInterval(() => {
        currentTokenIdx += stepSize
        const isComplete = currentTokenIdx >= tokens.length
        const currentSlice = tokens
          .slice(0, Math.min(currentTokenIdx, tokens.length))
          .join('')

        updateMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== botMsgId) return msg
            return {
              ...msg,
              content: currentSlice,
              isLoading: false,
              isStreaming: !isComplete,
              citations: copilotData.citations,
              notesRetrieved: copilotData.notes_retrieved,
            }
          })
        )

        if (isComplete) {
          window.clearInterval(timerId)
          activeIntervalsRef.current.delete(botMsgId)
          setIsStreamingActive(false)
        }
      }, intervalMs)

      activeIntervalsRef.current.set(botMsgId, timerId)
    },
    [updateMessages]
  )

  // Send query to POST /api/copilot/ask
  const handleSend = useCallback(
    async (overrideQuestion?: string) => {
      const questionText = (overrideQuestion || draft).trim()
      if (!questionText || isStreamingActive || !caseId || !isCaseOpen) return

      updateDraft('')

      const timestamp = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })

      const userMsgId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const botMsgId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

      const userMsg: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: questionText,
        timestamp,
      }

      const botMsg: ChatMessage = {
        id: botMsgId,
        role: 'assistant',
        content: '',
        isLoading: true,
        timestamp,
      }

      updateMessages((prev) => [...prev, userMsg, botMsg])

      try {
        const payload: CopilotRequest = {
          question: questionText,
          case_id: caseId ?? undefined,
        }

        const res = await fetch('/api/copilot/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`)
        }

        const data: CopilotResponse = await res.json()
        const validation = validateText(data.answer, data.notes_retrieved)
        const sanitizedAnswer = validation.surviving_text || data.answer
        streamResponse(botMsgId, { ...data, answer: sanitizedAnswer })
      } catch (err: unknown) {
        console.warn(
          '[Copilot] Live /api/copilot/ask unavailable, checking offline synthesizer:',
          err
        )

        // Seamless fallback to grounded offline case memory for SIH venue offline conditions
        const offlineData = getOfflineCaseResponse(questionText)
        if (offlineData) {
          const validation = validateText(offlineData.answer, offlineData.notes_retrieved)
          const sanitizedAnswer = validation.surviving_text || offlineData.answer
          streamResponse(botMsgId, { ...offlineData, answer: sanitizedAnswer })
        } else {
          // Provider unreachable / error state per HER-T06
          const errorMsg =
            err instanceof Error ? err.message : 'Network error contacting copilot engine.'
          updateMessages((prev) =>
            prev.map((msg) =>
              msg.id === botMsgId
                ? {
                    ...msg,
                    isLoading: false,
                    isStreaming: false,
                    isError: true,
                    isProviderUnreachable: true,
                    errorTitle: 'Model Provider Unreachable',
                    errorMessage:
                      'Could not connect to configured model provider (Ollama / Gemini Flash).',
                    errorDetails:
                      providerErrorDetails ||
                      `${errorMsg}. Ensure Ollama is running at http://127.0.0.1:11434 with model loaded, or switch to Gemini Flash in Case_Config.yaml. The local provider is available offline.`,
                  }
                : msg
            )
          )
          setIsStreamingActive(false)
        }
      }
    },
    [draft, isStreamingActive, updateDraft, caseId, isCaseOpen, providerErrorDetails, updateMessages, streamResponse]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleRetry = (botMessageId: string) => {
    // Find the preceding user message
    const msgIndex = messages.findIndex((m) => m.id === botMessageId)
    if (msgIndex > 0) {
      const prevUserMsg = messages[msgIndex - 1]
      if (prevUserMsg && prevUserMsg.role === 'user') {
        // Remove the error message and re-send
        updateMessages((prev) => prev.filter((m) => m.id !== botMessageId))
        handleSend(prevUserMsg.content)
      }
    }
  }

  const handleClearHistory = () => {
    // Stop all active intervals
    activeIntervalsRef.current.forEach((timerId) => window.clearInterval(timerId))
    activeIntervalsRef.current.clear()
    setIsStreamingActive(false)
    updateMessages(() => [])
  }

  return (
    <aside className={`copilot-panel ${className || ''}`.trim()} style={style}>
      {/* Panel Header */}
      <div className="copilot-header">
        <div className="copilot-header-left">
          <span className="copilot-header-icon" aria-hidden="true">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 4a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3h1V8a4 4 0 0 1 4-4z" />
              <path d="M9.5 14h.01" />
              <path d="M14.5 14h.01" />
            </svg>
          </span>
          <span className="copilot-header-title">Copilot</span>
          <span className="copilot-header-badge">Law 4</span>
        </div>

        <div className="copilot-header-actions">
          {messages.length > 0 && (
            <button
              type="button"
              className="copilot-icon-btn"
              onClick={handleClearHistory}
              title="Clear conversation history"
              aria-label="Clear conversation history"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              className="copilot-icon-btn"
              onClick={onClose}
              title="Close copilot panel"
              aria-label="Close copilot panel"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Message Stream Log */}
      <div className="copilot-log" ref={logRef}>
        {!caseId || !isCaseOpen ? (
          <EmptyState
            headline="No Case Open"
            body="Open a case vault to query the copilot against evidentiary documents and entity notes."
          />
        ) : isProviderUnreachable && messages.length === 0 ? (
          <ErrorState
            title="Model Provider Unreachable"
            message="Could not connect to configured model provider (Ollama / Gemini Flash)."
            details={
              providerErrorDetails ||
              'Ensure Ollama is running at http://127.0.0.1:11434 with model loaded, or switch to Gemini Flash in Case_Config.yaml. The local provider is available offline.'
            }
            retryAction={onRetryProvider}
            retryLabel="Retry Provider"
          />
        ) : messages.length === 0 ? (
          <div className="copilot-empty">
            <div className="copilot-empty-icon" aria-hidden="true">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 4a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3h1V8a4 4 0 0 1 4-4z" />
                <path d="M9.5 14h.01" />
                <path d="M14.5 14h.01" />
              </svg>
            </div>
            <div className="copilot-empty-title">Investigative Copilot</div>
            <div className="copilot-empty-desc">
              Answers grounded directly in <code style={{ fontFamily: 'var(--font-mono)' }}>_Case_Index.md</code>.
              Every assertion carries verifiable source citations under Law 4.
            </div>

            <div className="copilot-suggestions-header">Suggested queries</div>
            <div className="copilot-suggestions">
              {SUGGESTED_PROMPTS.map((promptText) => (
                <button
                  key={promptText}
                  type="button"
                  className="copilot-suggestion-btn"
                  onClick={() => handleSend(promptText)}
                >
                  <span>{promptText}</span>
                  <span className="copilot-suggestion-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <CopilotMessage
              key={m.id}
              message={m}
              onCitationClick={onCitationClick}
              onNoteClick={onNoteClick}
              onRetry={handleRetry}
            />
          ))
        )}
      </div>

      {/* Bottom Input Form */}
      <div className="copilot-form-container">
        <form
          className="copilot-form"
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
        >
          <div className="copilot-input-row">
            <textarea
              ref={textareaRef}
              className="copilot-textarea"
              rows={1}
              value={draft}
              placeholder={
                !caseId || !isCaseOpen
                  ? 'Open a case to query copilot...'
                  : 'Ask about suspects, CDR links, FIR records...'
              }
              onChange={(e) => updateDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreamingActive || !caseId || !isCaseOpen}
            />
            <button
              type="submit"
              className="copilot-send-btn"
              disabled={!draft.trim() || isStreamingActive || !caseId || !isCaseOpen}
              title="Send message (Enter)"
              aria-label="Send message"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 12l16-8-6 8 6 8z" />
              </svg>
            </button>
          </div>

          <div className="copilot-form-footer">
            <span className="copilot-hint">
              Enter to send · Shift+Enter for newline
            </span>
            <span className="copilot-law-badge">
              Law 4 Enforced
            </span>
          </div>
        </form>
      </div>
    </aside>
  )
}
