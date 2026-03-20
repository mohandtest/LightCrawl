import { Fetcher } from "../core/fetcher";
import type { SearchResult, ScraperConfig, Novel } from "../types/models";

export abstract class BaseSource {
  abstract name: string;
  abstract homeUrl: string;
  protected fetcher: Fetcher;

  constructor(config?: ScraperConfig) {
    this.fetcher = new Fetcher(config);
  }

  abstract search(query: string): Promise<SearchResult[]>;
  abstract parseNovel(url: string): Promise<Novel>;
  abstract parseChapter(url: string): Promise<string>;

  /**
   * Select a single element matching the selector
   */
  protected selectOne(doc: Document, selector: string): Element | null {
    try {
      return doc.querySelector(selector);
    } catch (error) {
      console.warn(`Invalid selector "${selector}":`, error);
      return null;
    }
  }

  /**
   * Select all elements matching the selector
   */
  protected selectElements(doc: Document | Element, selector: string): Element[] {
    try {
      return Array.from((doc as any).querySelectorAll(selector));
    } catch (error) {
      console.warn(`Invalid selector "${selector}":`, error);
      return [];
    }
  }

  /**
   * Get text content of an element
   */
  protected getText(element: Element | null): string {
    if (!element) return "";
    const text = element.textContent || "";
    return text.trim();
  }

  /**
   * Get attribute value
   */
  protected getAttr(element: Element | null, attr: string): string {
    if (!element) return "";
    return element.getAttribute(attr) || "";
  }

  /**
   * Convert relative URLs to absolute URLs
   */
  protected absoluteUrl(url: string): string {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    if (url.startsWith("/")) return new URL(url, this.homeUrl).href;
    return new URL(url, this.homeUrl).href;
  }
}
