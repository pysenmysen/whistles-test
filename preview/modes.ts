import { createContext, useContext } from 'react'
import { DEFAULT_THEME } from './theme/readTheme'

// The sidebar's Theme switch, and the project's stage classes (its background and content roles).
// Each block sets data-theme itself, so a page can also show a mode side by side (the Themes rows).
export type Modes = { theme: string; stage?: string }
export const ModesContext = createContext<Modes>({ theme: DEFAULT_THEME })
export const useModes = () => useContext(ModesContext)
// Props for a block that shows the current mode on the project's own surface
export const useBlock = () => {
  const { theme, stage = '' } = useModes()
  return { 'data-theme': theme === DEFAULT_THEME ? undefined : theme, className: `pv-block ${stage}` }
}
