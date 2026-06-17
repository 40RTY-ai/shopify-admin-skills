---
name: shopify-admin-agentic-readiness-audit
role: agentic
description: "Score how findable, readable, and recommendable the store's catalog is to AI shopping agents — then route each gap to the agentic skill that fixes it."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - products:query
  - files:query
  - metafieldDefinitions:query
  - shop:query
  - themes:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
audit_signals:
  - agentic-listing-schema
  - catalog-intent-alignment
  - product-schema-jsonld
  - gtin-sku-pdp
  - listing-image-alt-text
  - listing-description-quality
  - listing-metafields
  - robots-ai-rules
  - org-schema
---

## Purpose
Runs a store-side "Agentic Commerce Readiness" scan — the same questions the public **agentiq.report** audit asks, but answered from inside the Shopify Admin with full catalog data. It scores whether AI shopping agents (ChatGPT, Gemini, Perplexity, agentic checkout) can FIND, READ, and RECOMMEND the store's products, then prints a prioritized gap list where **every gap names the sibling `agentic` skill that fixes it**. Read-only — it changes nothing. Use it first (and on a schedule) to decide which remediation skills to run.

## Prerequisites
- Authenticated Shopify CLI session (`shopify auth login --store <domain>`)
- Required API scopes: `read_products`, `read_files`, `read_content` (themes), `read_online_store_pages`

## Parameters
All skills accept these universal parameters:

| Parameter | Type   | Required | Default | Description |
|-----------|--------|----------|---------|-------------|
| store     | string | yes      | —       | Store domain (e.g., mystore.myshopify.com) |
| format    | string | no       | human   | Output format: `human` (default) or `json` |
| dry_run   | bool   | no       | false   | No-op here — this skill never mutates |

Skill-specific parameters:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| sample_size | int | no | 250 | How many products to sample for the catalog-data checks |
| min_description_chars | int | no | 120 | Threshold below which a description counts as "thin" |

## Workflow Steps

1. **OPERATION:** `shop` — query
   **Inputs:** none
   **Expected output:** Shop name, primary domain, social `sameAs` links, and policy presence — feeds the identity + policy checks.

2. **OPERATION:** `themes` — query
   **Inputs:** `roles: [MAIN]`, then `theme.files(filenames: ["templates/robots.txt.liquid", "layout/theme.liquid", "assets/llms.txt", "templates/llms.txt.liquid"])`
   **Expected output:** Whether the published theme allows AI crawlers (robots), ships an Organization JSON-LD block, and serves an llms.txt — feeds discovery + identity checks.

3. **OPERATION:** `metafieldDefinitions` — query
   **Inputs:** `ownerType: PRODUCT`
   **Expected output:** Which structured attributes are defined (material, specs, features) — feeds the metafield-coverage check.

4. **OPERATION:** `products` — query (paginate to `sample_size`)
   **Inputs:** `first: 250`, fields: `descriptionHtml`, `category`, `media`, `metafields`, `variants{ barcode, sku, price }`
   **Expected output:** Per-product completeness — description length, image alt-text coverage, barcode/GTIN presence, category assigned, metafield population.

5. **OPERATION:** `files` — query
   **Inputs:** `first: 50`, `query: "media_type:IMAGE"` (sample) — corroborate alt-text coverage at the file level.
   **Expected output:** Alt-text fill rate across product media.

6. **COMPUTE (no API):** roll the findings into a 0–100 readiness score across five pillars — **Discoverable** (robots/llms.txt), **Trusted** (Organization schema, sameAs, policies), **Readable** (descriptions, alt text, JSON-LD fields), **Structured** (metafields, category, barcodes), **Matchable** (title/tag/metafield richness for intent) — and map each failing pillar to its fix skill.

## GraphQL Operations

```graphql
# shop:query — validated against api_version 2025-01
query AgenticReadinessShop {
  shop {
    name
    myshopifyDomain
    primaryDomain { url }
    contactEmail
    shopPolicies { type body url }
  }
}
```

```graphql
# themes:query — validated against api_version 2025-01
query AgenticReadinessTheme {
  themes(first: 1, roles: [MAIN]) {
    nodes {
      id
      name
      files(filenames: [
        "templates/robots.txt.liquid",
        "layout/theme.liquid",
        "assets/llms.txt",
        "templates/llms.txt.liquid"
      ]) {
        nodes {
          filename
          body {
            ... on OnlineStoreThemeFileBodyText { content }
          }
        }
      }
    }
  }
}
```

```graphql
# metafieldDefinitions:query — validated against api_version 2025-01
query AgenticReadinessMetafieldDefs {
  metafieldDefinitions(first: 100, ownerType: PRODUCT) {
    edges { node { namespace key name type { name } } }
  }
}
```

```graphql
# products:query — validated against api_version 2025-01
query AgenticReadinessProducts($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    edges {
      node {
        id
        title
        descriptionHtml
        category { id fullName }
        tags
        media(first: 10) {
          edges { node { ... on MediaImage { id image { altText url } } } }
        }
        metafields(first: 20) { edges { node { namespace key value } } }
        variants(first: 100) {
          edges { node { id sku barcode price } }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

```graphql
# files:query — validated against api_version 2025-01
query AgenticReadinessFiles($first: Int!, $after: String) {
  files(first: $first, after: $after, query: "media_type:IMAGE") {
    edges { node { ... on MediaImage { id alt } } }
    pageInfo { hasNextPage endCursor }
  }
}
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
A readiness scorecard. `human`: an overall 0–100 score + per-pillar bars (Discoverable / Trusted / Readable / Structured / Matchable) + a prioritized gap table where each row is `gap → impact → the agentic skill to run`. `json`: `{ score, grade, pillars{...}, gaps:[{ pillar, audit_signal, finding, fix_skill }], sampled_products }`. Every `fix_skill` value is a sibling skill name (e.g. `shopify-admin-agentic-image-alt-text`) so the operator can chain straight into remediation.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit | Wait 2s, retry up to 3 times |
| `ACCESS_DENIED` reading themes | Missing `read_content` scope | Skip the theme pillar, mark Discoverable/Trusted "unknown", continue |
| Empty catalog | New/empty store | Report "no products to assess"; still check theme + policies |

## Best Practices
- Run this FIRST and re-run it after each remediation skill — it's the scoreboard that tells you what's left and what moved.
- Sample, don't crawl: 250 products is enough to estimate fill rates; only audit the full catalog when the sample shows borderline pillars.
- Treat `category`-unassigned and `barcode`-missing as the highest-leverage gaps — they unblock both AI retrieval (Matchable) and Product JSON-LD (Readable) at once.
- This skill is read-only; it never needs `dry_run`. The skills it routes you to DO mutate — run each of those with `dry_run: true` first.
