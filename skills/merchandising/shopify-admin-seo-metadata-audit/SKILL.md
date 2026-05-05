---
name: shopify-admin-seo-metadata-audit
role: merchandising
description: 'Read-only: scans products, collections, and pages for missing SEO titles or meta descriptions.'
toolkit: 'shopify-admin, shopify-admin-execution'
api_version: 2025-01
graphql_operations:
  - 'products:query'
  - 'collections:query'
  - 'pages:query'
status: stable
compatibility: 'Claude Code, Cursor, Codex, Gemini CLI'
execution_adapters:
  shopify-mcp:
    pagination_max_first: 50
    auth: connector-managed
    operations:
      - skill_op: 'products:query'
        prefer_tool: search_products
        fallback: graphql_query
      - skill_op: 'collections:query'
        prefer_tool: graphql_query
      - skill_op: 'pages:query'
        prefer_tool: graphql_query
  shopify-cli:
    pagination_max_first: 250
    auth: cli-session
---

## Purpose
Scans all active products, collections, and pages and flags records with missing or short SEO titles (`seo.title`) and meta descriptions (`seo.description`). Produces a prioritized list of SEO gaps sorted by traffic potential (products → collections → pages). Read-only — no mutations.

## Prerequisites
Either auth path works. See [docs/execution-adapters.md](../../docs/execution-adapters.md).

- **Shopify MCP connector** (recommended, official): `https://setup.shopify.com/mcp` — connect via `/mcp` in Claude Code; switch stores with the `switch-shop` tool. The connector must be installed with the scopes listed below.
- **Shopify CLI:** `shopify auth login --store <domain>` with the scopes listed below.
- API scopes: `read_products`, `read_content`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| min_title_length | integer | no | 10 | Flag SEO titles shorter than this (characters) |
| min_description_length | integer | no | 50 | Flag meta descriptions shorter than this (characters) |
| scope | string | no | all | What to scan: `products`, `collections`, `pages`, or `all` |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `products` — query (if `scope` includes products)
   **Inputs:** `query: "status:active"`, `first: 250`, select `seo { title, description }`, pagination cursor
   **Expected output:** All active products with SEO fields; paginate until `hasNextPage: false`

2. **OPERATION:** `collections` — query (if `scope` includes collections)
   **Inputs:** `first: 250`, select `seo { title, description }`, pagination cursor
   **Expected output:** All collections with SEO fields

3. **OPERATION:** `pages` — query (if `scope` includes pages)
   **Inputs:** `first: 250`, select `seo { title, description }`, pagination cursor
   **Expected output:** All pages with SEO fields

4. Flag records: missing title, missing description, title < `min_title_length`, description < `min_description_length`

## GraphQL Operations

```graphql
# products:query — validated against api_version 2025-01
query ProductSEO($first: Int!, $after: String) {
  products(first: $first, after: $after, query: "status:active") {
    edges {
      node {
        id
        title
        handle
        seo {
          title
          description
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

```graphql
# collections:query — validated against api_version 2025-01
query CollectionSEO($first: Int!, $after: String) {
  collections(first: $first, after: $after) {
    edges {
      node {
        id
        title
        handle
        seo {
          title
          description
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

```graphql
# pages:query — validated against api_version 2025-04
query PageSEO($first: Int!, $after: String) {
  pages(first: $first, after: $after) {
    edges {
      node {
        id
        title
        handle
        seoTitle: metafield(namespace: "global", key: "title_tag") { value }
        seoDescription: metafield(namespace: "global", key: "description_tag") { value }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: SEO Metadata Audit                   ║
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

**On completion**, emit:

For `format: human` (default):
```
══════════════════════════════════════════════
SEO METADATA AUDIT
  Products scanned:     <n>  |  Missing SEO: <n>
  Collections scanned:  <n>  |  Missing SEO: <n>
  Pages scanned:        <n>  |  Missing SEO: <n>

  Top gaps (products):
    "<title>" — missing: description
    "<title>" — title too short (<n> chars)
  Output: seo_audit_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "seo-metadata-audit",
  "store": "<domain>",
  "summary": {
    "products": { "scanned": 0, "missing_title": 0, "missing_description": 0, "short_title": 0, "short_description": 0 },
    "collections": { "scanned": 0, "missing_title": 0, "missing_description": 0 },
    "pages": { "scanned": 0, "missing_title": 0, "missing_description": 0 }
  },
  "output_file": "seo_audit_<date>.csv"
}
```

## Output Format
CSV file `seo_audit_<YYYY-MM-DD>.csv` with columns:
`type`, `id`, `title`, `handle`, `seo_title`, `seo_description`, `issue`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Empty store | No products/collections/pages | Exit with summary: 0 records |

## Best Practices
- Prioritize fixing missing meta descriptions on top-selling products first — descriptions appear in search result snippets and directly impact click-through rate.
- A good SEO title length is 50–60 characters; meta descriptions should be 120–160 characters. Adjust `min_title_length` and `min_description_length` to match these targets.
- Run monthly as part of a catalog hygiene routine, especially after bulk product imports which often omit SEO fields.
- After fixing gaps, pair with `product-data-completeness-score` for a comprehensive catalog quality view.
