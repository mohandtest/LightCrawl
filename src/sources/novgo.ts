import { BaseSource } from "./base-source";
import { Chapter, Novel, SearchResult, ScraperConfig } from "../types/models";

export class NovGoSource extends BaseSource {
  name = "NovGo";
  homeUrl = "https://novgo.net/";

  constructor(config?: ScraperConfig) {
    super(config);
  }

  async search(query: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({ s: query });
    const url = `${this.homeUrl}?${params}`;

    try {
      const doc = await this.fetcher.fetch(url);
      // Adjust selectors based on novgo.net structure
      const items = this.selectElements(doc, ".search-item a, .novel-item a");

      return items.map((item) => ({
        title: this.getText(item),
        url: this.absoluteUrl(this.getAttr(item, "href")),
        cover: undefined,
      }));
    } catch (error) {
      console.error(`Search failed on ${this.name}:`, error);
      return [];
    }
  }

  async parseNovel(url: string): Promise<Novel> {
    const doc = await this.fetcher.fetch(url);

    const title = this.getText(this.selectOne(doc, "h1.novel-title, .title"));
    const summary = this.getText(
      this.selectOne(doc, ".novel-description, .description, .summary")
    );

    // Parse cover
    const coverImg = this.selectOne(doc, ".novel-cover img, .cover img");
    let cover: string | undefined;
    if (coverImg) {
      cover = this.absoluteUrl(
        this.getAttr(coverImg, "src") || this.getAttr(coverImg, "data-src")
      );
    }

    // Parse authors - adjust based on actual structure
    const authors = this.selectElements(doc, ".author-link, [href*='author']")
      .map((el) => this.getText(el))
      .filter((text) => text.length > 0);

    // Parse genres
    const genres = this.selectElements(doc, ".genre, .tag, [href*='genre']")
      .map((el) => this.getText(el))
      .filter((text) => text.length > 0);

    // Parse chapters
    const chapters = await this.parseChapterList(url);

    return {
      title,
      url,
      cover,
      authors,
      genres,
      summary,
      chapters,
    };
  }

  private async parseChapterList(novelUrl: string): Promise<Chapter[]> {
    const doc = await this.fetcher.fetch(novelUrl);

    // novgo.net typically has chapters in a list
    const chapterLinks = this.selectElements(
      doc,
      ".chapter-list a, .chapters a, [href*='chapter']"
    );

    return chapterLinks.map((link, id) => ({
      id,
      title: this.getText(link),
      url: this.absoluteUrl(this.getAttr(link, "href")),
    }));
  }

  async parseChapter(url: string): Promise<string> {
    const doc = await this.fetcher.fetch(url);
    const content = this.selectOne(
      doc,
      ".chapter-content, .novel-text, article, .content"
    );

    if (!content) throw new Error("No chapter content found");

    // Remove ads
    const scripts = this.selectElements(content, "script, style, .ad, .advertisement");
    scripts.forEach((el) => el.remove());

    return content.innerHTML;
  }
}