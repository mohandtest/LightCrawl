/**
 * Cover Image Downloader and Processor
 */

export async function downloadCoverImage(coverUrl: string): Promise<Buffer | null> {
  if (!coverUrl) return null;

  try {
    const response = await fetch(coverUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.warn(`Failed to download cover: HTTP ${response.status}`);
      return null;
    }

    // Use Bun's built-in image processing
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.warn(`Failed to download cover image: ${error}`);
    return null;
  }
}

export function getImageExtension(buffer: Buffer): string {
  // Check magic bytes to determine image type
  if (buffer.length < 4) return "jpg";

  const header = buffer.slice(0, 4).toString("hex");

  // PNG: 89 50 4E 47
  if (header.startsWith("89504e47")) return "png";

  // JPEG: FF D8 FF
  if (header.startsWith("ffd8ff")) return "jpg";

  // GIF: 47 49 46 38
  if (header.startsWith("47494638")) return "gif";

  // WebP: 52 49 46 46 ... 57 45 42 50
  if (header.startsWith("52494646") && buffer.slice(8, 12).toString("ascii") === "WEBP") {
    return "webp";
  }

  return "jpg"; // Default
}
