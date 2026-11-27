// Brings in the starter's newest own files: npm run starter:update [branch or tag]   (default: main)
// From grebban/greb-starter: preview/, scripts/, AGENTS.md, CLAUDE.md, STARTER-CHANGELOG.md and its workflows.
// Never touches the project's own: src/, design/, PROJECT.md, package.json. Commit the result like any change.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = process.env.STARTER_REPO || 'https://github.com/grebban/greb-starter.git';
const DIRS = ['preview', 'scripts']; // replaced whole, so a file the starter dropped goes too
const FILES = ['AGENTS.md', 'CLAUDE.md', 'STARTER-CHANGELOG.md'];
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const git = (...a) => execFileSync('git', a, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const has = (p) => { try { git('cat-file', '-e', 'FETCH_HEAD:' + p); return true; } catch { return false; } };

// Uncommitted work in the starter's files would be lost: stop first
const dirty = git('status', '--porcelain', '--', ...DIRS, ...FILES, '.github/workflows').trim();
if (dirty) { console.error(`Commit or undo these first; the update replaces them:\n${dirty}`); process.exit(1); }

const ref = process.argv[2] || 'main';
try { git('fetch', '-q', REPO, ref); } catch (e) { console.error(`Couldn't fetch ${ref} from ${REPO}:\n${e.stderr || e.message}`); process.exit(1); }

// What's new: the starter's changelog lines this project doesn't have yet
const local = existsSync(join(root, 'STARTER-CHANGELOG.md')) ? readFileSync(join(root, 'STARTER-CHANGELOG.md'), 'utf8') : '';
const news = has('STARTER-CHANGELOG.md') ? git('show', 'FETCH_HEAD:STARTER-CHANGELOG.md').split('\n').filter((l) => l.startsWith('- ') && !local.includes(l)) : [];

for (const d of DIRS) if (has(d)) { rmSync(join(root, d), { recursive: true, force: true }); git('checkout', 'FETCH_HEAD', '--', d); }
for (const f of FILES) if (has(f)) git('checkout', 'FETCH_HEAD', '--', f);
// Workflows one by one: a project's own workflows stay
for (const f of git('ls-tree', '--name-only', 'FETCH_HEAD', '.github/workflows/').split('\n').filter(Boolean)) git('checkout', 'FETCH_HEAD', '--', f);

// package.json is the project's: say what the starter's has that this one doesn't, to add by hand
const mine = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const theirs = JSON.parse(git('show', 'FETCH_HEAD:package.json'));
const missing = [];
for (const k of ['scripts', 'dependencies', 'devDependencies']) {
  for (const [n, v] of Object.entries(theirs[k] || {})) if ((mine[k] || {})[n] !== v) missing.push(`  ${k}.${n}: ${JSON.stringify(v)}${(mine[k] || {})[n] ? ` (here: ${JSON.stringify(mine[k][n])})` : ''}`);
}

const changed = git('status', '--short').trim();
console.log(news.length ? `New in the starter:\n${news.join('\n')}` : 'No new changelog entries.');
if (missing.length) console.log(`\npackage.json: the starter's differs. Add or change by hand, then npm install:\n${missing.join('\n')}`);
console.log(changed ? `\nChanged:\n${changed}\n\nRun npm run check, then commit.` : '\nAlready up to date.');
