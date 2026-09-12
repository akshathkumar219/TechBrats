import { useState, useRef, useEffect, useCallback } from 'react'

export interface AnalysisProposal {
  id: string
  claim: string
  reason: string
  citation: {
    source_doc_id: string
    locator: string
    snippet?: string | null
  }
  confidence: number
  status?: string
}

export interface AnalysisResult {
  case_id: string
  summary: string
  new_connections?: AnalysisProposal[]
  files_to_update?: Array<{
    file_path: string
    reason: string
    suggested_additions?: string[]
  }>
  dropped_proposals_count?: number
  analyzed_at?: string
  /** True when the backend served this from its 07_AI_Synthesis fixture rather
   * than a live model run. Must always be surfaced to the user — never shown
   * as if it were a live result. */
  cache_used?: boolean
}

export interface AnalyseButtonProps {
  vaultName?: string | null
  caseId?: string
  onAnalysisComplete?: (result: AnalysisResult) => void
  className?: string
  variant?: 'pill' | 'ribbon'
}

const AGENT_STAGES = [
  { id: 'scanning', label: 'Scanning records', icon: '🔍' },
  { id: 'connecting', label: 'Finding connections', icon: '🔗' },
  { id: 'alibis', label: 'Checking alibis & contradictions', icon: '⚖️' },
  { id: 'citations', label: 'Validating citations', icon: '📋' },
] as const

const CSS = `
.btn-analyse-container {
  display: inline-flex;
  align-items: center;
  position: relative;
}

.btn-analyse-ribbon-container {
  position: relative;
  display: inline-flex;
}

.btn-analyse-ribbon-btn {
  width: var(--ws-icon, 30px);
  height: var(--ws-icon, 30px);
  display: grid;
  place-items: center;
  border-radius: var(--r-sm);
  color: var(--text-muted);
  position: relative;
  background: none;
  border: 0;
  cursor: pointer;
  transition: background var(--t-fast), color var(--t-fast);
}

.btn-analyse-ribbon-btn:hover:not(:disabled) {
  background: var(--bg-raised);
  color: var(--text-primary);
}

.btn-analyse-ribbon-btn.is-running {
  background: var(--bg-overlay);
  color: var(--accent);
}

.btn-analyse-ribbon-btn.is-complete {
  background: rgba(22, 163, 74, 0.15);
  color: var(--ok);
}

.btn-analyse-ribbon-btn.is-error {
  background: var(--danger-bg);
  color: var(--danger);
}

.btn-analyse-status-glyph {
  font-size: var(--fs-sm);
  font-weight: 600;
}

.btn-analyse-status-ok {
  color: var(--ok);
}

.btn-analyse-status-error {
  color: var(--danger);
}

.btn-analyse-ribbon-container .analyse-pipeline-tooltip {
  top: 50%;
  transform: translateY(-50%);
  left: calc(100% + 8px);
  right: auto;
}


.btn-analyse {
  display: inline-flex;
  align-items: center;
  gap: var(--s2);
  padding: 4px 10px;
  font-family: var(--font-ui);
  font-size: var(--fs-sm);
  font-weight: 500;
  border-radius: var(--r-sm);
  cursor: pointer;
  background-color: var(--bg-inset);
  color: var(--text-primary);
  border: 1px solid var(--border-strong);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all var(--t-fast);
  user-select: none;
  white-space: nowrap;
}

.btn-analyse:hover:not(:disabled) {
  background-color: var(--bg-hover);
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.btn-analyse:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-analyse.is-running {
  background-color: var(--bg-overlay);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.btn-analyse.is-complete {
  background-color: rgba(22, 163, 74, 0.12);
  color: var(--ok);
  border-color: var(--ok);
}

.btn-analyse.is-error {
  background-color: var(--danger-bg);
  color: var(--danger);
  border-color: var(--danger);
}

.btn-analyse-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid var(--border-strong);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: analyse-spin 0.8s linear infinite;
}

@keyframes analyse-spin {
  to { transform: rotate(360deg); }
}

.btn-analyse-agent-pulse {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--accent);
  box-shadow: 0 0 6px var(--accent);
  animation: analyse-pulse 1.2s ease-in-out infinite alternate;
}

@keyframes analyse-pulse {
  from { opacity: 0.4; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1.15); }
}

.analyse-pipeline-tooltip {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: var(--bg-overlay);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-pop);
  border-radius: var(--r-md);
  padding: var(--s2) var(--s3);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: var(--s1);
  min-width: 320px;
  pointer-events: none;
}

.analyse-pipeline-header {
  font-size: var(--fs-xs);
  color: var(--text-faint);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: var(--font-mono);
  margin-bottom: 2px;
}

.analyse-pipeline-steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.analyse-pipeline-step {
  display: flex;
  align-items: center;
  gap: var(--s2);
  font-size: var(--fs-xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.analyse-pipeline-step.is-active {
  color: var(--accent);
  font-weight: 600;
}

.analyse-pipeline-step.is-done {
  color: var(--ok);
}
`

export function AnalyseButton({
  vaultName,
  caseId,
  onAnalysisComplete,
  className = '',
  variant = 'pill',
}: AnalyseButtonProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [agentIndex, setAgentIndex] = useState(0)
  const [successCount, setSuccessCount] = useState<number | null>(null)
  const [cacheUsed, setCacheUsed] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const [showHoverTip, setShowHoverTip] = useState(false)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onMouseEnter = () => {
    hoverTimerRef.current = setTimeout(() => setShowHoverTip(true), 80)
  }
  const onMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setShowHoverTip(false)
  }

  const activeTimerRef = useRef<number | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (activeTimerRef.current !== null) {
        window.clearTimeout(activeTimerRef.current)
      }
      if (hoverTimerRef.current !== null) {
        clearTimeout(hoverTimerRef.current)
      }
    }
  }, [])

  const handleAnalyse = useCallback(async () => {
    if (isRunning) return

    const targetCaseId = caseId || vaultName || 'Case_01_Sonipat_Arms'
    setIsRunning(true)
    setSuccessCount(null)
    setCacheUsed(false)
    setErrorMessage(null)
    setAgentIndex(0)
    setShowTooltip(true)

    // Sequence through the 4 agents:
    // "Scanning records → Finding connections → Checking alibis & contradictions → Validating citations"
    const stepDuration = 1000
    const sequenceStartTime = Date.now()

    const stepInterval = window.setInterval(() => {
      setAgentIndex((curr) => {
        if (curr < AGENT_STAGES.length - 1) {
          return curr + 1
        }
        return curr
      })
    }, stepDuration)

    try {
      // Call backend POST /api/case/analyse
      const fetchPromise = fetch('/api/case/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: targetCaseId }),
      })

      // Ensure each of the 4 agents has enough visible display time on stage
      const minAnimationTime = AGENT_STAGES.length * stepDuration + 200
      const [res] = await Promise.all([
        fetchPromise.catch((err) => {
          console.warn('[AnalyseCase] Backend call caught error:', err)
          return null
        }),
        new Promise((resolve) => {
          const elapsed = Date.now() - sequenceStartTime
          const remaining = Math.max(0, minAnimationTime - elapsed)
          window.setTimeout(resolve, remaining)
        }),
      ])

      window.clearInterval(stepInterval)

      let data: AnalysisResult | null = null
      let parseError: string | null = null
      if (res && res.ok) {
        try {
          data = await res.json()
        } catch {
          parseError = 'Backend returned an unreadable response.'
        }
      } else if (res) {
        parseError = `Analysis request failed (${res.status}).`
      } else {
        parseError = 'Could not reach the backend.'
      }

      if (!isMountedRef.current) return

      // Honesty over uptime: never invent proposals. If the live call failed,
      // show a real error state — the backend's own cached-fixture fallback
      // (marked `cache_used`) is the only acceptable substitute for a live run,
      // and it is always labelled as such downstream. See docs/OVERHAUL_SPEC.md §F.
      if (!data) {
        setErrorMessage(parseError ?? 'Analysis failed.')
        setIsRunning(false)
        activeTimerRef.current = window.setTimeout(() => {
          if (isMountedRef.current) {
            setErrorMessage(null)
            setShowTooltip(false)
          }
        }, 5000)
        return
      }

      const proposalsCount = data.new_connections?.length ?? 0
      setSuccessCount(proposalsCount)
      setCacheUsed(Boolean(data.cache_used))
      setIsRunning(false)
      onAnalysisComplete?.(data)

      // Notify any listeners across workspace
      window.dispatchEvent(
        new CustomEvent('syndicate-brain:case-analysed', { detail: data })
      )

      // Keep success state for 4 seconds then return to idle
      activeTimerRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          setSuccessCount(null)
          setShowTooltip(false)
        }
      }, 4000)
    } catch (err) {
      console.error('[AnalyseCase] Error during analysis:', err)
      window.clearInterval(stepInterval)
      if (isMountedRef.current) {
        setErrorMessage('Analysis failed.')
        setIsRunning(false)
        setShowTooltip(false)
      }
    }
  }, [isRunning, caseId, vaultName, onAnalysisComplete])

  const activeAgent = AGENT_STAGES[agentIndex]

  if (variant === 'ribbon') {
    return (
      <div
        className={`ws-ico-wrap btn-analyse-ribbon-container ${className}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <style>{CSS}</style>
        <button
          type="button"
          className={`ws-ico btn-analyse-ribbon-btn ${isRunning ? 'is-running' : ''} ${successCount !== null ? 'is-complete' : ''} ${errorMessage ? 'is-error' : ''}`}
          onClick={handleAnalyse}
          disabled={isRunning}
          aria-label="Make AI Synthesis"
          aria-busy={isRunning}
          aria-live="polite"
        >
          {isRunning ? (
            <span className="btn-analyse-agent-pulse" aria-hidden="true" />
          ) : errorMessage ? (
            <span aria-hidden="true" className="btn-analyse-status-glyph btn-analyse-status-error">!</span>
          ) : successCount !== null ? (
            <span aria-hidden="true" className="btn-analyse-status-glyph btn-analyse-status-ok">✓</span>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l1.8 5.4a2 2 0 0 0 1.2 1.2l5.4 1.8-5.4 1.8a2 2 0 0 0-1.2 1.2L12 21l-1.8-5.4a2 2 0 0 0-1.2-1.2L3.6 12.6l5.4-1.8a2 2 0 0 0 1.2-1.2L12 3z" />
              <path d="M19 3v4M21 5h-4" />
            </svg>
          )}
        </button>

        {/* Ribbon hover tooltip when idle */}
        {showHoverTip && !isRunning && (
          <div className="ws-tooltip" role="tooltip">
            <span>
              {errorMessage
                ? errorMessage
                : successCount !== null
                  ? `Analysis Complete (${successCount} proposals)${cacheUsed ? ' · Cached, not live' : ''}`
                  : 'Make AI Synthesis'}
            </span>
          </div>
        )}

        {/* Live Agent Sequence Tooltip / Pipeline Indicator */}
        {isRunning && showTooltip && (
          <div className="analyse-pipeline-tooltip" role="status" aria-label="Investigation Agent Pipeline">
            <div className="analyse-pipeline-header">Agent Layer Pipeline (Laws 2, 3, 4)</div>
            <div className="analyse-pipeline-steps">
              {AGENT_STAGES.map((stage, i) => {
                const isDone = i < agentIndex
                const isCurr = i === agentIndex
                return (
                  <div
                    key={stage.id}
                    className={`analyse-pipeline-step ${isDone ? 'is-done' : ''} ${isCurr ? 'is-active' : ''}`}
                  >
                    <span aria-hidden="true">{isDone ? '✓' : isCurr ? '▶' : '○'}</span>
                    <span>{stage.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`btn-analyse-container ${className}`}>
      <style>{CSS}</style>
      <button
        type="button"
        className={`btn-analyse ${isRunning ? 'is-running' : ''} ${successCount !== null ? 'is-complete' : ''} ${errorMessage ? 'is-error' : ''}`}
        onClick={handleAnalyse}
        disabled={isRunning}
        title={
          isRunning
            ? `Active Agent: ${activeAgent.label}`
            : errorMessage
              ? `${errorMessage} Click to retry.`
              : 'Run AI investigative agent layer over case notes and raw inputs (Law 2: Proposals only)'
        }
        aria-busy={isRunning}
        aria-live="polite"
      >
        {isRunning ? (
          <>
            <span className="btn-analyse-agent-pulse" aria-hidden="true" />
            <span>{activeAgent.label}...</span>
          </>
        ) : errorMessage ? (
          <>
            <span aria-hidden="true">!</span>
            <span>Analysis Failed — Retry</span>
          </>
        ) : successCount !== null ? (
          <>
            <span aria-hidden="true">✓</span>
            <span>Analysis Complete ({successCount} proposals){cacheUsed ? ' · Cached' : ''}</span>
          </>
        ) : (
          <>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span>Analyse Case</span>
          </>
        )}
      </button>

      {/* Live Agent Sequence Tooltip / Pipeline Indicator */}
      {isRunning && showTooltip && (
        <div className="analyse-pipeline-tooltip" role="status" aria-label="Investigation Agent Pipeline">
          <div className="analyse-pipeline-header">Agent Layer Pipeline (Laws 2, 3, 4)</div>
          <div className="analyse-pipeline-steps">
            {AGENT_STAGES.map((stage, i) => {
              const isDone = i < agentIndex
              const isCurr = i === agentIndex
              return (
                <div
                  key={stage.id}
                  className={`analyse-pipeline-step ${isDone ? 'is-done' : ''} ${isCurr ? 'is-active' : ''}`}
                >
                  <span aria-hidden="true">{isDone ? '✓' : isCurr ? '▶' : '○'}</span>
                  <span>{stage.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
