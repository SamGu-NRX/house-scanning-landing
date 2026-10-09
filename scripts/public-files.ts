import { lstat, readdir } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

// Anchored to this module's directory rather than the process working directory, so
// every consumer resolves the same tree no matter where bun was started.
export const siteRoot = resolve(import.meta.dir, "..");

// Only these asset types belong on the public site. Keep notes and local output out.
// Notes like art/README.md drop out; the .txt font and frame licenses stay in.
const publicAssetExtensions = new Set([".svg", ".webp", ".woff2", ".txt"]);

// Walk the given assets/ directory recursively, so nested folders like art/ and
// fonts/ need no list of their own.
async function assetFiles(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    // Refuse a link instead of following it: the target could sit outside the site
    // root, and a copy would pull in whatever it points at.
    if (entry.isSymbolicLink()) throw new Error(`Refusing linked asset: ${fullPath}`);
    if (entry.isDirectory()) {
      result.push(...await assetFiles(fullPath));
    } else if (entry.isFile() && publicAssetExtensions.has(extname(entry.name))) {
      // Relative to the site root with forward slashes: on windows-latest, relative()
      // would otherwise hand back backslashes and the list would not match the
      // references in index.html.
      result.push(relative(siteRoot, fullPath).split(sep).join("/"));
    }
  }
  return result;
}

export async function publicFiles(): Promise<string[]> {
  // Hand-listed rather than scanned: a new page file at the repo root has to be added
  // here, or neither dev nor build will see it.
  const rootFiles = ["index.html", "styles.css", "motion.js", "demo.js", "coverage.js", "story.js"];
  // lstat rather than stat, so a link is not followed: a directory or a link wearing a
  // page's name fails the run here instead of at copy or serve time.
  for (const name of rootFiles) {
    const info = await lstat(join(siteRoot, name));
    if (!info.isFile()) throw new Error(`Expected a regular public file: ${name}`);
  }
  return [...rootFiles, ...await assetFiles(join(siteRoot, "assets"))];
}
