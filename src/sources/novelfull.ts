import { BaseSource } from "./base-source";
import { Chapter, Novel, SearchResult, ScraperConfig } from "../types/models";

export class NovelFullSource extends BaseSource {
  name = "NovelFull";
  homeUrl = "https://novelfull.com/";

  constructor(config?: ScraperConfig) {
    super(config);
  }

  async search(query: string): Promise<SearchResult[]> {
    const params = new URLSearchParams({ keyword: query });
    const url = `${this.homeUrl}search?${params}`;

    try {
      const doc = await this.fetcher.fetch(url);
      const items = this.selectElements(
        doc,
        "#list-page .row h3[class*='title'] > a"
      );

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

    const title = this.getText(this.selectOne(doc, "h3.title"));
    const summary = this.getText(this.selectOne(doc, ".desc-text"));

    // Parse cover
    const coverImg = this.selectOne(doc, ".book img");
    let cover: string | undefined;
    if (coverImg) {
      const dataSrc = this.getAttr(coverImg, "data-src");
      const src = this.getAttr(coverImg, "src");
      cover = this.absoluteUrl(dataSrc || src);
    }

    // Parse authors
    const authorSelectors = [".info a[href*='/a/']", ".info a[href*='/au/']"];
    const authors = this.selectElements(
      doc,
      authorSelectors.join(",")
    ).map((el) => this.getText(el));

    // Parse genres
    const genres: string[] = [];
    const infoSection = this.selectOne(doc, ".info, .info-meta");
    if (infoSection) {
      const lists = this.selectElements(infoSection, "li");
      for (const li of lists) {
        const header = this.selectOne(li, "h3");
        const headerText = this.getText(header);
        if (headerText.includes("Genre") || headerText.includes("Tag")) {
          const links = this.selectElements(li, "a");
          links.forEach((link) => {
            const text = this.getText(link);
            if (text) genres.push(text);
          });
        }
      }
    }

    // Parse chapters
    const chapters = await this.parseChapterList(doc, url);

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

  private async parseChapterList(doc: Document, novelUrl: string): Promise<Chapter[]> {
    const ratingTag = this.selectOne(doc, "#rating[data-novel-id]");
    if (!ratingTag) return [];

    const novelId = this.getAttr(ratingTag, "data-novel-id");

    // Try both endpoints
    let chapterDoc: Document;
    try {
      chapterDoc = await this.fetcher.fetch(
        `${this.homeUrl}ajax-chapter-option?novelId=${novelId}`
      );
    } catch {
      chapterDoc = await this.fetcher.fetch(
        `${this.homeUrl}ajax/chapter-archive?novelId=${novelId}`
      );
    }

    const chapterLinks = this.selectElements(
      chapterDoc,
      "ul.list-chapter > li > a[href], select > option[value]"
    );

    return chapterLinks.map((link, id) => ({
      id,
      title: this.getText(link),
      url: this.absoluteUrl(
        this.getAttr(link, "href") || this.getAttr(link, "value")
      ),
    }));
  }

  async parseChapter(url: string): Promise<string> {
    const doc = await this.fetcher.fetch(url);
    const content = this.selectOne(doc, "#chr-content, #chapter-content");

    if (!content) throw new Error("No chapter content found");

    // Remove ads/scripts
    const adElements = this.selectElements(content, "div");
    adElements.forEach((ad) => ad.remove());

    return content.innerHTML;
  }
}