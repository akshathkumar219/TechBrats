/**
 * SyndicateBrain (SIH26189) — Copilot Types
 * Strict adherence to Case Model Law 3 & Law 4 (Evidentiary Citations).
 */

export interface CitationItem {
  source_doc_id: string
  locator: string
  snippet?: string | null
  observed_at?: string | null
  tier?: string
}

export interface RetrievedNoteMeta {
  rawPath: string
  filename: string
  entityType: string
  badgeColorVar: string
}

export interface CopilotRequest {
  question: string
  case_id?: string
}

export interface CopilotResponse {
  answer: string
  citations: CitationItem[]
  notes_retrieved: string[]
  is_not_found?: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: CitationItem[]
  notesRetrieved?: string[]
  isStreaming?: boolean
  isLoading?: boolean
  isError?: boolean
  isProviderUnreachable?: boolean
  isNotFound?: boolean
  errorTitle?: string
  errorMessage?: string
  errorDetails?: string
  timestamp?: string
}

export interface CitationChipProps {
  source?: string
  locator?: string | null
  path?: string
  line?: number
  span?: [number, number]
  citation?: CitationItem
  retrievedNotes?: string[]
  onClick?: (source: string, locator?: string | null) => void
  className?: string
  inline?: boolean
}

export interface CopilotMessageProps {
  message: ChatMessage
  onCitationClick?: (source: string, locator?: string | null) => void
  onNoteClick?: (notePath: string) => void
  onRetry?: (messageId: string) => void
}

export interface CopilotPanelProps {
  caseId?: string | null
  isCaseOpen?: boolean
  isProviderUnreachable?: boolean
  providerErrorDetails?: string
  initialMessages?: ChatMessage[]
  messages?: ChatMessage[]
  setMessages?: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  onMessagesChange?: (messages: ChatMessage[]) => void
  onCitationClick?: (source: string, locator?: string | null) => void
  onNoteClick?: (notePath: string) => void
  onRetryProvider?: () => void
  draft?: string
  setDraft?: (draft: string) => void
  className?: string
  style?: React.CSSProperties
  onClose?: () => void
}
