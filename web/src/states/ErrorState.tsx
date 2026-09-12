import React from 'react'
import type { ErrorStateProps } from './types'
import './states.css'

void React

/**
 * ErrorState — Shared error surface for failed network requests, hash mismatches, or unreadable files.
 *
 * Law 1 & Evidentiary Rule:
 * When evidence fails verification or a file cannot be resolved, SyndicateBrain reports
 * the exact factual reason. Never conceals error traces or hashes.
 */
export function ErrorState({
  title = 'Operation failed',
  message,
  details,
  failedFile,
  retryAction,
  retryLabel = 'Retry',
  className = '',
  compact = false,
}: ErrorStateProps) {
  return (
    <div
      className={`sb-error-state ${compact ? 'is-compact' : ''} ${className}`.trim()}
      role="alert"
      aria-live="assertive"
      data-testid="sb-error-state"
    >
      <div className="sb-error-header">
        <span
          className="sb-error-badge"
          aria-hidden="true"
          data-testid="sb-error-glyph"
        >
          ⚠
        </span>
        <h4 className="sb-error-title">{title}</h4>
      </div>

      <p className="sb-error-message">{message}</p>

      {failedFile && (
        <div className="sb-error-file-chip" data-testid="sb-error-failed-file">
          <span className="sb-error-file-label">Unresolvable File:</span>
          <code className="sb-error-file-path">{failedFile}</code>
        </div>
      )}

      {details && (
        <details className="sb-error-details" data-testid="sb-error-details">
          <summary className="sb-error-details-summary">
            Technical diagnostics & trace
          </summary>
          <pre className="sb-error-details-pre">{details}</pre>
        </details>
      )}

      {retryAction && (
        <div className="sb-error-actions">
          <button
            type="button"
            className="sb-error-retry-btn"
            onClick={retryAction}
            data-testid="sb-error-retry-btn"
          >
            <span className="sb-error-retry-glyph" aria-hidden="true">
              ↻
            </span>
            <span>{retryLabel}</span>
          </button>
        </div>
      )}
    </div>
  )
}
