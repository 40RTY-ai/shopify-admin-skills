---
name: shopify-admin-order-cancellation-analysis
role: order-intelligence
description: "Read-only: tracks cancellation rate over time and breaks down cancelled orders by cancelReason to surface fraud, inventory, customer, and declined-payment patterns."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Computes cancellation rate (cancelled orders / total orders) over a configurable window, broken down by `cancelReason` (`CUSTOMER`, `FRAUD`, `INVENTORY`, `DECLINED`, `OTHER`, `STAFF`). Surfaces shifts in cancellation patterns — for example, a spike in `INVENTORY` cancellations suggests a stock data integrity problem, while a spike in `FRAUD` suggests a coordinated attack. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders`
- API scopes: `read_orders`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 30 | Lookback window for orders included in the analysis |
| bucket | string | no | day | Time bucket: `day`, `week`, or `month` |
| min_value | float | no | 0 | Only include orders above this total value |
| reason_filter | string | no | — | Optional filter to a single `cancelReason` |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time. The analysis uses `cancelReason` as recorded by Shopify or staff at cancellation time — accuracy depends on staff selecting the correct reason.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, select `cancelledAt`, `cancelReason`, `displayFinancialStatus`, `totalPriceSet`, pagination cursor
   **Expected output:** All orders created in the window (cancelled and non-cancelled) for rate calculation; paginate until `hasNextPage: false`

2. Partition orders into cancelled (`cancelledAt != null`) and not cancelled. Compute overall rate = cancelled / total.

3. For cancelled orders, group by `cancelReason` and by time bucket. Compute rate per bucket and per reason.

4. Identify time buckets where any single reason exceeds 2x its trailing 7-bucket average — flag as anomalies.

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query OrdersForCancellationAnalysis($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        cancelledAt
        cancelReason
        displayFinancialStatus
        displayFulfillmentStatus
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        customer {
          id
          numberOfOrders
        }
        staffMember {
          id
          name
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
║  SKILL: Order Cancellation Analysis          ║
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
CANCELLATION ANALYSIS  (<days_back> days, by <bucket>)
  Total orders:        <n>
  Cancelled orders:    <n>  (<pct>%)
  Lost revenue:        $<amount>

  By reason:
    CUSTOMER     <n>  (<pct>%)
    FRAUD        <n>  (<pct>%)
    INVENTORY    <n>  (<pct>%)
    DECLINED     <n>  (<pct>%)
    OTHER        <n>  (<pct>%)

  Anomaly buckets (>2x trailing avg):
    <bucket-key>  reason=<reason>  rate=<pct>%
  Output: cancellation_analysis_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "order-cancellation-analysis",
  "store": "<domain>",
  "period_days": 30,
  "bucket": "day",
  "total_orders": 0,
  "cancelled_orders": 0,
  "cancellation_rate": 0,
  "lost_revenue": 0,
  "currency": "USD",
  "by_reason": {
    "CUSTOMER": 0, "FRAUD": 0, "INVENTORY": 0, "DECLINED": 0, "OTHER": 0
  },
  "anomalies": [],
  "output_file": "cancellation_analysis_<date>.csv"
}
```

## Output Format
CSV file `cancellation_analysis_<YYYY-MM-DD>.csv` with columns:
`bucket_start`, `bucket_end`, `total_orders`, `cancelled_orders`, `rate_pct`, `reason_customer`, `reason_fraud`, `reason_inventory`, `reason_declined`, `reason_other`, `lost_revenue`, `currency`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `cancelReason` is null on cancelled order | Older order pre-dating reason field | Bucket into `OTHER`, log count |
| No orders in window | Empty store or test domain | Exit with summary: 0 orders, 0% rate |
| Cancelled order created outside window | Cancellation happened in window but order older | Excluded by design — analyses creation cohort |

## Best Practices
- A baseline cancellation rate of 1–3% is typical; spikes above 5% warrant investigation.
- Sustained `INVENTORY` cancellations indicate a sync issue between storefront stock and warehouse — pair this skill with `multi-location-inventory-audit`.
- Sustained `FRAUD` cancellations indicate either improving fraud filters (good) or a coordinated attack (bad) — cross-reference with `order-risk-report`.
- High `DECLINED` rates often correlate with checkout friction or expired payment methods — investigate alongside checkout abandonment data.
- Run weekly to catch reason-mix shifts early; run after every major promotion to confirm cancellations did not spike.
