import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { byName, DEFAULT_THEME, refsOf, vars } from '../theme/readTheme'
import { names } from '../theme/readSpecs'
import type { SetSpec } from '../theme/readSpecs'
import { useBlock, useModes } from '../modes'
import type { Cell, SetEntry } from '../types'

// A Spec's page section, drawn from design/specs.json › sets[].showcase. Sets of one Spec (Button/Primary/Md and /Sm)
// share a section, their sizes side by side in every card. It opens with one live example per size and the Variants;
// States, each mode, Behaviour and Switches sit under collapsed headers, opened ones remembered per page.
// The project's config only draws one Cell; the preview draws Hover, Pressed, Focus (a field's own look) and Focus
// visible (the ring: data-input="keyboard" on the cell, as Focus says).

const PREVIEW: Record<string, string> = { Hover: 'hover', Pressed: 'active', Focus: 'focus' }
const TARGET = 'a, button, [role="tab"], [role="combobox"], [role="option"], input, select, textarea'

function Previewed({ state, children }: { state?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const target = ref.current?.querySelector(TARGET)
    if (!target || !state || !PREVIEW[state]) return
    target.setAttribute('data-preview', PREVIEW[state])
    // Hover and Pressed can be drawn by a box around the element (an input's field box): mark its ancestors too
    if (state !== 'Focus') for (let el = target.parentElement; el && el !== ref.current; el = el.parentElement) el.setAttribute('data-preview', PREVIEW[state])
  })
  return <div ref={ref} className="min-w-0">{children}</div>
}

// One component in one state. A live state (showcase.stateProp) starts at the state shown and then is the
// component's: props[stateProp] is the value, onState changes it.
function Drawn({ entry, cell, stateProp }: { entry: SetEntry; cell: Cell; stateProp?: string }) {
  const [value, setValue] = useState<unknown>(() => !!stateProp && cell.state.toLowerCase() === stateProp.toLowerCase())
  const css = PREVIEW[cell.state]
  const live = stateProp ? { props: { ...cell.props, [stateProp]: value }, onState: setValue } : {}
  return <Previewed state={cell.state}>{entry.render({ ...cell, ...live, state: css ? 'Default' : cell.state })}</Previewed>
}

// A cell: its label, then the component. Room is kept for anything that hangs below it (an open list), so it never
// lies over the next cell. `cell` px: the showcase's cell width (or the space there is).
function CellBox({ label, cell, focusVisible, style, children }: { label?: string; cell?: number; focusVisible?: boolean; style?: CSSProperties; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const box = ref.current
    if (!box) return
    box.style.paddingBottom = ''
    // A closed list or panel is inert: it doesn't count
    const bottom = Math.max(0, ...[...box.querySelectorAll<HTMLElement>('*')].filter((e) => !e.closest('[inert]')).map((e) => e.getBoundingClientRect().bottom))
    const over = bottom - box.getBoundingClientRect().bottom
    if (over > 0) box.style.paddingBottom = `${Math.ceil(over)}px`
  })
  return (
    <div ref={ref} className="grid min-w-0 content-start justify-items-start gap-2" style={{ ...(cell ? { width: `min(100%, ${cell}px)` } : {}), ...style }}
      {...(focusVisible ? { 'data-input': 'keyboard' } : {})}>
      {label && <p className="pv-label">{label}</p>}
      <div className="w-full">{children}</div>
    </div>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-start gap-6">{children}</div>
}

// A collapsed group in the preview's own style: a native <details>
function Fold({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: (open: boolean) => void; children: ReactNode }) {
  return (
    <details className="pv-fold" open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary>{title}</summary>
      <div className="grid gap-6 pt-4">{children}</div>
    </details>
  )
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// Switches: a hint like "input/font-size 14px" sets that variable, and every variable built on it, on the cell.
function switchStyle(hint?: string): CSSProperties | undefined {
  const m = hint?.match(/^(\S+)\s+([\d.]+px)$/)
  const name = m && Object.entries(names).find(([, figma]) => figma === m[1])?.[0]
  if (!m || !name) return undefined
  const style: Record<string, string> = { [name]: m[2] }
  for (const v of vars) if (refsOf(v.value).includes(name) && byName.has(v.name)) style[v.name] = m[2]
  return style as CSSProperties
}

type Item = { set: SetSpec; entry: SetEntry }
type Folds = { isOpen: (id: string) => boolean; toggle: (id: string, open: boolean) => void }

function SpecSection({ items, folds }: { items: Item[]; folds: Folds }) {
  const block = useBlock()
  const { stage = '' } = useModes()
  const first = items[0].set
  const sc = first.showcase ?? {}
  const cell = sc.cell ?? 268
  const base = first.width === 'fill' ? 'fill' : 'hug'
  const sized = items.length > 1
  const sizeOf = (s: SetSpec) => s.name.split('/').pop()!
  const title = sized ? first.name.split('/').slice(0, -1).join('/') : first.name
  const states = sc.states ?? ['Default']

  // Every size of the Spec in one state, side by side. `each` px: each size exactly that wide (Behaviour).
  const draw = (c: Partial<Cell>, list = items, each?: number) => (
    <div className="flex flex-wrap items-start gap-4">
      {list.map(({ set, entry }) => (
        // One size: the whole cell, so a part placed absolutely (an open list) has a width to take
        <div key={set.id} className={list.length === 1 && !each ? 'w-full min-w-0' : each ? 'min-w-0' : c.width === 'fill' || (!c.width && base === 'fill') ? 'min-w-0 flex-1' : 'min-w-0'} style={each ? { width: `min(100%, ${each}px)` } : undefined}>
          <Drawn entry={entry} stateProp={sc.stateProp} cell={{ title: '', props: {}, width: base, state: 'Default', ...c }} />
        </div>
      ))}
    </div>
  )

  // States: one column per state, in one row (it scrolls sideways when there isn't room)
  const statesRow = (mode?: string) => (
    <div data-theme={mode} className={mode ? `${stage} -mx-2 px-2 py-3` : ''}>
      <div className="-mx-1 grid grid-flow-col auto-cols-[minmax(min-content,1fr)] gap-6 overflow-x-auto px-1">
        {states.map((s) => <CellBox key={s} label={s}>{draw({ state: s })}</CellBox>)}
      </div>
    </div>
  )
  const fold = (id: string, label: string, body: ReactNode) => (
    <Fold key={id} title={label} open={folds.isOpen(`${title}/${id}`)} onToggle={(o) => folds.toggle(`${title}/${id}`, o)}>{body}</Fold>
  )
  const live = states.find((s) => !PREVIEW[s]) ?? 'Default'

  return (
    <section {...block}>
      <h2 className="pv-heading">{title}</h2>
      <Row>{items.map((it) => <CellBox key={it.set.id} label={sized ? sizeOf(it.set) : undefined} cell={cell}>{draw({ state: live }, [it])}</CellBox>)}</Row>

      {sc.variants && sc.variants.length > 0 && (
        <div className="grid gap-3">
          <p className="pv-small">Variants</p>
          <Row>
            {sc.variants.map((v) => {
              const shared = { title: v.title, props: v.props ?? {}, slot: v.slot, count: v.count, required: !!v.mark, variant: v.variant }
              if (v.states) return v.states.map((s) => <CellBox key={v.title + s} label={`${v.title}, ${s}`} cell={cell}>{draw({ ...shared, state: s })}</CellBox>)
              const widths = v.widths ?? [base]
              const state = v.focusVisible || v.state === 'focus' ? 'Focus' : v.state ? cap(v.state) : 'Default'
              return (
                <CellBox key={v.title} label={v.widths ? `${v.title} (${widths.map(cap).join(', ')})` : v.title} cell={cell} focusVisible={v.focusVisible}>
                  <div className="grid gap-3">{widths.map((w) => <div key={w}>{draw({ ...shared, width: w, state })}</div>)}</div>
                </CellBox>
              )
            })}
          </Row>
        </div>
      )}

      {fold('states', 'States', statesRow(DEFAULT_THEME))}
      {(sc.modes ?? []).map((m) => fold(m, m, statesRow(m.toLowerCase())))}

      {sc.behaviour && sc.behaviour.length > 0 && fold('behaviour', 'Behaviour', (
        <Row>
          {sc.behaviour.map((b) => {
            const state = b.state === 'focus' ? 'Focus' : 'Default'
            const shared = { title: b.title, props: b.props ?? {}, textProp: b.text, open: b.open, state }
            const texts = ([['Short', b.short], ['Long', b.long]] as const).filter(([, t]) => !!t)
            return (
              <div key={b.title} className="grid min-w-0 content-start gap-3">
                <p className="pv-label">{b.title}</p>
                {texts.length === 0 && <CellBox>{draw(shared, items, cell)}</CellBox>}
                {texts.map(([label, t]) => (
                  <CellBox key={label}>
                    <p className="pv-small">{label}</p>
                    {draw({ ...shared, text: t }, items, cell)}
                  </CellBox>
                ))}
              </div>
            )
          })}
        </Row>
      ))}

      {sc.switches && sc.switches.length > 0 && fold('switches', 'Switches', (
        <Row>
          {sc.switches.map((s) => (
            <CellBox key={s.title} label={`${s.title}${s.hint ? `, ${s.hint}` : ''}`} cell={cell} style={switchStyle(s.hint)}>{draw({})}</CellBox>
          ))}
        </Row>
      ))}
    </section>
  )
}

// Open folds, per page: a per-viewer convenience in localStorage
const STORE = 'grebfig-preview-open'
const readStore = (): Record<string, string[]> => {
  try { return JSON.parse(localStorage.getItem(STORE) ?? '{}') } catch { return {} }
}

export function ComponentPage({ page, items }: { page: string; items: Item[] }) {
  const [open, setOpen] = useState<string[]>(() => readStore()[page] ?? [])
  const folds: Folds = {
    isOpen: (id) => open.includes(id),
    toggle: (id, on) => {
      if (on === open.includes(id)) return
      const next = on ? [...open, id] : open.filter((x) => x !== id)
      setOpen(next)
      try { localStorage.setItem(STORE, JSON.stringify({ ...readStore(), [page]: next })) } catch { /* private window: keep it in memory */ }
    },
  }
  // One section per Spec, in the order of its first set
  const bySpec = new Map<string, Item[]>()
  for (const it of items) bySpec.set(it.set.spec ?? it.set.id, [...(bySpec.get(it.set.spec ?? it.set.id) ?? []), it])
  return <div className="grid gap-2">{[...bySpec].map(([spec, list]) => <SpecSection key={spec} items={list} folds={folds} />)}</div>
}
