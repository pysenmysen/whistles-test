import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import { DEFAULT_THEME, themeModes, vars } from './theme/readTheme'
import { FOUNDATION_PAGES } from './foundations/FoundationPages'
import { AssetsPage, hasAssets } from './foundations/AssetsPage'
import { ComponentPage } from './components/ComponentPage'
import { EXPORT_VERSION, sets, specs, warnings } from './theme/readSpecs'
import { ModesContext } from './modes'
import type { Modes } from './modes'
import type { PreviewConfig } from './types'

type Page = { group: string; id: string; label: string; Page: ComponentType }
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Theme: Light (no attribute) and every [data-theme] mode in theme.css.
// The base (no attribute) is Light unless theme.css names a light mode itself.
const THEMES = [...new Set([DEFAULT_THEME, ...themeModes.map((m) => m.value)])]
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// The Theme switch is a per-viewer convenience: kept in localStorage when it's there.
const STORE = 'grebfig-preview-modes'
function loadModes(): Modes {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Modes | null
    return { theme: saved && THEMES.includes(saved.theme) ? saved.theme : DEFAULT_THEME }
  } catch {
    return { theme: DEFAULT_THEME }
  }
}

/* The surface components sit on: the page's background and text roles, found by name in any file's theme
 * (ui-background-default and ui-content-primary in Grebban's template, canvas-bg and ui-pri elsewhere).
 * Drawn by .pv-stage, so each mode's values apply; config.stage overrides it with classes. */
const PAGE = /^--color-(ui|canvas|page|app|global|surface)-/
const find = (...res: RegExp[]) => res.map((re) => vars.find((v) => PAGE.test(v.name) && re.test(v.name))).find(Boolean)?.name
const STAGE_BG = find(/-background-default$/, /-(bg|background)$/, /-background-/)
const STAGE_FG = find(/-content-primary$/, /-text-primary$/, /-(content|text|fg|foreground)$/, /-content-default$/, /-pri(mary)?$/)
const STAGE_CSS = `.pv-stage{${STAGE_BG ? `background-color:var(${STAGE_BG});` : ''}${STAGE_FG ? `color:var(${STAGE_FG});` : ''}}`

// "[Client] Stylesheet": the client from the export (the Project Spec's Client line)
const TITLE = specs.client ? `${specs.client} Stylesheet` : 'Stylesheet'
document.title = TITLE

export function Preview({ config }: { config: PreviewConfig }) {
  const pages: Page[] = useMemo(() => [
    ...FOUNDATION_PAGES.map((p) => ({ group: 'Foundations', ...p })),
    // Assets: whatever is in src/assets/, after Interaction
    ...(hasAssets ? [{ group: 'Foundations', id: 'assets', label: 'Assets', Page: AssetsPage }] : []),
    // Component pages: the config's sets, in specs.json's order, grouped by the config's page
    ...[...new Set(sets.filter((s) => config.sets[s.name]).map((s) => config.sets[s.name].page))].map((label) => {
      const items = sets.filter((s) => config.sets[s.name]?.page === label).map((set) => ({ set, entry: config.sets[set.name] }))
      return { group: 'Components', id: slug(label), label, Page: () => <ComponentPage page={label} items={items} /> }
    }),
  ], [config])

  // The hash is #page or #page/section, so a reload keeps your place.
  const read = () => {
    const [page = '', section = ''] = decodeURIComponent(location.hash.slice(1)).split('/')
    return { page: pages.some((p) => p.id === page) ? page : pages[0].id, section }
  }
  const [{ page, section }, setLoc] = useState(read)
  const [modes, setModes] = useState(loadModes)
  const [menuOpen, setMenuOpen] = useState(false)
  const main = useRef<HTMLElement>(null)

  useEffect(() => {
    const on = () => { setLoc(read()); setMenuOpen(false) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(modes)) } catch { /* private window: keep it in memory */ }
  }, [modes])

  useLayoutEffect(() => {
    const target = section && document.getElementById(section)
    if (target) target.scrollIntoView()
    else main.current?.scrollTo(0, 0)
  }, [page, section])

  const current = pages.find((p) => p.id === page)!
  // specs.json › warnings, on the page of the set they name ("button/primary" → Buttons), colours on Themes,
  // icons on Assets; the rest on the first page
  const warningPage = (w: unknown) => {
    const text = (typeof w === 'string' ? w : JSON.stringify(w)).toLowerCase()
    const set = sets.find((s) => config.sets[s.name] && text.includes(s.name.toLowerCase().split('/').slice(0, 2).join('/')))
    if (set) return slug(config.sets[set.name].page)
    // A colour pair that can't be read is a theme's; an icon drawn at the wrong size is the assets'
    if (text.includes('content and fill')) return 'themes'
    if (text.includes(' placed at ') && pages.some((p) => p.id === 'assets')) return 'assets'
    return pages[0].id
  }
  const shownWarnings = warnings.filter((w) => warningPage(w) === page)
    .map((w) => (typeof w === 'string' ? w : (w as { message?: string; text?: string }).message ?? (w as { text?: string }).text ?? JSON.stringify(w)))
  const groups = [...new Set(pages.map((p) => p.group))]

  const nav = (
    <nav aria-label="Preview" className="grid gap-4">
      {groups.map((g) => (
        <div key={g}>
          <p className="pv-small">{g}</p>
          <ul className="mt-2 grid gap-1">
            {pages.filter((p) => p.group === g).map((p) => (
              <li key={p.id}>
                <a href={`#${p.id}`} className="pv-nav-link" aria-current={p.id === page ? 'page' : undefined}>{p.label}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )

  // Two modes: a toggle. More: a dropdown. At the top of the list, so it's the first thing in reach.
  const themeSwitch = (
    <div className="grid justify-items-start gap-2">
      <span className="pv-label" id="pv-theme-label">Theme</span>
      {THEMES.length === 2 ? (
        <div className="pv-toggle" role="group" aria-labelledby="pv-theme-label">
          {THEMES.map((t) => (
            <button key={t} type="button" aria-pressed={modes.theme === t} onClick={() => setModes({ theme: t })}>{cap(t)}</button>
          ))}
        </div>
      ) : (
        <select className="pv-control" aria-labelledby="pv-theme-label" value={modes.theme} onChange={(e) => setModes({ theme: e.target.value })}>
          {THEMES.map((t) => <option key={t} value={t}>{cap(t)}</option>)}
        </select>
      )}
    </div>
  )

  return (
    <ModesContext.Provider value={{ ...modes, stage: config.stage || 'pv-stage' }}>
      <style>{STAGE_CSS}</style>
      <div className="pv-app pv-shell" data-pv-mode={modes.theme === 'dark' ? 'dark' : 'light'}>
        {/* Below 768px: a top bar with a menu button; the Theme switch and nav sit in the menu */}
        <header className="pv-topbar flex h-14 shrink-0 items-center justify-between px-4">
          <span className="pv-label">{TITLE}</span>
          <button type="button" className="pv-pill" aria-expanded={menuOpen} aria-controls="pv-menu" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </header>
        {menuOpen && (
          <div id="pv-menu" className="pv-app pv-menu fixed inset-x-0 top-14 bottom-0 z-10 grid content-start gap-6 overflow-y-auto p-4" data-pv-mode={modes.theme === 'dark' ? 'dark' : 'light'}>
            {themeSwitch}
            {nav}
          </div>
        )}
        <aside className="pv-sidebar w-56 shrink-0 flex-col gap-8 overflow-y-auto p-6">
          <span className="pv-label">{TITLE}</span>
          {themeSwitch}
          {nav}
        </aside>
        <main
          ref={main}
          className="pv-main min-w-0 flex-1 overflow-y-auto"
        >
          <div className="pv-content">
            <h1 className="pv-title mb-6">{current.label}</h1>
            {!specs.exported && (
              <p className="pv-accent mb-6">No export yet. In Figma: GrebFig › Foundations › Export › Download all, then run <code>npm run import</code>.</p>
            )}
            {specs.exported && specs.export !== EXPORT_VERSION && (
              <p className="pv-accent mb-6">This export is format {specs.export ?? 'unknown'}; this preview reads format {EXPORT_VERSION}. Update the starter or GrebFig so they match.</p>
            )}
            {shownWarnings.length > 0 && (
              <ul className="pv-accent mb-6 grid gap-1" aria-label="Export warnings">{shownWarnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            )}
            <current.Page key={page} />
          </div>
        </main>
      </div>
    </ModesContext.Provider>
  )
}
