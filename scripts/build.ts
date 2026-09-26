import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { publicFiles, siteRoot } from "./public-files";

const output = join(siteRoot, "dist");
const files = await publicFiles();
const included = new Set(files);

// Fail before touching dist if the page points at a file the build cannot publish.
const html = await Bun.file(join(siteRoot, "index.html")).text();
const css = await Bun.file(join(siteRoot, "styles.css")).text();
const references: string[] = [];
for (const [, attribute, value] of html.matchAll(/\b(src|href|srcset)="([^"]+)"/g)) {
  const paths = attribute === "srcset"
    ? value.split(",").map((item) => item.trim().split(/\s+/)[0])
    : [value];
  references.push(...paths);
}
for (const [, quoted, singleQuoted, bare] of css.matchAll(/url\((?:"([^"]+)"|'([^']+)'|([^\s)]+))\)/g)) {
  references.push(quoted ?? singleQuoted ?? bare);
}
for (const reference of references) {
  if (/^(?:#|[a-z]+:|\/\/)/i.test(reference)) continue;
  if (!included.has(reference)) throw new Error(`Public asset missing from build: ${reference}`);
}

// A clean output keeps removed files from appearing in the next deployment.
await rm(output, { recursive: true, force: true });
for (const name of files) {
  const destination = join(output, name);
  await mkdir(dirname(destination), { recursive: true });
  await Bun.write(destination, Bun.file(join(siteRoot, name)));
}
console.log(`Copied ${files.length} public files to dist/`);
