---
name: shopify-admin-agentic-description-enrichment
role: agentic
description: "Rewrite thin product descriptions into structured, fact-rich copy (materials, fit, use-cases, the words shoppers actually type) so AI agents have something concrete to quote and match."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - products:query
  - productUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
audit_signals:
  - listing-description-quality
  - agentic-listing-schema
---

## Purpose
When an AI agent decides whether to recommend a product, it quotes the description to justify the match. One-line or empty descriptions give it nothing — so it can't confirm the product fits the shopper's intent and moves on. This skill finds products with thin descriptions (below a character threshold or missing key attributes) and rewrites them into structured copy: a benefit-led opening line, then concrete facts (material, fit/sizing, dimensions, use-cases, care) drawn from the product's own metafields/options/type. Fixes `listing-description-quality` and strengthens `agentic-listing-schema`.

## Prerequisites
- Authenticated Shopify CLI session (`shopify auth login --store <domain>`)
- Required API scopes: `read_products`, `write_products`

## Parameters
All skills accept these universal parameters:

| Parameter | Type   | Required | Default | Description |
|-----------|--------|----------|---------|-------------|
| store     | string | yes      | —       | Store domain (e.g., mystore.myshopify.com) |
| format    | string | no       | human   | Output format: `human` (default) or `json` |
| dry_run   | bool   | no       | false   | Preview mutations without executing |

Skill-specific parameters:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| collection_id | string | no | — | Limit to a collection GID |
| tag | string | no | — | Limit to a product tag |
| min_chars | int | no | 120 | Products with a plain-text description shorter than this are rewritten |
| overwrite | bool | no | false | If false, only enrich products below `min_chars`; if true, restructure all targeted products |
| brand_voice | string | no | — | Optional voice guidance (e.g., "plain, technical, no hype") |

## Safety

> ⚠️ Step 3 (`productUpdate`) replaces `descriptionHtml` on live products. This is content the merchant may have hand-written. Always run `dry_run: true`, export the before/after, and have a human approve the rewrites before committing. Default only touches products under `min_chars`.

## Workflow Steps

1. **OPERATION:** `products` — query
   **Inputs:** `first: 100`, optional filter; fields `descriptionHtml`, `title`, `productType`, `options`, `tags`, `metafields(first: 30)`; paginate.
   **Expected output:** Products whose stripped-text description is below `min_chars`, plus the structured facts available to enrich from.

2. **COMPUTE (no API):** for each thin product, draft `descriptionHtml`: a one-line benefit hook + a short facts list built ONLY from real product data (no invented specs), honoring `brand_voice`. Emit a before/after preview.

3. **OPERATION:** `productUpdate` — mutation
   **Inputs:** `{ id, descriptionHtml }` per approved product.
   **Expected output:** Updated product; collect `userErrors`.

## GraphQL Operations

```graphql
# products:query — validated against api_version 2025-01
query EnrichProducts($first: Int!, $after: String, $query: String) {
  products(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        title
        descriptionHtml
        productType
        tags
        options { name values }
        metafields(first: 30) { edges { node { namespace key value type } } }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

```graphql
# productUpdate:mutation — validated against api_version 2025-01
mutation EnrichProductDescription($input: ProductInput!) {
  productUpdate(input: $input) {
    product { id descriptionHtml }
    userErrors { field message }
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
`human`: count enriched + a before/after CSV (`product, old_len, new_len, new_description`). `json`: `{ products_enriched, products_skipped, errors, output_file }`.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit | Wait 2s, retry up to 3 times |
| `userErrors` non-empty | Invalid HTML / field length | Log message, skip product, continue |
| No facts to enrich from | Sparse product data | Skip; recommend running `shopify-admin-agentic-metafields-setup` first |

## Best Practices
- Enrich from facts the store already holds (metafields, options, type) — never fabricate materials, certifications, or measurements.
- Front-load the attributes shoppers search by; agents weight the first sentence heavily when matching intent.
- This pairs with `shopify-admin-agentic-metafields-setup`: structured metafields make the descriptions both richer and machine-filterable.
- Always have a human approve the dry-run diff for hero/bestseller products before committing.
