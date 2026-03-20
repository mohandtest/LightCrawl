import { NovelFullSource } from "./sources/novelfull";
import { NovGoSource } from "./sources/novgo";
import { EPUBGenerator } from "./epub/generator";

export class LightCrawl {
  private sources: Map<string, any> = new Map();

  constructor() {
    this.registerSource("novelfull", new NovelFullSource());
    this.registerSource("novgo", new NovGoSource());
  }

  registerSource(name: string, source: any) {
    this.sources.set(name, source);
  }

  async downloadNovel(
    novelUrl: string,
    outputPath: string,
    sourceName?: string
  ): Promise<void> {
    let source;

    if (sourceName) {
      source = this.sources.get(sourceName);
      if (!source) throw new Error(`Unknown source: ${sourceName}`);
    } else {
      // Auto-detect source
      source = this.detectSource(novelUrl);
      if (!source) throw new Error(`No matching source for ${novelUrl}`);
    }

    console.log(`🔍 Parsing novel from ${source.name}...`);
    const novel = await source.parseNovel(novelUrl);

    console.log(`📥 Downloading ${novel.chapters.length} chapters...`);
    const chapters = novel.chapters.slice(0, 10); // Limit for demo

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      try {
        console.log(`  [${i + 1}/${chapters.length}] ${chapter.title}`);
        chapter.content = await source.parseChapter(chapter.url);
      } catch (error) {
        console.error(`    Failed: ${error}`);
      }
    }

    console.log(`📦 Generating EPUB...`);
    const generator = new EPUBGenerator();
    await generator.generate({ ...novel, chapters }, outputPath);

    console.log(`✅ EPUB saved to ${outputPath}`);
  }

  private detectSource(url: string) {
    for (const [_, source] of this.sources) {
      if (url.includes(source.homeUrl)) return source;
    }
    return null;
  }

  async search(query: string, sourceName: string) {
    const source = this.sources.get(sourceName);
    if (!source) throw new Error(`Unknown source: ${sourceName}`);

    console.log(`🔍 Searching ${source.name} for "${query}"...`);
    return source.search(query);
  }
}

// CLI interface
const crawler = new LightCrawl();

async function main() {
  const args = Bun.argv.slice(2);

  if (!args.length || args[0] === "--help" || args[0] === "-h") {
    printHelp();
    return;
  }

  try {
    if (args[0] === "search") {
      const query = args[1];
      const source = args[2] || "novelfull";

      if (!query) {
        console.error("❌ Search query is required");
        console.error("Usage: bun src/index.ts search <query> [source]");
        process.exit(1);
      }

      const results = await crawler.search(query, source);
      if (results.length === 0) {
        console.log(`No results found for "${query}"`);
        return;
      }
      console.log(`\n📚 Found ${results.length} results:\n`);
      results.slice(0, 5).forEach((r, i) => {
        console.log(`${i + 1}. ${r.title}`);
        console.log(`   ${r.url}\n`);
      });
    } else if (args[0] === "download") {
      const url = args[1];
      const output = args[2] || "./novel.epub";

      if (!url) {
        console.error("❌ Novel URL is required");
        console.error("Usage: bun src/index.ts download <url> [output.epub]");
        process.exit(1);
      }

      if (!isValidUrl(url)) {
        console.error("❌ Invalid URL provided");
        process.exit(1);
      }

      if (!isValidOutputPath(output)) {
        console.error("❌ Invalid output path provided");
        process.exit(1);
      }

      await crawler.downloadNovel(url, output);
    } else {
      printHelp();
    }
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
╭─ LightCrawl - Light Novel Scraper ─────────────────╮
│                                                      │
│ Usage:                                               │
│   bun src/index.ts search <query> [source]          │
│   bun src/index.ts download <url> [output.epub]     │
│                                                      │
│ Commands:                                            │
│   search    Search for novels                        │
│   download Download novel and generate EPUB         │
│                                                      │
│ Options:                                             │
│   -h, --help Show this help message                 │
│                                                      │
│ Sources:                                             │
│   novelfull  (default)                              │
│   novgo                                             │
│                                                      │
│ Examples:                                            │
│   bun src/index.ts search "Cultivation" novelfull   │
│   bun src/index.ts download <novel-url>            │
│   bun src/index.ts download <novel-url> out.epub   │
│                                                      │
╰──────────────────────────────────────────────────────╯
`);
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith("http://") || url.startsWith("https://");
  } catch {
    return false;
  }
}

function isValidOutputPath(path: string): boolean {
  // Don't allow paths that traverse up or are system paths
  return !path.includes("..") && !path.startsWith("/") && path.length > 0 && path.endsWith(".epub");
}

main().catch(console.error);