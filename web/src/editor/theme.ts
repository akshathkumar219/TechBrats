import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

/**
 * CM6 theme built entirely from the design tokens in index.css.
 * No hardcoded colours — every value is a var() lookup.
 */
export const editorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: 'transparent',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-note)',
      fontSize: 'var(--fs-md)',
    },
    '.cm-scroller': {
      fontFamily: 'var(--font-note)',
      lineHeight: '1.65',
      overflow: 'auto',
    },
    '.cm-content': {
      padding: '0',
      caretColor: 'var(--accent)',
    },
    '.cm-line': { padding: '0' },

    // Cursor
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--accent)',
      borderLeftWidth: '2px',
    },

    // Selection — CM6 needs both selectors, and !important to beat the base theme
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'var(--accent-bg) !important',
    },
    '.cm-selectionMatch': { backgroundColor: 'rgba(232,176,75,0.14)' },

    '.cm-activeLine': { backgroundColor: 'rgba(255,255,255,0.022)' },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--text-muted)',
    },

    // Fold gutter
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: 'var(--text-faint)',
      border: 'none',
      paddingRight: 'var(--s1)',
    },
    '.cm-foldGutter .cm-gutterElement': {
      cursor: 'pointer',
      opacity: '0',
      transition: 'opacity var(--t-fast)',
    },
    '.cm-gutters:hover .cm-foldGutter .cm-gutterElement': { opacity: '1' },
    '.cm-foldPlaceholder': {
      backgroundColor: 'var(--bg-overlay)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      color: 'var(--text-muted)',
      padding: '0 var(--s2)',
      margin: '0 var(--s1)',
    },

    '.cm-matchingBracket, .cm-nonmatchingBracket': {
      backgroundColor: 'var(--accent-bg)',
      outline: '1px solid var(--accent-dim)',
    },

    // Search panel
    '.cm-panels': {
      backgroundColor: 'var(--bg-raised)',
      color: 'var(--text-body)',
      borderTop: '1px solid var(--border)',
    },
    '.cm-panels input, .cm-panels button': {
      backgroundColor: 'var(--bg-inset)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '2px var(--s2)',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-sm)',
    },
    '.cm-searchMatch': { backgroundColor: 'rgba(232,176,75,0.20)' },
    '.cm-searchMatch-selected': { backgroundColor: 'rgba(232,176,75,0.40)' },

    // Autocomplete dropdown
    '.cm-tooltip': {
      backgroundColor: 'var(--bg-overlay)',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--r-md)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul': {
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-base)',
      maxHeight: '18em',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li': {
      padding: 'var(--s1) var(--s3)',
      color: 'var(--text-body)',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: 'var(--accent-bg)',
      color: 'var(--text-primary)',
    },
    '.cm-completionLabel': { fontFamily: 'var(--font-ui)' },
    '.cm-completionDetail': {
      color: 'var(--text-faint)',
      fontSize: 'var(--fs-xs)',
      fontStyle: 'normal',
      marginLeft: 'var(--s3)',
    },

    '.cm-placeholder': { color: 'var(--text-faint)' },

    // Live preview markdown styles
    '.cm-strong': { fontWeight: '600', color: 'var(--text-primary)' },
    '.cm-em': { fontStyle: 'italic', color: 'var(--text-primary)' },
    '.cm-strikethrough': { textDecoration: 'line-through', color: 'var(--text-muted)' },
    '.cm-inline-code': {
      fontFamily: 'var(--font-mono)',
      fontSize: '0.92em',
      backgroundColor: 'var(--bg-overlay)',
      border: '1px solid var(--border)',
      padding: '1px 5px',
      borderRadius: 'var(--r-sm)',
      color: 'var(--info)',
    },
    '.cm-link-text': {
      color: 'var(--accent)',
      textDecoration: 'underline',
      textUnderlineOffset: '2px',
    },
    '.cm-wikilink': {
      color: 'var(--accent)',
      textDecoration: 'underline',
      textUnderlineOffset: '2px',
      fontWeight: '500',
      cursor: 'pointer',
    },
    '.cm-task-checkbox': {
      marginRight: 'var(--s2)',
      accentColor: 'var(--accent)',
      cursor: 'pointer',
      verticalAlign: 'middle',
    },
    '.cm-hr': {
      border: 'none',
      borderTop: '1px solid var(--border)',
      margin: 'var(--s3) 0',
      width: '100%',
    },
    '.cm-formatting-blockquote': {
      borderLeft: '3px solid var(--border-strong)',
      paddingLeft: 'var(--s3) !important',
      color: 'var(--text-muted)',
    },
    '.cm-frontmatter-widget': {
      marginBottom: 'var(--s4)',
      cursor: 'pointer',
    },
  },
  { dark: true }
)

/**
 * Markdown syntax highlighting.
 *
 * The key line is `processingInstruction` — that's what Lezer tags the raw
 * markdown marks (`#`, `**`, `>`, `-`). Fading them to --text-faint is the
 * single biggest step toward the Obsidian look before any live-preview
 * decoration work exists.
 */
export const markdownHighlight = HighlightStyle.define([
  { tag: t.processingInstruction, color: 'var(--text-faint)' },

  { tag: t.heading1, fontSize: 'var(--fs-xl)', fontWeight: '600', color: 'var(--text-primary)' },
  { tag: t.heading2, fontSize: 'var(--fs-lg)', fontWeight: '600', color: 'var(--text-primary)' },
  { tag: t.heading3, fontSize: 'var(--fs-md)', fontWeight: '600', color: 'var(--text-primary)' },
  { tag: [t.heading4, t.heading5, t.heading6], fontSize: 'var(--fs-base)', fontWeight: '600', color: 'var(--text-primary)' },

  { tag: t.strong, fontWeight: '700', color: 'var(--text-primary)' },
  { tag: t.emphasis, fontStyle: 'italic', color: 'var(--text-primary)' },
  { tag: t.strikethrough, textDecoration: 'line-through', color: 'var(--text-muted)' },

  { tag: t.link, color: 'var(--accent)', textDecoration: 'none' },
  { tag: t.url, color: 'var(--text-faint)' },

  { tag: t.monospace, fontFamily: 'var(--font-mono)', fontSize: '0.92em', color: 'var(--info)' },
  { tag: t.quote, color: 'var(--text-muted)', fontStyle: 'italic' },
  { tag: t.list, color: 'var(--accent)' },

  { tag: t.contentSeparator, color: 'var(--border-strong)' },

  // Fenced code block contents
  { tag: t.keyword, color: 'var(--hypothesis)' },
  { tag: [t.string, t.special(t.string)], color: 'var(--ok)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--accent)' },
  { tag: t.comment, color: 'var(--text-faint)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.labelName], color: 'var(--info)' },
  { tag: t.typeName, color: 'var(--e-device)' },
])

export const syntaxTheme = syntaxHighlighting(markdownHighlight)
