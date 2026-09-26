import { join } from "node:path";
import { publicFiles, siteRoot } from "./public-files";

const routes = new Set((await publicFiles()).map((name) => `/${name}`));
const port = Number(Bun.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer from 1 to 65535");
}

const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(request) {
    const pathname = new URL(request.url).pathname;
    const route = pathname === "/" ? "/index.html" : pathname;
    if (!routes.has(route)) return new Response("Not found", { status: 404 });
    const file = Bun.file(join(siteRoot, route.slice(1)));
    return new Response(file, { headers: { "content-type": file.type } });
  },
});
console.log(`Open ${server.url}`);
