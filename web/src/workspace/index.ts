/**
 * SyndicateBrain Workspace Module (HAR-T06)
 *
 * Public Contracts:
 *
 * 1. Navigation:
 *    export function openFileAt(path: string, line: number, span?: [number, number]): void
 *    export function onOpenFileAt(handler: (detail: OpenFileAtDetail) => void): () => void
 *
 *    Opens a note in the editor, switches to editor pane if graph is visible,
 *    scrolls to the specified 1-based line number, and highlights the character span.
 *    Communicates via global custom event `syndicate-brain:open-file-at`.
 *
 * 2. Right-Rail Panel Host:
 *    export function PanelHost(props: PanelHostProps): JSX.Element
 *
 *    Modular right-rail host for tabbed panels ('copilot', 'proposals', 'inspector', 'changed').
 *    Provides tab switching, panel rendering, collapse toggling, and clean decoupling.
 */

export {
  openFileAt,
  onOpenFileAt,
  useOpenFileAt,
  OPEN_FILE_AT_EVENT,
  type OpenFileAtDetail,
  type OpenFileAtHandler,
} from './navigation'

export {
  PanelHost,
  type PanelHostProps,
  type PanelItem,
  type PanelId,
  type StandardPanelId,
} from './PanelHost'
