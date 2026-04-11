---
name: product-data-completeness-score
role: merchandising
description: "Read-only: scores each product on data completeness across description, images, SEO, weight, barcode, cost, and metafields."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - products:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Calculates a data completeness score (0–100) for each active product based on the presence of key fields: description, images, SEO title, SEO description, variant weight, barcode, cost, and specified metafields. Produces a ranked list of products needing the most data work. Read-only — no mutations. Combines Matrixify QA and SEO Manager scan into a single catalog health report.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_products`
- API scopes: `read_products`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| status_filter | string | no | active | Product status to score: `active`, `draft`, or `all` |
| required_metafields | array | no | [] | List of `namespace.key` metafields that are required (e.g., `["custom.material"]`) |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Scoring Rubric

| Field | Points |
|-------|--------|
| Description present (non-empty) | 15 |
| At least 1 image | 15 |
| SEO title present | 10 |
| SEO description present | 10 |
| At least 1 variant with barcode | 10 |
| At least 1 variant with cost | 10 |
| At least 1 variant with weight | 10 |
| All required metafields present | 20 (split evenly) |
| **Total** | **100** |

## Workflow Steps

1. **OPERATION:** `products` — query
   **Inputs:** `query: "status:<status_filter>"`, `first: 250`, select all completeness fields, pagination cursor
   **Expected output:** Products with all scored fields; paginate until `hasNextPage: false`

2. Score each product per rubric; rank ascending by score

## GraphQL Operations

```graphql
# products:query — validated against api_version 2025-01
query ProductCompleteness($query: String!, $after: String) {
  products(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        title
        handle
        descriptionHtml
        images(first: 1) {
          edges {
            node {
              id
            }
          }
        }
        seo {
          title
          description
        }
        variants(first: 10) {
          edges {
            node {
              id
              barcode
              weight
              inventoryItem {
                unitCost {
                  amount
                }
              }
            }
          }
        }
        metafields(first: 20) {
          edges {
            node {
              namespace
              key
              value
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
║  SKILL: Product Data Completeness Score      ║
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
PRODUCT DATA COMPLETENESS REPORT
  Products scored:  <n>
  Avg score:        <pct>/100
  Score < 50:       <n> products (need urgent attention)
  Score 50–79:      <n> products
  Score ≥ 80:       <n> products

  Lowest scoring products:
    "<title>"  Score: <n>/100  Missing: description, SEO title
  Output: completeness_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "product-data-completeness-score",
  "store": "<domain>",
  "products_scored": 0,
  "avg_score": 0,
  "below_50_count": 0,
  "output_file": "completeness_<date>.csv"
}
```

## Output Format
CSV file `completeness_<YYYY-MM-DD>.csv` with columns:
`product_id`, `title`, `score`, `has_description`, `image_count`, `has_seo_title`, `has_seo_description`, `has_barcode`, `has_cost`, `has_weight`, `missing_metafields`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| No products match filter | Empty catalog or wrong filter | Exit with 0 results |

## Best Practices
- Use this skill as a pre-launch gate — run before activating DRAFT products to ensure all required fields are filled.
- Tune `required_metafields` to your store's specific needs (e.g., `custom.material` for apparel, `custom.ingredients` for food).
- A score below 50 typically means a product is missing foundational content (description or images) and should be deprioritized from launch until fixed.
- Run monthly to track catalog quality trends over time; improvements after a content sprint should be visible in the average score.
