import { useState, useEffect } from 'react'

export function App() {
  const [isPreviewOnly, setIsPreviewOnly] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault()
        setIsPreviewOnly((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <div className="app">
        {/* 1. Title bar (40px) */}
        <header className="title">
          <div className="vault-title">
            <span>SyndicateBrain</span>
            <span className="vault-badge">No Vault Loaded</span>
          </div>
          <div className="title-actions">
            <button type="button" className="btn">
              + New note
            </button>
            <button type="button" className="btn">
              + New folder
            </button>
            <button type="button" className="btn btn-primary">
              Open folder
            </button>
          </div>
        </header>

        {/* 2. Left rail (240px) */}
        <aside className="left">
          <div className="left-search-box">
            <input
              type="text"
              className="input-search"
              placeholder="Search notes..."
              disabled
            />
          </div>
          <div className="panel-header">
            <span>Files</span>
          </div>
          <div className="placeholder-content">
            <p>Open a folder to view notes.</p>
          </div>
        </aside>

        {/* 3. Centre (flex) - Split view */}
        <main className="center">
          <div className={`center-split ${isPreviewOnly ? 'preview-only' : ''}`}>
            <section className="editor-pane">
              <div className="pane-inner">
                <textarea
                  className="editor-textarea"
                  placeholder="Select a note from the left tree or create a new note..."
                  readOnly
                />
              </div>
            </section>
            <section className="preview-pane">
              <div className="pane-inner">
                <div className="preview-content">
                  <h1 className="note-h1">Investigation Workbench</h1>
                  <p className="note-body">
                    Markdown preview will render here. Toggle between raw and preview-only using <kbd>Cmd+E</kbd>.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>

        {/* 4. Right rail (320px) */}
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

        {/* 5. Status bar (24px) */}
        <footer className="status">
          <div className="status-item">
            <span>No file selected</span>
          </div>
          <div className="status-item">
            <span>0 words</span>
          </div>
          <div className="status-item">
            <span className="status-indicator" />
            <span>saved</span>
          </div>
        </footer>
      </div>

      {/* Window too small guard below 1280px */}
      <div className="window-too-small">
        <h2>Desktop Window Too Small</h2>
        <p>
          SyndicateBrain requires a minimum viewport width of 1280px to display all investigation panes. Please expand your browser window.
        </p>
      </div>
    </>
  )
}

export default App

