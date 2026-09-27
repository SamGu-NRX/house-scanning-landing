# Design notes

For the next person refining the landing page: where each visual comes from, and how to swap the illustrations for real footage.

## Direction

Every visual is one to-scale meter wall. It is defined once in centimeters (`#meter-wall`, `#yard`, `#far-yard` in `index.html`) and appears as the phone's camera view, as the walk seen from outside, and as the unseen-ground study. The page explains the survey with these drawings; the briefing carries the research.

Familjen Grotesk (Familjen STHLM, SIL OFL, `assets/fonts/`) replaced Manrope for headings. Manrope at weight 400 with tight tracking read as a generic product hero. Familjen's grotesk forms stay legible at medium weight with little tracking. Instrument Sans remains the body face. The drawn phone keeps the system rounded face.

## The phone

The drawn screens follow `ios/HouseScan/UI` at `dd44fc3` on the `house-scanning-master` branch `t3/ios-mvf-r7-ui`: `Theme.swift`, `CameraChrome.swift`, `Buttons.swift`, `InstructionCard.swift`, `PhotoCounter.swift`, `WallTape.swift`, `GroundQuestion.swift`, `ScanCopy.swift` and `ResultScreen.swift`. They are not a device capture, and nothing here shows what TestFlight installs.

- `demo.js` builds one scene timeline. A shot plays one window of it at a rate; the hero plays a shortened cut (`CUT`, about 17 s) and a step button plays that stage in full. The cut's base rates were set by eye; Sam asked for 30% more time per beat, so each is divided by `CUT_SLOWER` (1.3). Nobody has tested either with viewers.
- A finished or paused shot is re-seeked to its clock, never later than one millisecond before its stage boundary (`shotLast`), so a played step ends inside itself and a resize rebuilds the same frame. `pause()` sets the clock's time explicitly because `Animation.pause()` only settles on the next frame ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Animation/pause); Context7 was out of quota). After someone picks a step, Watch all returns to the overview.
- Keyboard selection and reduced motion show a stage's still at once: the frame that makes its point (`still` in `stages`). Walk stops on the full coverage strip and Mark on the marked window. With reduced motion, Play steps through the stills.
- The fingertip appears only for taps the person makes. The automatic meter photo gets none.
- The example result sits 12 ft from the meter, so it falls in the third panel of the wide figure. The electrical-panel notice is the one `ResultScreen.swift` always shows.

## The phone's side

"From camera frames to a wall in feet" draws the iOS client from `house-scanning-ios-r7-ui` (branch `t3/ios-mvf-r9-ui`, checked at `fb4c30e`), not from the older parent checkout:

- `Runtime/LiveCapture.swift`: ARKit world tracking with `.gravity` alignment, horizontal and vertical planes, `meshWithClassification` or `mesh`, and `sceneDepth` only where the phone supports it. The four layer details say no more than this file does.
- `HouseScanKit/Scene/SceneExport.swift`: scene.json is ARKit's world frame converted from meters to feet. `scene.schema.json` defines `s` along the wall from the meter, `coverage` and `keyframes`.
- The scene.json panel is valid JSON with the page's example values, abridged: keyframes and objects omit schema-required keys (`id`, `intrinsics`, `w`, `h`; `bottom_ft`, `top_ft`), so it would not validate against the schema. Keys and enum values come from `scene.schema.json` and `example-scene.json`.

## The server

"The server rebuilds the wall from the photos" presents the intended pipeline from `huntertcarver/house-scanning-server` at `66ee387` (main after PR #26, the typed contracts), in present tense. At that revision the contracts are the only server code; no deployed service was verified, and the page links no source because the repository is private.

- Routes: `server/contracts/api.py` and `docs/build/ws-14-ios-contract.md` §3.2. The app creates a capture, uploads to signed URLs, commits, finalizes with `packet.json` (`formatVersion` 0.4), long-polls `…/events` and reads `…/result`.
- Stage chips are `StageName` values from `server/contracts/jobs.py`; the four drawings group eleven stages and leave out `validate`, `objects`, `reads` and `objects_3d`.
- Technologies come from `docs/server-pipeline-build-plan.md` §2 and §3: COLMAP held to ARKit poses, π³ or LiDAR depth, scale from LiDAR or the meter's make and model, rules that decide with other checks limited to veto or downgrade.
- result.json uses `ResultResponse` keys from `server/contracts/result.py` (camelCase; `needs_views`, `needs_more_photos`, a `band` view and a `route_length` criterion). It omits `runId`, `memberActions` and `outcome.profile/message/reasons`, and it shows no threshold. The criterion values are the page's example route.
- **Current vs proposed.** The client has not moved to this path. At `2641027` (`t3/ios-mvf-r9-ui`, rechecked at `fb4c30e`), `ResultClient.swift` posts scene.json alone to `/v1/placements` (the briefing's PR #11 prototype, snake_case `decision`/`spot`/`checks`), and the homeowner's share packet is manifest 1.1 (`PacketManifest.swift`), not packet 0.4. The page shows the intended flow; this note is where the gap lives.
- No figure from the plan appears. Its accuracy numbers come from DSLR, laser and simulated data, and `packetgen` packets are synthetic.

## Materials, light and motion

- One light, from the upper left. In the shared wall (`#meter-wall`, `#yard`), shadows are hard offsets and shading is gradients, because the phone's camera view repaints that drawing every frame and a filter there would be paid per frame. The layer sheets, server drawings and unseen-ground study are static, so they use `feDropShadow` and blur ([MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/filter)); those rasterize once. Nothing uses WebGL or a continuous animation.
- The server drawings were computed by a scratch script (a perspective point cloud and an isometric slice) that is not in the repository. The SVG in `index.html` is the source now.
- Layer key (`story.js`): a button or sheet click pins its layer; a mouse over a button previews it and hands back to the pinned one; Escape or a tap outside unpins. Sheets above the focused one rise and sheets below sink, and both empty to dashed outlines, because an opacity-dimmed sheet still paints over a lower selected one. SVG has no z-index, so emptying is what keeps a lower sheet readable. Interaction moves are 300 ms; the first separation on scroll is 760 ms and staggered.
- Unseen-ground study: the candidate battery and its clearance envelope take the colours of their checks (`data-wall`, `data-ground`, `data-room` on the scene), so the shrub inside the envelope is visibly why Clear space fails once seen.
- "What leaves the phone" and the server flow play one entrance each, only when they start below the screen; with reduced motion or no script they are drawn from the start.
- Code panels: lines stay at 38 characters or fewer, so they fit a 320 px screen at 11 px without wrapping. Token colours (keys, strings, numbers, booleans, punctuation) all hold at least 5.5 : 1 on the panel.

## References visible in the work

| Reference | Used for | Limit |
| --- | --- | --- |
| [useLayouts: scroll split cards](https://uselayouts.com/docs/components/scroll-split-cards) | The wide figure: one continuous wall separates into three aligned panels. | The docs page shows no mechanics. `story.js` copies one drawing into each panel and only the clips change, so nothing shifts when it splits. Triggered on view, not by scroll. No source copied. |
| [Detail: smart corner morph](https://detail.design/detail/smart-corner-morph-animation) | The step highlight stretches over both steps before settling, so it travels as one shape. | The page offers a video only; this is an adaptation, not its implementation. |
| [Aceternity: Compare](https://ui.aceternity.com/components/compare) | The unseen-ground slider. | Pointer drags on the scene, with a range kept for keys. A check reads Not seen with none of its region in view and Unsure with part of it; only a fully seen region can pass or fail (`coverage.js`, tested by `bun run check`). No source copied. |
| [Magic UI: iPhone](https://magicui.design/docs/components/iphone) | Device frame geometry. | The only adapted code; MIT notice in `assets/iphone-frame-LICENSE.txt`. |
| [Live briefing](https://house-scanning-briefing.vercel.app/), midday 26 Sep 2026 | The pass/fail/unsure rule on error bars, unseen ground never counted as empty, rules rather than a model deciding, the upload carrying only measurements, and the three method families under comparison. | Its dated status, thresholds and dataset figures stay off this page. The local briefing files are older and supplied no claims. |

The other supplied references (Kree8, Lathyrus, Designeer, Florian Kiem, ObsidianUI, Nexvyn, Cult UI, Spell, Deck.gallery, Animos, Godly, Transitions.dev, Backgrounds Supply) were recorded in the previous pass and are not visibly used in this one. Cult UI's ShiftCard page returned 404 on 26 Sep 2026. The four generated images in `assets/art/` are no longer on the page but still ship with the build; their prompts remain in `assets/art/README.md`.

## Replacing the illustrations

- **Landing film.** `.film-stage` in the "What one walk records" section is its position, at 2 : 1. Replace `.film-whole` and the three `.panel` elements with one `<video>` (muted, `playsinline`, a poster frame, native controls) of the same aspect, and remove the wide-figure block from `story.js`. The Seen, Measured and Placed chips and captions can become its chapters; a film that ends on the same three-part frame keeps the page's main explanation.
- **Phone recording.** A screen recording replaces all of `.app` inside `.phone-screen`. Keep the frame, the step list and Play, and map each `CUT` shot to video times. The footer identifies the current survey and measurements as examples.
