// Raw DataForSEO API response types

export interface DataForSeoEnvelope {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: DataForSeoTask[];
}

export interface DataForSeoTask {
  id: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  result_count: number;
  path: string[];
  data: Record<string, unknown>;
  result: DataForSeoTaskResult[];
}

export interface DataForSeoTaskResult {
  total_count?: number;
  items_count?: number;
  items: Record<string, unknown>[];
  [key: string]: unknown;
}

// --- Keyword Overview Item ---

export interface RawKeywordOverviewItem {
  keyword: string;
  keyword_info: {
    search_volume: number | null;
    cpc: number | null;
    competition_level: string | null;
    monthly_searches: Array<{ year: number; month: number; search_volume: number }> | null;
  };
  keyword_properties: {
    keyword_difficulty: number | null;
  };
  search_intent_info: {
    main_intent: string | null;
  };
}

// --- Keyword Suggestions / Related Item ---

export interface RawKeywordSuggestionItem {
  keyword: string;
  keyword_info: {
    search_volume: number | null;
    cpc: number | null;
    competition_level: string | null;
  };
  keyword_properties: {
    keyword_difficulty: number | null;
  };
  search_intent_info: {
    main_intent: string | null;
  };
}

// Related keywords nest data under keyword_data
export interface RawRelatedKeywordItem {
  keyword_data: {
    keyword: string;
    keyword_info: {
      search_volume: number | null;
      cpc: number | null;
      competition_level: string | null;
    };
    keyword_properties: {
      keyword_difficulty: number | null;
    };
    search_intent_info: {
      main_intent: string | null;
    };
  };
}

// --- Bulk Keyword Difficulty Item ---

export interface RawBulkDifficultyItem {
  keyword: string;
  keyword_difficulty: number | null;
}

// --- SERP Item (polymorphic on type) ---

export interface RawSerpItem {
  type: string;
  rank_group?: number;
  rank_absolute?: number;
  domain?: string;
  url?: string;
  title?: string;
  description?: string;
  items?: Record<string, unknown>[];
  references?: Array<{ domain: string; url: string }>;
}

// --- Ranked Keywords Item ---

export interface RawRankedKeywordItem {
  keyword_data: {
    keyword: string;
    keyword_info: {
      search_volume: number | null;
      cpc: number | null;
    };
  };
  ranked_serp_element: {
    serp_item: {
      rank_group: number | null;
      url: string;
    };
  };
}

// --- Domain Intersection Item ---

export interface RawDomainIntersectionItem {
  keyword_data: {
    keyword: string;
    keyword_info: {
      search_volume: number | null;
      cpc: number | null;
    };
  };
  first_domain_serp_element: {
    rank_group: number | null;
  };
  second_domain_serp_element: {
    rank_group: number | null;
  };
}

// --- SERP Competitors Item ---

export interface RawSerpCompetitorItem {
  domain: string;
  avg_position: number;
  se_keywords: number;
  rating: number;
}

// --- Content Parsing ---

export interface RawContentItem {
  page_content: {
    main_topic: Array<{
      h_title: string;
      level: number;
      primary_content: Array<{ text: string }>;
    }>;
  };
}
