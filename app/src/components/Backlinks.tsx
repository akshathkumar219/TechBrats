export function Backlinks() {
  return (
    <aside className="right">
      <div className="panel-header">
        <span>Backlinks</span>
      </div>
      <div className="backlink-section">
        <div className="backlink-section-title">
          <span>Linked Mentions</span>
          <span>0</span>
        </div>
      </div>
      <div className="backlink-section">
        <div className="backlink-section-title">
          <span>Unlinked Mentions</span>
          <span>0</span>
        </div>
      </div>
      <div className="placeholder-content">
        <p>Select a note to inspect incoming mentions.</p>
      </div>
    </aside>
  )
}
