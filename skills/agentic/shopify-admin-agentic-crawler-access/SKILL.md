---
name: shopify-admin-agentic-crawler-access
role: agentic
description: "Edit the theme's robots.txt.liquid to explicitly allow AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, OAI-SearchBot, Amazonbot) so AI assistants are permitted to read the catalog."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - themes:query
  - themeFilesUpsert:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
audit_signals:
  - robots-ai-rules
---

## Purpose
If your `robots.txt` doesn't address the AI crawlers by name — or worse, disallows them — assistants like ChatGPT, Claude, and Perplexity may never read your store, so you simply don't exist to AI shoppers. Shopify generates `robots.txt` from a theme template (`templates/robots.txt.liquid`); this skill reads that template and appends explicit allow rules for the major AI user-agents (with a clear, idempotent managed block) so foundational models and AI search are permitted to crawl your pages. Fixes the agentiq.report finding `robots-ai-rules`.

## Prerequisites
- Authenticated Shopify CLI session (`shopify auth login --store <domain>`)
- Required API scopes: `read_themes`, `write_themes`

## Parameters
All skills accept these universal parameters:

| Parameter | Type   | Required | Default | Description |
|-----------|--------|----------|---------|-------------|
| store     | string | yes      | —       | Store domain (e.g., mystore.myshopify.com) |
| format    | string | no       | human   | Output format: `human` (default) or `json` |
| dry_run   | bool   | no       | true    | Preview the new robots.txt.liquid without writing (defaults ON — this edits the live theme) |

Skill-specific parameters:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| theme_id | string | no | — | Theme GID to edit (defaults to the published MAIN theme) |
| agents | string | no | GPTBot,OAI-SearchBot,ChatGPT-User,ClaudeBot,Claude-Web,PerplexityBot,Perplexity-User,Google-Extended,Amazonbot,Applebot-Extended | Comma list of AI user-agents to allow |
| mode | string | no | allow | `allow` (add Allow rules) or `audit` (report current state only, no write) |

## Safety

> ⚠️ Step 2 (`themeFilesUpsert`) modifies a file in the LIVE published theme. A malformed `robots.txt.liquid` can de-index the store from ALL search engines. This skill writes only inside a clearly-delimited `# BEGIN agentic-crawler-access … # END` managed block (re-running replaces just that block, never your other rules), defaults `dry_run: true`, and recommends duplicating the theme first. Review the full proposed file before setting `dry_run: false`.

## Workflow Steps

1. **OPERATION:** `themes` — query
   **Inputs:** `roles: [MAIN]` (unless `theme_id` given), then `theme.files(filenames: ["templates/robots.txt.liquid"])`
   **Expected output:** Current `robots.txt.liquid` content (or absence — Shopify uses a default if the template doesn't exist).

2. **COMPUTE (no API):** construct the new template. If no custom template exists, start from the Shopify default (`{{ robots.default_groups }}`) and append the managed block with `User-agent:`/`Allow: /` stanzas for each agent in `agents`. If a managed block already exists, replace only it. Emit the full proposed file diff.

3. **OPERATION:** `themeFilesUpsert` — mutation
   **Inputs:** `themeId`, `files: [{ filename: "templates/robots.txt.liquid", body: { type: TEXT, value: <new content> } }]` (skipped when `dry_run` or `mode: audit`).
   **Expected output:** Upserted theme file; collect `userErrors`.

## GraphQL Operations

```graphql
# themes:query — validated against api_version 2025-01
query CrawlerThemeFile {
  themes(first: 1, roles: [MAIN]) {
    nodes {
      id
      name
      files(filenames: ["templates/robots.txt.liquid"]) {
        nodes {
          filename
          body { ... on OnlineStoreThemeFileBodyText { content } }
        }
      }
    }
  }
}
```

```graphql
# themeFilesUpsert:mutation — validated against api_version 2025-01
mutation CrawlerAllowUpsert($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
  themeFilesUpsert(themeId: $themeId, files: $files) {
    upsertedThemeFiles { filename }
    userErrors { filename code message }
  }
}
```

Managed block written into `templates/robots.txt.liquid` (after `{{ robots.default_groups }}`):

```liquid
# BEGIN agentic-crawler-access (managed by shopify-admin-agentic-crawler-access)
User-agent: GPTBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /
# ... one stanza per agent in `agents`
# END agentic-crawler-access
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: <skill name>                         ║
║  Store: <store domain>                       ║
║  Started: <YYYY-MM-DD HH:MM UTC>             ║
╚══════════════════════════════════════════════╝
```

**After each step**, emit:
```
[N/TOTAL] <QUERY|MUTATION>  <OperationName>
          → Params: <brief summary of key inputs>
          → Result: <count or outcome>
```

If `dry_run: true`, prefix every mutation step with `[DRY RUN]` and do not execute it.

**On completion**, emit:

For `format: human` (default):
```
══════════════════════════════════════════════
OUTCOME SUMMARY
  <Metric label>:   <value>
  Errors:           0
  Output:           <filename or "none">
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "<skill-slug>",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": false,
  "steps": [
    {
      "step": 1,
      "operation": "<OperationName>",
      "type": "query",
      "params_summary": "<string>",
      "result_summary": "<string>",
      "skipped": false
    }
  ],
  "outcome": {
    "metric_key": 0,
    "errors": 0,
    "output_file": null
  }
}
```

## Output Format
`human`: the before/after `robots.txt.liquid` and the list of agents now allowed. `json`: `{ theme_id, agents_allowed:[...], wrote: true|false, errors }`.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit | Wait 2s, retry up to 3 times |
| `ACCESS_DENIED` | Missing `write_themes` | Abort with a clear scope message; do not partially write |
| `userErrors` on upsert | Invalid template body | Do not write; surface the Liquid error for review |

## Best Practices
- **Duplicate the published theme before writing** (Online Store → Themes → Duplicate) so you can roll back instantly.
- Keep `dry_run: true` until you've read the entire proposed file — a broken `robots.txt.liquid` can de-index the whole store.
- Use the managed-block markers; never hand-merge — re-running the skill then cleanly updates only its own block.
- Allowing AI crawlers ≠ giving away content; it's permission to read public pages the same way Googlebot does. Pair with `shopify-admin-agentic-llms-txt` so crawlers also get a guided summary.
