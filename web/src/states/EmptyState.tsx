import React from 'react'
import type { EmptyStateProps, EmptyStateActionConfig } from './types'
import './states.css'

void React

/**
 * Default clean procedural icon for empty states (case folder outline).
 */
function DefaultEmptyIcon() {
  return (
    <svg
      className="sb-empty-icon-svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3 7v13a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1h-9l-2-2H4a1 1 0 0 0-1 1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Type guard for EmptyStateActionConfig.
 */
function isActionConfig(action: unknown): action is EmptyStateActionConfig {
  return (
    typeof action === 'object' &&
    action !== null &&
    'label' in action &&
    typeof (action as EmptyStateActionConfig).label === 'string' &&
    'onClick' in action &&
    typeof (action as EmptyStateActionConfig).onClick === 'function'
  )
}

/**
 * EmptyState — Shared empty state component across SyndicateBrain workbench.
 *
 * Copy Tone Rule (docs/design-system.md §7):
 * Procedural, factual, objective. Never editorialises about individuals or evidence.
 * Examples:
 * - "Named as accused in 3 FIRs", never "High risk individual".
 * - "No predictions generated. Predictions are investigative leads only and are never used as evidence."
 */
export function EmptyState({
  icon,
  headline,
  body,
  action,
  className = '',
  compact = false,
  role = 'status',
}: EmptyStateProps) {
  // Determine icon to render (null explicitly suppresses icon)
  const renderedIcon =
    icon === undefined ? <DefaultEmptyIcon /> : icon !== null ? icon : null

  return (
    <div
      className={`sb-empty-state ${compact ? 'is-compact' : ''} ${className}`.trim()}
      role={role}
      aria-label={headline}
      data-testid="sb-empty-state"
    >
      {renderedIcon && (
        <div className="sb-empty-icon-wrap" data-testid="sb-empty-icon">
          {renderedIcon}
        </div>
      )}

      {compact ? (
        <h4 className="sb-empty-headline">{headline}</h4>
      ) : (
        <h3 className="sb-empty-headline">{headline}</h3>
      )}

      <p className="sb-empty-body">{body}</p>

      {action && (
        <div className="sb-empty-action" data-testid="sb-empty-action">
          {isActionConfig(action) ? (
            <button
              type="button"
              className="sb-empty-btn"
              onClick={action.onClick}
              disabled={action.disabled}
              data-testid="sb-empty-action-btn"
            >
              {action.label}
            </button>
          ) : (
            action
          )}
        </div>
      )}
    </div>
  )
}
