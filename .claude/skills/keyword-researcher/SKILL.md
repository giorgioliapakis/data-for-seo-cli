---
name: keyword-researcher
description: |
  DataForSEO CLI for keyword research, SERP analysis, and competitor intelligence.
  Use when: (1) Checking keyword volumes/difficulty, (2) Analyzing SERPs for features and rankings,
  (3) Finding keyword suggestions or related terms, (4) Competitor keyword analysis or domain overlap,
  (5) Fetching page content for gap analysis. Prefer this over MCP tools for 10-20x smaller responses.
---

# Keyword Researcher (DataForSEO CLI)

Filtered keyword and SERP data via the `dfs` CLI. Returns only actionable insights.

## Setup

```bash
# If credentials already stored:
dfs whoami

# If not, set env vars or store permanently:
export DATAFORSEO_LOGIN=your_login
export DATAFORSEO_PASSWORD=your_password
# Or:
dfs login --login "$DATAFORSEO_LOGIN" --password "$DATAFORSEO_PASSWORD"
```

## Commands

### Keyword Volume + Metrics

```bash
dfs volume "seo tools" "keyword research" "backlink checker"
```

Output columns: `keyword, volume, cpc, difficulty, competition, intent, trend`

### Keyword Suggestions

```bash
dfs suggestions "seo tools" -n 15
```

Output columns: `keyword, volume, cpc, difficulty, competition`

### Related Keywords

```bash
dfs related "keyword research" -n 15
```

Output columns: `keyword, volume, cpc, difficulty, competition`

### Keyword Difficulty

```bash
dfs difficulty "seo tools" "keyword research" "backlink checker"
```

Output columns: `keyword, difficulty`

### SERP Analysis

```bash
dfs serp "best seo tools" --target yourdomain.com
```

Stderr: features detected + target position + PAA questions
Stdout columns: `position, domain, title, url`

Use `--json` for the full structured SERP result including features, snippet, and PAA.

### Competitor Ranked Keywords

```bash
dfs ranked ahrefs.com -n 20
```

Output columns: `keyword, position, volume, cpc, url`

### Domain Overlap

```bash
dfs overlap ahrefs.com semrush.com -n 20
```

Output columns: `keyword, pos1, pos2, volume, cpc`

### SERP Competitors

```bash
dfs competitors "seo tools" "keyword research tool" -n 10
```

Output columns: `domain, avg_position, visibility, keywords_count`

### Page Content

```bash
dfs content "https://example.com/page"
dfs content "https://example.com/page" --full --json
```

TSV: `url, title, word_count, headings_count` (headings detail on stderr)
JSON: full structured content with headings tree and content preview.

## Output Formats

- **Default (TSV)** - use this for most agent workflows. Minimal tokens.
- **`--json`** - use when you need to parse specific fields programmatically.
- **`--table`** - use when presenting results to the user.

## Options

```
-l, --location <code>    Location code (default: 2840 = US)
    --language <code>     Language code (default: en)
-n, --limit <n>          Max results (default: 50)
    --no-cache           Force fresh API call
```

Use `dfs locations <search>` and `dfs languages <search>` to find codes.

## Caching

Results are cached automatically. Repeated queries in the same period are free.

| Data Type | Cache TTL |
|-----------|-----------|
| Keyword data | 7 days |
| Competitor data | 3 days |
| SERP results | 1 day |
| Locations/languages | 30 days |

Use `--no-cache` when you need guaranteed fresh data.

## Response Size Comparison

| Query Type | Raw API | CLI Output |
|------------|---------|------------|
| SERP (10 results) | ~15-30KB | ~1-2KB |
| Keyword volume (5 kw) | ~8KB | ~500B |
| Keyword suggestions (20) | ~20KB | ~2KB |
| Competitor ranked (20) | ~10KB | ~1KB |

## Common Workflows

### Content brief keyword research
1. `dfs volume` - check seed term metrics
2. `dfs suggestions` - expand to related terms
3. `dfs serp` - analyze top 3 target SERPs
4. `dfs content` - fetch top-ranking page content

### Competitor gap analysis
1. `dfs ranked <competitor>` - their top keywords
2. `dfs overlap <us> <them>` - shared keywords + position gaps
3. `dfs serp` - deep dive on key terms

### Quick volume check
Single `dfs volume` call with up to 50 keywords.
