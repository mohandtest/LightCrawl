/**
 * LightCrawl - Light Novel Scraper
 * Modular entry point with core Crawler logic
 */

import { NovelFullSource } from "./sources/novelfull";
import { NovGoSource } from "./sources/novgo";
import { EPUBGenerator } from "./epub/generator";
import { ProgressBar } from "./utils/progress";
import { mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

/**
 * Core LightCrawl Scraper Class
 * Handles novel parsing, chapter downloading, and EPUB generation
 */
export class LightCrawl {
  private sources: Map<string, any> = new Map();
  private maxConcurrency: number = 5; // Concurrent downloads

  constructor() {
    this.registerSource("novelfull", new NovelFullSource());
    this.registerSource("novgo", new NovGoSource());
  }

  registerSource(name: string, source: any): void {
    this.sources.set(name, source);
  }

  async downloadNovel(
    novelUrl: string,
    outputDir: string,
    chapterRange?: string
  ): Promise<void> {
    const source = this.detectSource(novelUrl);
    if (!source) throw new Error(`No matching source for ${novelUrl}`);

    console.log(`🔍 Parsing novel from ${source.name}...`);
    const novel = await source.parseNovel(novelUrl);

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    console.log(`📚 Total chapters available: ${novel.chapters.length}`);

    // Parse chapter range
    let chaptersToDownload = novel.chapters;
    if (chapterRange && chapterRange !== "all") {
      const range = this.parseChapterRange(chapterRange, novel.chapters.length);
      chaptersToDownload = novel.chapters.slice(range.start, range.end);
      console.log(`📖 Downloading chapters ${range.start + 1}-${range.end}...\n`);
    } else {
      console.log(`📖 Downloading all ${novel.chapters.length} chapters...\n`);
    }

    // Download chapters concurrently with progress bar
    await this.downloadChaptersConcurrent(source, chaptersToDownload);

    console.log(`\n📦 Generating EPUB...`);
    const generator = new EPUBGenerator();
    
    // Use novel title for filename, fallback to "novel" if empty
    const filename = this.sanitizeFilename(novel.title) || "novel";
    const epubPath = join(outputDir, `${filename}.epub`);
    
    await generator.generate({ ...novel, chapters: chaptersToDownload }, epubPath);

    console.log(`✅ EPUB saved to ${epubPath}`);
    console.log(`📂 Novel folder: ${outputDir}`);
  }

  async search(query: string, sourceName: string) {
    const source = this.sources.get(sourceName);
    if (!source) throw new Error(`Unknown source: ${sourceName}`);

    console.log(`🔍 Searching ${source.name} for "${query}"...`);
    return source.search(query);
  }

  private async downloadChaptersConcurrent(
    source: any,
    chapters: any[]
  ): Promise<void> {
    const progress = new ProgressBar(chapters.length, "📥 Downloading");
    let completed = 0;
    let index = 0;

    const download = async () => {
      while (index < chapters.length) {
        const i = index++;
        const chapter = chapters[i];

        try {
          chapter.content = await source.parseChapter(chapter.url);
          completed++;
          progress.update(completed);
        } catch (error) {
          // Silently fail and continue
          completed++;
          progress.update(completed);
        }
      }
    };

    // Run multiple downloaders concurrently
    const workers = Array(this.maxConcurrency).fill(null).map(() => download());
    await Promise.all(workers);

    progress.finish();
  }

  private sanitizeFilename(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 100); // Limit filename length
  }

  private detectSource(url: string) {
    for (const [_, source] of this.sources) {
      if (url.includes(source.homeUrl)) return source;
    }
    return null;
  }

  private parseChapterRange(
    rangeStr: string,
    totalChapters: number
  ): { start: number; end: number } {
    if (rangeStr.toLowerCase() === "all") {
      return { start: 0, end: totalChapters };
    }

    const match = rangeStr.match(/^(\d+)-(\d+)$/);
    if (!match) {
      throw new Error(`Invalid range format. Use "x-y" (e.g., "1-50") or "all"`);
    }

    let start = parseInt(match[1]) - 1;
    let end = parseInt(match[2]);

    if (start < 0 || end > totalChapters || start >= end) {
      throw new Error(`Invalid range. Must be between 1-${totalChapters}`);
    }

    return { start, end };
  }
}

// ============================================================================
// CLI Routing
// ============================================================================

import { runInteractiveMode } from "./cli/interactive";
import { runLegacyMode } from "./cli/legacy";
import { printHelp, closeReadline } from "./cli/utils";

async function main(): Promise<void> {
  const args = Bun.argv.slice(2);

  try {
    // Help command
    if (args[0] === "--help" || args[0] === "-h") {
      printHelp();
      return;
    }

    const crawler = new LightCrawl();

    // Legacy command mode if args provided
    if (args.length > 0) {
      await runLegacyMode(crawler, args);
    } else {
      // Interactive mode
      await runInteractiveMode(crawler);
    }
  } finally {
    closeReadline();
  }
}

main().catch(console.error);
