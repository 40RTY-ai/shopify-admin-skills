---
name: shopify-admin-agentic-image-alt-text
role: agentic
description: "Generate and set descriptive alt text on product images so AI agents (which can't 'see' pixels) can understand and recommend what each product looks like."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - products:query
  - fileUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
audit_signals:
  - listing-image-alt-text
---

## Purpose
An AI shopping agent reads image **alt text** to understand a product's appearance — color, material, style, use. Blank or filename-style alt text ("IMG_2931.jpg") tells the agent nothing, so it can't match the product to a visual query ("red linen midi dress") or describe it to a shopper. This skill finds product images with missing or low-value alt text and writes concise, descriptive alt text derived from the product's title, options, type, and tags. Fixes the agentiq.report finding `listing-image-alt-text`.

## Prerequisites
- Authenticated Shopify CLI session (`shopify auth login --store <domain>`)
- Required API scopes: `read_products`, `write_products`, `write_files`

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
| overwrite | bool | no | false | If true, also rewrite filename-style / placeholder alt text; if false, only fill blanks |
| max_chars | int | no | 125 | Alt-text length cap (accessibility + agent-readability) |

## Safety

> ⚠️ Step 3 (`fileUpdate`) writes alt text to live media. With `overwrite: true` it replaces existing alt text, which is not bulk-reversible. Run `dry_run: true` first and review the proposed alt text per image. Default (`overwrite: false`) only fills blanks and is low-risk.

## Workflow Steps

1. **OPERATION:** `products` — query
   **Inputs:** `first: 250`, optional collection/tag filter; fields `title`, `productType`, `tags`, `options`, `media{ MediaImage{ id image{ altText } } }`; paginate until done.
   **Expected output:** Product media with current alt text + the product context needed to generate good alt text.

2. **COMPUTE (no API):** for each image with blank (or, if `overwrite`, placeholder) alt text, compose alt text from `title` + relevant option values (color/material/style) + product type, trimmed to `max_chars`. Emit a preview table (image id → proposed alt).

3. **OPERATION:** `fileUpdate` — mutation
   **Inputs:** `files: [{ id: <MediaImage id>, alt: <generated alt> }]` in batches (≤ 25).
   **Expected output:** Updated files; collect `userErrors`.

## GraphQL Operations

```graphql
# products:query — validated against api_version 2025-01
query AltTextProducts($first: Int!, $after: String, $query: String) {
  products(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        title
        productType
        tags
        options { name values }
        media(first: 20) {
          edges {
            node { ... on MediaImage { id image { altText url } } }
          }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

```graphql
# fileUpdate:mutation — validated against api_version 2025-01
mutation AltTextUpdate($files: [FileUpdateInput!]!) {
  fileUpdate(files: $files) {
    files { ... on MediaImage { id alt } }
    userErrors { field message code }
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
`human`: count of images updated + a CSV (`product, image_id, old_alt, new_alt`). `json`: `{ images_updated, images_skipped, errors, output_file }`.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit | Wait 2s, retry up to 3 times |
| `userErrors` non-empty | Invalid file id / not a MediaImage | Log message, skip, continue |
| Alt exceeds limit | Generated text too long | Trim to `max_chars` at a word boundary |

## Best Practices
- Lead the alt text with the concrete noun + distinguishing attribute ("Charcoal merino crew-neck sweater"), not marketing fluff — that's what agents match on.
- Keep `overwrite: false` for the first pass to fix the worst gap (blanks) safely; do a reviewed `overwrite: true` pass later for filename-style alts.
- Don't keyword-stuff — one accurate sentence beats a comma salad and reads better for screen-reader users too.
- Re-run `shopify-admin-agentic-readiness-audit` afterward to confirm the alt-text coverage pillar moved.
