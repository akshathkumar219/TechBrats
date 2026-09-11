import type { VaultFile } from '../fs/vault'

interface FileTreeProps {
  files: VaultFile[]
  selectedPath: string | null
  onSelectFile: (path: string) => void
  isLoading: boolean
  error: string | null
}

export function FileTree({
  files,
  selectedPath,
  onSelectFile,
  isLoading,
  error,
}: FileTreeProps) {
  return (
    <aside className="left">
      <div className="left-search-box">
        <input
          type="text"
          className="input-search"
          placeholder="Search notes..."
          disabled={files.length === 0}
        />
      </div>
      <div className="panel-header">
        <span>Files {files.length > 0 ? `(${files.length})` : ''}</span>
      </div>

      {error && (
        <div className="placeholder-content">
          <p style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="placeholder-content">
          <p>Scanning files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="placeholder-content">
          <p>Click &ldquo;Open folder&rdquo; to load a vault.</p>
        </div>
      ) : (
        <div className="file-list">
          {files.map((file) => (
            <div
              key={file.path}
              className={`file-item ${selectedPath === file.path ? 'active' : ''}`}
              onClick={() => onSelectFile(file.path)}
              title={file.path}
            >
              <span className="file-item-icon">📄</span>
              <span className="file-item-name">{file.path}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  )
}
