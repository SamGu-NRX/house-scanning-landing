import { lstat, readdir } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";

export const siteRoot = resolve(import.meta.dir, "..");

// Only these asset types belong on the public site. Keep notes and local output out.
const publicAssetExtensions = new Set([".svg", ".webp", ".woff2", ".txt"]);

async function assetFiles(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing linked asset: ${fullPath}`);
    if (entry.isDirectory()) {
      result.push(...await assetFiles(fullPath));
    } else if (entry.isFile() && publicAssetExtensions.has(extname(entry.name))) {
      result.push(relative(siteRoot, fullPath).split(sep).join("/"));
    }
  }
  return result;
}

export async function publicFiles(): Promise<string[]> {
  const rootFiles = ["index.html", "styles.css", "demo.js", "motion.js"];
  for (const name of rootFiles) {
    const info = await lstat(join(siteRoot, name));
    if (!info.isFile()) throw new Error(`Expected a regular public file: ${name}`);
  }
  return [...rootFiles, ...await assetFiles(join(siteRoot, "assets"))];
}
