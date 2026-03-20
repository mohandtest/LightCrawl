// Core data models
export interface SearchResult {
  title: string;
  url: string;
  cover?: string;
}

export interface Chapter {
  id: number;
  title: string;
  url: string;
  content?: string;
}

export interface Volume {
  id: number;
  title?: string;
  chapters: Chapter[];
}

export interface Novel {
  title: string;
  url: string;
  cover?: string;
  authors: string[];
  genres: string[];
  summary: string;
  chapters: Chapter[];
  volumes?: Volume[];
}

export interface ScraperConfig {
  maxConcurrency?: number;
  timeout?: number;
  userAgent?: string;
  retries?: number;
}