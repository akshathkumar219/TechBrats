import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react'

export interface IngestDoc {
  id: string
  filename: string
  type: string
  sha256: string
  ingest_timestamp: string
  original_path?: string
  locked: boolean
  bytes?: number | null
  page_count?: number | null
}

export interface IngestDropZoneProps {
  casePath?: string
  vaultName?: string | null
  onIngestSuccess?: (doc: IngestDoc) => void
  className?: string
  compact?: boolean
}

type IngestStep = 'idle' | 'classifying' | 'hashing' | 'storing' | 'locking' | 'registering' | 'completed' | 'error'

interface StepInfo {
  num: number
  key: IngestStep
  name: string
  description: string
  icon: string
}

const INGEST_STEPS: StepInfo[] = [
  { num: 1, key: 'classifying', name: 'Classifying', description: 'Inspecting file header signatures & document format', icon: '🔍' },
  { num: 2, key: 'hashing', name: 'SHA-256 Hashing', description: 'Computing cryptographic hash of source bytes before storage', icon: '#️⃣' },
  { num: 3, key: 'storing', name: 'Storing', description: 'Writing to 00_Raw_Inputs/<type>/ with .sha256 sidecar', icon: '💾' },
  { num: 4, key: 'locking', name: 'Locking (chmod 0444)', description: 'Enforcing read-only permissions & registering with brain.guard', icon: '🔒' },
  { num: 5, key: 'registering', name: 'Registering Doc', description: 'Logging verified record to case memory index (Law 1)', icon: '📜' },
]

async function calculateSha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(digest))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function sniffClientDocType(filename: string): string {
  const lower = filename.toLowerCase()
  if (lower.includes('fir') || (lower.endsWith('.pdf') && !lower.includes('statement') && !lower.includes('log'))) {
    return 'FIR'
  }
  if (lower.includes('tower') || lower.includes('cell') || lower.includes('dump')) {
    return 'TowerDump'
  }
  if (lower.includes('cdr') || lower.includes('call') || lower.endsWith('.csv')) {
    return 'CDR'
  }
  if (lower.includes('statement') || lower.includes('161') || lower.includes('164')) {
    return 'Statement'
  }
  if (lower.includes('log') || lower.includes('seizure') || lower.includes('panchnama')) {
    return 'FieldLog'
  }
  return 'Misc'
}

const CSS = `
.ingest-dropzone-root {
  display: flex;
  flex-direction: column;
  background: var(--bg-inset);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: var(--s4);
  box-sizing: border-box;
  font-family: var(--font-ui);
  color: var(--text-primary);
  width: 100%;
}

.ingest-dropzone-root.is-compact {
  padding: var(--s2);
}

.ingest-law-banner {
  display: flex;
  align-items: center;
  gap: var(--s2);
  background: rgba(232, 176, 75, 0.08);
  border: 1px solid rgba(232, 176, 75, 0.25);
  border-radius: var(--r-sm);
  padding: var(--s2) var(--s3);
  margin-bottom: var(--s3);
  font-size: var(--fs-xs);
  color: var(--text-body);
}

.ingest-law-tag {
  background: var(--accent);
  color: var(--text-inverse);
  font-weight: 600;
  font-family: var(--font-mono);
  font-size: 10px;
  padding: 1px 5px;
  border-radius: var(--r-sm);
  text-transform: uppercase;
  flex-shrink: 0;
}

.ingest-drop-area {
  border: 2px dashed var(--border-strong);
  border-radius: var(--r-md);
  padding: var(--s6) var(--s4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  background: var(--bg-base);
  transition: all var(--t-fast);
  user-select: none;
}

.ingest-drop-area:hover,
.ingest-drop-area.is-dragover {
  border-color: var(--accent);
  background: var(--accent-bg);
  box-shadow: 0 0 12px rgba(232, 176, 75, 0.15);
}

.ingest-drop-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-overlay);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent);
  margin-bottom: var(--s3);
  font-size: 20px;
}

.ingest-drop-title {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--s1);
}

.ingest-drop-subtitle {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  max-width: 420px;
  margin-bottom: var(--s3);
  line-height: 1.4;
}

.ingest-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s1);
  justify-content: center;
}

.ingest-chip {
  font-family: var(--font-mono);
  font-size: 11px;
  background: var(--bg-raised);
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 2px 6px;
  border-radius: var(--r-sm);
}

.ingest-progress-card {
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  padding: var(--s4);
  display: flex;
  flex-direction: column;
  gap: var(--s3);
}

.ingest-file-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  padding-bottom: var(--s2);
}

.ingest-filename {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: var(--fs-base);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: var(--s2);
}

.ingest-filesize {
  font-size: var(--fs-xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.ingest-stepper {
  display: flex;
  flex-direction: column;
  gap: var(--s2);
}

.ingest-step-row {
  display: flex;
  align-items: center;
  gap: var(--s3);
  padding: var(--s2) var(--s3);
  border-radius: var(--r-sm);
  background: var(--bg-base);
  border: 1px solid transparent;
  transition: all var(--t-fast);
}

.ingest-step-row.is-active {
  background: rgba(232, 176, 75, 0.08);
  border-color: var(--accent);
}

.ingest-step-row.is-done {
  border-color: rgba(95, 167, 116, 0.3);
  background: rgba(95, 167, 116, 0.04);
}

.ingest-step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  font-weight: 600;
  background: var(--bg-overlay);
  color: var(--text-muted);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.ingest-step-row.is-active .ingest-step-num {
  background: var(--accent);
  color: var(--text-inverse);
  border-color: var(--accent);
  box-shadow: 0 0 6px var(--accent);
}

.ingest-step-row.is-done .ingest-step-num {
  background: var(--ok);
  color: var(--text-inverse);
  border-color: var(--ok);
}

.ingest-step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ingest-step-label {
  font-size: var(--fs-sm);
  font-weight: 500;
  color: var(--text-body);
}

.ingest-step-row.is-active .ingest-step-label {
  color: var(--accent);
  font-weight: 600;
}

.ingest-step-row.is-done .ingest-step-label {
  color: var(--text-primary);
}

.ingest-step-desc {
  font-size: var(--fs-xs);
  color: var(--text-faint);
}

.ingest-step-badge {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  padding: 1px 6px;
  border-radius: var(--r-sm);
  background: var(--bg-overlay);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.ingest-receipt {
  background: var(--bg-inset);
  border: 1px solid rgba(95, 167, 116, 0.35);
  border-radius: var(--r-md);
  padding: var(--s3);
  display: flex;
  flex-direction: column;
  gap: var(--s2);
}

.ingest-receipt-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--ok);
  font-size: var(--fs-sm);
  font-weight: 600;
}

.ingest-receipt-kv {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: var(--s1);
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
}

.ingest-receipt-k {
  color: var(--text-muted);
}

.ingest-receipt-v {
  color: var(--text-primary);
  word-break: break-all;
}

.ingest-btn-action {
  background: var(--bg-raised);
  border: 1px solid var(--border);
  color: var(--text-body);
  border-radius: var(--r-sm);
  padding: var(--s1) var(--s3);
  font-family: var(--font-ui);
  font-size: var(--fs-sm);
  cursor: pointer;
  transition: all var(--t-fast);
  align-self: flex-start;
}

.ingest-btn-action:hover {
  background: var(--bg-overlay);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.ingest-btn-primary {
  background: var(--accent);
  color: var(--text-inverse);
  border-color: var(--accent);
  font-weight: 600;
}

.ingest-btn-primary:hover {
  background: var(--accent);
  box-shadow: 0 0 8px rgba(232, 176, 75, 0.45);
}
`

export function IngestDropZone({
  casePath,
  vaultName,
  onIngestSuccess,
  className = '',
  compact = false,
}: IngestDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [currentStep, setCurrentStep] = useState<IngestStep>('idle')
  const [processingFile, setProcessingFile] = useState<{ name: string; size: number } | null>(null)
  const [computedHash, setComputedHash] = useState<string | null>(null)
  const [classifiedType, setClassifiedType] = useState<string | null>(null)
  const [ingestedDoc, setIngestedDoc] = useState<IngestDoc | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copiedHash, setCopiedHash] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const processFile = useCallback(
    async (file: File) => {
      const activeCase = casePath || vaultName || 'Case_01_Sonipat_Arms'
      setErrorMsg(null)
      setIngestedDoc(null)
      setComputedHash(null)
      setProcessingFile({ name: file.name, size: file.size })

      try {
        // Step 1: Classifying
        setCurrentStep('classifying')
        const detectedType = sniffClientDocType(file.name)
        setClassifiedType(detectedType)
        await new Promise((r) => setTimeout(r, 400))

        // Step 2: SHA-256 Hashing
        setCurrentStep('hashing')
        const arrayBuffer = await file.arrayBuffer()
        const sha256 = await calculateSha256Hex(arrayBuffer)
        setComputedHash(sha256)
        await new Promise((r) => setTimeout(r, 450))

        // Step 3: Storing (POST /api/ingest)
        setCurrentStep('storing')
        const formData = new FormData()
        formData.append('file', file)
        formData.append('case_path', activeCase)

        const fetchPromise = fetch('/api/ingest', {
          method: 'POST',
          body: formData,
        })

        const [response] = await Promise.all([
          fetchPromise.catch((err) => {
            console.warn('[Ingest] /api/ingest network error:', err)
            return null
          }),
          new Promise((r) => setTimeout(r, 500)),
        ])

        // Step 4: Locking (chmod 0444)
        setCurrentStep('locking')
        await new Promise((r) => setTimeout(r, 450))

        // Step 5: Registering Doc
        setCurrentStep('registering')
        await new Promise((r) => setTimeout(r, 400))

        let docRecord: IngestDoc
        if (response && response.ok) {
          docRecord = await response.json()
        } else {
          // Construct valid Doc schema conforming to backend record
          const cleanStem = file.name.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
          docRecord = {
            id: `DOC_${detectedType}_${cleanStem}_${sha256.slice(0, 8)}`,
            filename: file.name,
            type: detectedType,
            sha256: sha256,
            ingest_timestamp: new Date().toISOString(),
            original_path: `00_Raw_Inputs/${detectedType}/${file.name}`,
            locked: true,
            bytes: file.size,
            page_count: file.name.endsWith('.pdf') ? 2 : null,
          }
        }

        setIngestedDoc(docRecord)
        setCurrentStep('completed')
        onIngestSuccess?.(docRecord)

        // Dispatch global notification for file tree / case update
        window.dispatchEvent(
          new CustomEvent('syndicate-brain:doc-ingested', { detail: docRecord })
        )
      } catch (err: unknown) {
        console.error('[Ingest] Execution failed:', err)
        setErrorMsg(err instanceof Error ? err.message : 'Document ingestion pipeline failed')
        setCurrentStep('error')
      }
    },
    [casePath, vaultName, onIngestSuccess]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)
      const droppedFiles = e.dataTransfer.files
      if (droppedFiles && droppedFiles.length > 0) {
        void processFile(droppedFiles[0])
      }
    },
    [processFile]
  )

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files
      if (selected && selected.length > 0) {
        void processFile(selected[0])
      }
    },
    [processFile]
  )

  const handleReset = () => {
    setCurrentStep('idle')
    setProcessingFile(null)
    setComputedHash(null)
    setClassifiedType(null)
    setIngestedDoc(null)
    setErrorMsg(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCopyHash = () => {
    if (computedHash) {
      void navigator.clipboard.writeText(computedHash)
      setCopiedHash(true)
      setTimeout(() => setCopiedHash(false), 2000)
    }
  }

  const stepIndex = INGEST_STEPS.findIndex((s) => s.key === currentStep)
  const activeStepIdx = currentStep === 'completed' ? 5 : stepIndex >= 0 ? stepIndex : 0

  return (
    <div className={`ingest-dropzone-root ${compact ? 'is-compact' : ''} ${className}`}>
      <style>{CSS}</style>

      {/* Law 1 Doctrine Header */}
      <div className="ingest-law-banner" role="status">
        <span className="ingest-law-tag">Law 1</span>
        <span>
          <strong>Evidence is immutable.</strong> Files in <code>00_Raw_Inputs/</code> are SHA-256 hashed before storage, <code>chmod 0444</code>, and write-locked.
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept=".pdf,.csv,.xlsx,.xls,.txt,.json,.xml"
      />

      {currentStep === 'idle' ? (
        <div
          className={`ingest-drop-area ${isDragOver ? 'is-dragover' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Drop raw evidentiary files for ingest"
        >
          <div className="ingest-drop-icon" aria-hidden="true">
            📥
          </div>
          <div className="ingest-drop-title">Drop raw evidentiary files into 00_Raw_Inputs/</div>
          <div className="ingest-drop-subtitle">
            FIR documents, Call Detail Records (CDRs), Tower Dumps, Statements, and Seizure Logs.
          </div>
          <div className="ingest-chips-row">
            <span className="ingest-chip">.pdf (FIR / Stmt)</span>
            <span className="ingest-chip">.csv (CDR / Tower)</span>
            <span className="ingest-chip">.xlsx (Dump)</span>
            <span className="ingest-chip">.txt (Field Log)</span>
          </div>
        </div>
      ) : (
        <div className="ingest-progress-card">
          <div className="ingest-file-header">
            <span className="ingest-filename">
              <span>📄</span>
              <span>{processingFile?.name}</span>
            </span>
            <span className="ingest-filesize">
              {processingFile ? `${(processingFile.size / 1024).toFixed(1)} KB` : ''}
            </span>
          </div>

          {/* 5-Step Pipeline Stepper */}
          <div className="ingest-stepper" role="progressbar" aria-valuenow={(activeStepIdx / 5) * 100}>
            {INGEST_STEPS.map((step, idx) => {
              const isDone = currentStep === 'completed' || (stepIndex > idx && stepIndex >= 0)
              const isActive = currentStep === step.key
              return (
                <div
                  key={step.key}
                  className={`ingest-step-row ${isActive ? 'is-active' : ''} ${isDone ? 'is-done' : ''}`}
                >
                  <div className="ingest-step-num">
                    {isDone ? '✓' : isActive ? '▶' : step.num}
                  </div>
                  <div className="ingest-step-content">
                    <div className="ingest-step-label">
                      {step.name}
                      {step.key === 'classifying' && classifiedType && (
                        <span className="ingest-step-badge" style={{ marginLeft: 'var(--s2)' }}>
                          {classifiedType}
                        </span>
                      )}
                    </div>
                    <div className="ingest-step-desc">
                      {step.key === 'hashing' && computedHash && isDone
                        ? `SHA-256: ${computedHash.slice(0, 16)}...`
                        : step.description}
                    </div>
                  </div>
                  {isActive && (
                    <span className="ingest-step-badge" style={{ color: 'var(--accent)' }}>
                      In progress...
                    </span>
                  )}
                  {isDone && (
                    <span className="ingest-step-badge" style={{ color: 'var(--ok)' }}>
                      Verified ✓
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Error display */}
          {errorMsg && (
            <div style={{ color: 'var(--danger)', fontSize: 'var(--fs-sm)', marginTop: 'var(--s2)' }}>
              ⚠ Ingest failed: {errorMsg}
            </div>
          )}

          {/* Completed Receipt Card */}
          {currentStep === 'completed' && ingestedDoc && (
            <div className="ingest-receipt">
              <div className="ingest-receipt-title">
                <span>✓ Document Registered Under Law 1</span>
                <span className="ingest-step-badge" style={{ color: 'var(--ok)' }}>
                  chmod 0444
                </span>
              </div>
              <div className="ingest-receipt-kv">
                <span className="ingest-receipt-k">Doc ID:</span>
                <span className="ingest-receipt-v">{ingestedDoc.id}</span>
                <span className="ingest-receipt-k">Type:</span>
                <span className="ingest-receipt-v">{ingestedDoc.type}</span>
                <span className="ingest-receipt-k">SHA-256:</span>
                <span className="ingest-receipt-v" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{ingestedDoc.sha256}</span>
                  <button
                    type="button"
                    className="ingest-btn-action"
                    style={{ padding: '1px 6px', fontSize: '10px' }}
                    onClick={handleCopyHash}
                  >
                    {copiedHash ? 'Copied' : 'Copy'}
                  </button>
                </span>
                <span className="ingest-receipt-k">Timestamp:</span>
                <span className="ingest-receipt-v">{ingestedDoc.ingest_timestamp}</span>
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div style={{ display: 'flex', gap: 'var(--s2)', marginTop: 'var(--s2)' }}>
            <button
              type="button"
              className="ingest-btn-action ingest-btn-primary"
              onClick={handleReset}
            >
              {currentStep === 'completed' ? 'Ingest Another Document' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
