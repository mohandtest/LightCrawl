/**
 * Legacy Command Mode
 * Backwards-compatible command-line interface
 */

import { LightCrawl } from "../index";
import { join } from "path";
import { isValidUrl, slugify } from "./utils";

export async function runLegacyMode(
  crawler: LightCrawl,
  args: string[]
): Promise<void> {
  try {
    if (args[0] === "search") {
      await handleSearch(crawler, args);
    } else if (args[0] === "download") {
      await handleDownload(crawler, args);
    } else {
      throw new Error(`Unknown command: ${args[0]}`);
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

async function handleSearch(
  crawler: LightCrawl,
  args: string[]
): Promise<void> {
  const query = args[1];
  const source = args[2] || "novelfull";

  if (!query) {
    console.error("❌ Search query is required");
    console.error("Usage: bun src/index.ts search <query> [source]");
    process.exit(1);
  }

  const results = await crawler.search(query, source);
  if (results.length === 0) {
    console.log(`❌ No results found for "${query}"`);
    return;
  }

  console.log(`\n✅ Found ${results.length} results:\n`);
  results.slice(0, 5).forEach((r, i) => {
    console.log(`${i + 1}. ${r.title}`);
    console.log(`   ${r.url}\n`);
  });
}

async function handleDownload(
  crawler: LightCrawl,
  args: string[]
): Promise<void> {
  const url = args[1];
  const chapterRange = args[2];

  if (!url) {
    console.error("❌ Novel URL is required");
    console.error("Usage: bun src/index.ts download <url> [chapter-range]");
    process.exit(1);
  }

  if (!isValidUrl(url)) {
    console.error("❌ Invalid URL provided");
    process.exit(1);
  }

  const slug = "novel";
  const outputDir = join("./epubs", slug);
  await crawler.downloadNovel(url, outputDir, chapterRange);
}
