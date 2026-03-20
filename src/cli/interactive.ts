/**
 * Interactive CLI Mode
 * User-friendly menu-driven interface
 */

import { LightCrawl } from "../index";
import { join } from "path";
import {
  input,
  inputChoice,
  isValidUrl,
  slugify,
  printWelcome,
} from "./utils";

export async function runInteractiveMode(crawler: LightCrawl): Promise<void> {
  console.clear();
  printWelcome();

  while (true) {
    console.log("\n1️⃣  Search for a novel");
    console.log("2️⃣  Enter novel URL directly");
    console.log("3️⃣  Exit\n");

    const choice = await inputChoice("Choose an option (1-3): ", ["1", "2", "3"]);

    if (choice === "3") {
      console.log("\n👋 Goodbye!\n");
      return;
    }

    try {
      if (choice === "1") {
        await handleSearch(crawler);
      } else if (choice === "2") {
        await handleDirectUrl(crawler);
      }
    } catch (error) {
      console.error(
        `\n❌ Error: ${error instanceof Error ? error.message : error}\n`
      );
    }
  }
}

async function handleSearch(crawler: LightCrawl): Promise<void> {
  const query = await input("📚 Enter search query: ");
  if (!query.trim()) {
    console.log("❌ Query cannot be empty");
    return;
  }

  console.log("");
  const results = await crawler.search(query, "novelfull");

  if (results.length === 0) {
    console.log("❌ No results found\n");
    return;
  }

  console.log(`\n✅ Found ${results.length} results:\n`);
  results.slice(0, 10).forEach((r, i) => {
    console.log(`${i + 1}. ${r.title}`);
  });

  while (true) {
    console.log("");
    const selection = await input(
      "Pick a result (1-" + Math.min(10, results.length) + ") or (c)ancel: "
    );

    if (selection.toLowerCase() === "c") {
      console.log("❌ Cancelled\n");
      return;
    }

    const index = parseInt(selection) - 1;
    if (index >= 0 && index < Math.min(10, results.length)) {
      const selected = results[index];
      await handleDownload(crawler, selected.url);
      return;
    }

    console.log("❌ Invalid selection");
  }
}

async function handleDirectUrl(crawler: LightCrawl): Promise<void> {
  const url = await input("🔗 Enter novel URL: ");
  if (!isValidUrl(url)) {
    console.error("❌ Invalid URL provided");
    return;
  }

  await handleDownload(crawler, url);
}

async function handleDownload(
  crawler: LightCrawl,
  novelUrl: string
): Promise<void> {
  console.log("");

  try {
    let source;
    for (const [_, s] of (crawler as any).sources) {
      if (novelUrl.includes(s.homeUrl)) {
        source = s;
        break;
      }
    }

    if (!source) {
      throw new Error(`No matching source for ${novelUrl}`);
    }

    console.log(`🔍 Fetching novel info...`);
    const novel = await source.parseNovel(novelUrl);

    console.log(`\n📖 Title: ${novel.title}`);
    console.log(`👤 Author(s): ${novel.authors.join(", ")}`);
    console.log(`📚 Total chapters: ${novel.chapters.length}\n`);

    // Ask for chapter range
    while (true) {
      const rangeInput = await input(
        'Enter chapter range (e.g., "1-50", "all", or (c)ancel): '
      );

      if (rangeInput.toLowerCase() === "c") {
        console.log("❌ Cancelled\n");
        return;
      }

      if (
        rangeInput.toLowerCase() === "all" ||
        /^\d+-\d+$/.test(rangeInput)
      ) {
        // Create folder in ./epubs/
        const slug = slugify(novel.title);
        const outputDir = join("./epubs", slug);

        console.log(`\n📁 Saving to: ${outputDir}`);
        console.log("⏳ This may take a while...\n");

        await crawler.downloadNovel(novelUrl, outputDir, rangeInput);
        console.log("");
        return;
      }

      console.log('❌ Invalid format. Use "x-y" (e.g., "1-50") or "all"');
    }
  } catch (error) {
    throw error;
  }
}
