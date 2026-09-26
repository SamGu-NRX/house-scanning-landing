# Design references

For the next person refining the landing page: these references inform the interactions, while the page keeps its paper, fern, large-icon visual style. All 17 supplied sites were inspected on September 26, 2026. A documented interaction is distinguished from one exercised in the browser below.

## Patterns used here

The phone keeps one scene in place through capture, reconstruction, scale, and fit. Its stage indicator moves between positions; pause freezes the scene and its progress together. The coverage illustration uses a native range input, so dragging and arrow keys reveal the same content. Research questions and FAQs use native disclosures. Section entrances play once, with a short stagger; keyboard input and reduced motion suppress movement.

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

The scene lives inside `.scene-viewport`; device chrome and controls live outside it. A future recording can replace the SVG, but the stage timings and play, pause, replay controls must then follow the video's actual timeline. Keep the concept label until the recording demonstrates the real capture and reconstruction path.
