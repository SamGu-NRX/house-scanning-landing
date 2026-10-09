// Prints the list that public-files.ts hands to build and dev, then checks the shape
// they rely on. Run with: bun scripts/examples/public-files-demo.ts
import { publicFiles, siteRoot } from "../public-files";

const files = await publicFiles();
const rootFiles = files.filter((name) => !name.startsWith("assets/"));
const assets = files.filter((name) => name.startsWith("assets/"));

console.log(`${files.length} public files under ${siteRoot}`);
console.log(`Root files (${rootFiles.length}): ${rootFiles.join(", ")}`);

const byDirectory = new Map<string, string[]>();
for (const asset of assets) {
  const directory = asset.slice(0, asset.lastIndexOf("/"));
  const names = byDirectory.get(directory) ?? [];
  names.push(asset);
  byDirectory.set(directory, names);
}
for (const [directory, names] of byDirectory) {
  console.log(`\n${directory}/`);
  for (const name of names) console.log(`  ${name}`);
}

// The invariants build.ts and dev.ts depend on; each failure stops the run.
if (!files.includes("index.html")) {
  throw new Error("index.html is missing from the public files");
}
if (files.includes("assets/art/README.md")) {
  throw new Error("assets/art/README.md must stay out: .md is not a public asset extension");
}
for (const name of files) {
  if (name.includes("\\")) throw new Error(`Backslash in public path: ${name}`);
  if (name.startsWith("/") || name.startsWith("../")) {
    throw new Error(`Public path must stay inside the site root: ${name}`);
  }
}
