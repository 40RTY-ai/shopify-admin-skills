---
name: variant-option-normalizer
role: merchandising
description: "Detects inconsistent variant option naming (Sm vs Small vs S) and bulk-corrects to a standard set."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - products:query
  - productVariantsBulkUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Scans product variants for inconsistent option values (e.g., "Sm", "Small", "small", "S" all meaning the same size) and bulk-updates them to a canonical set you define. Inconsistent option naming breaks size filters, causes customer confusion, and prevents search apps from grouping variants correctly.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_products,write_products`
- API scopes: `read_products`, `write_products`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| option_name | string | yes | — | Option to normalize (e.g., `Size`, `Color`) |
| mapping | object | yes | — | Map of non-standard → canonical values (e.g., `{"Sm": "S", "small": "S", "Sml": "S"}`) |
| filter | string | no | — | Optional product filter (e.g., `tag:apparel`) |
| dry_run | bool | no | true | Preview changes without executing mutations |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ⚠️ `productVariantsBulkUpdate` modifies variant option values. Option value changes affect how the variant appears to customers in the storefront and may break existing cart links or saved wishlists. Run with `dry_run: true` to review all affected variants before committing.

## Workflow Steps

1. **OPERATION:** `products` — query
   **Inputs:** `query: <filter>` (or all products if no filter), `first: 250`, select `options`, `variants { selectedOptions }`, pagination cursor
   **Expected output:** Products with variant option values; paginate until `hasNextPage: false`

2. Match variant option values against `mapping` keys — collect variants needing update

3. **OPERATION:** `productVariantsBulkUpdate` — mutation
   **Inputs:** `productId`, array of `variants { id, options: [<normalized_value>] }` for affected variants
   **Expected output:** `productVariants { id, selectedOptions }`, `userErrors`

## GraphQL Operations

```graphql
# products:query — validated against api_version 2025-01
query ProductVariantOptions($query: String!, $after: String) {
  products(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        title
        options {
          id
          name
          values
        }
        variants(first: 100) {
          edges {
            node {
              id
              title
              sku
              selectedOptions {
                name
                value
              }
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
      title
      selectedOptions {
        name
        value
      }
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
║  SKILL: Variant Option Normalizer            ║
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
  Products scanned:       <n>
  Variants needing fix:   <n>
  Variants updated:       <n>
  Errors:                 <n>
  Output:                 option_normalizer_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "variant-option-normalizer",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": true,
  "option_name": "Size",
  "outcome": {
    "products_scanned": 0,
    "variants_needing_fix": 0,
    "variants_updated": 0,
    "errors": 0,
    "output_file": "option_normalizer_<date>.csv"
  }
}
```

## Output Format
CSV file `option_normalizer_<YYYY-MM-DD>.csv` with columns:
`product_id`, `product_title`, `variant_id`, `sku`, `option_name`, `old_value`, `new_value`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `userErrors` on bulk update | Option value conflict within product | Log error, skip product, continue |
| No matching variants | Mapping keys not found in catalog | Exit with 0 matches, review mapping |

## Best Practices
- Build the `mapping` by first running with `dry_run: true` and reviewing the detected option values — you may discover more variants than expected.
- Normalize one `option_name` at a time (Size, then Color separately) to keep the mapping manageable and reduce error risk.
- After normalizing, verify that automated collection rules based on option values still match the intended products.
