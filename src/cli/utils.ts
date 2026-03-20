/**
 * CLI Utility Functions
 * Validation, input handling, and formatting
 */

import { createInterface } from "readline";

// Global readline interface for input handling
let rl: ReturnType<typeof createInterface> | null = null;

function getReadlineInterface() {
  if (!rl) {
    rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  return rl;
}

export function closeReadline(): void {
  if (rl) {
    rl.close();
    rl = null;
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.startsWith("http://") || url.startsWith("https://");
  } catch {
    return false;
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function input(prompt: string): Promise<string> {
  const rl = getReadlineInterface();
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      resolve(answer.trim());
    });
  });
}

export async function inputChoice(
  prompt: string,
  validChoices: string[]
): Promise<string> {
  while (true) {
    const answer = await input(prompt);
    if (validChoices.includes(answer)) {
      return answer;
    }
    console.log(`❌ Invalid choice. Choose from: ${validChoices.join(", ")}`);
  }
}

export function parseChapterRange(
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

  let start = parseInt(match[1]!) - 1; // Convert to 0-indexed
  let end = parseInt(match[2]!);

  if (start < 0 || end > totalChapters || start >= end) {
    throw new Error(`Invalid range. Must be between 1-${totalChapters}`);
  }

  return { start, end };
}

export function printWelcome() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║         🌐 LightCrawl - Light Novel Scraper           ║
║                                                       ║
║       Download web novels and create EPUB files       ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`);
}

export function printHelp() {
  console.log(`
╭─ LightCrawl - Light Novel Scraper ─────────────────╮
│                                                      │
│ Interactive Mode (default):                          │
│   bun src/index.ts                                   │
│   (Follow the interactive prompts)                   │
│                                                      │
│ Legacy Command Mode:                                 │
│   bun src/index.ts search <query> [source]          │
│   bun src/index.ts download <url> [chapters]        │
│                                                      │
│ Chapter Range Examples:                              │
│   "all"      - Download all chapters                │
│   "1-50"     - Download chapters 1 to 50            │
│   "10-100"   - Download chapters 10 to 100          │
│                                                      │
│ Sources:                                             │
│   novelfull  (default)                              │
│   novgo                                             │
│                                                      │
│ Output:                                              │
│   Novel folders are saved in ./epubs/                │
│   Example: ./epubs/novel-title/novel.epub           │
│                                                      │
╰──────────────────────────────────────────────────────╯
`);
}
