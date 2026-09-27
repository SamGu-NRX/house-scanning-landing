// One check in the unseen-ground study, kept free of the page so scripts/check-coverage.ts can test it alone.
// A check needs its whole region in view before it can pass or fail: unseen is "none", partly seen is "unsure".
// The error bar still narrows as more of the region comes into view, but it only decides the result once all
// of it is seen. Values are on an unnumbered scale where `limit` is the rule; none of them are real thresholds.
globalThis.coverageCheck = function coverageCheck({ region: [from, to], estimate, edge, limit, wide, narrow }) {
  if (!(from < to)) throw new Error(`coverageCheck needs a region with from < to, got [${from}, ${to}]`);
  // The walk saw everything right of `edge`, so the seen share of the region is the part right of it.
  const seen = Math.min(Math.max((to - Math.max(edge, from)) / (to - from), 0), 1);
  if (seen === 0) return { state: 'none', seen };
  const error = wide + (narrow - wide) * seen;
  const lo = Math.max(estimate - error, 0);
  const hi = Math.min(estimate + error, 1);
  if (seen < 1) return { state: 'unsure', seen, lo, hi };
  const state = estimate - error > limit ? 'pass' : estimate + error < limit ? 'fail' : 'unsure';
  return { state, seen, lo, hi };
};
