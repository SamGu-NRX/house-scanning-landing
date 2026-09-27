// Checks the unseen-ground rule in coverage.js: no check may pass or fail while any of its region is unseen.
// Run with `bun run check`. It exits non-zero with the first failing case.
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

const rule = { limit: 0.5, wide: 0.45, narrow: 0.08 };
const region: [number, number] = [-190, -114];
const fail = (message: string) => { throw new Error(message); };
const expect = (label: string, got: string, want: string) => {
  if (got !== want) fail(`${label}: expected ${want}, got ${got}`);
};

// The discrete cases: nothing seen, part seen, all seen.
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
for (let value = 0; value <= 100; value += 0.5) {
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
if (partial === 0) fail("the sweep never produced a partly seen region, so it tested nothing");

let threw = false;
try { coverageCheck({ region: [-100, -190], estimate: 0.5, edge: 0, ...rule }); } catch { threw = true; }
if (!threw) fail("a reversed region should be refused");

console.log(`coverage check passed: 8 discrete cases, ${partial} partly seen cases in the sweep, all unsure`);
