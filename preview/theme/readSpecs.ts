// Reads design/specs.json: each set's showcase (how Figma's documentation shows it), the layout frames and Figma names.
import specsRaw from '../../design/specs.json?raw'

export type Showcase = {
  cell?: number
  /** A prop the user changes (open): its state starts at the shown value, then the component keeps its own. */
  stateProp?: string
  states?: string[]
  modes?: string[]
  variants?: { title: string; props?: Record<string, unknown>; widths?: ('hug' | 'fill')[]; focusVisible?: boolean; state?: string; states?: string[]; slot?: string; count?: number; mark?: string; variant?: Record<string, string> }[]
  behaviour?: { title: string; text?: string; props?: Record<string, unknown>; short?: string; long?: string; state?: string; open?: boolean }[]
  switches?: { title: string; hint?: string }[]
}
export type SetSpec = { name: string; id: string; spec?: string; width?: 'hug' | 'fill' | 'both'; showcase?: Showcase }
type Specs = {
  export?: number
  /** When the export was made; missing until the first export is imported. */
  exported?: string
  /** The client's name, for the title. */
  client?: string
  sets?: SetSpec[]
  layout?: {
    maxWidth?: string | null
    grid?: { platform: string; width: number }[]
    overlay?: { platform: string; width: number; height: number; panel: [number, number, number, number] }[]
  }
  names?: Record<string, string>
  /** What the export found wrong; shown at the top of the page they're about. */
  warnings?: unknown[]
}

export const specs: Specs = JSON.parse(specsRaw)
export const sets = specs.sets ?? []
export const layout = specs.layout ?? {}
export const names = specs.names ?? {}
export const warnings = specs.warnings ?? []
/** The export format this preview reads (design/CONTRACT.md). */
export const EXPORT_VERSION = 2
