import {
  VolumeRow, SuggestionRow, RelatedRow, DifficultyRow,
  SerpResult, SerpFeatures, SerpOrganicResult,
  RankedRow, OverlapRow, CompetitorRow,
  ContentResult, ContentHeading,
} from '../types/output.js';

// --- Keyword Overview ---

export function filterVolume(items: Record<string, unknown>[]): VolumeRow[] {
  return items.map(item => {
    const kwInfo = (item['keyword_info'] || {}) as Record<string, unknown>;
    const kwProps = (item['keyword_properties'] || {}) as Record<string, unknown>;
    const intentInfo = (item['search_intent_info'] || {}) as Record<string, unknown>;
    const monthlySearches = kwInfo['monthly_searches'] as Array<{ year: number; month: number; search_volume: number }> | null;

    // Build 12-month trend string (newest first)
    let trend = '';
    if (monthlySearches && Array.isArray(monthlySearches)) {
      trend = monthlySearches
        .slice(0, 12)
        .map(m => m.search_volume ?? 0)
        .join(',');
    }

    return {
      keyword: String(item['keyword'] || ''),
      volume: kwInfo['search_volume'] as number | null ?? null,
      cpc: kwInfo['cpc'] as number | null ?? null,
      difficulty: kwProps['keyword_difficulty'] as number | null ?? null,
      competition: kwInfo['competition_level'] as string | null ?? null,
      intent: intentInfo['main_intent'] as string | null ?? null,
      trend,
    };
  });
}

// --- Keyword Suggestions ---

export function filterSuggestions(items: Record<string, unknown>[]): SuggestionRow[] {
  return items.map(item => {
    const kwInfo = (item['keyword_info'] || {}) as Record<string, unknown>;
    const kwProps = (item['keyword_properties'] || {}) as Record<string, unknown>;

    return {
      keyword: String(item['keyword'] || ''),
      volume: kwInfo['search_volume'] as number | null ?? null,
      cpc: kwInfo['cpc'] as number | null ?? null,
      difficulty: kwProps['keyword_difficulty'] as number | null ?? null,
      competition: kwInfo['competition_level'] as string | null ?? null,
    };
  });
}

// --- Related Keywords (nested under keyword_data) ---

export function filterRelated(items: Record<string, unknown>[]): RelatedRow[] {
  return items.map(item => {
    const kwData = (item['keyword_data'] || {}) as Record<string, unknown>;
    const kwInfo = (kwData['keyword_info'] || {}) as Record<string, unknown>;
    const kwProps = (kwData['keyword_properties'] || {}) as Record<string, unknown>;

    return {
      keyword: String(kwData['keyword'] || ''),
      volume: kwInfo['search_volume'] as number | null ?? null,
      cpc: kwInfo['cpc'] as number | null ?? null,
      difficulty: kwProps['keyword_difficulty'] as number | null ?? null,
      competition: kwInfo['competition_level'] as string | null ?? null,
    };
  });
}

// --- Bulk Keyword Difficulty ---

export function filterDifficulty(items: Record<string, unknown>[]): DifficultyRow[] {
  return items.map(item => ({
    keyword: String(item['keyword'] || ''),
    difficulty: item['keyword_difficulty'] as number | null ?? null,
  }));
}

// --- SERP Analysis ---

export function filterSerp(
  items: Record<string, unknown>[],
  targetDomain?: string,
): SerpResult {
  const result: SerpResult = {
    keyword: '',
    our_position: null,
    our_url: null,
    features: {
      ai_overview: false,
      ai_overview_cites_us: false,
      featured_snippet: false,
      people_also_ask: false,
      video_carousel: false,
      images: false,
    },
    featured_snippet: null,
    people_also_ask: [],
    organic_results: [],
  };

  for (const item of items) {
    const itemType = String(item['type'] || '');

    if (itemType === 'ai_overview') {
      result.features.ai_overview = true;
      if (targetDomain) {
        const refs = (item['references'] || []) as Array<Record<string, unknown>>;
        for (const ref of refs) {
          if (String(ref['domain'] || '').includes(targetDomain)) {
            result.features.ai_overview_cites_us = true;
            break;
          }
        }
      }
    } else if (itemType === 'featured_snippet') {
      result.features.featured_snippet = true;
      const text = String(item['description'] || item['text'] || '');
      result.featured_snippet = {
        text: text.length > 500 ? text.substring(0, 500) + '...' : text,
        source_domain: String(item['domain'] || ''),
        source_url: String(item['url'] || ''),
      };
    } else if (itemType === 'people_also_ask') {
      result.features.people_also_ask = true;
      const paaItems = (item['items'] || []) as Array<Record<string, unknown>>;
      for (const paa of paaItems.slice(0, 6)) {
        const question = String(paa['title'] || '');
        if (question) result.people_also_ask.push(question);
      }
    } else if (itemType === 'video') {
      result.features.video_carousel = true;
    } else if (itemType === 'images') {
      result.features.images = true;
    } else if (itemType === 'organic') {
      const domain = String(item['domain'] || '');
      const rank = item['rank_group'] as number | null;
      const url = String(item['url'] || '');
      const title = String(item['title'] || '');

      // Check if this is our domain
      if (targetDomain && domain.includes(targetDomain)) {
        result.our_position = rank;
        result.our_url = url;
      }

      const organicResult: SerpOrganicResult = {
        position: rank,
        domain,
        title: title.length > 80 ? title.substring(0, 80) + '...' : title,
        url,
      };
      result.organic_results.push(organicResult);
    }
  }

  return result;
}

// --- Ranked Keywords ---

export function filterRanked(
  items: Record<string, unknown>[],
  totalCount: number,
  domain: string,
): { domain: string; total_keywords: number; keywords: RankedRow[] } {
  const keywords: RankedRow[] = items.map(item => {
    const kwData = (item['keyword_data'] || {}) as Record<string, unknown>;
    const kwInfo = (kwData['keyword_info'] || {}) as Record<string, unknown>;
    const serpElement = (item['ranked_serp_element'] || {}) as Record<string, unknown>;
    const serpItem = (serpElement['serp_item'] || {}) as Record<string, unknown>;

    return {
      keyword: String(kwData['keyword'] || ''),
      position: serpItem['rank_group'] as number | null ?? null,
      volume: kwInfo['search_volume'] as number | null ?? null,
      cpc: kwInfo['cpc'] as number | null ?? null,
      url: String(serpItem['url'] || ''),
    };
  });

  return { domain, total_keywords: totalCount, keywords };
}

// --- Domain Overlap ---

export function filterOverlap(
  items: Record<string, unknown>[],
  totalCount: number,
  domain1: string,
  domain2: string,
): { domain1: string; domain2: string; overlapping_keywords: number; keywords: OverlapRow[] } {
  const keywords: OverlapRow[] = items.map(item => {
    const kwData = (item['keyword_data'] || {}) as Record<string, unknown>;
    const kwInfo = (kwData['keyword_info'] || {}) as Record<string, unknown>;
    const d1Serp = (item['first_domain_serp_element'] || {}) as Record<string, unknown>;
    const d2Serp = (item['second_domain_serp_element'] || {}) as Record<string, unknown>;

    return {
      keyword: String(kwData['keyword'] || ''),
      pos1: d1Serp['rank_group'] as number | null ?? null,
      pos2: d2Serp['rank_group'] as number | null ?? null,
      volume: kwInfo['search_volume'] as number | null ?? null,
      cpc: kwInfo['cpc'] as number | null ?? null,
    };
  });

  return { domain1, domain2, overlapping_keywords: totalCount, keywords };
}

// --- SERP Competitors ---

export function filterCompetitors(items: Record<string, unknown>[]): CompetitorRow[] {
  return items.map(item => ({
    domain: String(item['domain'] || ''),
    avg_position: Math.round(((item['avg_position'] as number) || 0) * 10) / 10,
    keywords_count: (item['se_keywords'] as number) || 0,
    visibility: Math.round(((item['rating'] as number) || 0) * 100 * 10) / 10,
  }));
}

// --- Content Parsing ---

export function filterContent(items: Record<string, unknown>[], url: string): ContentResult {
  const item = items[0] || {};
  const pageContent = (item['page_content'] || {}) as Record<string, unknown>;
  const mainTopics = (pageContent['main_topic'] || []) as Array<Record<string, unknown>>;

  let title = '';
  const headings: ContentHeading[] = [];
  const contentParts: string[] = [];

  for (const topic of mainTopics) {
    const hTitle = String(topic['h_title'] || '');
    const level = (topic['level'] as number) || 2;

    if (level === 1 && !title && hTitle) {
      title = hTitle;
    } else if (hTitle) {
      headings.push({ level, text: hTitle });
    }

    const primary = (topic['primary_content'] || []) as Array<Record<string, unknown>>;
    for (const p of primary) {
      const text = String(p['text'] || '');
      if (text) contentParts.push(text);
    }
  }

  const fullContent = contentParts.join('\n\n');
  const wordCount = fullContent ? fullContent.split(/\s+/).length : 0;

  return {
    url,
    title,
    word_count: wordCount,
    headings,
    content_preview: fullContent.length > 2000 ? fullContent.substring(0, 2000) + '...' : fullContent,
    full_content: fullContent,
  };
}
