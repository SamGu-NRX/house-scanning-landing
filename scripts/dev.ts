// Static file server for local development: serves the public files straight
// from the repo root, with no build step in between.
import { join } from "node:path";
import { publicFiles, siteRoot } from "./public-files";

// The route set is snapshotted once at startup from publicFiles(). A file
// added while the server runs is not in the set, so it 404s until restart.
const routes = new Set((await publicFiles()).map((name) => `/${name}`));
// An unset PORT defaults to 3000; anything set must be a real port number, so
// a typo fails fast instead of binding somewhere unexpected.
const port = Number(Bun.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer from 1 to 65535");
}

const server = Bun.serve({
  // Loopback only: this server serves raw sources and is not meant to be
  // reachable from the network.
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    // "/" serves the home page; every other request must match a route exactly.
    const route = pathname === "/" ? "/index.html" : pathname;
    // Matching is exact-string against the snapshot. The URL parser normalizes
    // dot-dot segments away (it decodes %2e too, so /%2e%2e/x arrives as /x),
    // and what survives, like /..%2findex.html, cannot equal a route name:
    // those come from the publicFiles() walk, never from the request. Only a
    // matched route reaches Bun.file below, so no path outside siteRoot is
    // ever read.
    if (!routes.has(route)) return new Response("Not found", { status: 404 });
    const file = Bun.file(join(siteRoot, route.slice(1)));
    // The type comes from the file's extension, so no mime map lives here.
    return new Response(file, { headers: { "content-type": file.type } });
  },
});
console.log(`Open ${server.url}`);
