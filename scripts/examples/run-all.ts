// Runs every example in this directory, in order, as a child process, and
// stops at the first failure. Run with `bun scripts/examples/run-all.ts`.

// The list must match the files in this directory. A missing file is a hard
// failure before any example runs; that catches a broken merge.
const examples = [
  "public-files-demo.ts",
  "build-demo.ts",
  "coverage-demo.ts",
  "dev-demo.ts",
];

for (const name of examples) {
  const path = `${import.meta.dir}/${name}`;
  if (!(await Bun.file(path).exists())) {
    console.error(`missing example: ${path}`);
    process.exit(1);
  }
}

for (const name of examples) {
  console.log(`running ${name}`);
  const proc = Bun.spawn({
    cmd: [process.execPath, `${import.meta.dir}/${name}`],
    stdio: ["inherit", "inherit", "inherit"],
  });
  const code = await proc.exited;
  if (code !== 0) {
    console.error(`example ${name} failed with exit code ${code}`);
    process.exit(code || 1);
  }
}

console.log(`all examples passed (${examples.length}/${examples.length})`);
