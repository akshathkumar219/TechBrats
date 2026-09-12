import React, { type CSSProperties } from 'react'
import type { LoadingSkeletonProps, SkeletonVariant } from './types'
import './states.css'

void React

// Natural paragraph line width rhythm (percentage values)
const TEXT_LINE_WIDTHS = ['100%', '92%', '84%', '68%', '96%', '78%', '62%']

/**
 * LoadingSkeleton — Shared shaped placeholders for asynchronous operations.
 *
 * Law & Design System Rule:
 * SHAPED PLACEHOLDERS, NEVER SPINNERS.
 * Renders the structural skeleton of the incoming content so officers see layout stability.
 * Uses token variables (--bg-raised, --bg-overlay, --border) and smooth shimmer motion.
 */
export function LoadingSkeleton({
  variant = 'text',
  lines = 3,
  className = '',
  height,
  width,
  ariaLabel,
}: LoadingSkeletonProps) {
  const rootStyle: CSSProperties = {
    ...(height !== undefined ? { height } : {}),
    ...(width !== undefined ? { width } : {}),
  }

  const defaultAriaLabel = ariaLabel || `Loading ${variant} content...`

  return (
    <div
      className={`sb-skeleton-root sb-skeleton-variant-${variant} ${className}`.trim()}
      style={rootStyle}
      role="status"
      aria-busy="true"
      aria-live="polite"
      aria-label={defaultAriaLabel}
      data-testid={`sb-skeleton-${variant}`}
    >
      {renderVariant(variant, lines)}
    </div>
  )
}

function renderVariant(variant: SkeletonVariant, lines: number) {
  switch (variant) {
    case 'card':
      return <CardSkeleton />
    case 'graph':
      return <GraphSkeleton />
    case 'table':
      return <TableSkeleton rows={Math.max(lines, 1)} />
    case 'pill':
      return <PillSkeleton />
    case 'detail':
      return <DetailSkeleton fields={Math.max(lines, 2)} />
    case 'text':
    default:
      return <TextSkeleton count={Math.max(lines, 1)} />
  }
}

/**
 * Text paragraph skeleton with realistic line-length variation.
 */
function TextSkeleton({ count }: { count: number }) {
  return (
    <div className="sb-skeleton-text-group" data-testid="sb-skeleton-text-group">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ width: TEXT_LINE_WIDTHS[i % TEXT_LINE_WIDTHS.length] }}
          data-testid="sb-skeleton-line"
        />
      ))}
    </div>
  )
}

/**
 * Card skeleton with entity badge, title block, and narrative lines.
 */
function CardSkeleton() {
  return (
    <div className="sb-skeleton-card" data-testid="sb-skeleton-card-inner">
      <div className="sb-skeleton-card-header">
        <div className="sb-skeleton-avatar sb-skeleton-shimmer" />
        <div className="sb-skeleton-card-titles">
          <div
            className="sb-skeleton-line sb-skeleton-shimmer"
            style={{ width: '65%', height: 'var(--fs-md)' }}
          />
          <div
            className="sb-skeleton-line sb-skeleton-shimmer"
            style={{ width: '40%', height: 'var(--fs-xs)' }}
          />
        </div>
      </div>
      <div className="sb-skeleton-card-body">
        <div
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ width: '100%' }}
        />
        <div
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ width: '85%' }}
        />
      </div>
    </div>
  )
}

/**
 * Graph canvas skeleton mimicking topology nodes, edges, and status chrome.
 */
function GraphSkeleton() {
  return (
    <div className="sb-skeleton-graph" data-testid="sb-skeleton-graph-inner">
      <div className="sb-skeleton-graph-header">
        <div
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ width: '140px', height: 'var(--fs-sm)' }}
        />
        <div
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ width: '80px', height: 'var(--fs-xs)' }}
        />
      </div>

      <div className="sb-skeleton-graph-canvas">
        {/* Simulated topology nodes */}
        <div
          className="sb-skeleton-graph-node sb-skeleton-shimmer"
          style={{ width: 28, height: 28, top: '25%', left: '20%' }}
        />
        <div
          className="sb-skeleton-graph-node sb-skeleton-shimmer"
          style={{ width: 34, height: 34, top: '45%', left: '48%' }}
        />
        <div
          className="sb-skeleton-graph-node sb-skeleton-shimmer"
          style={{ width: 22, height: 22, top: '65%', left: '26%' }}
        />
        <div
          className="sb-skeleton-graph-node sb-skeleton-shimmer"
          style={{ width: 30, height: 30, top: '30%', left: '75%' }}
        />
        <div
          className="sb-skeleton-graph-node sb-skeleton-shimmer"
          style={{ width: 20, height: 20, top: '70%', left: '70%' }}
        />

        {/* Simulated edges */}
        <div
          className="sb-skeleton-graph-edge"
          style={{ top: '32%', left: '25%', width: '25%', transform: 'rotate(24deg)' }}
        />
        <div
          className="sb-skeleton-graph-edge"
          style={{ top: '50%', left: '50%', width: '26%', transform: 'rotate(-20deg)' }}
        />
        <div
          className="sb-skeleton-graph-edge"
          style={{ top: '52%', left: '32%', width: '18%', transform: 'rotate(-25deg)' }}
        />
        <div
          className="sb-skeleton-graph-edge"
          style={{ top: '42%', left: '72%', width: '18%', transform: 'rotate(70deg)' }}
        />
      </div>

      <div className="sb-skeleton-graph-footer">
        <div
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ width: '24px', height: 'var(--fs-xs)' }}
        />
        <div
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ flex: 1, height: 'var(--s1)' }}
        />
        <div
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ width: '24px', height: 'var(--fs-xs)' }}
        />
      </div>
    </div>
  )
}

/**
 * Tabular data skeleton with header row and cell columns.
 */
function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="sb-skeleton-table" data-testid="sb-skeleton-table-inner">
      <div className="sb-skeleton-table-header">
        <div
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ height: 'var(--fs-xs)', width: '70%' }}
        />
        <div
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ height: 'var(--fs-xs)', width: '85%' }}
        />
        <div
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ height: 'var(--fs-xs)', width: '60%' }}
        />
        <div
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ height: 'var(--fs-xs)', width: '50%' }}
        />
      </div>
      {Array.from({ length: rows }, (_, idx) => (
        <div key={idx} className="sb-skeleton-table-row">
          <div
            className="sb-skeleton-line sb-skeleton-shimmer"
            style={{ height: 'var(--fs-sm)', width: '80%' }}
          />
          <div
            className="sb-skeleton-line sb-skeleton-shimmer"
            style={{ height: 'var(--fs-sm)', width: '90%' }}
          />
          <div
            className="sb-skeleton-line sb-skeleton-shimmer"
            style={{ height: 'var(--fs-sm)', width: '65%' }}
          />
          <div
            className="sb-skeleton-line sb-skeleton-shimmer"
            style={{ height: 'var(--fs-sm)', width: '45%' }}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * Compact inline pill skeleton for badges, chips, or locators.
 */
function PillSkeleton() {
  return (
    <div
      className="sb-skeleton-pill sb-skeleton-shimmer"
      data-testid="sb-skeleton-pill-inner"
    />
  )
}

/**
 * Inspector or entity detail panel skeleton.
 */
function DetailSkeleton({ fields }: { fields: number }) {
  return (
    <div className="sb-skeleton-detail" data-testid="sb-skeleton-detail-inner">
      <div className="sb-skeleton-detail-header">
        <div
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ width: '55%', height: 'var(--fs-md)' }}
        />
        <div
          className="sb-skeleton-pill sb-skeleton-shimmer"
          style={{ width: '60px', height: 'var(--fs-sm)' }}
        />
      </div>

      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="sb-skeleton-detail-row">
          <div className="sb-skeleton-detail-label sb-skeleton-line sb-skeleton-shimmer" />
          <div
            className="sb-skeleton-detail-value sb-skeleton-line sb-skeleton-shimmer"
            style={{ width: `${50 + ((i * 17) % 45)}%` }}
          />
        </div>
      ))}

      <div className="sb-skeleton-detail-block">
        <div
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ width: '30%', height: 'var(--fs-xs)' }}
        />
        <div
          className="sb-skeleton-line sb-skeleton-shimmer"
          style={{ width: '100%', height: 'var(--s5)' }}
        />
      </div>
    </div>
  )
}
