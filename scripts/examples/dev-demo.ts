// End-to-end demo of scripts/dev.ts. It spawns the real dev server as a child
// process, waits until it answers, probes three routes, and always stops the
// child. Exits 0 when every probe matches, and non-zero with the reason
// otherwise.
//
// Usage: bun scripts/examples/dev-demo.ts
// Set EXAMPLE_PORT to pin the port; otherwise a random port in 20000-40000
// keeps parallel runs on one machine from colliding.

import { join } from "node:path";

// An EXAMPLE_PORT pins the port; a random one rarely collides.
const port = Bun.env.EXAMPLE_PORT ?? String(20000 + Math.floor(Math.random() * 20001));
const base = `http://127.0.0.1:${port}`;

// The child runs from the repo root so its relative paths resolve the same way
// they do under `bun run dev`. process.execPath is the bun binary already
// running this demo.
const child = Bun.spawn([process.execPath, "scripts/dev.ts"], {
  cwd: join(import.meta.dir, "..", ".."),
  env: { ...Bun.env, PORT: port },
  stdout: "pipe",
  stderr: "pipe",
});

// One probe: fetch the path and compare the status and, when wanted, the
// content-type prefix before any charset parameter. Returns true on a match.
async function probe(path: string, wantStatus: number, wantType?: string): Promise<boolean> {
  const response = await fetch(`${base}${path}`);
  const type = (response.headers.get("content-type") ?? "").split(";")[0];
  const body = await response.text();
  const matched = response.status === wantStatus && (wantType === undefined || type === wantType);
  const got = `got ${response.status} with ${type || "no content-type"}, ${body.length} chars`;
  if (matched) console.log(`dev-demo: GET ${path}: ${got}`);
  else console.error(`dev-demo: GET ${path}: ${got}; wanted ${wantStatus}${wantType === undefined ? "" : ` with ${wantType}`}`);
  return matched;
}

let ok = true;
try {
  // Bounded wait: at most 25 polls, 200 ms apart. If the child exits first
  // (port taken, startup error), stop waiting and report what it printed.
  let up = false;
  for (let attempt = 0; attempt < 25 && !up; attempt++) {
    if (child.exitCode !== null) break;
    try {
      await fetch(base);
      up = true;
    } catch {
      await Bun.sleep(200);
    }
  }
  if (!up) {
    ok = false;
    if (child.exitCode !== null) {
      console.error(`dev-demo: the server exited before answering on ${base}`);
      const stderr = await new Response(child.stderr).text();
      if (stderr.trim()) console.error(stderr.trim());
    } else {
      console.error(`dev-demo: the server never answered on ${base}`);
    }
  } else {
    // The home page.
    ok = (await probe("/", 200, "text/html")) && ok;
    // A real asset route.
    ok = (await probe("/assets/mark.svg", 200, "image/svg+xml")) && ok;
    // A path outside the snapshot's route set.
    ok = (await probe("/nope", 404)) && ok;
  }
} catch (error) {
  console.error("dev-demo: unexpected failure:", error);
  ok = false;
} finally {
  // The child is stopped on every path; a demo must not leave a server running.
  child.kill();
  await child.exited;
}

if (ok) console.log("dev-demo: all probes matched");
else {
  console.error("dev-demo: at least one probe did not match");
  process.exit(1);
}
