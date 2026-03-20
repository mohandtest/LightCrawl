import JSZip from "jszip";
import { Novel, Chapter } from "../types/models";

export class EPUBGenerator {
  async generate(novel: Novel, outputPath: string): Promise<void> {
    const zip = new JSZip();

    // EPUB structure
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

    // Container XML
    const containerXML = this.generateContainerXML();
    zip.folder("META-INF")?.file("container.xml", containerXML);

    // Package OPF
    const packageOPF = this.generatePackageOPF(novel);
    zip.file("OEBPS/content.opf", packageOPF);

    // Table of Contents
    const tocNCX = this.generateTOCNCX(novel);
    zip.file("OEBPS/toc.ncx", tocNCX);

    // HTML chapters
    for (let i = 0; i < novel.chapters.length; i++) {
      const chapter = novel.chapters[i];
      const html = this.generateChapterHTML(chapter);
      zip.file(`OEBPS/chapter${i + 1}.html`, html);
    }

    // Cover (if available)
    if (novel.cover) {
      try {
        const coverData = await this.fetchCover(novel.cover);
        const ext = novel.cover.split(".").pop() || "jpg";
        zip.file(`OEBPS/cover.${ext}`, coverData, { binary: true });
      } catch (error) {
        console.warn("Failed to fetch cover image:", error);
      }
    }

    // Write to file
    const buffer = await zip.generateAsync({ type: "arraybuffer" });
    await Bun.write(outputPath, buffer);
  }

  private generateContainerXML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  }

  private generatePackageOPF(novel: Novel): string {
    const chapters = novel.chapters
      .map(
        (ch, i) =>
          `    <item id="ch${i + 1}" href="chapter${i + 1}.html" media-type="application/xhtml+xml"/>`
      )
      .join("\n");

    const spine = novel.chapters
      .map((_, i) => `    <itemref idref="ch${i + 1}"/>`)
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${this.escape(novel.title)}</dc:title>
    <dc:creator>${this.escape(novel.authors.join(", "))}</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${chapters}
  </manifest>
  <spine toc="ncx">
${spine}
  </spine>
</package>`;
  }

  private generateTOCNCX(novel: Novel): string {
    const navPoints = novel.chapters
      .map(
        (ch, i) =>
          `    <navPoint id="ch${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${this.escape(ch.title)}</text></navLabel>
      <content src="chapter${i + 1}.html"/>
    </navPoint>`
      )
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/">
  <head>
    <meta name="dtb:uid" content="test"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
  </head>
  <docTitle><text>${this.escape(novel.title)}</text></docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;
  }

  private generateChapterHTML(chapter: Chapter): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${this.escape(chapter.title)}</title>
  <style>body { font-family: serif; margin: 1em; }</style>
</head>
<body>
  <h1>${this.escape(chapter.title)}</h1>
  <div class="content">${chapter.content || ""}</div>
</body>
</html>`;
  }

  private async fetchCover(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    return response.arrayBuffer();
  }

  private escape(text: string): string {
    return text.replace(/[&<>"']/g, (char) => {
      const escapeMap: { [key: string]: string } = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      };
      return escapeMap[char];
    });
  }
}