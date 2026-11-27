// Assets page: whatever is in the project's src/assets/ (readAssets.ts), named as design/assets.md names it.
// Icons are drawn in the page's text colour (they're currentColor), so the Theme switch shows them in Dark too.
import { useId, useState } from 'react'
import { iconGroups, images, sizeLabel } from '../theme/readAssets'
import type { IconSizeFile } from '../theme/readAssets'
import { useBlock } from '../modes'

// One size at its real size. Ids inside the file (masks, clip paths) get a suffix, so many on a page don't collide.
function Glyph({ file }: { file: IconSizeFile }) {
  const uid = useId().replace(/:/g, '')
  const markup = file.markup.replace(/id="([^"]+)"/g, `id="$1-${uid}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${uid})`)
  return <span aria-hidden="true" className="block [&>svg]:block" dangerouslySetInnerHTML={{ __html: markup }} />
}

function ImageTile({ file, url, figma }: { file: string; url: string; figma?: string }) {
  const [px, setPx] = useState<string>()
  return (
    <div className="grid min-w-0 content-start gap-2">
      <span className="pv-checker flex aspect-[4/3] items-center justify-center overflow-hidden p-2">
        <img src={url} alt="" className="max-h-full max-w-full object-contain" onLoad={(e) => setPx(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight} px`)} />
      </span>
      <div className="min-w-0">
        <p className="break-words">{file}</p>
        {figma && <p className="pv-muted break-words">{figma}</p>}
        {px && <p className="pv-muted">{px}</p>}
      </div>
    </div>
  )
}

export function AssetsPage() {
  const block = useBlock()
  const placedNote = 'placed at a size it has no file for'
  return (
    <div className="grid gap-2">
      {iconGroups.map(([group, list]) => (
        <section key={group || 'icons'} {...block}>
          <h2 className="pv-heading">{iconGroups.length > 1 && group ? group : 'Icons'} <span className="pv-muted">{list.length}</span></h2>
          <div className="pv-cols pv-each-2">
            {list.map((icon) => (
              <div key={icon.key} className="grid min-w-0 content-start gap-2">
                <div className="flex min-h-12 flex-wrap items-end gap-3">
                  {icon.sizes.map((s) => <Glyph key={s.size} file={s} />)}
                </div>
                <div className="min-w-0">
                  <p className="break-words">{icon.name}</p>
                  <p className="pv-muted">{icon.sizes.map((s) => (s.size ? sizeLabel(s.size) : `${s.px}px`)).join(', ')}</p>
                  {icon.placedMissing.length > 0 && (
                    <p className="pv-accent">{icon.placedMissing.map(sizeLabel).join(', ')}: {placedNote}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="pv-muted">Sizes from the file names, drawn at their real size. The size check reads literal placements in src (icon="…" size="…") only.</p>
        </section>
      ))}
      {images.length > 0 && (
        <section {...block}>
          <h2 className="pv-heading">Images <span className="pv-muted">{images.length}</span></h2>
          <div className="pv-cols pv-each-3">{images.map((i) => <ImageTile key={i.file} {...i} />)}</div>
        </section>
      )}
    </div>
  )
}

export const hasAssets = iconGroups.length > 0 || images.length > 0
