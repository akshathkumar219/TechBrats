import { useState } from 'react'
import type { PropertyValue } from '../lib/frontmatter'

interface FrontmatterPanelProps {
  properties: Record<string, PropertyValue>
}

export function FrontmatterPanel({ properties }: FrontmatterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const entries = Object.entries(properties)

  if (entries.length === 0) return null

  return (
    <div className="properties-panel">
      <div className="properties-header" onClick={() => setIsExpanded((prev) => !prev)}>
        <div className="properties-title">
          <span className="properties-chevron">{isExpanded ? '▾' : '▸'}</span>
          <span>Properties</span>
        </div>
        <span className="properties-count">{entries.length}</span>
      </div>

      {isExpanded && (
        <div className="properties-table">
          {entries.map(([key, value]) => (
            <div key={key} className="property-row">
              <div className="property-key">{key}</div>
              <div className="property-value">
                {Array.isArray(value) ? (
                  <div className="property-tags">
                    {value.map((item, idx) => (
                      <span key={idx} className="property-tag">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="property-scalar">{String(value)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
