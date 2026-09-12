import React, { useState } from 'react'
import type { CopilotMessageProps } from './types'
import { getNoteMetadata, renderContentWithCitations } from './utils'

export function CopilotMessage({
  message,
  onCitationClick,
  onNoteClick,
  onRetry,
}: CopilotMessageProps): React.JSX.Element {
  const [isRetrievedOpen, setIsRetrievedOpen] = useState(false)
  const isUser = message.role === 'user'

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
        <div className="copilot-thinking">
          <div className="copilot-thinking-dots" aria-hidden="true">
            <span className="copilot-thinking-dot" />
            <span className="copilot-thinking-dot" />
            <span className="copilot-thinking-dot" />
          </div>
          <span>Retrieving case notes from _Case_Index.md...</span>
        </div>
      )}

      {/* Error Box */}
      {message.isError && (
        <div className="copilot-error-box">
          <div className="copilot-error-msg">
            {message.errorMessage ||
              message.content ||
              'Failed to retrieve answer from Copilot service.'}
          </div>
          {onRetry && (
            <button
              type="button"
              className="copilot-retry-btn"
              onClick={() => onRetry(message.id)}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M23 4v6h-6" />
                <path d="M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>Retry</span>
            </button>
          )}
        </div>
      )}

      {/* Message Content with Inline Citations */}
      {!message.isLoading && !message.isError && (
        <div className="copilot-bot-body">
          {renderContentWithCitations(
            message.content,
            message.isStreaming,
            onCitationClick
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
