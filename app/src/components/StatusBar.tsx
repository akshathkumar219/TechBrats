interface StatusBarProps {
  filePath: string | null
  wordCount?: number
  saveStatus?: 'saved' | 'unsaved'
}

export function StatusBar({
  filePath,
  wordCount = 0,
  saveStatus = 'saved',
}: StatusBarProps) {
  return (
    <footer className="status">
      <div className="status-item">
        <span>{filePath ?? 'No file selected'}</span>
      </div>
      <div className="status-item">
        <span>{wordCount} words</span>
      </div>
      <div className="status-item">
        <span className={`status-indicator ${saveStatus === 'unsaved' ? 'unsaved' : ''}`} />
        <span>{saveStatus}</span>
      </div>
    </footer>
  )
}
