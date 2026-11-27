// Reads GrebFig's export (src/theme.css) as text, so a new export updates the Foundations pages with no code changes.
// Nothing here lists a token: every name comes from the file.
import raw from "../../src/theme.css?raw"
import { names } from "./readSpecs"

export type Var = { name: string; value: string; source: string }
export type Mode = { attr: string; value: string; label: string | null; decls: Map<string, string> }
export type MediaBlock = { query: string; label: string | null; decls: Map<string, string>; body: string }
export type Utility = { name: string; body: string; decls: [string, string][] }

type Block = { prelude: string; label: string | null; body: string }

const declsOf = (body: string) =>
  new Map([...body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;{}]+);/g)].map((m) => [m[1], m[2].trim()]))

// Top-level blocks and comments. A comment with "›" names the block after it (`themes › Dark`); the rest are notes.
function scan(css: string) {
  const blocks: Block[] = []
  const notes: string[] = []
  let label: string | null = null
  let i = 0
  while (i < css.length) {
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i)
      const text = css.slice(i + 2, end).trim()
      if (text.includes('›')) label = text
      else notes.push(text)
      i = end + 2
      continue
    }
    if (/\s/.test(css[i])) { i++; continue }
    const open = css.indexOf('{', i)
    const semi = css.indexOf(';', i)
    if (open === -1) break
    if (semi !== -1 && semi < open) { i = semi + 1; continue } // a statement like @import
    let depth = 1
    let j = open + 1
    while (depth && j < css.length) {
      if (css[j] === '{') depth++
      else if (css[j] === '}') depth--
      j++
    }
    blocks.push({ prelude: css.slice(i, open).trim(), label, body: css.slice(open + 1, j - 1) })
    label = null
    i = j
  }
  return { blocks, notes }
}

const { blocks, notes } = scan(raw)

export const vars: Var[] = []
export const modes: Mode[] = []
export const media: MediaBlock[] = []
export const utilities: Utility[] = []
export const otherBlocks: string[] = []
// `--breakpoint-*: initial` clears one of Tailwind's own namespaces
export const resets: string[] = []
export const exportNotes = notes
// theme.css styles scroll bars itself (a scrollbar-color rule): the Utilities sample shows it
export const scrollbarStyled = /scrollbar-color\s*:/.test(raw)

for (const b of blocks) {
  const attr = b.prelude.match(/^\[([a-zA-Z0-9_-]+)="([^"]*)"\]$/)
  if (b.prelude.startsWith('@theme') || b.prelude === ':root') {
    for (const [name, value] of declsOf(b.body)) vars.push({ name, value, source: b.prelude })
    for (const m of b.body.matchAll(/(--[a-zA-Z0-9_-]+-\*)\s*:\s*initial/g)) resets.push(m[1])
  } else if (attr) {
    modes.push({ attr: attr[1], value: attr[2], label: b.label, decls: declsOf(b.body) })
  } else if (b.prelude.startsWith('@media')) {
    media.push({ query: b.prelude.replace(/^@media\s*/, ''), label: b.label, decls: declsOf(b.body), body: b.body.trim() })
  } else if (b.prelude.startsWith('@utility')) {
    const body = b.body.trim()
    const decls = [...body.matchAll(/^\s*([a-z-]+)\s*:\s*([^;{}]+);/gm)].map((m): [string, string] => [m[1], m[2].trim()])
    utilities.push({ name: b.prelude.replace(/^@utility\s*/, ''), body, decls })
  } else {
    otherBlocks.push(b.prelude)
  }
}

export const byName = new Map(vars.map((v) => [v.name, v]))
export const seg = (name: string, i: number) => name.replace(/^--/, '').split('-')[i] ?? ''
export const refsOf = (value: string) => [...value.matchAll(/var\((--[a-zA-Z0-9_-]+)/g)].map((m) => m[1])

// Colour modes are data-theme; any other attribute is a switch (Foundations › Switches).
export const themeModes = modes.filter((m) => m.attr === 'data-theme')
export const switchModes = modes.filter((m) => m.attr !== 'data-theme')
// The default colour mode: the export writes it first (Light, Default-light…), its values also on :root
export const DEFAULT_THEME = themeModes[0]?.value ?? 'light'

// A variable the mode doesn't set, but whose var() points at one it does, keeps its :root value inside the mode:
// custom properties resolve var() where they're declared, and children inherit the result.
export function staleIn(name: string, decls: Map<string, string>, seen = new Set<string>()): boolean {
  if (decls.has(name) || seen.has(name)) return false
  seen.add(name)
  const v = byName.get(name)
  if (!v) return false
  return refsOf(v.value).some((r) => decls.has(r) || staleIn(r, decls, seen))
}

// A utility named like a variable (`@utility text-misc-14-100-uc` and `--text-misc-14-100-uc`) adds to that
// variable's class: the text styles' family and case. Shown with Typography; the rest are Utilities.
export const styleUtility = new Map(utilities.filter((u) => byName.has(`--${u.name}`)).map((u) => [`--${u.name}`, u]))
export const plainUtilities = utilities.filter((u) => !byName.has(`--${u.name}`))
// Media blocks that set variables are switches; the rest (prefers-reduced-motion) are global rules.
export const mediaRules = media.filter((m) => m.decls.size === 0)

export const SECTIONS = [
  ['primitives', 'Primitives'],
  ['themes', 'Themes'],
  ['typography', 'Typography'],
  ['spacing', 'Spacing'],
  ['radius', 'Radius & stroke'],
  ['effects', 'Gradients & effects'],
  ['motion', 'Motion'],
  ['switches', 'Switches'],
  ['grid', 'Breakpoints & grid'],
  ['focus', 'Focus'],
  ['other', 'Other'],
] as const
export type SectionId = (typeof SECTIONS)[number][0]

const switchNames = new Set([...switchModes, ...media].flatMap((m) => [...m.decls.keys()]))
const isRef = (value: string) => value.startsWith('var(')

// Grouped by namespace: the variable's first segment (color, text, spacing…). Anything unmatched lands in Other.
function sectionOf({ name, value }: Var): SectionId {
  if (switchNames.has(name)) return 'switches'
  const ns = seg(name, 0)
  // Gradient stops and shadows are Gradients & effects (Figma's Color › Gradients & effects), not Themes
  if (ns === 'color' && seg(name, 1) === 'gradient') return 'effects'
  if (ns === 'color') return isRef(value) ? 'themes' : 'primitives'
  if (['font', 'text', 'type'].includes(ns)) return 'typography'
  if (['spacing', 'width'].includes(ns)) return 'spacing'
  if (['radius', 'stroke'].includes(ns)) return 'radius'
  if (ns === 'shadow') return 'effects'
  if (['ease', 'duration', 'motion'].includes(ns)) return 'motion'
  if (['breakpoint', 'columns'].includes(ns)) return 'grid'
  if (ns === 'focus') return 'focus'
  return 'other'
}

export const bySection = Object.fromEntries(SECTIONS.map(([id]) => [id, vars.filter((v) => sectionOf(v) === id)])) as Record<SectionId, Var[]>

// --- Figma-style names and readable values ---------------------------------------------------------------

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// The export writes a Figma path with "-" (`space/sm` → `--spacing-sm`, `ui/link/hover` → `--color-ui-link-hover`,
// `Misc/14_100_UC` → `--text-misc-14-100-uc`). This turns it back. "-" inside a Figma segment can't be told apart
// from "/", so a segment with a hyphen comes back split (a guess, noted in CHECKS.md).
export function figmaName({ name, value }: Var): string {
  // The export names each variable (specs.json › names); the rest are rebuilt below
  if (names[name]) return names[name]
  const [ns, ...rest] = name.replace(/^--/, '').split('--')[0].split('-')
  if (ns === 'color') return (isRef(value) ? rest : ['color', ...rest]).join('/') // roles have no color/ prefix in Figma
  if (ns === 'spacing') return rest[0] === 'size' ? rest.join('/') : ['space', ...rest].join('/')
  if (ns === 'text') {
    const [group, ...parts] = rest
    return `${cap(group)}/${parts.map((p) => (/^\d+$/.test(p) ? p : p === 'uc' ? 'UC' : cap(p))).join('_')}`
  }
  if (ns === 'shadow') return `Shadow/${rest.map(cap).join('/')}`
  return [ns, ...rest].join('/')
}

// rem → px with type/base (the export's --type-base), so sizes read like Figma's.
const typeBase = parseFloat(byName.get('--type-base')?.value ?? '16') || 16
export function px(value: string): string {
  const v = value.trim()
  if (/^-?[\d.]+rem$/.test(v)) return `${+(parseFloat(v) * typeBase).toFixed(2)}px`
  if (v === '0') return '0px'
  return v
}
// A unitless line height or an em letter spacing as Figma shows it: 1.2 → 120%, 0.02em → 2%.
export const percent = (value: string) => {
  const n = parseFloat(value)
  return Number.isNaN(n) ? value : `${+(n * 100).toFixed(2)}%`
}
