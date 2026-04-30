---
name: shopify-admin-cross-sell-opportunity-finder
role: conversion-optimization
description: "Read-only: identifies products with high single-purchase rates that could benefit from cross-sell pairing based on category and price affinity."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
  - products:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Finds products that are almost always purchased alone (single-item orders) and identifies potential cross-sell partners based on category affinity, price complementarity, and customer overlap. While `frequently-bought-together` finds existing patterns, this skill finds MISSING patterns — products that SHOULD be cross-sold but aren't. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,read_products`
- API scopes: `read_orders`, `read_products`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain |
| days_back | integer | no | 180 | Order lookback window |
| solo_threshold | float | no | 70 | % of orders where product is bought alone to flag as "solo" |
| min_orders | integer | no | 10 | Minimum orders for a product to be analyzed |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, select `lineItems { product { id, title, productType, vendor }, quantity, originalTotalSet }`, pagination cursor
   **Expected output:** All orders with product data

2. For each product, calculate:
   - Total orders containing this product
   - Solo orders (product is the only item) vs. multi-item orders
   - Solo rate = solo_orders / total_orders × 100
   - Average order value when solo vs. when multi-item

3. Flag products with solo rate ≥ solo_threshold as "cross-sell candidates"

4. **OPERATION:** `products` — query (enrichment)
   **Inputs:** Product IDs for solo items and potential partners
   **Expected output:** Product type, vendor, price, collections for affinity matching

5. For each solo product, suggest cross-sell partners:
   - Same vendor, different product type (complementary)
   - Same product type, different price tier (good-better-best)
   - Products bought by the same customer cohort in separate orders
   - Price complementarity: partner price should be 20-50% of main product price (impulse add-on range)

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query OrdersForCrossSell($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        customer { id }
        lineItems(first: 50) {
          edges {
            node {
              product { id title productType vendor }
              quantity
              originalTotalSet { shopMoney { amount currencyCode } }
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
# products:query — validated against api_version 2025-01
query ProductEnrichment($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on Product {
      id
      title
      productType
      vendor
      priceRangeV2 {
        minVariantPrice { amount currencyCode }
      }
      totalInventory
      status
    }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Cross-Sell Opportunity Finder        ║
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
CROSS-SELL OPPORTUNITY REPORT  (<days_back> days)
  Products analyzed:         <n>
  High solo-rate products:   <n>
  ─────────────────────────────
  TOP CROSS-SELL OPPORTUNITIES:

  "<product A>"  (solo rate: <pct>%, <n> orders)
    → Suggested partner: "<product B>" (same vendor, complementary type)
    → Price fit: $<main> + $<partner> = $<combined>
    → Potential AOV lift: +$<amount> per order

  Revenue opportunity: $<total> (if <pct>% of solo orders add partner)

  Output: cross_sell_opportunities_<date>.csv
══════════════════════════════════════════════
```

## Output Format
CSV file `cross_sell_opportunities_<YYYY-MM-DD>.csv` with columns:
`product_id`, `product_title`, `total_orders`, `solo_orders`, `solo_rate`, `suggested_partner_id`, `suggested_partner_title`, `affinity_type`, `potential_aov_lift`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| All multi-item orders | Store naturally has high cross-sell | Report as healthy — no action needed |
| Small catalog | Too few products for meaningful pairs | Suggest expanding catalog |

## Best Practices
- Products with 80%+ solo rate and high order volume are biggest AOV opportunities.
- Implement suggested pairs as "Customers also bought" or cart drawer recommendations.
- Cross-reference with `frequently-bought-together` to see what IS working vs. what's missing.
- Use with `discount-ab-analysis` to test a "buy X, get Y at 15% off" promotion.
