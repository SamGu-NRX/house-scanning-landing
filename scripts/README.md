# scripts/

This directory is the site's whole toolchain: three commands Bun runs, plus the one shared module they all stand on. There is no framework and no dependency — every file here is a standalone TypeScript program executed directly by `bun`, with the command names wired in `package.json` (`dev`, `build`, `check`).

The site itself is static: `index.html`, `styles.css`, four JavaScript files at the root, and everything under `assets/`. `scripts/` exists to do three jobs around that static core: serve it while editing, package it for deployment, and test the one rule from the page that is pure logic.

## The four files

| File | Command | Job |
| --- | --- | --- |
| `public-files.ts` | (library — nothing runs it directly) | Decides which files belong to the public site. |
| `dev.ts` | `bun run dev` | Serves exactly those files at `http://127.0.0.1:3000` while editing. |
| `build.ts` | `bun run build` | Checks the page's references, then copies the same files into `dist/` for deployment. |
| `check-coverage.ts` | `bun run check` | Tests the unseen-ground rule that `coverage.js` implements. |

Why the shared module exists: `dev.ts` and `build.ts` must agree on what "public" means — the server 404s on anything outside the list, and the build copies exactly the list. `public-files.ts` is that agreement in code, so the two commands cannot drift apart.

## How data flows

**1. Listing the public files — `public-files.ts`.**
`siteRoot` is resolved from the module's own directory (`import.meta.dir/..`), so every consumer gets the same root no matter what the process working directory is (line 4). `publicFiles()` (line 23) returns the union of two sources:

- six root page files, hand-listed in `rootFiles` (line 24) — `index.html`, `styles.css`, `motion.js`, `demo.js`, `coverage.js`, `story.js` — each verified with `lstat` to be a regular file (lines 25–28);
- a recursive walk of `assets/` (`assetFiles`, lines 9–21) that keeps only the allow-listed extensions `.svg`, `.webp`, `.woff2`, `.txt` (line 7) and refuses any symbolic link outright (line 13), because a linked asset could resolve outside the site root.

Paths come back repo-root-relative with forward slashes (line 17 normalizes separators), which matters because CI also runs the build on Windows.

**2. Serving while editing — `dev.ts`.**
At startup the script snapshots the public file list into a route set, one `/{path}` per file (line 4). The server binds `127.0.0.1` only (line 11) and answers each request by mapping `/` to `/index.html` (line 15), requiring an exact match against the route set (line 16), and returning the file with the content type `Bun.file()` already knows (lines 17–18). Anything else — including traversal-shaped paths — is a plain 404; the pathname is never percent-decoded, so no request can name a file outside the route set.

**3. Packaging for deployment — `build.ts`.**
The build is the dev server's list, made durable. It first reads `index.html` and `styles.css` (lines 10–11) and extracts every reference they make: `src`, `href`, and `srcset` attributes from the HTML (lines 13–18, with `srcset` comma-split and each entry trimmed to its URL token), and `url(...)` of all three quoting forms from the CSS (lines 19–21). Fragment (`#...`), absolute-URL (`https:` and any other scheme), and protocol-relative (`//`) references are skipped (line 23) — they never name a repo file. Every remaining reference must be in the public file list or the build fails before anything is written (line 24). Only then does it `rm -rf` the output directory and copy each public file to the same path under `dist/` (lines 28–33), so a file removed from the site cannot survive into the next deployment. Vercel runs this same command and serves `dist/` (see `vercel.json`).

**4. Testing the unseen-ground rule — `check-coverage.ts`.**
`coverage.js` is dual-use: the page loads it for the unseen-ground slider (`index.html` line 19), and this check imports it (line 3) as the unit under test. Importing it assigns `globalThis.coverageCheck` (`coverage.js` line 5); the check reads that global with a type assertion and fails immediately if it is missing (lines 17–19). It then exercises one pure function three ways:

- eight discrete cases covering the state lattice — nothing seen, part seen, all seen, bar above / below / straddling the limit (lines 29–36);
- a sweep over every edge position the page's range can produce (0 to 100 in steps of 0.5, mapped onto the scene's −300..+100 span, line 42) times five estimates (lines 40–52), asserting that a partly seen region is always `unsure` and an unseen one always `none`; the counter on line 52 fails the whole run if the sweep somehow never produced a partly seen case;
- a reversed region, which must throw (lines 54–56).

Any assertion failure throws, so `bun run check` exits non-zero on the first failing case.

## Main types and functions

| Symbol | Where | What it is |
| --- | --- | --- |
| `siteRoot` | `public-files.ts:4` | Absolute path of the repository root; exported so all three scripts agree on it. |
| `publicFiles()` | `public-files.ts:23` | The one public API of the directory: `Promise<string[]>` of every file that is part of the site. |
| `assetFiles(directory)` | `public-files.ts:9` | Private recursive walker behind `publicFiles()`. |
| `fetch(request)` | `dev.ts:13` | The dev server's request handler; all serving logic lives here. |
| `CoverageCheck` (type) | `check-coverage.ts:4` | The shape of `globalThis.coverageCheck` as the check sees it; the real implementation is `coverage.js:5`. |
| `coverageCheck({region, estimate, edge, limit, wide, narrow})` | `coverage.js:5` | The unseen-ground rule: returns `none` when nothing is seen, `unsure` when part is seen, and only ever `pass`/`fail` when the whole region is seen (lines 8–15). |

`build.ts` has no functions at all — it is one straight-line top-level script, which is why importing it would run a build.

## How it connects to the rest of the repository

- `package.json` maps `dev`, `build`, and `check` to the three scripts; there are no other entry points.
- `vercel.json` runs `bun run build` and serves `outputDirectory: dist`; the CI workflow `.github/workflows/site-build.yml` runs only `bun run build` (on Bun 1.3.10, both Ubuntu and Windows, on every pull request). `bun run check` is not in CI — run it by hand.
- `index.html` lines 13–20 reference the favicon, a font preload, the stylesheet, and the four root JavaScript files; those are exactly the references the build validates. The minified inline script at `index.html:12` (the arrival effect) is not part of `scripts/` and is not built.
- `coverage.js` is the contract between the page and the check: `story.js` requires it before itself (`story.js:168`) and calls it per slider position (`story.js:203`) with rule constants hand-copied at `story.js:185-187`; `check-coverage.ts` imports it and re-copies the same constants at line 21. The scene span the sweep walks (−300 to +100) mirrors `story.js:192-194`.
- The parent repository ([SamGu-NRX/house-scanning-master](https://github.com/SamGu-NRX/house-scanning-master)) mounts this repo as the `sites/landing` submodule; `scripts/` knows nothing about that and needs to know nothing.

## Examples

Runnable examples live in `scripts/examples/`. Run them all:

```
bun scripts/examples/run-all.ts
```

or one at a time:

```
bun scripts/examples/public-files-demo.ts   # list the public files, assert the invariants
bun scripts/examples/build-demo.ts          # show the public file list; the real build is `bun run build`
bun scripts/examples/coverage-demo.ts       # call coverageCheck directly: pass, partial, and the reversed-region error
bun scripts/examples/dev-demo.ts            # start the real dev server on a spare port, hit /, an asset, and a 404
```

Each example is a standalone script that exits non-zero on failure; `run-all.ts` runs them in sequence and stops at the first failure.

## Known limitations and sharp edges

- **JavaScript is not scanned.** The reference check reads only `index.html` and `styles.css` (`build.ts:10-11`). An asset referenced only from `demo.js`, `story.js`, or any other script gets no check — and today no JS file references `assets/` at all (verified by grep at this commit). If the page's scripts start loading assets, the check must grow with them.
- **The `srcset` branch is currently unused.** `index.html` has no `<img>` and no `srcset` attribute at this commit, so `build.ts:14-16` handles a case that cannot occur yet. It is kept deliberately: the README records that Bun's HTML bundler chokes on this page's `srcset` lists, so `srcset` is expected to return.
- **The rule constants exist in two hand-synced places.** `story.js:185-187` (`LIMIT .5`, `WIDE .45`, `NARROW .08`) and `check-coverage.ts:21` are copies of each other, as are the scene span constants (`story.js:192-194` vs `check-coverage.ts:42`). Change one side without the other and the check keeps passing while testing values the page no longer uses.
- **The root file list is maintained by hand.** A new root-level page file must be added to `rootFiles` (`public-files.ts:24`) or neither the dev server nor the build will see it. The reverse is silent too: a root file that is not listed is simply never deployed — nothing warns.
- **The extension allow-list is closed.** An asset with a new extension (`.png`, `.jpg`, or even an uppercase `.WEBP`) is silently excluded from `publicFiles()` (`public-files.ts:7`); the fix is editing the allow-list, and nothing prompts you to.
- **CSS `url()` whitespace is a false-negative risk.** The regex at `build.ts:19` matches `url("x")`, `url('x')`, and `url(x)`, but not `url( "x" )` with inner whitespace — such a reference would be silently skipped by the check rather than failed. The real `styles.css` only uses the matched forms today.
- **Query strings are not supported in references.** A cache-busting reference like `assets/mark.svg?v=2` would hard-fail the build at `build.ts:24`; relative references must be bare paths.
- **The dev server's route set is a startup snapshot.** Files added while `bun run dev` is running 404 until restart (`dev.ts:4`).
- **`bun run check` is not in CI.** The workflow only builds. The coverage rule's test depends on someone running it locally.
- **Unreferenced-but-public files still ship.** The eight images in `assets/art/` are referenced nowhere (they left the page; see `DESIGN.md`) but are copied into every `dist/` because `publicFiles()` lists everything public, not everything used.
