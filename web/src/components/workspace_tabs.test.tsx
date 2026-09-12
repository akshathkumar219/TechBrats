/// <reference types="node" />
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { register } from 'node:module'

register(
  'data:text/javascript,export async function load(url, c, next) { if (url.endsWith(".css")) return { format: "module", shortCircuit: true, source: "export default {}" }; return next(url, c); }',
  import.meta.url
)

;(globalThis as any).React = React

if (typeof globalThis.window === 'undefined') {
  const listeners = new Map()
  ;(globalThis as any).window = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener: (type: string, fn: any) => {
      listeners.set(type, fn)
    },
    removeEventListener: (type: string) => {
      listeners.delete(type)
    },
    dispatchEvent: () => true,
  }
}
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map()
  ;(globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  }
}

const { Workspace } = await import('./Workspace.tsx')
const { CopilotPanel } = await import('../copilot/CopilotPanel.tsx')

describe('Workspace Tab Management and Copilot Header', () => {
  it('1. Copilot top row text has NO leading icon and uses sidebar toggle icon instead of cross', () => {
    const el = (
      <Workspace
        vaultName="Case_01_Sonipat_Arms"
        files={[{ path: '01_People/Vikram Singh.md', name: 'Vikram Singh.md' }]}
        activeFile={{ path: '01_People/Vikram Singh.md', name: 'Vikram Singh.md' }}
        wordCount={172}
        saveStatus="saved"
        sidebar={<div>Sidebar</div>}
        editor={<div>Editor</div>}
        onSelectFile={() => {}}
        onOpenVault={() => {}}
        onNewNote={() => {}}
        onNewFolder={() => {}}
        onQuickSwitcher={() => {}}
        onSearch={() => {}}
      />
    )
    const html = renderToStaticMarkup(el)

    // Verify copilot title has no icon
    assert.ok(html.includes('class="ws-copilot-title"><span>Copilot</span></div>'), 'Copilot title text has no leading icon')
    assert.ok(!html.includes('ws-copilot-title"><svg'), 'No svg icon inside ws-copilot-title')

    // Verify sidebar toggle button has sidebar icon (panelRight: M4 5h16v14H4z and M15 5v14) instead of cross (M18 6L6 18)
    assert.ok(html.includes('aria-label="Collapse sidebar"'), 'Top right button has aria-label="Collapse sidebar"')
    assert.ok(html.includes('title="Collapse sidebar"'), 'Top right button has title="Collapse sidebar"')
    assert.ok(html.includes('d="M15 5v14"'), 'Contains sidebar toggle right rail path')
  })

  it('2. CopilotPanel standalone header uses sidebar toggle and omits leading icon', () => {
    const el = (
      <CopilotPanel
        caseId="Case_01_Sonipat_Arms"
        isCaseOpen={true}
        onClose={() => {}}
      />
    )
    const html = renderToStaticMarkup(el)

    assert.ok(!html.includes('copilot-header-icon'), 'No copilot-header-icon rendered')
    assert.ok(html.includes('title="Collapse sidebar"'), 'OnClose button has title="Collapse sidebar"')
    assert.ok(html.includes('x1="15"'), 'Contains panel divider line')
    assert.ok(!html.includes('M18 6L6 18'), 'Does not contain cross path in close button')
  })

  it('3. Workspace renders active tab for open note', () => {
    const el = (
      <Workspace
        vaultName="Case_01_Sonipat_Arms"
        files={[{ path: '01_People/Vikram Singh.md', name: 'Vikram Singh.md' }]}
        activeFile={{ path: '01_People/Vikram Singh.md', name: 'Vikram Singh.md' }}
        wordCount={172}
        saveStatus="saved"
        sidebar={<div>Sidebar</div>}
        editor={<div>Editor</div>}
        onSelectFile={() => {}}
        onOpenVault={() => {}}
        onNewNote={() => {}}
        onNewFolder={() => {}}
        onQuickSwitcher={() => {}}
        onSearch={() => {}}
      />
    )
    const html = renderToStaticMarkup(el)

    assert.ok(html.includes('ws-tab is-active'), 'Renders active tab')
    assert.ok(html.includes('Vikram Singh'), 'Tab label shows note title')
    assert.ok(html.includes('aria-label="Close Vikram Singh"'), 'Close tab button has accessible label')
  })

  it('4. Workspace renders empty state when activeFile is null', () => {
    const el = (
      <Workspace
        vaultName="Case_01_Sonipat_Arms"
        files={[]}
        activeFile={null}
        wordCount={0}
        saveStatus="saved"
        sidebar={<div>Sidebar</div>}
        editor={<div>Editor</div>}
        onSelectFile={() => {}}
        onOpenVault={() => {}}
        onNewNote={() => {}}
        onNewFolder={() => {}}
        onQuickSwitcher={() => {}}
        onSearch={() => {}}
      />
    )
    const html = renderToStaticMarkup(el)

    assert.ok(html.includes('ws-empty-obsidian'), 'Renders empty state when activeFile is null')
    assert.ok(html.includes('New tab'), 'Tab label shows New tab')
  })
})
