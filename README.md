# data-for-seo-cli

Agent-first DataForSEO CLI. Keyword research, SERP analysis, competitor intelligence from your terminal. TSV by default - compact, structured, optimized for agent context windows.

## Install

```bash
npm install -g data-4-seo-cli
```

Binary aliases: `dataforseo` and `dfs`.

### Agent Skill

Install the Claude Code skill for agent integration:

```bash
npx skills add https://github.com/giorgioliapakis/agent-skills --skill keyword-researcher
```

## Setup

```bash
# Interactive
dfs login

# Non-interactive
dfs login --login YOUR_LOGIN --password YOUR_PASSWORD

# Or use environment variables (no login needed)
export DATAFORSEO_LOGIN=your_login
export DATAFORSEO_PASSWORD=your_password
```

Credentials stored in `~/Library/Application Support/dataforseo-cli/credentials.json` (macOS) with restrictive file permissions.

## Commands

### volume

Search volume, CPC, keyword difficulty, competition, intent, and 12-month trend.

```bash
dfs volume "seo tools" "keyword research"
dfs volume "seo verktyg" --location 2752 --language sv
```

```
keyword           volume  cpc   difficulty  competition  intent         trend
seo tools         12500   2.35  45          HIGH         commercial     14800,13900,12500,...
keyword research  8100    3.10  52          MEDIUM       informational  8100,7900,8100,...
```

### suggestions

Keyword suggestions from a seed keyword.

```bash
dfs suggestions "seo tools" -n 10
```

### related

Semantically related keywords.

```bash
dfs related "keyword research" -n 10
```

### difficulty

Bulk keyword difficulty scores.

```bash
dfs difficulty "seo tools" "keyword research" "backlink checker"
```

### serp

Live SERP analysis with feature detection (AI Overview, Featured Snippet, PAA, Video, Images).

```bash
dfs serp "best seo tools" --target yourdomain.com
```

Features and PAA go to stderr, organic results to stdout:

```
features: ai_overview, featured_snippet, people_also_ask    (stderr)
yourdomain.com: #3 https://yourdomain.com/seo-tools         (stderr)

position  domain          title                              url
1         ahrefs.com      Best SEO Tools...                  https://ahrefs.com/...
2         semrush.com     Top SEO Software...                https://semrush.com/...
```

### ranked

Keywords a domain ranks for, sorted by volume.

```bash
dfs ranked ahrefs.com -n 10
```

### overlap

Keyword intersection between two domains.

```bash
dfs overlap ahrefs.com semrush.com -n 10
```

### competitors

Who competes for a set of keywords.

```bash
dfs competitors "seo tools" "keyword research tool" -n 10
```

### content

Fetch and parse page content (title, headings, word count).

```bash
dfs content "https://example.com/page" --table
dfs content "https://example.com/page" --full --json
```

### locations / languages

Look up location and language codes for `--location` and `--language`.

```bash
dfs locations sweden
dfs languages swedish
```

## Output Formats

| Flag | Format | Use Case |
|------|--------|----------|
| (default) | TSV | Agent pipelines - fewest tokens |
| `--json` | JSON | Structured parsing |
| `--table` | Table | Human reading |

## Global Options

```
-l, --location <code>    Location code (default: 2840 = US)
    --language <code>     Language code (default: en)
-n, --limit <n>          Max results (default: 50)
    --json               JSON output
    --table              Human-readable table
    --no-cache           Skip cache read
    --clear-cache        Purge all cached data
    --debug              Show request details
```

## Caching

Results are cached to avoid duplicate API calls (and costs). Cache location:

- macOS: `~/Library/Caches/dataforseo-cli/`
- Linux: `~/.cache/dataforseo-cli/`

TTL by data type: keyword data (7 days), competitor data (3 days), SERP (1 day), locations/languages (30 days).

```bash
dfs volume "seo tools"          # hits API
dfs volume "seo tools"          # cached - no API cost
dfs volume "seo tools" --no-cache  # force fresh
dfs --clear-cache               # purge all
```

## Why TSV?

JSON keys and brackets burn tokens. TSV is the most compact structured format - easy to parse, minimal overhead, fits more data in a context window. Ideal for AI agents and automation pipelines.

## License

MIT
