// Foundations pages, laid out like Figma's Foundations page: every variable in theme.css as its visual and its
// Figma-style name, with a value where the value is the point. Names and values come from the file
// (theme/readTheme.ts); nothing here names a token. Samples set the variable inline because the names are only
// known at runtime. Everything sits on the main area, which the Theme switch paints; no cards.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  bySection, byName, figmaName, media, mediaRules, percent, plainUtilities, px, scrollbarStyled, refsOf, resets, seg, styleUtility,
  DEFAULT_THEME, switchModes, themeModes,
} from '../theme/readTheme'
import type { SectionId, Utility, Var } from '../theme/readTheme'
import { useBlock, useModes } from '../modes'
import { layout, names as figmaNames } from '../theme/readSpecs'

const v = (name: string) => `var(${name})`
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
// Long Figma paths wrap after a "/" rather than inside a word or a number
const breakAtSlash = (s: string) => s.replace(/\//g, '/​')
const last = (x: Var) => figmaName(x).split('/').pop() ?? ''
const list = (items: (string | false | undefined)[]) => items.filter(Boolean).join(', ')

function groupBy<T>(items: T[], key: (t: T) => string) {
  const m = new Map<string, T[]>()
  for (const t of items) m.set(key(t), [...(m.get(key(t)) ?? []), t])
  return [...m]
}

function useWindowWidth() {
  const [w, setW] = useState(() => window.innerWidth)
  useEffect(() => {
    const on = () => setW(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return w
}

// --- Building blocks ------------------------------------------------------------------------------------

// A section: one block (the project's surface, current mode) with its title, then its contents.
// `float`: the title sits on the grey page and each child is its own block (Typography).
function Section({ id, title, float, children }: { id: string; title?: string; float?: boolean; children: ReactNode }) {
  const block = useBlock()
  if (float)
    return (
      <section id={id} className="grid scroll-mt-4 gap-2">
        {title && <h2 className="pv-heading mt-4">{title}</h2>}
        {children}
      </section>
    )
  return (
    <section id={id} {...block} className={`${block.className} scroll-mt-4`}>
      {title && <h2 className="pv-heading">{title}</h2>}
      {children}
    </section>
  )
}

function Block({ children, className = '' }: { children: ReactNode; className?: string }) {
  const block = useBlock()
  return <div {...block} className={`${block.className} ${className}`}>{children}</div>
}

// The 12-column content grid: every child spans `span` columns (stepping up on narrower main areas).
function Grid({ span = 3, children }: { span?: 2 | 3 | 4 | 6 | 12; children: ReactNode }) {
  return <div className={`pv-cols pv-each-${span}`}>{children}</div>
}

// A visual with its name and an optional value under it.
function Item({ name, value, note, children }: { name: string; value?: string; note?: string; children?: ReactNode }) {
  return (
    <div className="grid min-w-0 content-start gap-2">
      {children}
      <div className="min-w-0">
        <p className="break-words">{breakAtSlash(name)}</p>
        {value && <p className="pv-muted break-words">{value}</p>}
        {note && <p className="pv-accent break-words">{note}</p>}
      </div>
    </div>
  )
}

function Swatch({ background, className = 'aspect-square w-full' }: { background: string; className?: string }) {
  return (
    <span className={`pv-checker pv-edge block shrink-0 ${className}`}>
      <span className="block size-full" style={{ background }} />
    </span>
  )
}

// --- Modes (for the Themes rows) --------------------------------------------------------------------------

// The default mode is the base: its own [data-theme] block (the first in theme.css) is the same column, so it's shown once.
const MODES = [
  { id: DEFAULT_THEME, label: `${cap(DEFAULT_THEME)} (default)`, decls: themeModes.find((m) => m.value === DEFAULT_THEME)?.decls ?? new Map<string, string>() },
  ...themeModes.filter((m) => m.value !== DEFAULT_THEME).map((m) => ({ id: m.value, label: cap(m.value), decls: m.decls })),
]
type Mode = (typeof MODES)[number]
const valueIn = (name: string, mode: Mode) => mode.decls.get(name) ?? byName.get(name)?.value ?? ''
// What a role points to in that mode, as Figma names it.
const pointsTo = (name: string, mode: Mode) => {
  const ref = refsOf(valueIn(name, mode))[0]
  const target = ref && byName.get(ref)
  return target ? figmaName(target) : valueIn(name, mode)
}

// --- Primitives -----------------------------------------------------------------------------------------

// Grouped like Figma (Color / Base, Color / Base / Gray, Color / Semantic / Red): by path without the last
// segment; a group of one, or the opacities of a colour already in the parent, joins the parent.
function primitiveGroups(items: Var[]) {
  const path = (x: Var) => figmaName(x).split('/')
  const names = new Set(items.map((x) => path(x).join('/')))
  const merged = new Map<string, { x: Var; label: string }[]>()
  for (const [key, group] of groupBy(items, (x) => path(x).slice(0, -1).join('/'))) {
    const parent = key.split('/').slice(0, -1).join('/')
    const target = (group.length < 2 || names.has(key)) && parent.includes('/') ? parent : key
    for (const x of group) merged.set(target, [...(merged.get(target) ?? []), { x, label: target === key ? last(x) : path(x).slice(-2).join('-') }])
  }
  return [...merged]
}

// The hex, or "black, 50%" for an opacity of another primitive.
function primitiveValue(x: Var) {
  const ref = refsOf(x.value)[0]
  const pct = x.value.match(/(\d+(?:\.\d+)?)%/)?.[1]
  return ref && pct !== undefined ? `${byName.get(ref) ? last(byName.get(ref)!) : ref}, ${pct}%` : x.value
}

// Figma's order inside a group: each colour, then its opacities (black, black-50, black-25, black-0, white…)
function figmaOrder(items: { x: Var; label: string }[]) {
  const family = (l: string) => l.split('-')[0]
  const families = [...new Set(items.map((i) => family(i.label)))]
  return [...items].sort((a, b) => families.indexOf(family(a.label)) - families.indexOf(family(b.label)) || (a.label === family(a.label) ? -1 : b.label === family(b.label) ? 1 : 0))
}

// A swatch with a 1px border; an opacity shows half on solid, half on the checkerboard
function Chip({ x }: { x: Var }) {
  const opacity = /color-mix|transparent/.test(x.value)
  return (
    <span className="relative block size-6 shrink-0 overflow-hidden border border-current/20">
      {opacity && <span className="pv-checker absolute inset-y-0 right-0 w-1/2" />}
      <span className="absolute inset-0" style={{ background: v(x.name) }} />
    </span>
  )
}

// Compact rows like Figma's Primitives frame: one column per group, a row per colour.
function Primitives() {
  return (
    <Section id="primitives">
      <Grid span={3}>
        {primitiveGroups(bySection.primitives).map(([group, items]) => (
          <div key={group} className="grid content-start gap-1">
            <p className="pv-label mb-1">{group.split('/').map(cap).join(' / ')}</p>
            {figmaOrder(items).map(({ x, label }) => (
              <div key={x.name} className="flex items-center gap-2">
                <Chip x={x} />
                <span className="min-w-0 flex-1 overflow-x-clip text-ellipsis whitespace-nowrap">{label}</span>
                <span className="pv-muted shrink-0">{primitiveValue(x)}</span>
              </div>
            ))}
          </div>
        ))}
      </Grid>
    </Section>
  )
}

// --- Themes ---------------------------------------------------------------------------------------------

// One block per group (ui, button, input…): Variable | Light (default) | Dark (| more modes). Each mode cell is a
// small box in that mode's own colours (data-theme on the cell), so Dark is dark. Narrow: rows don't need the page.
function Themes() {
  const { stage = '' } = useModes()
  const unset = MODES.slice(1).map((m) => [m, bySection.themes.filter((x) => !m.decls.has(x.name)).length] as const)
  const cols = { '--pv-cols': MODES.length } as CSSProperties
  return (
    <>
      {unset.map(([m, n]) => n > 0 && <p key={m.id} className="pv-muted">Faded: not set in {m.label}, so it keeps the Light value ({n} roles). Hover a row to follow it across.</p>)}
      {groupBy(bySection.themes, (x) => seg(x.name, 1)).map(([g, items]) => (
        <section key={g} id={`themes-${g}`} className={`pv-block ${stage} max-w-[52rem] scroll-mt-4`}>
          <h2 className="pv-heading">{cap(g)}</h2>
          <div className="pv-modes" style={cols}>
            <div className="pv-mode-row pv-mode-head">
              <span className="pv-small">Variable</span>
              {MODES.map((m) => <span key={m.id} className="pv-small px-2">{m.label}</span>)}
            </div>
            {items.map((x) => (
              <div key={x.name} className="pv-mode-row pv-row">
                <span>{breakAtSlash(figmaName(x))}</span>
                {MODES.map((m) => (
                  <span key={m.id} data-theme={m.id === DEFAULT_THEME ? undefined : m.id} className={`pv-mode-cell ${stage}`}>
                    <Swatch background={v(x.name)} className="size-4" />
                    <span className={`min-w-0 ${m.id === DEFAULT_THEME || m.decls.has(x.name) ? '' : 'pv-muted'}`}>{breakAtSlash(pointsTo(x.name, m))}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

// --- Gradients & effects ------------------------------------------------------------------------------

// In the mode the Theme switch shows, like everything else: the variables resolve on the main area.
// As Figma's board: Light and Dark side by side; each gradient (Soft, then Hard) in Down, Left, Right, Up; effects
// after. All on a mid grey, as Figma lays them over an image.
const DIRECTIONS = [['Down', 'to bottom'], ['Left', 'to left'], ['Right', 'to right'], ['Up', 'to top']] as const

function Effects() {
  const { stage = '' } = useModes()
  const stops = bySection.effects.filter((x) => seg(x.name, 0) === 'color')
  const shadows = bySection.effects.filter((x) => seg(x.name, 0) !== 'color')
  // Stops by name (soft, hard, transparent) or by opacity (100, 40, 0): each fades to the clear one
  const num = (x: Var) => (/^\d+$/.test(last(x)) ? Number(last(x)) : null)
  const end = stops.find((x) => last(x) === 'transparent') ?? stops.filter((x) => num(x) !== null).sort((a, b) => num(a)! - num(b)!)[0]
  // Soft before Hard, as Figma orders them; numbers from the most opaque down
  const styles = stops.filter((x) => x !== end).sort((a, b) => (num(a) !== null && num(b) !== null ? num(b)! - num(a)! : last(b).localeCompare(last(a))))
  const textures = plainUtilities.filter((u) => u.name.startsWith('texture-'))
  // The file's gradient styles, exported as bg-[name] utilities: Gradient/Soft/↓ in group Gradient/Soft, as Figma names them
  const exported = plainUtilities.filter((u) => /gradient\(/.test(u.body))
  const groupOf = (u: Utility) => (figmaNames[u.name] ?? u.name).split('/').slice(0, -1).join('/')
  const groups = [...new Set(exported.map(groupOf))]
  const tile = 'pv-backdrop relative block aspect-square'
  return (
    <Section id="effects">
      <div className="pv-cols pv-each-6">
        {MODES.map((m) => (
          <div key={m.id} data-theme={m.id} className={`${stage} grid content-start gap-4 p-4`}>
            <p className="pv-label">{m.label}</p>
            {groups.map((g) => (
              <div key={g} className="grid gap-2">
                <p>{g}</p>
                <div className="grid grid-cols-4 gap-2">
                  {exported.filter((u) => groupOf(u) === g).map((u) => (
                    <div key={u.name} className="grid gap-1">
                      <span className={tile}><span className="absolute inset-0" style={{ backgroundImage: u.decls.find(([k]) => k === 'background-image')?.[1] }} /></span>
                      <span className="pv-muted">{(figmaNames[u.name] ?? u.name).split('/').pop()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {/* Without gradient styles in the export: each stop fading to the clear one */}
            {!exported.length && end && styles.map((x) => (
              <div key={x.name} className="grid gap-2">
                <p>Gradient/{cap(last(x))}</p>
                <div className="grid grid-cols-4 gap-2">
                  {DIRECTIONS.map(([label, dir]) => (
                    <div key={label} className="grid gap-1">
                      <span className={tile}><span className="absolute inset-0" style={{ background: `linear-gradient(${dir}, ${v(x.name)}, ${v(end.name)})` }} /></span>
                      <span className="pv-muted">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {(shadows.length > 0 || textures.length > 0) && <div className="grid gap-2">
              <p>Effects</p>
              <div className="grid grid-cols-4 gap-2">
                {shadows.map((x) => (
                  <div key={x.name} className="grid gap-1">
                    <span className={`${tile} flex items-center justify-center`}><span className={`block size-1/2 ${stage}`} style={{ boxShadow: v(x.name) }} /></span>
                    <span className="pv-muted">{figmaName(x).split('/').pop()}</span>
                  </div>
                ))}
                {textures.map((t) => (
                  <div key={t.name} className="grid gap-1">
                    <span className={`${tile} ${t.name}`} />
                    <span className="pv-muted">{(figmaNames[t.name] ?? t.name).split('/').pop()}</span>
                  </div>
                ))}
              </div>
            </div>}
          </div>
        ))}
      </div>
    </Section>
  )
}

// --- Typography -----------------------------------------------------------------------------------------

const cssProp = (prop: string) => {
  const key = prop.replace(/-(\w)/g, (_, c: string) => c.toUpperCase())
  return key in document.body.style ? key : null
}

// Everything a text style sets: its variables and what its class (@utility) adds.
function styleCss(s: Var, props: Var[]): CSSProperties {
  const css: CSSProperties = { fontSize: v(s.name) }
  for (const p of props) {
    const key = cssProp(p.name.slice(s.name.length + 2))
    if (key) Object.assign(css, { [key]: v(p.name) })
  }
  for (const [prop, value] of styleUtility.get(s.name)?.decls ?? []) {
    const key = cssProp(prop)
    if (key) Object.assign(css, { [key]: value })
  }
  return css
}

const SPECIMEN = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  '. , : ; ! ? \' " ( ) [ ] / & @ # % * _ … •',
  '© ® ™ § € $ £ ¥',
  '+ − × ÷ = ≠ < > ± ° ~ – —',
]

// A style: its name and values on one line, then the sample. Primary: a two-line heading. Body styles (paragraph
// spacing, line height above 100%): two paragraphs at a fixed measure with the list beside. Misc: label examples.
function TextStyle({ s, props, group }: { s: Var; props: Var[]; group: string }) {
  const get = (k: string) => byName.get(`${s.name}--${k}`)
  const css = styleCss(s, props)
  const para = get('paragraph-spacing')
  const lst = get('list-spacing')
  const values = list([
    px(s.value),
    get('line-height') && `line ${percent(get('line-height')!.value)}`,
    get('letter-spacing') && `letter ${percent(get('letter-spacing')!.value)}`,
    get('font-weight') && `weight ${get('font-weight')!.value}`,
    para && `paragraph ${px(para.value)}`,
    lst && `list ${px(lst.value)}`,
  ])
  const body = (para || lst) && parseFloat(get('line-height')?.value ?? '1') > 1
  return (
    <Block>
      <p><span className="pv-label">{figmaName(s).split('/').slice(1).join('/')}</span> <span className="pv-muted">{values}</span></p>
      {!styleUtility.has(s.name) && <p className="pv-accent">No class in theme.css: family and case not set</p>}
      {body ? (
        <div className="pv-cols pv-each-6" style={css}>
          <div className="max-w-[32rem]">
            <p style={{ marginBlockEnd: para ? v(para.name) : undefined }}>This is a paragraph of body copy, long enough to wrap onto a second line so the line height can be judged.</p>
            <p>A second paragraph follows, so the space between them is visible.</p>
          </div>
          <ul className="list-disc ps-5">
            {['First item in a list', 'Second item', 'Third item'].map((t) => <li key={t} style={{ marginBlockEnd: lst ? v(lst.name) : undefined }}>{t}</li>)}
          </ul>
        </div>
      ) : group === 'misc' ? (
        <div className="flex flex-wrap items-start gap-x-10 gap-y-4" style={css}>
          <span className="max-w-[9rem]">A label that runs onto two lines</span>
          <span>1 299,00 €</span>
          <span>Read more</span>
        </div>
      ) : (
        <p className="min-w-0 break-words" style={css}>This is a heading<br />with a second row</p>
      )}
    </Block>
  )
}

function Typography() {
  const all = bySection.typography
  const styles = all.filter((x) => seg(x.name, 0) === 'text' && !x.name.slice(2).includes('--'))
  const sub = (s: Var) => all.filter((p) => p.name.startsWith(s.name + '--'))
  return (
    <>
      {groupBy(styles, (s) => seg(s.name, 1)).map(([group, items]) => {
        const family = styleUtility.get(items[0].name)?.decls.find(([k]) => k === 'font-family')?.[1]
        const famVar = family && refsOf(family)[0] ? byName.get(refsOf(family)[0]) : undefined
        return (
          <Section key={group} id={`typography-${group}`} title={`Typography/${cap(group)}`} float>
            {/* Figma's type specimen: the family, its letters, figures, symbols and currency */}
            <Block>
              <p><span className="pv-label">{famVar ? figmaName(famVar) : 'No family set'}</span> {famVar && <span className="pv-muted">{famVar.value.split(',')[0].replace(/"/g, '')}</span>}</p>
              <p className="pv-heading min-w-0 break-words font-normal tracking-normal" style={{ fontFamily: family }}>
                {SPECIMEN.map((l) => <span key={l} className="block">{l}</span>)}
              </p>
            </Block>
            {items.map((s) => <TextStyle key={s.name} s={s} props={sub(s)} group={group} />)}
          </Section>
        )
      })}
    </>
  )
}

// --- Layout ---------------------------------------------------------------------------------------------

// As Figma's Grid & breakpoints: each platform's breakpoints, margin and gutters, its grid drawn at the platform's
// design width (specs.json › layout.grid), and its overlay as a panel over a backdrop (layout.overlay).
function Breakpoints() {
  useWindowWidth()
  const { stage = '' } = useModes()
  // One scale for every frame: side by side they share the row, stacked each gets the row (.pv-grids)
  const row = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const frameWidth = (g: string) => Math.max(layout.grid?.find((f) => f.platform.toLowerCase() === g)?.width ?? 0, layout.overlay?.find((f) => f.platform.toLowerCase() === g)?.width ?? 0)
  const all = bySection.grid
  const bps = all.filter((x) => seg(x.name, 0) === 'breakpoint')
  const groups = [...new Set(bps.map((x) => seg(x.name, 1)))]
  const cols = all.filter((x) => seg(x.name, 0) === 'columns')
  const globals = cols.filter((x) => !groups.includes(seg(x.name, 1)))
  const col = (g: string, k: string) => byName.get(`--columns-${g}-${k}`)
  const grid = globals.find((c) => seg(c.name, 1) === 'grid')
  const overlayCols = globals.find((c) => seg(c.name, 1) === 'overlay')
  const backdrop = byName.get('--color-overlay-backdrop')
  const current = [...bps].reverse().find((x) => matchMedia(`(min-width: ${x.value === '0' ? '0px' : x.value})`).matches)
  const shown = new Set([...bps, ...cols].map((x) => x.name))
  const widths = groups.map(frameWidth).filter(Boolean)
  useLayoutEffect(() => {
    const el = row.current
    if (!el || !widths.length) return
    const measure = () => {
      const stacked = getComputedStyle(el).flexDirection === 'column'
      const gaps = parseFloat(getComputedStyle(el).columnGap) * (widths.length - 1)
      setScale(Math.min(1, stacked ? el.clientWidth / Math.max(...widths) : (el.clientWidth - gaps) / widths.reduce((a, b) => a + b, 0)))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [widths.join()]) // eslint-disable-line react-hooks/exhaustive-deps
  const columns = (c: Var | undefined, gutter?: Var, margin?: Var) => c && (
    <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${v(c.name)}, minmax(0, 1fr))`, columnGap: gutter ? v(gutter.name) : undefined, paddingInline: margin ? v(margin.name) : undefined }}>
      {Array.from({ length: Number(c.value) || 0 }, (_, i) => <div key={i} style={{ background: '#ff8fa3' }} />)}
    </div>
  )
  return (
    <Section id="grid" title="Grid & breakpoints">
      <p>Max width: {layout.maxWidth ?? 'none'}</p>
      {/* Side by side, each as wide as its frame: one scale for all */}
      {scale < 1 && <p className="pv-muted">Frames shown at {Math.round(scale * 100)}%</p>}
      <div ref={row} className="pv-grids">
      {groups.map((g) => {
        const gridFrame = layout.grid?.find((f) => f.platform.toLowerCase() === g)
        const overlay = layout.overlay?.find((f) => f.platform.toLowerCase() === g)
        return (
          <div key={g} className="grid min-w-0 content-start gap-3" style={{ flex: `${frameWidth(g) || 1} 1 0` }}>
            <p>
              <span className="pv-label">{cap(g)}</span>{' '}
              <span>{list(bps.filter((x) => seg(x.name, 1) === g).map((x) => `${last(x)} ${px(x.value)}${x === current ? ' (now)' : ''}`))}</span>{' '}
              <span className="pv-muted">{list([
                col(g, 'margin') && `margin ${px(col(g, 'margin')!.value)}`,
                col(g, 'gutter') && `gutter ${px(col(g, 'gutter')!.value)}`,
                col(g, 'overlay-gutter') && `overlay gutter ${px(col(g, 'overlay-gutter')!.value)}`,
                grid && `${grid.value} columns`,
              ])}</span>
            </p>
            {gridFrame && (
              <div className="h-24" style={{ width: gridFrame.width, zoom: scale }}>{columns(grid, col(g, 'gutter'), col(g, 'margin'))}</div>
            )}
            {overlay && (
              <div className="pv-backdrop relative" style={{ width: overlay.width, height: overlay.height, zoom: scale }}>
                  <div className="absolute inset-0" style={{ background: backdrop ? v(backdrop.name) : undefined }} />
                  <div className={`${stage} absolute`} style={{ left: overlay.panel[0], top: overlay.panel[1], width: overlay.panel[2], height: overlay.panel[3] }}>
                    {columns(overlayCols, col(g, 'overlay-gutter'))}
                  </div>
              </div>
            )}
          </div>
        )
      })}
      </div>
      {resets.length > 0 && <p className="pv-muted">Tailwind’s own breakpoints are cleared, so only these exist.</p>}
      {all.filter((x) => !shown.has(x.name)).map((x) => <Item key={x.name} name={figmaName(x)} value={px(x.value)} />)}
    </Section>
  )
}

function Spacing() {
  return (
    <Section id="spacing" title="Spacing & sizing">
      <div className="grid gap-2">
        {bySection.spacing.map((x) => (
          <div key={x.name} className="grid grid-cols-[9rem_4rem_minmax(0,1fr)] items-center gap-3">
            <span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">{figmaName(x)}</span>
            <span className="pv-muted">{px(x.value)}</span>
            <span className="block h-3 max-w-full" style={{ width: v(x.name), background: 'currentColor' }} />
          </div>
        ))}
      </div>
    </Section>
  )
}

function RadiusStroke() {
  const radius = bySection.radius.filter((x) => seg(x.name, 0) === 'radius')
  const stroke = bySection.radius.filter((x) => seg(x.name, 0) !== 'radius')
  return (
    <Section id="radius" title="Radius & stroke">
      <Grid span={2}>
        {radius.map((x) => (
          <Item key={x.name} name={figmaName(x)} value={px(x.value)}>
            <div className="size-16" style={{ borderRadius: v(x.name), background: 'color-mix(in srgb, currentColor 15%, transparent)' }} />
          </Item>
        ))}
        {stroke.map((x) => (
          <Item key={x.name} name={figmaName(x)} value={px(x.value)}>
            <div className="flex h-16 items-center"><div className="w-full" style={{ height: v(x.name), background: 'currentColor' }} /></div>
          </Item>
        ))}
      </Grid>
    </Section>
  )
}

// Every value a switch takes, side by side (Figma's Switches table). Icon size is set where it's used.
function Switches() {
  const width = useWindowWidth()
  return (
    <Section id="switches" title="Switches">
      {groupBy(switchModes, (m) => m.attr).map(([attr, ms]) => [...new Set(ms.flatMap((m) => [...m.decls.keys()]))].map((name) => {
        const values = ms.filter((m) => m.decls.has(name)).map((m) => ({ value: m.value, label: m.label?.split('›')[1]?.trim() ?? m.value, size: m.decls.get(name)! }))
        return (
          <div key={attr + name} className="grid gap-3">
            <p className="pv-label">{cap((ms[0].label?.split('›')[0].trim() ?? attr).replace(/-/g, ' '))}</p>
            <div className="flex flex-wrap items-end gap-6">
              {values.map((m) => (
                <div key={m.value} {...{ [attr]: m.value }} className="grid justify-items-start gap-1">
                  <div style={{ width: v(name), height: v(name), background: 'currentColor' }} />
                  <span>{m.label}</span>
                  <span className="pv-muted">{px(m.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )
      }))}
      {groupBy(media.filter((m) => m.decls.size).flatMap((b) => [...b.decls].map(([name, value]) => ({ name, value, b }))), (x) => x.name).map(([name, items]) => {
        const base = byName.get(name)
        const now = items.find((x) => matchMedia(x.b.query).matches)
        return (
          <Item key={name} name={base ? figmaName(base) : name}
            value={list([`${px(base?.value ?? '')} by default`, ...items.map((x) => `${px(x.value)} from ${x.b.label?.split('›')[1]?.trim() ?? x.b.query}`), `now ${px(now?.value ?? base?.value ?? '')} at ${width}px`])}>
            <p style={{ fontSize: v(name) }}>Resize the window</p>
          </Item>
        )
      })}
    </Section>
  )
}

function Other() {
  return <Section id="other" title="Other"><Grid>{bySection.other.map((x) => <Item key={x.name} name={figmaName(x)} value={x.value} />)}</Grid></Section>
}

// --- Interaction ----------------------------------------------------------------------------------------

function Mover({ name, value, inn, out }: { name: string; value: string; inn: [string, string]; out?: [string, string] }) {
  const [on, setOn] = useState(false)
  const [d, e] = on || !out ? inn : out
  return (
    <div onMouseEnter={() => setOn(true)} onMouseLeave={() => setOn(false)}>
      <Item name={name} value={value}>
        <div className="@container" style={{ background: 'color-mix(in srgb, currentColor 8%, transparent)' }}>
          <div className="size-8" style={{ background: 'currentColor', translate: on ? 'calc(100cqw - 2rem) 0' : '0 0', transition: `translate ${d} ${e}` }} />
        </div>
      </Item>
    </div>
  )
}

function Motion() {
  const all = bySection.motion
  const used = new Set<string>()
  const presets: ReactNode[] = []
  for (const dur of all.filter((x) => seg(x.name, 0) === 'duration')) {
    const name = dur.name.slice('--duration-'.length)
    const ease = byName.get(`--ease-${name}`)
    if (!ease || used.has(dur.name)) continue
    const base = name.replace(/-in$/, '')
    const outDur = name.endsWith('-in') ? byName.get(`--duration-${base}-out`) : undefined
    const outEase = byName.get(`--ease-${base}-out`)
    used.add(dur.name).add(ease.name)
    if (outDur && outEase) {
      used.add(outDur.name).add(outEase.name)
      presets.push(<Mover key={name} name={base} value={`in ${dur.value} ${ease.value}, out ${outDur.value} ${outEase.value}`} inn={[v(dur.name), v(ease.name)]} out={[v(outDur.name), v(outEase.name)]} />)
    } else presets.push(<Mover key={name} name={name} value={`${dur.value}, ${ease.value}`} inn={[v(dur.name), v(ease.name)]} />)
  }
  return (
    <Section id="motion" title="Motion">
      <p className="pv-muted">Hover a preset to play it.</p>
      <Grid>{presets}</Grid>
      {/* Timings: how long something waits or stays, not a movement: one line */}
      {all.some((x) => !used.has(x.name)) && (
        <p><span className="pv-label">Timings</span> {list(all.filter((x) => !used.has(x.name)).map((x) => `${last(x)} ${x.value}`))}</p>
      )}
      {mediaRules.map((m) => (
        <p key={m.query} className="pv-muted">
          {/reduced-motion/.test(m.query)
            ? matchMedia(m.query).matches ? 'Reduce motion is on in the system: the boxes jump instead of moving.' : 'With Reduce motion on in the system, things jump instead of moving.'
            : `theme.css also has a rule for ${m.query}.`}
        </p>
      ))}
    </Section>
  )
}

const RING = 'relative outline-none after:pointer-events-none after:absolute after:-inset-(--focus-ring-offset) after:rounded-focus after:border-(length:--focus-ring-width) after:border-ui-focus after:opacity-0 focus-visible:after:opacity-100'

function Focus() {
  const names = [...bySection.focus, ...bySection.focus.flatMap((x) => refsOf(x.value).map((r) => byName.get(r)!).filter(Boolean)),
    ...['--color-ui-focus', '--radius-focus'].map((n) => byName.get(n)).filter((x): x is Var => !!x)]
  const unique = [...new Map(names.map((x) => [x.name, x])).values()]
  return (
    <Section id="focus" title="Focus">
      <div className="grid gap-2">
        {/* clip-focus-margin: the ring at the edge of a clipping box stays visible */}
        <div className="clip-focus-margin flex flex-wrap gap-3">
          <button type="button" className={`${RING} pv-button`}>Press Tab</button>
          <button type="button" className={`${RING} pv-button`}>And again</button>
        </div>
        <p className="pv-muted">Keyboard focus only, outside the element, and not clipped by the box around it.</p>
      </div>
      <Grid>
        {unique.map((x) => (
          <Item key={x.name} name={figmaName(x)} value={seg(x.name, 0) === 'color' ? undefined : px(byName.get(refsOf(x.value)[0])?.value ?? x.value)}>
            {seg(x.name, 0) === 'color' && <Swatch background={v(x.name)} className="size-16" />}
          </Item>
        ))}
      </Grid>
    </Section>
  )
}

// What theme.css draws beyond variables, each on a small sample: a texture utility on a surface, and its scroll bar
// (a rule on every element that scrolls) on a box whose content overflows.
function Utilities() {
  const { stage = '' } = useModes()
  const textures = plainUtilities.filter((u) => u.name.startsWith('texture-'))
  if (!textures.length && !scrollbarStyled) return null
  return (
    <Section id="utilities" title="Utilities">
      <Grid>
        {textures.map((u) => (
          <Item key={u.name} name={u.name} value={figmaNames[u.name]}>
            <span className={`${stage} block h-32 ${u.name}`} />
          </Item>
        ))}
        {scrollbarStyled && (
          <Item name="Scroll bar" value="every element that scrolls">
            <div className={`${stage} h-32 overflow-y-auto p-3`}>{Array.from({ length: 12 }, (_, i) => <p key={i}>Row {i + 1}</p>)}</div>
          </Item>
        )}
      </Grid>
    </Section>
  )
}

// --- Pages ----------------------------------------------------------------------------------------------

type Part = SectionId | 'utilities'
const PARTS: Record<Part, () => ReactNode> = {
  primitives: Primitives, themes: Themes, effects: Effects, typography: Typography, spacing: Spacing, radius: RadiusStroke,
  grid: Breakpoints, switches: Switches, motion: Motion, focus: Focus, other: Other, utilities: Utilities,
}

// Every section is on exactly one page, so every variable is shown. Other only appears when something is unclaimed.
const PAGES: { id: string; label: string; parts: Part[] }[] = [
  { id: 'primitives', label: 'Primitives', parts: ['primitives'] },
  { id: 'themes', label: 'Themes', parts: ['themes'] },
  { id: 'effects', label: 'Gradients & effects', parts: ['effects'] },
  { id: 'typography', label: 'Typography', parts: ['typography'] },
  { id: 'layout', label: 'Layout', parts: ['grid', 'spacing', 'radius', 'switches', 'other'] },
  { id: 'interaction', label: 'Interaction', parts: ['motion', 'focus', 'utilities'] },
]

function FoundationPage({ parts }: { parts: Part[] }) {
  return (
    <div className="grid gap-2">
      {parts.filter((id) => id !== 'other' || bySection.other.length).map((id) => {
        const Body = PARTS[id]
        return <Body key={id} />
      })}
    </div>
  )
}

export const FOUNDATION_PAGES = PAGES.map((p) => ({ id: p.id, label: p.label, Page: () => <FoundationPage parts={p.parts} /> }))
