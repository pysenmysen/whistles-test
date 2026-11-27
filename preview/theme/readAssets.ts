// Reads the project's src/assets/ (GrebFig's exported icons and images) and design/assets.md for their Figma names.
// Generic: nothing here names a file. Icons are read the way a project's Icon component reads them (import.meta.glob).
import assetsMd from '../../design/assets.md?raw'

const iconFiles = import.meta.glob('../../src/assets/icons/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const imageFiles = import.meta.glob('../../src/assets/images/*.{png,jpg,jpeg,webp,gif,svg,avif}', { query: '?url', import: 'default', eager: true }) as Record<string, string>
// The project's source, to see which size each icon is placed at (literal `icon="X" size="y"` only)
const sources = import.meta.glob('../../src/**/*.{tsx,ts,jsx,js}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const base = (path: string) => path.split('/').pop()!
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

// assets.md's tables: "| Icon/Check | `check-xs.svg` 8px, … |" → file name → Figma name
const figmaNames = new Map<string, string>()
for (const line of assetsMd.split('\n')) {
  const cells = line.split('|').map((c) => c.trim())
  if (cells.length < 4 || !cells[1] || cells[1].startsWith('---')) continue
  for (const m of cells[2].matchAll(/`([^`]+\.[a-z0-9]+)`/gi)) figmaNames.set(m[1], cells[1])
}

const SIZE_ORDER = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']
export type IconSizeFile = { size: string; px: number | null; markup: string }
export type IconAsset = { key: string; name: string; group: string; sizes: IconSizeFile[]; placedMissing: string[] }

// `[name]-[size].svg` → one icon with its sizes
const byIcon = new Map<string, IconSizeFile[]>()
const fileOf = new Map<string, string>()
for (const [path, markup] of Object.entries(iconFiles)) {
  const file = base(path)
  const m = file.replace(/\.svg$/, '').match(/^(.*)-([a-z0-9]+)$/)
  const [key, size] = m && SIZE_ORDER.includes(m[2]) ? [m[1], m[2]] : [file.replace(/\.svg$/, ''), '']
  const px = Number(markup.match(/<svg[^>]*\swidth="([\d.]+)"/)?.[1]) || null
  byIcon.set(key, [...(byIcon.get(key) ?? []), { size, px, markup }])
  if (!fileOf.has(key)) fileOf.set(key, file)
}

// Sizes the source places each icon at: <Icon icon="Search" size="sm" /> or icon={a ? 'Show' : 'ShowHide'} size="sm"
const placed = new Map<string, Set<string>>()
for (const text of Object.values(sources)) {
  for (const m of text.matchAll(/icon=(\{[^}]*\}|"[^"]*")\s+size="([a-z0-9]+)"/g)) {
    for (const n of m[1].matchAll(/['"]([A-Za-z][\w]*)['"]/g)) {
      const key = n[1].toLowerCase()
      placed.set(key, (placed.get(key) ?? new Set()).add(m[2]))
    }
  }
}

export const icons: IconAsset[] = [...byIcon].map(([key, sizes]) => {
  sizes.sort((a, b) => SIZE_ORDER.indexOf(b.size) - SIZE_ORDER.indexOf(a.size))
  const figma = figmaNames.get(fileOf.get(key)!)
  const have = new Set(sizes.map((s) => s.size))
  return {
    key,
    name: figma?.split('/').pop() ?? cap(key),
    group: figma?.split('/').slice(0, -1).join('/') ?? '',
    sizes,
    placedMissing: [...(placed.get(key) ?? [])].filter((s) => !have.has(s)),
  }
}).sort((a, b) => a.name.localeCompare(b.name))

// Groups from assets.md's Figma names (Icon/… is one group: then it's just alphabetical)
export const iconGroups = [...new Set(icons.map((i) => i.group))].map((g) => [g, icons.filter((i) => i.group === g)] as const)

export type ImageAsset = { file: string; url: string; figma?: string }
export const images: ImageAsset[] = Object.entries(imageFiles).map(([path, url]) => ({ file: base(path), url, figma: figmaNames.get(base(path)) }))
  .sort((a, b) => a.file.localeCompare(b.file))

export const sizeLabel = (s: string) => cap(s)
