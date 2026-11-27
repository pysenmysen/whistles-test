import type { ReactNode } from 'react'

// One cell of a set's showcase (design/specs.json › sets[].showcase), as the preview asks the project to draw it.
// Hover, Pressed, Focus and Focus visible are drawn by the preview; everything else is the component's own props.
export type Cell = {
  /** What Figma calls the row or entry: "Left icon", "Min items (2)", "Open". */
  title: string
  /** A showcase state that's a prop or content: Default, Disabled, Error, Selected, Current, Closed, Open, Options, Empty. */
  state: string
  /** The showcase's props for this entry, as Figma names them (showLeftIcon, showMessage…). */
  props: Record<string, unknown>
  /** showcase.stateProp: props[stateProp] is the live value; call this when the component changes it. */
  onState?: (value: unknown) => void
  /** hug: the component's own width; fill: it takes the cell (the page passes w-full where the Spec says so). */
  width: 'hug' | 'fill'
  /** Behaviour: the text prop it's about (buttonLabel, userInput…) and the short or long text for it. */
  textProp?: string
  text?: string
  /** A slot and how many items to put in it. */
  slot?: string
  count?: number
  /** Open: the field with its list showing. */
  open?: boolean
  /** Required: the showcase's mark (`*`). */
  required?: boolean
  /** A variant property Figma sets (Content: Empty). */
  variant?: Record<string, string>
}

export type SetEntry = {
  /** Sidebar page it belongs to, e.g. "Buttons". Pages appear in the order of their first set. */
  page: string
  render: (cell: Cell) => ReactNode
}

export type PreviewConfig = {
  /** Classes for the surface components sit on. Leave it out: the preview finds the theme's background and text
   * roles itself. Set it only when it picks the wrong ones. */
  stage?: string
  /** Figma set name (as in specs.json) → its component. Sets without an entry aren't shown. */
  sets: Record<string, SetEntry>
}
