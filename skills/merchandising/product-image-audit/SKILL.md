---
name: product-image-audit
role: merchandising
description: "Read-only: flags products and variants with missing images or fewer than a minimum number of images."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - products:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Scans all active products and their variants for missing or insufficient images. Flags products with zero images, variants with no assigned image, and products below a minimum image count threshold. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_products`
- API scopes: `read_products`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| min_images | integer | no | 1 | Flag products with fewer than this many images |
| check_variants | bool | no | true | Also flag variants with no assigned image |
| status_filter | string | no | active | Product status to scan: `active`, `draft`, or `all` |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `products` — query
   **Inputs:** `query: "status:<status_filter>"`, `first: 250`, select `images`, `variants { image }`, pagination cursor
   **Expected output:** Products with image counts and variant image assignments; paginate until `hasNextPage: false`

2. Flag products: `images.count < min_images` OR `images.count == 0`

3. If `check_variants`: flag variants where `image` is null

## GraphQL Operations

```graphql
# products:query — validated against api_version 2025-01
query ProductImageAudit($query: String!, $after: String) {
  products(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        title
        handle
        status
        images(first: 10) {
          edges {
            node {
              id
              url
              altText
            }
          }
        }
        variants(first: 50) {
          edges {
            node {
              id
              title
              sku
              image {
                id
                url
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

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Product Image Audit                  ║
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
PRODUCT IMAGE AUDIT
  Products scanned:           <n>
  Missing all images:         <n>
  Below min (<min_images>):   <n>
  Variants missing image:     <n>

  Products needing images:
    "<title>" — 0 images
    "<title>" — 1 image (below min <n>)
  Output: image_audit_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "product-image-audit",
  "store": "<domain>",
  "min_images": 1,
  "products_scanned": 0,
  "missing_all_images": 0,
  "below_minimum": 0,
  "variants_missing_image": 0,
  "output_file": "image_audit_<date>.csv"
}
```

## Output Format
CSV file `image_audit_<YYYY-MM-DD>.csv` with columns:
`product_id`, `product_title`, `handle`, `image_count`, `issue`, `variant_id`, `variant_sku`, `variant_has_image`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| No products match filter | Empty catalog or wrong status filter | Exit with 0 results |

## Best Practices
- Products with zero images cannot be sold on most sales channels (Google Shopping, Meta, etc.) — prioritize these as urgent.
- For apparel or products with color/size variants, set `min_images: 3` to ensure at least one front, back, and lifestyle shot per product.
- Run after bulk product imports to catch images that failed to upload in the import batch.
- Pair with `product-data-completeness-score` for a single comprehensive catalog quality report.
