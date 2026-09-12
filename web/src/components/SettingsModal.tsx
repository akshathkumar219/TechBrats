import { useState, useEffect } from 'react'

export interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  vaultName: string | null
}

export function SettingsModal({ isOpen, onClose, vaultName }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'case' | 'ai' | 'editor'>('case')
  const [preferCache, setPreferCache] = useState<boolean>(() => {
    const val = localStorage.getItem('sb_prefer_cache')
    return val !== null ? val === 'true' : true
  })
  const [modelName, setModelName] = useState<string>(() => {
    return localStorage.getItem('sb_ai_model') || 'llama3'
  })
  const [provider, setProvider] = useState<string>(() => {
    return localStorage.getItem('sb_ai_provider') || 'ollama'
  })
  const [lineNumbers, setLineNumbers] = useState<boolean>(() => {
    const val = localStorage.getItem('sb_editor_line_numbers')
    return val !== null ? val === 'true' : true
  })
  const [savedNotice, setSavedNotice] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSave = () => {
    localStorage.setItem('sb_prefer_cache', String(preferCache))
    localStorage.setItem('sb_ai_model', modelName)
    localStorage.setItem('sb_ai_provider', provider)
    localStorage.setItem('sb_editor_line_numbers', String(lineNumbers))
    setSavedNotice(true)
    setTimeout(() => {
      setSavedNotice(false)
      onClose()
    }, 800)
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      style={{ zIndex: 1000 }}
    >
      <div
        className="command-palette-box"
        style={{ maxWidth: 620, width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shortcuts-head" style={{ borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: 'var(--fs-base)', color: 'var(--text-primary)' }}>
              SyndicateBrain Settings
            </span>
          </div>
          <button
            type="button"
            className="shortcuts-close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 var(--s4)', gap: 'var(--s2)' }}>
          <button
            type="button"
            className={`panel-host-tab${activeTab === 'case' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('case')}
            style={{ padding: 'var(--s2) var(--s3)' }}
          >
            Investigation Case
          </button>
          <button
            type="button"
            className={`panel-host-tab${activeTab === 'ai' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('ai')}
            style={{ padding: 'var(--s2) var(--s3)' }}
          >
            AI Engine & Models
          </button>
          <button
            type="button"
            className={`panel-host-tab${activeTab === 'editor' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('editor')}
            style={{ padding: 'var(--s2) var(--s3)' }}
          >
            Editor & Display
          </button>
        </div>

        <div style={{ padding: 'var(--s4)', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}>
          {activeTab === 'case' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--fs-xs)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.05em' }}>
                  Current Investigation Case
                </label>
                <div style={{ padding: 'var(--s2) var(--s3)', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)' }}>
                  📁 {vaultName || 'Case_01_Sonipat_Arms'}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--fs-xs)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.05em' }}>
                  Enforced Case Model Laws (Active)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 'var(--fs-xs)', color: 'var(--text-body)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--ok)' }}>✓</span>
                    <strong>Law 1: Raw Inputs Are Sacred</strong> — <code>00_Raw_Inputs/</code> write-protected
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--ok)' }}>✓</span>
                    <strong>Law 2: Proposals Only</strong> — AI edits queued for human detective approval
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--ok)' }}>✓</span>
                    <strong>Law 3: Every Link Carries Provenance</strong> — Document ID, line & hash verified
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--ok)' }}>✓</span>
                    <strong>Law 4: Grounding Gate</strong> — Uncited claims automatically discarded
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              <div>
                <label htmlFor="settings-ai-provider" style={{ display: 'block', fontSize: 'var(--fs-xs)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Inference Provider
                </label>
                <select
                  id="settings-ai-provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  style={{ width: '100%', padding: 'var(--s2)', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}
                >
                  <option value="ollama">Ollama (Local Offline · Air-Gapped Police Network)</option>
                  <option value="gemini">Google Gemini API (Cloud Acceleration)</option>
                </select>
              </div>

              <div>
                <label htmlFor="settings-ai-model" style={{ display: 'block', fontSize: 'var(--fs-xs)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Active LLM Architecture
                </label>
                <select
                  id="settings-ai-model"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  style={{ width: '100%', padding: 'var(--s2)', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}
                >
                  <option value="llama3">Meta Llama 3 (8B Instruct · High Reasoning)</option>
                  <option value="qwen2.5:3b-instruct">Qwen 2.5 3B (Ultra Fast · Low Memory)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Multimodal · Long Context)</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--s2) 0', borderTop: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 'var(--fs-sm)', color: 'var(--text-primary)' }}>
                    Pre-Computed Response Cache
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                    Instant synthesis and Copilot responses for benchmark case evaluation
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferCache}
                  onChange={(e) => setPreferCache(e.target.checked)}
                  aria-label="Toggle response cache"
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'editor' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--s2) 0' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 'var(--fs-sm)', color: 'var(--text-primary)' }}>
                    CodeMirror Line Numbers
                  </div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
                    Display line numbers in markdown dossiers and evidence files
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={lineNumbers}
                  onChange={(e) => setLineNumbers(e.target.checked)}
                  aria-label="Toggle editor line numbers"
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--fs-xs)', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>
                  Color Theme
                </label>
                <div style={{ padding: 'var(--s2) var(--s3)', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 'var(--fs-sm)', color: 'var(--text-primary)' }}>
                  Obsidian Dark (Tactical High-Contrast Investigation Theme)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: 'var(--s3) var(--s4)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--s2)' }}>
          {savedNotice && (
            <span style={{ color: 'var(--ok)', fontSize: 'var(--fs-xs)', fontWeight: 500 }}>
              ✓ Settings saved!
            </span>
          )}
          <button
            type="button"
            className="ws-pane-action-btn"
            style={{ width: 'auto', padding: 'var(--s1) var(--s3)' }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: 'var(--s1) var(--s4)', fontSize: 'var(--fs-sm)' }}
            onClick={handleSave}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  )
}
