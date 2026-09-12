import React, { useState, useMemo } from 'react'
import type { CopilotMessageProps } from './types'
import { getNoteMetadata, renderContentWithCitations, isNoAnswerFound } from './utils'
import { openFileAt } from './navigation'
import { ErrorState, LoadingSkeleton } from '../states'

export function CopilotMessage({
  message,
  onCitationClick,
  onNoteClick,
  onRetry,
}: CopilotMessageProps): React.JSX.Element {
  const [isRetrievedOpen, setIsRetrievedOpen] = useState(false)
  const isUser = message.role === 'user'

  const validSourceSet = useMemo(() => {
    const s = new Set<string>(message.notesRetrieved || [])
    if (message.citations) {
      for (const c of message.citations) {
        if (c?.source_doc_id) s.add(c.source_doc_id)
      }
    }
    return s
  }, [message.notesRetrieved, message.citations])

  if (isUser) {
    return (
      <div className="copilot-msg is-user">
        <div className="copilot-user-bubble">{message.content}</div>
        {message.timestamp && (
          <span className="copilot-user-time">{message.timestamp}</span>
        )}
      </div>
    )
  }

  // Assistant / Bot message
  const statusTag = (() => {
    if (message.isLoading) {
      return (
        <span className="copilot-bot-status-tag is-thinking">
          Searching Case Memory
        </span>
      )
    }
    if (message.isStreaming) {
      return (
        <span className="copilot-bot-status-tag is-streaming">
          Streaming
        </span>
      )
    }
    if (message.isError) {
      return (
        <span className="copilot-bot-status-tag is-error">
          Error
        </span>
      )
    }
    return (
      <span className="copilot-bot-status-tag is-grounded">
        Law 4 Grounded
      </span>
    )
  })()

  const retrievedNotes = message.notesRetrieved || []

  return (
    <div className="copilot-msg is-bot">
      {/* Bot Header */}
      <div className="copilot-bot-header">
        <div className="copilot-bot-identity">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 4a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-4a3 3 0 0 1 3-3h1V8a4 4 0 0 1 4-4z" />
            <path d="M9.5 14h.01" />
            <path d="M14.5 14h.01" />
          </svg>
          <span>Copilot</span>
          {statusTag}
        </div>
        {message.timestamp && (
          <span className="copilot-bot-time">{message.timestamp}</span>
        )}
      </div>

      {/* Loading / Thinking State */}
      {message.isLoading && (
        <div className="copilot-thinking" role="status" aria-label="Thinking">
          <div className="copilot-thinking-dots" aria-hidden="true">
            <span className="copilot-thinking-dot" />
            <span className="copilot-thinking-dot" />
            <span className="copilot-thinking-dot" />
          </div>
          <span>Thinking... scanning _Case_Index.md</span>
          <LoadingSkeleton variant="detail" lines={2} />
        </div>
      )}

      {/* Error Box with ErrorState */}
      {message.isError && (
        <div className="copilot-error-box">
          <ErrorState
            title={message.errorTitle || 'Model Provider Unreachable'}
            message={message.errorMessage || message.content || 'Could not connect to model provider.'}
            details={message.errorDetails || 'Ensure Ollama is running at http://127.0.0.1:11434 with model loaded, or switch to Gemini Flash in Case_Config.yaml.'}
            retryAction={onRetry ? () => onRetry(message.id) : undefined}
            retryLabel="Retry Question"
          />
        </div>
      )}

      {/* NO ANSWER FOUND ("I don't know" state per Law 4 & HER-T06) */}
      {!message.isLoading && !message.isError && isNoAnswerFound(message) && (
        <div className="copilot-no-answer-card" role="status" aria-label="No Answer Found">
          <div className="copilot-no-answer-badge">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Record Absence Verified (Law 4)</span>
          </div>
          <h4 className="copilot-no-answer-headline">
            Nothing in this case mentions that
          </h4>
          <p className="copilot-no-answer-subtext">
            A full scan of all case notes, FIRs, statements, and CDR records yielded no surviving citations for this query.
          </p>
        </div>
      )}

      {/* Message Content with Inline Citations (when answer is present and grounded) */}
      {!message.isLoading && !message.isError && !isNoAnswerFound(message) && (
        <div className="copilot-bot-body">
          {renderContentWithCitations(
            message.content,
            message.isStreaming,
            onCitationClick,
            validSourceSet
          )}
        </div>
      )}

      {/* Collapsible Retrieved Notes Section */}
      {!message.isLoading && retrievedNotes.length > 0 && (
        <div className="copilot-retrieved">
          <button
            type="button"
            className="copilot-retrieved-toggle"
            onClick={() => setIsRetrievedOpen((prev) => !prev)}
            aria-expanded={isRetrievedOpen}
          >
            <span className="copilot-retrieved-chevron" aria-hidden="true">
              {isRetrievedOpen ? '▾' : '▸'}
            </span>
            <span>Retrieved Notes</span>
            <span className="copilot-retrieved-count">
              ({retrievedNotes.length} {retrievedNotes.length === 1 ? 'note' : 'notes'})
            </span>
          </button>

          {isRetrievedOpen && (
            <div className="copilot-retrieved-list">
              {retrievedNotes.map((notePath) => {
                const meta = getNoteMetadata(notePath)
                return (
                  <div
                    key={notePath}
                    className="copilot-retrieved-item"
                    onClick={() => {
                      openFileAt(notePath, 1)
                      onNoteClick?.(notePath)
                      onCitationClick?.(notePath, null)
                    }}
                    title={`Open note: ${notePath}`}
                  >
                    <div className="copilot-retrieved-item-left">
                      <span
                        className="copilot-entity-badge"
                        style={{
                          color: meta.badgeColorVar,
                          borderColor: meta.badgeColorVar,
                        }}
                      >
                        {meta.entityType}
                      </span>
                      <span className="copilot-note-name">{meta.filename}</span>
                    </div>
                    <div className="copilot-retrieved-item-right">
                      <span>{notePath}</span>
                      <span className="copilot-note-link-icon" aria-hidden="true">
                        ↗
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
