// Filtered output types - the lean records each command produces

export interface VolumeRow {
  keyword: string;
  volume: number | null;
  cpc: number | null;
  difficulty: number | null;
  competition: string | null;
  intent: string | null;
  trend: string; // comma-separated 12-month volumes (newest first)
}

export interface SuggestionRow {
  keyword: string;
  volume: number | null;
  cpc: number | null;
  difficulty: number | null;
  competition: string | null;
}

export interface RelatedRow {
  keyword: string;
  volume: number | null;
  cpc: number | null;
  difficulty: number | null;
  competition: string | null;
}

export interface DifficultyRow {
  keyword: string;
  difficulty: number | null;
}

export interface SerpFeatures {
  ai_overview: boolean;
  ai_overview_cites_us: boolean;
  featured_snippet: boolean;
  people_also_ask: boolean;
  video_carousel: boolean;
  images: boolean;
}

export interface SerpOrganicResult {
  position: number | null;
  domain: string;
  title: string;
  url: string;
}

export interface SerpResult {
  keyword: string;
  our_position: number | null;
  our_url: string | null;
  features: SerpFeatures;
  featured_snippet: { text: string; source_domain: string; source_url: string } | null;
  people_also_ask: string[];
  organic_results: SerpOrganicResult[];
}

export interface RankedRow {
  keyword: string;
  position: number | null;
  volume: number | null;
  cpc: number | null;
  url: string;
}

export interface RankedResult {
  domain: string;
  total_keywords: number;
  keywords: RankedRow[];
}

export interface OverlapRow {
  keyword: string;
  pos1: number | null;
  pos2: number | null;
  volume: number | null;
  cpc: number | null;
}

export interface OverlapResult {
  domain1: string;
  domain2: string;
  overlapping_keywords: number;
  keywords: OverlapRow[];
}

export interface CompetitorRow {
  domain: string;
  avg_position: number;
  visibility: number;
  keywords_count: number;
}

export interface ContentHeading {
  level: number;
  text: string;
}

export interface ContentResult {
  url: string;
  title: string;
  word_count: number;
  headings: ContentHeading[];
  content_preview: string;
  full_content: string;
}
