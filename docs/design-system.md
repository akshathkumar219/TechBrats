# SyndicateBrain — Design System: "Case File"

Companion to `blueprint.md` §10.

**Design thesis:** this is an instrument, not a dashboard. Dark, quiet, dense, fast. Zero neon, zero glassmorphism, zero decorative gradients. The only thing allowed to be visually loud is a contradiction or a non-evidentiary hypothesis — because those are the two things an officer must never miss.

**The organising rule:** *colour and line style encode evidentiary status.* Amber = verified. Magenta dashed = AI hypothesis. Red = contradiction. An officer should be able to tell, from across the room, whether they are looking at evidence or at a guess.

---

## 1. Tokens

```css
:root {
  /* Surfaces */
  --bg-void:      #0B0C0E;   /* window chrome, gutters */
  --bg-base:      #131519;   /* editor, main canvas */
  --bg-raised:    #1A1D22;   /* sidebars, cards, panels */
  --bg-overlay:   #22262C;   /* modals, popovers, hover states */
  --bg-inset:     #0E1013;   /* code blocks, inputs, wells */

  /* Lines */
  --border:       #2A2F36;
  --border-strong:#3A414A;
  --border-focus: #E8B04B;

  /* Text */
  --text-primary: #E6E8EA;
  --text-body:    #C4C9CF;
  --text-muted:   #8A9099;
  --text-faint:   #5A616B;
  --text-inverse: #0B0C0E;

  /* Semantic — evidentiary status */
  --evidence:      #E8B04B;   /* amber: verified, provenance-backed */
  --evidence-dim:  #8A6B2E;
  --evidence-bg:   rgba(232,176,75,0.10);
  --hypothesis:    #C2569E;   /* magenta: AI-predicted, NON-EVIDENTIARY */
  --hypothesis-bg: rgba(194,86,158,0.10);
  --danger:        #D4574E;   /* contradiction, alibi conflict, refusal */
  --danger-bg:     rgba(212,87,78,0.10);
  --ok:            #5FA774;   /* confirmed, adjudicated, hash-verified */
  --info:          #5B8FC7;   /* system messages, neutral metadata */

  /* Entity type accents (graph nodes + note icons) */
  --e-person:   #E8B04B;
  --e-phone:    #7FB3D5;
  --e-device:   #6FA8A0;
  --e-vehicle:  #B08CD9;
  --e-location: #8FBF7F;
  --e-tower:    #5FA774;
  --e-org:      #D98C5F;
  --e-fir:      #9AA3AD;
  --e-event:    #D4574E;

  /* Type */
  --font-ui:     "Inter", system-ui, sans-serif;
  --font-note:   "iA Writer Quattro", "Inter", sans-serif;
  --font-mono:   "JetBrains Mono", ui-monospace, monospace;
  --font-indic:  "Noto Sans Devanagari";

  --fs-xs: 11px; --fs-sm: 12px; --fs-base: 13px;
  --fs-md: 15px; --fs-lg: 18px; --fs-xl: 22px; --fs-2xl: 28px;

  /* Space — 4px grid */
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px; --s7:48px;

  /* Radius & elevation */
  --r-sm:4px; --r-md:6px; --r-lg:10px;
  --shadow-pop: 0 8px 24px rgba(0,0,0,0.45);

  /* Motion */
  --t-fast: 120ms cubic-bezier(0.2,0,0,1);
  --t-med:  200ms cubic-bezier(0.2,0,0,1);
}
```

**Light mode** ships but is not the default — forensic labs and night shifts. Invert surfaces, keep every semantic hue identical (amber/magenta/red must never change meaning across themes), darken amber to `#B07E1E` for contrast on white.

---

## 2. Typography

| Use | Font | Size | Weight | Line height |
| :--- | :--- | :--- | :--- | :--- |
| App UI, labels, menus | Inter | 13px | 450 | 1.4 |
| Sidebar / tree | Inter | 13px | 450 | 1.6 |
| Note body | iA Writer Quattro / Inter | 15px | 400 | 1.65 |
| Note H1 | Inter | 22px | 600 | 1.3 |
| Note H2 | Inter | 18px | 600 | 1.35 |
| Note H3 | Inter | 15px | 600 | 1.4 |
| Source badges | JetBrains Mono | 11px | 400 | 1.2 |
| Hashes, Cypher, locators | JetBrains Mono | 12px | 400 | 1.5 |
| Devanagari (any context) | Noto Sans Devanagari | +1px vs Latin | match | 1.75 |

Note editor content column caps at **72ch**. Reading FIR narratives at full-window width is exhausting.

---

## 2b. Target Viewport — Desktop Only, One Breakpoint

**This is a desktop application. There is no mobile build, no tablet build, and no responsive design.** Say this out loud in the pitch: criminal case data on a phone is a security liability, not a missing feature.

| | Value |
| :--- | :--- |
| Design target | **1440 × 900** (standard laptop) |
| Minimum supported | **1280 × 720** — below this, show a "window too small" message rather than reflowing |
| Maximum | unbounded; centre-cap the editor column at 72ch, let the graph canvas take the rest |
| Breakpoints | **one.** Panes have fixed pixel widths and the centre flexes. That is the entire layout system. |
| Input | keyboard + mouse. Hover states are reliable. Right-click menus are fine. No touch targets, no 44px minimums. |

**What desktop-only lets you delete outright** — every one of these is real work you are not doing:

- Responsive breakpoints, mobile nav, hamburger menus, collapsible panes
- Touch target sizing, swipe gestures, tap-vs-hover ambiguity
- PWA manifest, service worker, offline sync, install prompts
- Any layout that has to work without a persistent sidebar
- Mobile-safe font sizes — 13px UI and 11px mono are fine here
- Virtual keyboard handling, viewport-height hacks, safe-area insets

**And what it lets you assume** — each of these is a capability the design leans on:
- A real filesystem with a real path
- Multiple panes visible simultaneously, always
- Full keyboard shortcuts including modifier combos
- Enough RAM and CPU to render a few thousand graph nodes
- A single-user machine — no multi-tenancy, no auth, no sessions

**Note on the dev loop:** building in a browser tab during Phases 0–4 (see `roadmap.md`) is a *development* choice, not a platform choice. The output is a desktop app. Nothing in the UI should ever be designed for a small screen.

---

## 3. Layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ TITLE BAR  ‹case name›  [Ingest] [Timeline ▸] [⌘K]   ●graph ○editor      │ 40px
├────────────┬──────────────────────────────────────────┬──────────────────┤
│ LEFT RAIL  │  CENTER                                  │  RIGHT RAIL      │
│ 240px      │  flex                                    │  320px           │
│            │                                          │                  │
│ ⌕ Search   │  ┌ tab ┬ tab ┬ tab ────────────────────┐ │ ▸ Provenance     │
│ ▸ 00_Case  │  │                                     │ │   Inspector      │
│ ▸ 01_Evid  │  │   Editor  /  Graph  /  Timeline     │ │ ▸ Backlinks      │
│ ▸ 02_AI    │  │                                     │ │ ▸ Copilot        │
│ ▸ 03_Work  │  │                                     │ │ ▸ Adjudication   │
│ ▸ 04_Exp   │  └─────────────────────────────────────┘ │   Queue (3)      │
│            │                                          │                  │
│ ◈ Graph    │  ══ TIMELINE SCRUBBER ══════════════════ │                  │ 56px
│ # Tags     │  |◀── Jan ─── Apr ─▓▓▓▓▓─ Aug ──▶|  λ●   │                  │
├────────────┴──────────────────────────────────────────┴──────────────────┤
│ STATUS BAR  ⬤ offline · 1,247 nodes · 8,912 edges · vault verified ✓     │ 24px
└──────────────────────────────────────────────────────────────────────────┘
```

The **status bar is a trust surface**. Permanent, always-visible: `⬤ offline` (green dot, never any other state), node/edge counts, and `vault verified ✓` (green) or `⚠ HASH MISMATCH` (red, and it takes over the bar). An officer glances there to know the file is intact.

The **timeline scrubber is always visible** when the graph is open — it is not a hidden filter. Law 5 has to be present in the furniture.

---

## 4. Graph Canvas Rules

### Nodes
| Property | Rule |
| :--- | :--- |
| Shape | Person = circle · Phone = rounded square · Device = hexagon · Vehicle = pentagon · Tower = triangle · Location = diamond · Org = large circle w/ ring · FIR = document glyph · Event = star |
| Size | `12px + 28px * normalized_pagerank` (clamped 12–40px) |
| Fill | entity-type accent at 18% opacity |
| Stroke | entity-type accent, 1.5px; 2.5px when in the active community |
| Community | subtle tinted convex hull behind the cluster, 8% opacity, with the community's name label |
| Label | shown above ~0.6 zoom; canonical name; alias in `--text-faint` beneath |
| Selected | 2px `--evidence` ring + 6px outer glow |
| Dimmed | 15% opacity when a focus/local-graph mode is active |

### Edges — this is where the constitution becomes visible
| Kind | Colour | Style | Width |
| :--- | :--- | :--- | :--- |
| Verified, single source | `--evidence` @ 70% | solid | 1.5px |
| Verified, corroborated (2+ sources) | `--evidence` @ 100% | solid | 2.5px |
| Decayed (effective_weight < 0.25) | `--evidence` @ 25% | solid | 1px |
| **Hypothesis** | `--hypothesis` | **dashed 4-3, slow marching-ants** | 1.5px |
| Contradiction-adjacent | `--danger` | solid + ⚠ glyph at midpoint | 2px |
| Directional (calls, one-way) | as above | arrowhead at target | — |

Edge thickness maps to `effective_weight` (post-decay), so scrubbing the timeline visibly thins and thickens the network. That motion is the best 10 seconds of the demo.

### The Sandbox is a mode, not a layer
Entering Hypothesis Sandbox mode: a **persistent magenta 2px border around the entire canvas** plus a fixed banner — `INVESTIGATIVE LEADS — NON-EVIDENTIARY · NOT ADMISSIBLE AS EVIDENCE`. It cannot be dismissed. Exiting removes every predicted edge from view. There is no state in which verified and predicted edges are shown in the same view without the banner.

### Performance
Cytoscape.js with `cose-bilkent` for < 2,000 nodes. Above that, pre-compute layout in Python (`igraph` / ForceAtlas2), ship coordinates, render with fixed positions. Never let 50k CDR rows become 50k visible nodes — the default view shows **entities**, not call events, and edge bundling collapses repeated calls into one weighted edge.

---

## 5. Signature Components

**Source badge** — inline chip after a cited sentence:
`^[CDR_9812…csv row:4182]` → mono 11px, `--text-faint`, `--bg-inset` pill, 3px radius. Hover → popover with the verbatim source snippet. Click → opens the source document at that exact locator, highlighted.

**Provenance Inspector** (right rail, on edge/node select):
```
┌ PROVENANCE ────────────────────────┐
│ Vikram Singh ──CALLED──▶ Rehan Khan│
│ ─────────────────────────────────── │
│ Source   CDR_9812345678.csv         │
│ SHA-256  a3f2…9c1e            [copy]│
│ Locator  rows 4182–4213             │
│ Observed 12–19 Feb 2026             │
│ Weight   31 calls · eff. 0.84       │
│ ─────────────────────────────────── │
│ MATCH> ... verbatim snippet ...     │
│ ─────────────────────────────────── │
│ CYPHER                       [copy] │
│ MATCH (a:Person)-[r:CALLED]->(b)…   │
│ ─────────────────────────────────── │
│ [Open source]  [Add to selection]   │
└─────────────────────────────────────┘
```
Every element of Law 3 in one panel. Screenshot this for the deck.

**Adjudication card** (entity resolution grey band) — two columns side by side, matching fields highlighted `--ok`, conflicting fields `--danger`, shared hard keys pinned at the top with a key glyph. Keyboard: `M` merge, `R` reject, `?` need more info, `J/K` navigate. An analyst should clear 50 pairs in a couple of minutes.

**Certificate button** — the only filled amber button in the entire app. `--evidence` fill, `--text-inverse` label, 6px radius, seal glyph. Nothing else competes with it visually. If the selection is contaminated by sandbox elements, it turns `--danger` and reads **Selection contains non-evidentiary elements** with a list.

**Delta Log entry** — left border 3px `--evidence`, dated H2, section icons, new items get a brief `--ok` flash on first render after an ingest.

---

## 6. Interaction Grammar

| Key | Action |
| :--- | :--- |
| `⌘/Ctrl K` | Command palette |
| `⌘/Ctrl O` | Quick switcher (entity/note) |
| `⌘/Ctrl G` | Toggle graph ↔ editor |
| `⌘/Ctrl ⇧ F` | Global search |
| `⌘/Ctrl ⇧ I` | Ingest evidence |
| `⌘/Ctrl ⇧ C` | Copilot focus |
| `⌘/Ctrl E` | Export BSA §63 for current selection |
| `[` `]` | Step timeline window back/forward |
| `F` | Focus / local-graph on selected node |
| `H` | Toggle Hypothesis Sandbox |
| `Esc` | Clear selection / exit mode |

Everything reachable by keyboard. Detectives on a deadline do not use menus.

---

## 7. Copy Tone

Procedural, precise, never dramatic. The app never says "suspicious", "dangerous", "mastermind", or "criminal" about a person — it says what the data shows.

| ✗ Never | ✓ Instead |
| :--- | :--- |
| "Vikram is the kingpin" | "Highest betweenness centrality in this network (0.18)" |
| "AI found a hidden link" | "Predicted association — non-evidentiary, requires verification" |
| "Suspicious activity" | "14 calls between 01:00–04:00, above the 95th percentile for this network" |
| "High risk individual" | "Named as accused in 3 FIRs" |
| "Confirmed connection" (from AI) | "Deterministic link — CDR row 4182" |

Empty states carry the doctrine: the Hypothesis Sandbox with nothing in it reads *"No predictions generated. Predictions are investigative leads only and are never used as evidence."*
