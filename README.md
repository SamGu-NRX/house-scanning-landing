# house-scanning landing page

Static landing page for the house-scanning project. The app and research code live in [SamGu-NRX/house-scanning](https://github.com/SamGu-NRX/house-scanning), which mounts this separate repository as a Git submodule at `sites/landing`.

## Preview

Run `python3 -m http.server 4173 --bind 127.0.0.1` from this directory, then open <http://127.0.0.1:4173>. The site uses HTML, CSS, and a small JavaScript demo controller. No build step or package installation is needed.

The phone demo follows a fixed illustration through capture, reconstruction, scale, and possible battery fit. It plays once when visible and supports pause, replay, and manual steps. Reduced motion disables autoplay and movement. There is no camera, upload, or reconstruction service connected.

The technical section describes the proposed pipeline. The generated images are explanatory concepts; [asset notes](assets/art/README.md) record their prompts and filenames.

Manrope and Instrument Sans are served locally. Their SIL Open Font License files are in `assets/fonts/`.

## Parent repository

In a fresh parent checkout, run `git submodule update --init sites/landing` to retrieve the pinned site version. Publish site changes here first, then update and commit the `sites/landing` pointer in the parent. Do not copy the site files into the parent's `web/` application.
