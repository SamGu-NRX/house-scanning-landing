# Design references

For the next person refining the landing page: these references inform the interactions, while the page keeps its paper, fern, large-icon visual style. All 17 supplied sites were inspected on September 26, 2026. A documented interaction is distinguished from one exercised in the browser below.

## Patterns used here

The phone follows four steps: find the meter, walk the wall, mark nearby features, and review a possible battery placement. Its layout and wording follow `ios/HouseScan/UI` on the `house-scanning-master` development branch `t3/ios-mvf-r7-ui` at `dd44fc3`. This source does not establish what is installed through TestFlight. The page calls the drawn screens an illustrated preview.

- The wall is defined once in centimeters (`#meter-wall`, `#yard` and `#far-yard` in `index.html`) and reused by the phone camera, the result model and the coverage study.
- Phone chrome is sized in iPhone points: `--pt` is 1/393 of the screen width. The values come from `Theme.swift`, `CameraChrome.swift`, `Buttons.swift`, `InstructionCard.swift`, `PhotoCounter.swift`, `Scrim.swift` and `WallTape.swift`. The status bar and home indicator share a 393 × 851 SVG grid with the frame's island.
- `demo.js` builds one scene timeline. Each stage plays a window of it under its own clock, which also drives the progress bar in the stage control, so pause freezes both. Stage buttons, keyboard play and reduced motion show each stage's last frame.
- The ending uses the app's manual-review headline because the illustrated placement needs review. The upload screen uses a list icon at Sam's request to remove up-arrows.

The coverage illustration puts the same wall under haze, and a native range input moves the haze's edge, so dragging and arrow keys reveal the same content. Research questions and FAQs use native disclosures. Section entrances play once, with a short stagger; keyboard input and reduced motion suppress movement.

Only the Magic UI device geometry is adapted source code. Its MIT notice is in `assets/iphone-frame-LICENSE.txt`. The other interactions are local implementations informed by the references.

| Reference | Useful detail | Application or limit |
| --- | --- | --- |
| [Detail: corner morph](https://detail.design/detail/smart-corner-morph-animation) | A continuous shape bridges two states. | The selected stage travels between buttons rather than appearing in a new place. |
| [Magic UI: iPhone](https://magicui.design/docs/components/iphone) | Device geometry with a separate content area. | Adapted frame, with a DOM screen that can later hold a real recording. |
| [Aceternity: Compare](https://ui.aceternity.com/components/compare) | A movable boundary makes an image comparison tangible. | Coverage reveal, with an explicit illustration label and keyboard support. |
| [Kree8](https://kree8-exploration.vercel.app/) | Layered posters make the work itself the focal point. | Layered capture artwork, with a restrained fan on pointer hover. |
| [Lathyrus](https://lathyrustrading.com/) | Product scenes explain individual features. | The phone demonstrates each step instead of relying on descriptive copy alone. |
| [Designeer](https://designeer.xyz/) | Curated components, including Motion Primitives. | Discovery reference; no additional library needed for this static page. |
| [Florian Kiem: no loading states](https://floriankiem.com/writing/the-perfect-app-has-no-loading-states) | Preserve useful context while work continues. | Keep the illustrated scene visible through every phase; avoid a fake loading screen. |
| [ObsidianUI: draggable marquee](https://www.obsidianui.dev/docs/draggable-marquee) | Documented drag momentum and keyboard controls. | Preview stayed black. No marquee added; repeating images would not explain the survey. |
| [useLayouts: scroll split cards](https://uselayouts.com/docs/components/scroll-split-cards) | One photo separates into aligned panels on scroll. | Reference for preserving visual continuity between evidence and model views. No source copied. |
| [Nexvyn: phone mockup](https://ui.nexvyn.dev/components/phone-mockup) | Upright and angled devices frame a product demo. | Kept a single upright phone so the scene remains legible. No assets copied. |
| [Cult UI: ShiftCard](https://www.cult-ui.com/docs/components/shift-card) | Documented reveal of secondary details on hover. | Research details open on click or keyboard instead, making the same information available on touch. Hover behavior was not exercised. |
| [Spell: perspective book](https://spell.sh/docs/perspective-book) | A dimensional object carries a small hover response. | Reference for the capture stack's depth. No book component or code used. |
| [Deck.gallery](https://deck.gallery/) | Editorial cover layouts and clear visual pacing. | Wide concept imagery separates denser technical explanations. No deck assets used. |
| [Animos](https://animos.app/) | Looping product showcase templates. | Reference for a staged scan narrative. No templates acquired; the walkthrough plays once. |
| [Godly: heroes](https://godly.design/hero/) | Product-first hero compositions. | Keep the phone alongside the main proposition, with one clear demo action. |
| [Transitions.dev](https://transitions.dev/) | Small state changes, sliding pills, and panel reveals. | Stage indicator, short instruction entrances, and disclosure transitions. |
| [Backgrounds Supply](https://www.backgrounds.supply/) | Categorized background studies. | Plain paper and a light coverage hatch suit this page. No paid assets acquired. |

## Replacing the illustration

The camera scene is `svg.scene` inside `.app`, beneath the drawn controls. A recording of the real app can replace all of `.app`, including its chrome. Keep the device frame and external playback controls, and bind the stage timings to the video's timeline. Keep the Illustration badge while the screens are drawn.
