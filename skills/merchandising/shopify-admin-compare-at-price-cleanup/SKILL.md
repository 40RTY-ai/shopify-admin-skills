---
name: shopify-admin-compare-at-price-cleanup
role: merchandising
description: "Removes stale compareAtPrice values where current price >= compareAtPrice (no real discount) or compareAtPrice has been set for over a configurable age threshold."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - productVariants:query
  - productVariantsBulkUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Identifies variants with a `compareAtPrice` that no longer represents a genuine discount and clears it, so storefront strikethrough pricing reflects real savings rather than legacy noise. Two conditions are flagged: (a) `compareAtPrice <= price` (no discount, often left over from a price increase), and (b) `compareAtPrice` set for longer than `max_age_days` (stale "always on sale" optics that hurt long-term price perception and can violate advertising standards in some regions). Defaults to dry-run.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_products,write_products`
- API scopes: `read_products`, `write_products`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| dry_run | bool | no | true | Preview the cleanup without executing mutations |
| clean_no_discount | bool | no | true | Clear `compareAtPrice` when `price >= compareAtPrice` |
| clean_stale | bool | no | true | Clear `compareAtPrice` set longer than `max_age_days` |
| max_age_days | integer | no | 90 | Age threshold in days for the stale rule (uses variant `updatedAt` as proxy) |
| collection_id | string | no | — | Optional collection GID to scope the cleanup |
| tag_filter | string | no | — | Optional product tag to scope the cleanup |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ⚠️ Step 2 executes `productVariantsBulkUpdate` mutations that overwrite `compareAtPrice` to null. The original strikethrough value is not preserved server-side — record the dry-run CSV before committing if you want a restore path. Always start with `dry_run: true` and review the CSV before running with `dry_run: false`.

## Workflow Steps

1. **OPERATION:** `productVariants` — query
   **Inputs:** `first: 250`, `query: <built from collection_id or tag_filter>`, select `price`, `compareAtPrice`, `updatedAt`, `product { id, title, vendor }`, `sku`, pagination cursor
   **Expected output:** All variants in scope with current pricing; paginate until `hasNextPage: false`

2. Filter to variants meeting either rule: `clean_no_discount` AND `compareAtPrice != null` AND `parseFloat(compareAtPrice) <= parseFloat(price)`, OR `clean_stale` AND `compareAtPrice != null` AND `(now - updatedAt) > max_age_days`. Group by `product.id` for batched mutation.

3. **OPERATION:** `productVariantsBulkUpdate` — mutation (skipped when `dry_run: true`)
   **Inputs:** Per product, `productId` plus `[{ id: variantId, compareAtPrice: null }]`
   **Expected output:** Updated variants with `compareAtPrice` set to null; collect `userErrors` per batch

4. Write the CSV (always, even on dry run) for audit trail and revert capability.

## GraphQL Operations

```graphql
# productVariants:query — validated against api_version 2025-01
query VariantsForCompareAtCleanup($query: String, $after: String) {
  productVariants(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        sku
        price
        compareAtPrice
        updatedAt
        product {
          id
          title
          vendor
          tags
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
mutation ClearCompareAtPrice($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
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
║  SKILL: Compare-At Price Cleanup             ║
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
COMPARE-AT PRICE CLEANUP  (<dry-run|live>)
  Variants inspected:      <n>
  No-discount cleared:     <n>
  Stale (>= <days>d):      <n>
  Total cleared:           <n>
  Errors:                  <n>
  Output: compare_at_cleanup_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "compare-at-price-cleanup",
  "store": "<domain>",
  "dry_run": true,
  "variants_inspected": 0,
  "cleared_no_discount": 0,
  "cleared_stale": 0,
  "total_cleared": 0,
  "errors": 0,
  "output_file": "compare_at_cleanup_<date>.csv"
}
```

## Output Format
CSV file `compare_at_cleanup_<YYYY-MM-DD>.csv` with columns:
`variant_id`, `product_id`, `product_title`, `vendor`, `sku`, `price`, `original_compare_at_price`, `rule_matched`, `variant_updated_at`, `mutation_status`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `userErrors` in mutation response | Variant locked or in active subscription contract | Log per-variant error, continue with remaining variants |
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `compareAtPrice` already null mid-run | Another process cleared it concurrently | Skip, count as no-op success |
| `updatedAt` newer than expected | Concurrent edit during the audit | Re-query single variant before mutation; skip if rule no longer matches |

## Best Practices
1. Always run with `dry_run: true` first and review the CSV. There is no bulk undo for compareAtPrice clearing.
2. Disable `clean_stale` (set `clean_stale: false`) during long planned promotions — your "stale" sale is actually intentional.
3. Use `collection_id` to scope the cleanup to evergreen products and exclude an active sale collection.
4. After running live, spot-check 5–10 variants in the storefront to confirm strikethrough pricing is gone.
5. Schedule a quarterly run as part of catalog hygiene; combine with `seo-metadata-audit` and `product-data-completeness-score` for an end-of-quarter merchandising sweep.
