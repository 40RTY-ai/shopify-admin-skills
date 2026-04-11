---
name: exchange-vs-refund-ratio
role: returns
description: "Read-only: tracks what percentage of returns become exchanges vs. refunds vs. store credit — measures revenue recovery rate."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - returns:query
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Analyzes return resolutions to calculate the split between exchanges (revenue retained), store credit (revenue deferred), and refunds (revenue lost). Tracks this as a revenue recovery metric over time. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,read_returns`
- API scopes: `read_orders`, `read_returns`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 30 | Lookback window for return resolutions |
| compare_days_back | integer | no | 0 | Optional prior period for comparison (0 = no comparison) |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `returns` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, pagination cursor
   **Expected output:** Returns with `refunds { totalRefundedSet }`, `exchangeLineItems`, and resolution status

2. Categorize each return resolution:
   - **Exchange**: return has `exchangeLineItems` with quantity > 0
   - **Store credit**: return has `refunds` with gift card or store credit payment
   - **Refund**: return has cash/card refund with no exchange

3. **OPERATION:** `orders` — query (if `compare_days_back > 0`)
   **Inputs:** Same logic for prior period to compute trend

## GraphQL Operations

```graphql
# returns:query — validated against api_version 2025-01
query ReturnResolutions($query: String!, $after: String) {
  returns(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        status
        createdAt
        totalQuantity
        order {
          id
          name
        }
        exchangeLineItems(first: 10) {
          edges {
            node {
              id
              quantity
              lineItem {
                variant {
                  id
                  title
                }
              }
            }
          }
        }
        refunds(first: 5) {
          id
          totalRefundedSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
        returnLineItems(first: 20) {
          edges {
            node {
              refundableQuantity
              returnReason
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
query OrdersInPeriod($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
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
║  SKILL: Exchange vs Refund Ratio             ║
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
EXCHANGE vs REFUND RATIO  (<days_back> days)
  Total returns resolved:  <n>

  Resolution breakdown:
    Exchange (revenue kept):    <n>  (<pct>%)
    Store credit (deferred):    <n>  (<pct>%)
    Refund (revenue lost):      <n>  (<pct>%)

  Revenue recovery rate: <pct>%
  (exchanges + store credit as % of all returns)

  Output: exchange_refund_ratio_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "exchange-vs-refund-ratio",
  "store": "<domain>",
  "period_days": 30,
  "total_returns": 0,
  "exchanges": { "count": 0, "pct": 0 },
  "store_credit": { "count": 0, "pct": 0 },
  "refunds": { "count": 0, "pct": 0 },
  "revenue_recovery_rate_pct": 0,
  "output_file": "exchange_refund_ratio_<date>.csv"
}
```

## Output Format
CSV file `exchange_refund_ratio_<YYYY-MM-DD>.csv` with columns:
`return_id`, `order_name`, `resolution_type`, `exchange_sku`, `refund_amount`, `currency`, `created_at`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| No resolved returns in window | No completed returns in period | Exit with summary: 0 returns |
| Exchange line items empty but status indicates exchange | In-progress exchange | Count as pending, exclude from ratio |

## Best Practices
- A revenue recovery rate above 30% (exchanges + store credit) is generally a strong signal for fashion/apparel; set your own benchmark based on category.
- Use `compare_days_back` to track whether returns policy changes (e.g., "exchange only" periods) improved the recovery rate.
- Pair with `return-reason-analysis` — high "wrong size" return reasons paired with low exchange rates may indicate size guidance issues in product listings.
- Run before and after launching an exchange incentive (e.g., bonus store credit for exchanging instead of refunding) to measure impact.
