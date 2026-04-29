---
name: shopify-admin-price-elasticity-analyzer
role: merchandising
description: "Read-only: analyzes the relationship between product pricing and sales velocity to identify optimal price points and price-sensitive products."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - products:query
  - orders:query
  - productVariants:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Analyzes price-to-velocity relationships across the product catalog to identify which products are price-sensitive and where optimal price points might exist. Compares products within the same category/vendor at different price tiers, and examines how products with compare-at prices (on sale) perform vs. full-price items. Inspired by dynamic pricing apps like Prisync and Intelis. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,read_products`
- API scopes: `read_orders`, `read_products`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain |
| days_back | integer | no | 90 | Sales lookback window |
| group_by | string | no | product_type | Group comparison: `product_type`, `vendor`, or `collection` |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `products` — query
   **Inputs:** `first: 250`, `status: ACTIVE`, select `id`, `title`, `productType`, `vendor`, `variants { price, compareAtPrice, inventoryQuantity }`, pagination cursor
   **Expected output:** All active products with pricing data

2. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, select `lineItems { variant { id, price }, quantity }`, pagination cursor
   **Expected output:** Sales data per variant for velocity calculation

3. For each product/variant, calculate:
   - **Units sold per day** (velocity)
   - **Revenue per day**
   - **Current price point**
   - **Has compare-at price?** (on sale indicator)
   - **Sale discount %** = (compareAtPrice - price) / compareAtPrice × 100

4. Within each group (product_type or vendor):
   - Sort by price ascending
   - Calculate velocity at each price tier
   - Identify price-velocity correlation (negative = price-sensitive, flat = price-insensitive)
   - Compare sale items velocity vs. full-price velocity
   - Flag products where small price changes could significantly change volume

5. **OPERATION:** `productVariants` — query (enrichment for variants with compare-at prices)
   **Inputs:** Variant IDs where compareAtPrice is set
   **Expected output:** Historical pricing context

## GraphQL Operations

```graphql
# products:query — validated against api_version 2025-01
query ActiveProductsWithPricing($after: String) {
  products(first: 250, after: $after, query: "status:active") {
    edges {
      node {
        id
        title
        productType
        vendor
        variants(first: 100) {
          edges {
            node {
              id
              price
              compareAtPrice
              sku
              inventoryQuantity
            }
          }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

```graphql
# orders:query — validated against api_version 2025-01
query SalesVelocityData($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        createdAt
        lineItems(first: 50) {
          edges {
            node {
              variant { id price }
              quantity
            }
          }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

```graphql
# productVariants:query — validated against api_version 2025-01
query VariantsOnSale($query: String, $after: String) {
  productVariants(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        price
        compareAtPrice
        product { id title productType vendor }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Price Elasticity Analyzer            ║
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
PRICE ELASTICITY ANALYSIS  (<days_back> days)
  Products analyzed:        <n>
  Product groups compared:  <n>
  ─────────────────────────────
  PRICE-SENSITIVE (high elasticity):
    "<product type>" — velocity drops <pct>% per $10 price increase
    Top candidate: "<product>" at $<price> — consider testing $<lower>

  PRICE-INSENSITIVE (low elasticity):
    "<product type>" — velocity stable across price range $<low>-$<high>
    Top candidate: "<product>" at $<price> — room to increase

  SALE EFFECTIVENESS:
    Products on sale: <n>  Avg discount: <pct>%
    Sale velocity lift: +<pct>% vs. full-price peers

  Output: price_elasticity_<date>.csv
══════════════════════════════════════════════
```

## Output Format
CSV file `price_elasticity_<YYYY-MM-DD>.csv` with columns:
`product_id`, `product_title`, `product_type`, `vendor`, `current_price`, `compare_at_price`, `daily_velocity`, `revenue_per_day`, `group_avg_velocity`, `price_rank_in_group`, `elasticity_indicator`, `recommendation`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Small groups | Only 1-2 products in a type | Skip group — insufficient data for comparison |
| No sales | Product has zero sales in window | Include at velocity=0 for comparison |

## Best Practices
- Best results require at least 5+ products per group for meaningful comparison.
- Price-insensitive products are candidates for price increases — test with `bulk-price-adjustment`.
- Price-sensitive products may benefit from promotional pricing — test with `discount-ab-analysis`.
- Products on sale with minimal velocity lift are wasting margin — remove compare-at price.
- Run quarterly to track how price sensitivity changes with seasons.
