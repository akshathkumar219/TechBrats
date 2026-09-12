export type ShortcutCategory = 'Formatting' | 'Navigation' | 'View' | 'Case'

export interface ShortcutItem {
  key: string
  label: string
  description?: string
  category: ShortcutCategory
}

export const SHORTCUTS: ShortcutItem[] = [
  // Formatting
  { key: '⌘B', label: 'Bold', description: 'Make selected text bold', category: 'Formatting' },
  { key: '⌘I', label: 'Italic', description: 'Make selected text italic', category: 'Formatting' },
  { key: '⌘⇧X', label: 'Strikethrough', description: 'Strike through selected text', category: 'Formatting' },
  { key: '⌘⇧C', label: 'Inline Code', description: 'Format selection as inline code', category: 'Formatting' },
  { key: '⌘K', label: 'Insert Link', description: 'Insert markdown link or wikilink', category: 'Formatting' },

  // Navigation
  { key: '⌘O', label: 'Quick Switcher', description: 'Find and jump to any note', category: 'Navigation' },
  { key: '⌘⇧F', label: 'Global Search', description: 'Search contents across all notes', category: 'Navigation' },
  { key: '⌥← / ⌥→', label: 'History Back / Forward', description: 'Navigate active tab history', category: 'Navigation' },

  // View
  { key: '⌘G', label: 'Evidence Graph', description: 'Toggle between editor and graph view', category: 'View' },
  { key: '⌘E', label: 'Cycle Editor Mode', description: 'Live Preview → Source → Reading', category: 'View' },
  { key: '⌘P', label: 'Command Palette', description: 'Run workbench actions and tools', category: 'View' },
  { key: '⌘/', label: 'Shortcuts Reference', description: 'Show keyboard shortcuts cheatsheet', category: 'View' },

  // Case
  { key: '⌘⇧A', label: 'Analyse Case', description: 'Extract entities and connections with AI', category: 'Case' },
  { key: 'Esc', label: 'Close Dialog', description: 'Dismiss current modal, overlay, or search', category: 'Case' },
]

export const CATEGORIES: ShortcutCategory[] = ['Formatting', 'Navigation', 'View', 'Case']
