// A runnable tour of the check that scripts/check-coverage.ts exercises: one all-seen pass,
// one partly-seen unsure, and the reversed-region refusal. Run with `bun scripts/examples/coverage-demo.ts`.
await import("../../coverage.js");
type CoverageCheck = (input: {
  region: [number, number];
  estimate: number;
  edge: number;
  limit: number;
  wide: number;
  narrow: number;
}) => { state: "none"; seen: number } | {
  state: "unsure" | "pass" | "fail";
  seen: number;
  lo: number;
  hi: number;
};
// Same handoff as check-coverage.ts: coverage.js defines the callable on globalThis, so the
// typed read off globalThis is the only way in.
const coverageCheck = (globalThis as typeof globalThis & { coverageCheck?: CoverageCheck }).coverageCheck;
if (typeof coverageCheck !== "function") throw new Error("coverage.js did not define globalThis.coverageCheck");

// The battery's span, with the rule values hand-copied from story.js lines 185-187.
const rule = { limit: 0.5, wide: 0.45, narrow: 0.08 };
const region: [number, number] = [-190, -114];

// Edge -300 is left of the whole region, so every unit is seen and the bar clears the limit.
console.log("all seen:", JSON.stringify(coverageCheck({ region, estimate: 0.78, edge: -300, ...rule })));
// Edge -152 is the region's midpoint, so half is seen and the result stays unsure.
console.log("partly seen:", JSON.stringify(coverageCheck({ region, estimate: 0.95, edge: -152, ...rule })));

// A region with its ends out of order is refused rather than measured (coverage.js line 6).
try {
  coverageCheck({ region: [-100, -190], estimate: 0.5, edge: 0, ...rule });
} catch (error) {
  console.log("reversed region:", error instanceof Error ? error.message : error);
}
