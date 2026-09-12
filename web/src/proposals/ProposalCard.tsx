import { useState, useCallback, useRef, useEffect } from 'react'
import type { ProposalCardProps } from './types'
import { CitationChip } from './CitationChip'

export function ProposalCard({
  proposal,
  onAccept,
  onReject,
  onOpenCitation,
  className = '',
}: ProposalCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [exitType, setExitType] = useState<'accepted' | 'rejected' | null>(null)
  const isMountedRef = useRef(true)
  const exitTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (exitTimeoutRef.current !== null) {
        window.clearTimeout(exitTimeoutRef.current)
      }
    }
  }, [])

  const handleAccept = useCallback(async () => {
    if (isProcessing || exitType) return
    setIsProcessing(true)

    // Trigger visual feedback and exit animation
    setExitType('accepted')

    try {
      if (onAccept) {
        await onAccept(proposal.id)
      } else {
        // Fallback default: call POST /api/proposal/{id}/accept directly
        await fetch(`/api/proposal/${encodeURIComponent(proposal.id)}/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch((err) => {
          console.warn('[ProposalCard] POST /api/proposal/:id/accept warning:', err)
        })
      }
    } catch (err) {
      console.warn('[ProposalCard] Error accepting proposal:', err)
    } finally {
      exitTimeoutRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          setIsProcessing(false)
        }
      }, 250)
    }
  }, [isProcessing, exitType, onAccept, proposal.id])

  const handleReject = useCallback(async () => {
    if (isProcessing || exitType) return
    setIsProcessing(true)

    // Trigger visual feedback and exit animation
    setExitType('rejected')

    try {
      if (onReject) {
        await onReject(proposal.id)
      } else {
        // Fallback default: call POST /api/proposal/{id}/reject directly
        await fetch(`/api/proposal/${encodeURIComponent(proposal.id)}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }).catch((err) => {
          console.warn('[ProposalCard] POST /api/proposal/:id/reject warning:', err)
        })
      }
    } catch (err) {
      console.warn('[ProposalCard] Error rejecting proposal:', err)
    } finally {
      exitTimeoutRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          setIsProcessing(false)
        }
      }, 250)
    }
  }, [isProcessing, exitType, onReject, proposal.id])

  const pct = Math.round(proposal.confidence * 100)
  const confTierClass =
    pct >= 90 ? 'is-conf-high' : pct >= 75 ? 'is-conf-medium' : 'is-conf-low'

  const cardStateClass = exitType
    ? exitType === 'accepted'
      ? 'is-exiting-accept'
      : 'is-exiting-reject'
    : ''

  return (
    <article
      className={`proposal-card ${cardStateClass} ${className}`}
      data-proposal-id={proposal.id}
      aria-label={`Proposal: ${proposal.claim}`}
    >
      {/* Header: Headline Claim & Confidence Badge */}
      <div className="proposal-card-header">
        <div className="proposal-card-headline-group">
          <span className="proposal-badge-hypothesis" title="AI Proposed Connection (Law 2)">
            AI PROPOSAL
          </span>
          <h4 className="proposal-card-claim">{proposal.claim}</h4>
        </div>

        <div className="proposal-card-meta">
          <span
            className={`proposal-confidence-badge ${confTierClass}`}
            title={`Model reported confidence: ${pct}%`}
          >
            {pct}% confidence
          </span>
        </div>
      </div>

      {/* Entity Pair relation (if specified) */}
      {(proposal.source_entity || proposal.target_entity) && (
        <div className="proposal-card-entities">
          {proposal.source_entity && (
            <span className="proposal-entity-tag">{proposal.source_entity}</span>
          )}
          <span className="proposal-entity-arrow" aria-hidden="true">
            →
          </span>
          {proposal.target_entity && (
            <span className="proposal-entity-tag">{proposal.target_entity}</span>
          )}
        </div>
      )}

      {/* Reason text */}
      <p className="proposal-card-reason">{proposal.reason}</p>

      {/* Footer: Provenance Citation Chip + Accept/Reject Actions */}
      <div className="proposal-card-footer">
        <div className="proposal-card-provenance">
          <span className="proposal-provenance-label">PROVENANCE</span>
          <CitationChip citation={proposal.citation} onClick={onOpenCitation} />
        </div>

        <div className="proposal-card-actions">
          {exitType === 'accepted' ? (
            <span className="proposal-status-chip is-accepted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Accepted
            </span>
          ) : exitType === 'rejected' ? (
            <span className="proposal-status-chip is-rejected">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Rejected
            </span>
          ) : (
            <>
              <button
                type="button"
                className="proposal-btn-reject"
                onClick={handleReject}
                disabled={isProcessing}
                title="Reject this proposal (logged to decisions.jsonl; will not re-propose)"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Reject
              </button>

              <button
                type="button"
                className="proposal-btn-accept"
                onClick={handleAccept}
                disabled={isProcessing}
                title="Accept this connection (writes verified link to vault under Law 3)"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Accept
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
