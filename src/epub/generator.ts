import JSZip from "jszip";
import type { Novel, Chapter, Volume } from "../types/models";
import { downloadCoverImage, getImageExtension } from "../utils/cover";
import { organizeChaptersIntoVolumes } from "../utils/volumes";

export class EPUBGenerator {
  private contentId = 0;

  async generate(novel: Novel, outputPath: string): Promise<void> {
    const zip = new JSZip();

    // Organize chapters into volumes if not already done
    const volumes = novel.volumes || organizeChaptersIntoVolumes(novel.chapters);

    // EPUB metadata
    zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
    zip.folder("META-INF")?.file("container.xml", this.generateContainerXML());

    // Download and add cover image
    let coverImageExt = "jpg";
    let coverImageFilename = "";
    if (novel.cover) {
      const coverBuffer = await downloadCoverImage(novel.cover);
      if (coverBuffer) {
        coverImageExt = getImageExtension(coverBuffer);
        coverImageFilename = `cover.${coverImageExt}`;
        zip.file(`OEBPS/${coverImageFilename}`, coverBuffer);
      }
    }

    // Generate cover page HTML (displays the cover image)
    if (coverImageFilename) {
      const coverHtml = this.generateCoverPageHTML(coverImageFilename);
      zip.file("OEBPS/cover.xhtml", coverHtml);
    }

    // Generate intro page
    const introHtml = this.generateIntroHTML(novel);
    zip.file("OEBPS/intro.xhtml", introHtml);

    // Generate chapter files
    let chapterIndex = 1;
    for (const volume of volumes) {
      for (const chapter of volume.chapters) {
        const html = this.generateChapterHTML(chapter, chapterIndex);
        zip.file(`OEBPS/chapter${chapterIndex}.xhtml`, html);
        chapterIndex++;
      }
    }

    // Generate OPF (package file)
    const opf = this.generatePackageOPF(novel, volumes, coverImageFilename);
    zip.file("OEBPS/content.opf", opf);

    // Generate NCX (table of contents for older e-readers)
    const ncx = this.generateTOCNCX(novel, volumes, !!coverImageFilename);
    zip.file("OEBPS/toc.ncx", ncx);

    // Generate Nav file (EPUB3 navigation)
    const nav = this.generateNav(novel, volumes, !!coverImageFilename);
    zip.file("OEBPS/nav.xhtml", nav);

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

  private generateCoverPageHTML(coverImageFilename: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Cover</title>
  <style>
    body { margin: 0; padding: 0; }
    #cover { text-align: center; }
    #cover img { max-width: 100%; height: auto; display: block; }
  </style>
</head>
<body>
  <div id="cover">
    <img src="${coverImageFilename}" alt="cover" />
  </div>
</body>
</html>`;
  }

  private generateIntroHTML(novel: Novel): string {
    const genres =
      novel.genres.length > 0 ? novel.genres.join(", ") : "Fiction";

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Introduction</title>
  <style>
    body { font-family: serif; margin: 2em; text-align: center; }
    h1 { font-size: 2em; margin-bottom: 0.5em; }
    .author { font-size: 1.2em; color: #666; margin: 1em 0; }
    .genres { color: #999; font-size: 0.9em; margin: 1em 0; }
    .summary { text-align: left; margin: 2em 0; line-height: 1.6; }
  </style>
</head>
<body>
  <h1>${this.escape(novel.title)}</h1>
  <div class="author">by ${this.escape(novel.authors.join(", "))}</div>
  <div class="genres">${this.escape(genres)}</div>
  <div class="summary">${novel.summary || "No summary available"}</div>
</body>
</html>`;
  }

  private generateChapterHTML(chapter: Chapter, index: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${this.escape(chapter.title)}</title>
  <style>
    body { font-family: serif; margin: 1em; line-height: 1.6; }
    h1 { font-size: 1.5em; margin-bottom: 0.5em; }
    .content { font-size: 1em; }
    p { margin: 1em 0; text-align: justify; }
  </style>
</head>
<body>
  <h1>${this.escape(chapter.title)}</h1>
  <div class="content">${chapter.content || ""}</div>
</body>
</html>`;
  }

  private generatePackageOPF(
    novel: Novel,
    volumes: Volume[],
    coverImage: string
  ): string {
    // Build manifest
    let manifest = `    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`;

    if (coverImage) {
      const ext = coverImage.split(".").pop() || "jpg";
      const mimeType =
        ext === "png"
          ? "image/png"
          : ext === "gif"
            ? "image/gif"
            : ext === "webp"
              ? "image/webp"
              : "image/jpeg";
      manifest += `\n    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`;
      manifest += `\n    <item id="cover-image" href="${coverImage}" media-type="${mimeType}"/>`;
    }

    manifest += `\n    <item id="intro" href="intro.xhtml" media-type="application/xhtml+xml"/>`;

    let chapterIndex = 1;
    for (const volume of volumes) {
      for (const _ of volume.chapters) {
        manifest += `\n    <item id="ch${chapterIndex}" href="chapter${chapterIndex}.xhtml" media-type="application/xhtml+xml"/>`;
        chapterIndex++;
      }
    }

    // Build spine - COVER FIRST, then intro, then chapters
    let spine = ``;
    if (coverImage) {
      spine += `    <itemref idref="cover"/>`;
    }
    spine += `\n    <itemref idref="intro"/>`;

    chapterIndex = 1;
    for (const volume of volumes) {
      for (const _ of volume.chapters) {
        spine += `\n    <itemref idref="ch${chapterIndex}"/>`;
        chapterIndex++;
      }
    }

    const uniqueId = this.generateUniqueId(novel);

    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uuid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="uuid">${uniqueId}</dc:identifier>
    <dc:title>${this.escape(novel.title)}</dc:title>
    ${novel.authors.map((author) => `<dc:creator>${this.escape(author)}</dc:creator>`).join("\n    ")}
    ${novel.genres.map((genre) => `<dc:subject>${this.escape(genre)}</dc:subject>`).join("\n    ")}
    <dc:language>en</dc:language>
    <dc:date>${new Date().toISOString().split("T")[0]}</dc:date>
  </metadata>
  <manifest>
${manifest}
  </manifest>
  <spine>
${spine}
  </spine>
</package>`;
  }

  private generateTOCNCX(novel: Novel, volumes: Volume[], hasCover: boolean): string {
    let playOrder = 1;
    let navPoints = "";

    // Cover page (if available)
    if (hasCover) {
      navPoints += `    <navPoint id="cover" playOrder="${playOrder++}">
      <navLabel><text>Cover</text></navLabel>
      <content src="cover.xhtml"/>
    </navPoint>\n`;
    }

    // Intro
    navPoints += `    <navPoint id="intro" playOrder="${playOrder++}">
      <navLabel><text>Introduction</text></navLabel>
      <content src="intro.xhtml"/>
    </navPoint>\n`;

    // Volumes and chapters
    let chapterIndex = 1;
    for (const volume of volumes) {
      navPoints += `    <navPoint id="vol${volume.id}" playOrder="${playOrder++}">
      <navLabel><text>${this.escape(volume.title || `Volume ${volume.id}`)}</text></navLabel>
      <content src="chapter${chapterIndex}.xhtml"/>
`;

      const firstChapterOfVolume = chapterIndex;
      for (const chapter of volume.chapters) {
        navPoints += `      <navPoint id="ch${chapterIndex}" playOrder="${playOrder++}">
        <navLabel><text>${this.escape(chapter.title)}</text></navLabel>
        <content src="chapter${chapterIndex}.xhtml"/>
      </navPoint>\n`;
        chapterIndex++;
      }

      navPoints += `    </navPoint>\n`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${this.generateUniqueId(novel)}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
  </head>
  <docTitle><text>${this.escape(novel.title)}</text></docTitle>
  <navMap>
${navPoints}  </navMap>
</ncx>`;
  }

  private generateNav(novel: Novel, volumes: Volume[], hasCover: boolean): string {
    let chapterIndex = 1;
    let navContent = ``;

    // Cover page (if available)
    if (hasCover) {
      navContent += `      <li><a href="cover.xhtml">Cover</a></li>\n`;
    }

    navContent += `      <li><a href="intro.xhtml">Introduction</a></li>\n`;

    for (const volume of volumes) {
      navContent += `      <li>
        <a href="chapter${chapterIndex}.xhtml">${this.escape(volume.title || `Volume ${volume.id}`)}</a>
        <ol>\n`;

      for (const chapter of volume.chapters) {
        navContent += `          <li><a href="chapter${chapterIndex}.xhtml">${this.escape(chapter.title)}</a></li>\n`;
        chapterIndex++;
      }

      navContent += `        </ol>
      </li>\n`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Navigation</title>
</head>
<body>
  <nav epub:type="toc">
    <ol>
${navContent}    </ol>
  </nav>
</body>
</html>`;
  }

  private generateUniqueId(novel: Novel): string {
    // Create a unique ID from title and URL
    const hash = Math.random().toString(36).substring(2, 15);
    return `lightcrawl-${hash}`;
  }

  private escape(text: string): string {
    return text.replace(/[&<>"']/g, (char: string) => {
      const escapeMap: { [key: string]: string } = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      };
      return escapeMap[char] || char;
    });
  }
}