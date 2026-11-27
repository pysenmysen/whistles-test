// Brings in a GrebFig export: npm run import [path to zip]
// Without a path: the newest [client]-grebfig-export.zip in ~/Downloads for this project's client (from
// design/specs.json), or for a project's first import, the newest *grebfig-export*.zip. A zip for another
// client stops the import. Clears design/components first, so a Spec deleted in Figma doesn't stay behind.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SUPPORTED = 2; // the export format this project reads (design/CONTRACT.md)
// The client as it's written in the zip's name (design/CONTRACT.md › Export)
export const slug = (c) => String(c || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const readSpecs = () => { try { return JSON.parse(readFileSync(join(root, 'design', 'specs.json'), 'utf8')); } catch { return {}; } };

// The newest zip in a folder for this client; any client's when there's none yet. Browsers save copies as "… (1).zip".
export function findZip(dir, client) {
  const want = slug(client);
  const zips = existsSync(dir) ? readdirSync(dir).filter((f) => /grebfig-export( \(\d+\))?\.zip$/.test(f)) : [];
  const mine = want ? zips.filter((f) => f.startsWith(want + '-grebfig-export')) : zips;
  return mine.map((f) => join(dir, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] || null;
}

function main() {
  const before = readSpecs().client || '';
  const downloads = join(homedir(), 'Downloads');
  const zip = process.argv[2] || findZip(downloads, before);
  if (!zip || !existsSync(zip)) {
    console.error(before
      ? `No ${slug(before)}-grebfig-export.zip in ${downloads}. In Figma: GrebFig › Foundations › Export › Download all, or pass the zip's path.`
      : `No export at ${zip || downloads}. In Figma: GrebFig › Foundations › Export › Download all, or pass the zip's path.`);
    process.exit(1);
  }
  // Another client's export would replace this project's design: check before touching anything
  const incoming = (() => { try { return JSON.parse(execFileSync('unzip', ['-p', zip, 'design/specs.json']).toString()); } catch { return null; } })();
  if (!incoming) { console.error(`${zip} isn't a GrebFig export: it has no design/specs.json.`); process.exit(1); }
  if (before && incoming.client && slug(incoming.client) !== slug(before)) {
    console.error(`${zip} is ${incoming.client}'s export; this project is ${before}. Nothing was imported.`);
    process.exit(1);
  }
  rmSync(join(root, 'design', 'components'), { recursive: true, force: true });
  // shortcut: uses the system's unzip (macOS, Linux, Git Bash on Windows); a zip library if that's ever missing
  execFileSync('unzip', ['-o', '-q', zip, '-d', root], { stdio: 'inherit' });

  const specs = readSpecs();
  console.log(`Imported ${zip}: ${specs.client || 'no client'}, from GrebFig ${specs.grebfig}, ${specs.exported}.`);
  if (specs.export !== SUPPORTED) console.warn(`This export is format ${specs.export}; this project reads format ${SUPPORTED}. Update the starter or GrebFig so they match.`);
  for (const w of specs.warnings || []) console.warn(`Fix in Figma: ${w}`);
  try {
    const changed = execFileSync('git', ['status', '--short', '--', 'src/theme.css', 'design', 'src/assets'], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    console.log(changed ? `Changed:\n${changed}` : 'Nothing changed since the last commit.');
  } catch { /* not a git repo yet */ }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
