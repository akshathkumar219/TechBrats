import { useState } from 'react'
import type { VaultFile } from '../fs/vault'
import type { BacklinkGroup } from '../lib/links'

interface BacklinksProps {
  activeFile: VaultFile | null
  backlinks: BacklinkGroup[]
  onSelectFile: (path: string) => void
}

export function Backlinks({ activeFile, backlinks, onSelectFile }: BacklinksProps) {
  const [isLinkedOpen, setIsLinkedOpen] = useState(true)
  const [isUnlinkedOpen, setIsUnlinkedOpen] = useState(false)

  const totalMentions = backlinks.reduce((sum, g) => sum + g.occurrences.length, 0)

  const renderContextSnippet = (lineText: string, rawMatch: string) => {
    const parts = lineText.split(rawMatch)
    if (parts.length === 1) return lineText
    return (
      <>
        {parts[0]}
        <span className="backlink-highlight">{rawMatch}</span>
        {parts.slice(1).join(rawMatch)}
      </>
    )
  }

  return (
    <aside className="right">
      <div className="panel-header">
        <span>Backlinks</span>
        {activeFile && <span className="backlink-badge">{totalMentions}</span>}
      </div>

      {!activeFile ? (
        <div className="placeholder-content">
          <p>Select a note to inspect incoming mentions.</p>
        </div>
      ) : (
        <>
          <div className="backlink-section">
            <div
              className="backlink-section-title"
              onClick={() => setIsLinkedOpen((prev) => !prev)}
            >
              <div className="backlink-title-left">
                <span className="backlink-chevron">{isLinkedOpen ? '▾' : '▸'}</span>
                <span>Linked Mentions</span>
              </div>
              <span className="backlink-badge">{totalMentions}</span>
            </div>

            {isLinkedOpen && (
              <div className="backlink-list">
                {backlinks.length === 0 ? (
                  <div className="backlink-empty">No linked mentions found</div>
                ) : (
                  backlinks.map((group) => (
                    <div key={group.sourceFile.path} className="backlink-group">
                      <div
                        className="backlink-group-header"
                        onClick={() => onSelectFile(group.sourceFile.path)}
                      >
                        <span className="backlink-filename">
                          {group.sourceFile.name.replace(/\.md$/, '')}
                        </span>
                        {group.sourceFile.path.includes('/') && (
                          <span className="backlink-filepath">
                            {group.sourceFile.path.replace(/\.md$/, '')}
                          </span>
                        )}
                      </div>
                      <div className="backlink-occurrences">
                        {group.occurrences.map((occ, idx) => (
                          <div
                            key={idx}
                            className="backlink-item"
                            onClick={() => onSelectFile(group.sourceFile.path)}
                          >
                            <span className="backlink-line-num">{occ.lineNumber}</span>
                            <span className="backlink-line-text">
                              {renderContextSnippet(occ.lineText, occ.rawMatch)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="backlink-section">
            <div
              className="backlink-section-title"
              onClick={() => setIsUnlinkedOpen((prev) => !prev)}
            >
              <div className="backlink-title-left">
                <span className="backlink-chevron">{isUnlinkedOpen ? '▾' : '▸'}</span>
                <span>Unlinked Mentions</span>
              </div>
              <span className="backlink-badge">0</span>
            </div>
            {isUnlinkedOpen && (
              <div className="backlink-list">
                <div className="backlink-empty">No unlinked mentions found</div>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  )
}
