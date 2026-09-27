# house-scanning landing page

Static landing page for the house-scanning project. The app and research code live in [SamGu-NRX/house-scanning-master](https://github.com/SamGu-NRX/house-scanning-master), which mounts this separate repository as a Git submodule at `sites/landing`.

## Preview and build

With Bun 1.3, run `bun run dev` from this directory and open <http://127.0.0.1:3000>. The server reads the HTML, CSS, JavaScript, and public assets directly from this directory. Refresh the browser after edits.

Run `bun run check` to test the unseen-ground rule in `coverage.js`. Run `bun run build` to produce `dist/`. The build copies the public page files, images, fonts, and font licenses. There are no package dependencies. Bun's HTML bundler currently fails on this page's `srcset` image lists, so the build keeps the existing file paths intact.

The phone demo (`demo.js`) draws the iOS prototype's screens over an illustrated meter wall: find the meter, walk the wall, mark what's near, and see a possible battery spot. It plays a short cut once when visible, and each step can be replayed in full. Reduced motion disables autoplay and movement. `story.js` runs the wide three-panel figure and the unseen-ground slider. There is no camera, upload, or reconstruction service connected.

The iPhone frame adapts Magic UI's MIT-licensed geometry; its notice is in `assets/iphone-frame-LICENSE.txt`. [Design notes](DESIGN.md) list the sources and how a real film or phone recording replaces the illustrations.

Familjen Grotesk and Instrument Sans are served locally. Their SIL Open Font License files are in `assets/fonts/`.

## Vercel

For the separate `house-scanning-landing` repository, set the Vercel project Root Directory to the repository root. `vercel.json` selects Bun for installation and build, then serves only `dist/`. If connecting the parent `house-scanning` repository instead, initialize its submodule and set the Vercel Root Directory to `sites/landing`. These are alternative project sources; do not point the landing deployment at the parent's `web/` app.

## Parent repository

In a fresh parent checkout, run `git submodule update --init sites/landing` to retrieve the pinned site version. Publish site changes here first, then update and commit the `sites/landing` pointer in the parent. Do not copy the site files into the parent's `web/` application.
