---
name: return-reason-analysis
role: returns
description: "Read-only: aggregates return reasons across orders to identify product quality or listing issues."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - returns:query
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Queries all return requests within a date window and aggregates them by return reason code, product, and SKU. Surfaces which products have the highest return rates and which reasons (wrong size, damaged, not as described, etc.) are most common. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,read_returns`
- API scopes: `read_orders`, `read_returns`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 30 | Lookback window for return requests |
| min_returns | integer | no | 3 | Minimum returns per product to include in output |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `returns` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, pagination cursor
   **Expected output:** Return objects with `returnLineItems { returnReason, refundableQuantity, fulfillmentLineItem { lineItem { product { title } variant { sku } } } }`; paginate until `hasNextPage: false`

2. Aggregate by: return reason → product → SKU; calculate return count and % of total returns per bucket

3. **OPERATION:** `orders` — query (for return rate context)
   **Inputs:** Same date window, `first: 250`; count total orders as denominator for return rate calculation

## GraphQL Operations

```graphql
# returns:query — validated against api_version 2025-01
query ReturnsAnalysis($query: String!, $after: String) {
  returns(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        status
        createdAt
        order {
          id
          name
        }
        returnLineItems(first: 50) {
          edges {
            node {
              id
              quantity
              returnReason
              returnReasonNote
              fulfillmentLineItem {
                lineItem {
                  product {
                    id
                    title
                  }
                  variant {
                    id
                    sku
                    title
                  }
                }
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
# orders:query — validated against api_version 2025-01
query OrderCountForPeriod($query: String!) {
  orders(first: 1, query: $query) {
    pageInfo {
      hasNextPage
    }
  }
  ordersCount: orders(first: 250, query: $query) {
    edges {
      node {
        id
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
║  SKILL: Return Reason Analysis               ║
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
RETURN REASON ANALYSIS  (<days_back> days)
  Total returns:   <n>
  Total orders:    <n>
  Return rate:     <pct>%

  Top Reasons
  ─────────────────────────────────────────
  Wrong size/fit        <n>  (<pct>%)
  Not as described      <n>  (<pct>%)
  Damaged/defective     <n>  (<pct>%)
  Changed mind          <n>  (<pct>%)
  Other                 <n>  (<pct>%)

  Top Products by Return Volume
  ─────────────────────────────────────────
  <Product Title>   <n> returns  (<SKU>)
  Output: return_reasons_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "return-reason-analysis",
  "store": "<domain>",
  "period_days": 30,
  "total_returns": 0,
  "total_orders": 0,
  "return_rate_pct": 0,
  "by_reason": [],
  "by_product": [],
  "output_file": "return_reasons_<date>.csv"
}
```

## Output Format
CSV file `return_reasons_<YYYY-MM-DD>.csv` with columns:
`return_id`, `order_name`, `product_title`, `sku`, `quantity`, `return_reason`, `reason_note`, `created_at`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| No returns in window | No return requests in period | Exit with summary: 0 returns |
| Missing product/variant on line item | Deleted product | Log as "deleted product", include in reason counts |

## Best Practices
- Cross-reference high-return products with their listing descriptions and images — "not as described" returns often indicate a copy or photography issue.
- Use `min_returns: 10` for larger stores to focus on statistically significant patterns rather than one-off complaints.
- Run monthly and compare period-over-period to track whether merchandising or product quality improvements are reducing specific return reasons.
- Pair with `exchange-vs-refund-ratio` to understand whether high-return products are recovering revenue via exchanges.
