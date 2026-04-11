---
name: bulk-price-adjustment
role: merchandising
description: "Query products by collection or tag and update all variant prices by a percentage or fixed amount, with optional floor/ceiling constraints."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - products:query
  - productVariantsBulkUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Applies a percentage or fixed price adjustment to every variant across a Shopify collection or tag in a single automated workflow — without manually navigating products in the admin UI, exporting CSVs, editing them, and re-importing. Use this skill when you need to run a storewide or collection-level sale, revert prices after a promotion ends, pass through a supplier cost increase, or align pricing across a segment of products. It replaces the paid functionality of apps like Prisync, Retail Pricing, or Bold Custom Pricing, and eliminates error-prone manual CSV uploads by operating directly against the Admin GraphQL API.

## Prerequisites
- Authenticated Shopify CLI session: `shopify auth login --store <domain>`
- API scopes: `read_products`, `write_products`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |
| dry_run | bool | no | false | Preview operations without executing mutations |
| collection_id | string | no* | — | GID of collection to target (e.g., `gid://shopify/Collection/123`) |
| tag | string | no* | — | Product tag to filter by (alternative to collection_id) |
| adjustment_type | string | yes | — | `percent` or `fixed` |
| adjustment_value | float | yes | — | Amount to adjust. Positive = increase, negative = decrease. For percent: `-10` = 10% discount. |
| min_price | float | no | 0 | Floor price — no variant will be set below this value |
| max_price | float | no | — | Ceiling price — no variant will be set above this value (optional) |

*One of `collection_id` or `tag` is required.

## Safety

> ⚠️ Step 2 executes `productVariantsBulkUpdate` mutations that change live prices immediately. Price changes cannot be undone in bulk via API — each variant must be reverted individually. Always run with `dry_run: true` first to review the full change set before committing. Verify the CSV output from dry_run against your expected results before proceeding.

## Workflow Steps

1. **OPERATION:** `products` — query
   **Inputs:** `first: 250`, `query: "collection_id:'<id>'"` or `query: "tag:'<tag>'"`, pagination cursor
   **Expected output:** List of products with all variant IDs, current prices, SKUs; paginate until `hasNextPage: false`

2. **OPERATION:** `productVariantsBulkUpdate` — mutation
   **Inputs:** For each product: `productId` + array of `{id, price}` with computed new prices (respecting min_price/max_price constraints)
   **Expected output:** Updated `price` per variant, `userErrors` array; collect all errors across batches

## GraphQL Operations

```graphql
# products:query — validated against api_version 2025-01
query ProductsForPriceAdjustment($first: Int!, $after: String, $query: String) {
  products(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        title
        tags
        variants(first: 100) {
          edges {
            node {
              id
              title
              price
              compareAtPrice
              sku
            }
          }
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
# productVariantsBulkUpdate:mutation — validated against api_version 2025-01
mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants {
      id
      price
      compareAtPrice
    }
    userErrors {
      field
      message
    }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: bulk-price-adjustment                ║
║  Store: <store domain>                       ║
║  Started: <YYYY-MM-DD HH:MM UTC>             ║
╚══════════════════════════════════════════════╝
```

**After each step**, emit:
```
[N/TOTAL] <QUERY|MUTATION>  <OperationName>
          → Params: <brief summary of key inputs>
          → Result: <count or outcome, e.g., "143 records returned">
```

If `dry_run: true`, prefix every mutation step with `[DRY RUN]` and do not execute it.

**On completion**, emit:

For `format: human` (default):
```
══════════════════════════════════════════════
OUTCOME SUMMARY
  <Metric label>:   <value>
  ...
  Errors:           <count, 0 if none>
  Output:           <filename or "none">
══════════════════════════════════════════════
```

For `format: json`, emit a JSON object with this schema:
```json
{
  "skill": "bulk-price-adjustment",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": false,
  "steps": [
    {
      "step": 1,
      "operation": "<OperationName>",
      "type": "query|mutation",
      "params_summary": "<string>",
      "result_summary": "<string>",
      "skipped": false
    }
  ],
  "outcome": {
    "<metric_key>": "<value>",
    "errors": 0,
    "output_file": "<filename|null>"
  }
}
```

## Output Format
CSV file `price_changes_<YYYY-MM-DD>.csv` with columns: `product_id`, `variant_id`, `sku`, `title`, `old_price`, `new_price`. For dry_run, the CSV is still generated but no mutations are executed.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `Neither collection_id nor tag provided` | Both parameters are empty | Provide one of `collection_id` or `tag` |
| `userErrors` in mutation response | Invalid price, variant not found | Log error per variant, continue with remaining variants, report in outcome |
| `Product not found in collection` | collection_id is wrong or collection is empty | Verify collection GID in Shopify admin |
| Rate limit (429) | Too many mutations in rapid succession | Reduce batch size; retry with exponential backoff |

## Best Practices
1. Always run `dry_run: true` first — review the CSV to confirm prices before committing. There is no bulk undo.
2. Set `min_price` to your cost floor to prevent pricing variants below cost during percentage discounts.
3. For collections with more than 250 products, the skill paginates automatically — the CSV will contain all variants regardless of page count.
4. Use `adjustment_type: percent` with a negative value for sales (e.g., `-15` for 15% off). Use `adjustment_type: fixed` for flat adjustments (e.g., `-5` to drop every variant by $5).
5. After committing, verify a sample of prices in the Shopify admin before announcing a sale — `userErrors` are logged but do not halt execution.
