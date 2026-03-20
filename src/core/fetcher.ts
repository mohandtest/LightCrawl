import { JSDOM } from "jsdom";

export class Fetcher {
  private maxConcurrency: number;
  private timeout: number;
  private userAgent: string;
  private retries: number;
  private activeRequests = 0;
  private queue: (() => Promise<any>)[] = [];

  constructor(config: {
    maxConcurrency?: number;
    timeout?: number;
    userAgent?: string;
    retries?: number;
  } = {}) {
    this.maxConcurrency = config.maxConcurrency || 10;
    this.timeout = config.timeout || 30000;
    this.userAgent =
      config.userAgent ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    this.retries = config.retries || 3;
  }

  private async processQueue() {
    if (this.activeRequests >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    this.activeRequests++;
    const task = this.queue.shift();

    try {
      await task?.();
    } finally {
      this.activeRequests--;
      this.processQueue();
    }
  }

  async fetch(url: string): Promise<Document> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        for (let attempt = 0; attempt < this.retries; attempt++) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(
              () => controller.abort(),
              this.timeout
            );

            const response = await fetch(url, {
              signal: controller.signal,
              headers: { "User-Agent": this.userAgent },
            });

            clearTimeout(timeout);

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const html = await response.text();
            const dom = new JSDOM(html);
            resolve(dom.window.document);
            return;
          } catch (error) {
            if (attempt === this.retries - 1) {
              reject(
                new Error(`Failed to fetch ${url} after ${this.retries} retries: ${error}`)
              );
            }
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
      });

      this.processQueue();
    });
  }

  async fetchBatch(urls: string[]): Promise<Document[]> {
    return Promise.all(urls.map((url) => this.fetch(url)));
  }
}