---
name: shopify-admin-agentic-product-taxonomy
role: agentic
description: "Assign every product a Shopify Standard Product Taxonomy category so AI agents can map a shopper's intent to the right category and surface the store's products."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - products:query
  - taxonomy:query
  - productUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
audit_signals:
  - category-taxonomy-api
  - catalog-intent-alignment
---

## Purpose
AI shopping agents resolve a query ("running shoes", "office chair", "sustainable sneakers") to a taxonomy node, then retrieve products in that node. Products with no Standard Product Taxonomy category are invisible to that mapping — they only surface on exact keyword luck. This skill finds uncategorized (or mis-categorized) products and assigns the correct Shopify standard taxonomy category, inferred from title/type/tags and confirmed against the live taxonomy tree. Fixes `category-taxonomy-api` and lifts `catalog-intent-alignment`.

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
| only_missing | bool | no | true | If true, only assign products with no category; if false, also review mismatches |
| confidence_floor | float | no | 0.7 | Skip products whose best taxonomy match scores below this |

## Safety

> ⚠️ Step 4 (`productUpdate`) sets the `category` on live products, which affects storefront facets, marketplaces, and tax. A wrong category mis-files a product everywhere. Run `dry_run: true`, review the proposed `product → category` mapping, and only auto-assign matches above `confidence_floor`; queue the rest for human review.

## Workflow Steps

1. **OPERATION:** `products` — query
   **Inputs:** `first: 250`, optional filter; fields `title`, `productType`, `tags`, `category{ id fullName }`; paginate.
   **Expected output:** Products with their current category (or null).

2. **OPERATION:** `taxonomy` — query
   **Inputs:** search the standard taxonomy tree by candidate terms derived from each product's type/title.
   **Expected output:** Candidate taxonomy category nodes (id + fullName) to match against.

3. **COMPUTE (no API):** score each product against candidate nodes; pick the best ≥ `confidence_floor`. Emit the proposed mapping.

4. **OPERATION:** `productUpdate` — mutation
   **Inputs:** `{ id, category: <taxonomyCategoryId> }` per confident match.
   **Expected output:** Updated product category; collect `userErrors`.

## GraphQL Operations

```graphql
# products:query — validated against api_version 2025-01
query TaxonomyProducts($first: Int!, $after: String, $query: String) {
  products(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        title
        productType
        tags
        category { id fullName }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

```graphql
# taxonomy:query — validated against api_version 2025-01
query TaxonomySearch($search: String) {
  taxonomy {
    categories(first: 20, search: $search) {
      edges { node { id fullName isLeaf level } }
    }
  }
}
```

```graphql
# productUpdate:mutation — validated against api_version 2025-01
mutation TaxonomyAssign($input: ProductInput!) {
  productUpdate(input: $input) {
    product { id category { id fullName } }
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
`human`: count categorized + a CSV (`product, old_category, new_category, confidence`) and a "needs review" list below the floor. `json`: `{ categorized, needs_review, errors, output_file }`.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit | Wait 2s, retry up to 3 times |
| No taxonomy match | Niche/ambiguous product | Add to needs-review list, do not guess |
| `userErrors` on update | Invalid category id | Log, skip, continue |

## Best Practices
- Pick the most specific (leaf) node you're confident in — agents match deeper categories more precisely than top-level ones.
- Keep `only_missing: true` for the first pass; re-categorizing existing assignments is higher-risk and best reviewed.
- Aligning the category with your storefront collections compounds the benefit: agents and on-site filters then agree.
- Re-run `shopify-admin-agentic-readiness-audit` to confirm the Matchable pillar improved.
