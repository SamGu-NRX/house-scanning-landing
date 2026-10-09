// Checks the unseen-ground rule in coverage.js: no check may pass or fail while any of its region is unseen.
// Run with `bun run check`. It exits non-zero with the first failing case.
// coverage.js is dual-use: the page loads it as a script (index.html line 19) to run the
// unseen-ground slider, and this import brings the same file in as the unit under test.
// coverage.js exports nothing, so the import runs only for its side effect of defining
// globalThis.coverageCheck.
await import("../coverage.js");
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
// SAFETY: coverage.js assigns this exact callable to globalThis when imported above.
const coverageCheck = (globalThis as typeof globalThis & { coverageCheck?: CoverageCheck }).coverageCheck;
if (typeof coverageCheck !== "function") throw new Error("coverage.js did not define globalThis.coverageCheck");
// The page side keeps the mirror-image guard: story.js line 168 throws if coverage.js has
// not defined the callable before story.js runs.

// Hand-synced with the page: these values copy LIMIT, WIDE and NARROW (story.js lines
// 185-187). Nothing links the two, so a page-side change must be copied here or the check
// quietly tests numbers the page no longer uses.
const rule = { limit: 0.5, wide: 0.45, narrow: 0.08 };
// The battery's span in the unseen scene, as drawn in index.html line 963 and checked by
// the wall and ground rows (story.js lines 189-190).
const region: [number, number] = [-190, -114];
// Uncaught throws end the process non-zero, so one failing expect is enough to fail bun run check.
const fail = (message: string) => { throw new Error(message); };
const expect = (label: string, got: string, want: string) => {
  if (got !== want) fail(`${label}: expected ${want}, got ${got}`);
};

// The discrete cases: nothing seen, part seen, all seen.
// Eight calls cover every state the rule can return: two none, four unsure, one pass, one fail.
expect("edge right of the region", coverageCheck({ region, estimate: 0.95, edge: -100, ...rule }).state, "none");
expect("edge on the region's right end", coverageCheck({ region, estimate: 0.95, edge: -114, ...rule }).state, "none");
expect("half the region seen, clear estimate", coverageCheck({ region, estimate: 0.95, edge: -152, ...rule }).state, "unsure");
expect("half the region seen, failing estimate", coverageCheck({ region, estimate: 0.02, edge: -152, ...rule }).state, "unsure");
expect("one unit still unseen", coverageCheck({ region, estimate: 0.95, edge: -189, ...rule }).state, "unsure");
expect("all seen, bar clears the limit", coverageCheck({ region, estimate: 0.78, edge: -190, ...rule }).state, "pass");
expect("all seen, bar short of the limit", coverageCheck({ region, estimate: 0.2, edge: -300, ...rule }).state, "fail");
expect("all seen, bar straddles the limit", coverageCheck({ region, estimate: 0.52, edge: -300, ...rule }).state, "unsure");

// The sweep: every edge position the page's range can produce, for estimates from certain fail to certain pass.
// Only a fully seen region may pass or fail.
let partial = 0;
// The page's range input steps by 1 (index.html line 976); stepping 0.5 here covers every
// position the page can produce plus the midpoints between them.
for (let value = 0; value <= 100; value += 0.5) {
  // Hand-synced with the page like the rule above: -300 and 400 copy LEFT and WIDTH (story.js
  // lines 181-182), and the formula copies the page's edge calculation (story.js line 199).
  // If the scene changes there and not here, the sweep tests edges the page can no longer
  // produce.
  const edge = -300 + 400 * value / 100;
  for (const estimate of [0, 0.2, 0.5, 0.78, 1]) {
    const { state, seen } = coverageCheck({ region, estimate, edge, ...rule });
    if (seen > 0 && seen < 1) {
      partial += 1;
      expect(`partly seen (${(seen * 100).toFixed(1)}%) at estimate ${estimate}`, state, "unsure");
    }
    if (seen === 0) expect(`unseen at estimate ${estimate}`, state, "none");
  }
}
// A sweep that never lands inside the region would pass without exercising partial sight,
// so the count has to come back non-zero.
if (partial === 0) fail("the sweep never produced a partly seen region, so it tested nothing");

// coverage.js refuses a region whose ends are out of order (coverage.js line 6), so this
// replays the refusal and fails if the throw ever goes missing.
let threw = false;
try { coverageCheck({ region: [-100, -190], estimate: 0.5, edge: 0, ...rule }); } catch { threw = true; }
if (!threw) fail("a reversed region should be refused");

console.log(`coverage check passed: 8 discrete cases, ${partial} partly seen cases in the sweep, all unsure`);
