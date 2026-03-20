/**
 * Volume Organization Utilities
 */

import { Chapter, Volume } from "../types/models";

const CHAPTERS_PER_VOLUME = 100;

export function organizeChaptersIntoVolumes(chapters: Chapter[]): Volume[] {
  if (chapters.length === 0) return [];

  const volumes: Volume[] = [];

  for (let i = 0; i < chapters.length; i += CHAPTERS_PER_VOLUME) {
    const volumeNumber = Math.floor(i / CHAPTERS_PER_VOLUME) + 1;
    const volumeChapters = chapters.slice(
      i,
      Math.min(i + CHAPTERS_PER_VOLUME, chapters.length)
    );

    volumes.push({
      id: volumeNumber,
      title: `Volume ${volumeNumber}`,
      chapters: volumeChapters,
    });
  }

  return volumes;
}
