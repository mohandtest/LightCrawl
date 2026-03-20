#!/usr/bin/env bun
/**
 * LightCrawl CLI Build Script
 * Compiles TypeScript to runnable Bun bundle
 */

import { existsSync } from "fs";
import { rm } from "fs/promises";
import path from "path";

const showHelp = () => {
  console.log(`
🏗️  LightCrawl Build Script

Usage: bun run build.ts [options]

Options:
  --outdir <path>  Output directory (default: "dist")
  --minify         Enable minification
  --help, -h       Show this help message

Example:
  bun run build.ts --outdir=dist --minify
`);
};

if (Bun.argv.includes("--help") || Bun.argv.includes("-h")) {
  showHelp();
  process.exit(0);
}

const outdir = Bun.argv.includes("--outdir")
  ? Bun.argv[Bun.argv.indexOf("--outdir") + 1] || "dist"
  : "dist";

const minify = Bun.argv.includes("--minify");

console.log("\n🚀 Starting build process...\n");

if (existsSync(outdir)) {
  console.log(`🗑️  Cleaning previous build at ${outdir}`);
  await rm(outdir, { recursive: true, force: true });
}

console.log(`📦 Building LightCrawl CLI...\n`);

const result = await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir,
  minify,
  target: "bun",
});

if (result.success) {
  console.log(`✅ Build successful!\n`);
  console.log(`📂 Output: ${outdir}/index.js`);
  console.log(`\n🚀 To run the built version:`);
  console.log(`   bun ${outdir}/index.js search <query>`);
  console.log(`   bun ${outdir}/index.js download <url>\n`);
} else {
  console.error(`❌ Build failed!`);
  for (const msg of result.logs) {
    console.error(msg);
  }
  process.exit(1);
}
