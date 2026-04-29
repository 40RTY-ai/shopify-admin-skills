---
name: shopify-admin-carrier-performance-comparison
role: fulfillment-ops
description: "Read-only: compares delivery times and shipping costs across carriers used in fulfillments to inform carrier mix and contract decisions."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
  - fulfillments:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Aggregates fulfillments across recent orders, joins them to the shipping line on each order, and compares carriers head-to-head on (a) average transit days, (b) on-time rate (delivered before/at the customer-facing estimate), and (c) shipping cost per order. Surfaces which carrier is the right default per zone, route, or weight class. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders`
- API scopes: `read_orders`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 60 | Lookback window for fulfilled orders |
| min_orders | integer | no | 10 | Minimum orders per carrier to include in comparison |
| segment_by | string | no | — | Optional segmentation: `country`, `weight`, or `none` |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time. Cost data uses the shipping line price the customer paid, not your negotiated carrier rate; if you want true cost variance you must overlay carrier invoices yourself.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "fulfillment_status:shipped created_at:>='<NOW - days_back days>'"`, `first: 250`, select `fulfillments { trackingInfo, createdAt, deliveredAt, inTransitAt }`, `shippingLine { carrierIdentifier, originalPriceSet, title }`, `totalWeight`, `shippingAddress`, pagination cursor
   **Expected output:** Fulfilled orders with shipping line and fulfillment timing; paginate until `hasNextPage: false`

2. **OPERATION:** `fulfillments` — query (per fulfillment ID for any order missing inline data)
   **Inputs:** `id: <fulfillmentGid>`
   **Expected output:** Detailed `events`, `deliveredAt`, `estimatedDeliveryAt`

3. Group by carrier (use `shippingLine.carrierIdentifier` if present, else parse `trackingInfo.company`). For each carrier compute: avg transit days, p90 transit days, on-time rate (`deliveredAt <= estimatedDeliveryAt`), avg shipping price, order count.

4. If `segment_by` is set, repeat the group within each segment (e.g., per `shippingAddress.countryCode`).

5. Filter out carriers below `min_orders` and sort by avg transit days ascending.

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query OrdersForCarrierComparison($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        totalWeight
        shippingAddress {
          countryCode
          provinceCode
          zip
        }
        shippingLine {
          carrierIdentifier
          title
          code
          originalPriceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
        fulfillments {
          id
          createdAt
          inTransitAt
          deliveredAt
          estimatedDeliveryAt
          status
          trackingInfo {
            company
            number
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
# fulfillments:query — validated against api_version 2025-01
query FulfillmentDetail($id: ID!) {
  fulfillment(id: $id) {
    id
    status
    createdAt
    inTransitAt
    deliveredAt
    estimatedDeliveryAt
    trackingInfo {
      company
      number
      url
    }
    events(first: 50) {
      edges {
        node {
          status
          happenedAt
          message
        }
      }
    }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Carrier Performance Comparison       ║
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
CARRIER PERFORMANCE  (<days_back> days)
  Orders analyzed:        <n>
  With delivery data:     <n>

  Carrier        Orders  Avg Days  P90  On-Time%  Avg Cost
  ──────────────────────────────────────────────────────────
  <carrier>      <n>     <d>       <d>  <pct>%    $<n>
  <carrier>      <n>     <d>       <d>  <pct>%    $<n>
  Output: carrier_performance_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "carrier-performance-comparison",
  "store": "<domain>",
  "period_days": 60,
  "orders_analyzed": 0,
  "carriers": [
    {
      "name": "UPS",
      "orders": 0,
      "avg_transit_days": 0,
      "p90_transit_days": 0,
      "on_time_pct": 0,
      "avg_cost": 0,
      "currency": "USD"
    }
  ],
  "output_file": "carrier_performance_<date>.csv"
}
```

## Output Format
CSV file `carrier_performance_<YYYY-MM-DD>.csv` with columns:
`carrier`, `segment`, `orders`, `avg_transit_days`, `p90_transit_days`, `on_time_pct`, `avg_cost`, `total_cost`, `currency`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `deliveredAt` is null | Carrier did not confirm delivery | Exclude from transit-time average, count as "in transit" |
| `estimatedDeliveryAt` is null | Carrier did not provide an ETA | Exclude from on-time rate, do not penalize carrier |
| `carrierIdentifier` and `trackingInfo.company` both null | Manual fulfillment without tracking | Bucket as `(unknown)`, surface count separately |

## Best Practices
- Compare carriers only at `min_orders >= 10`; smaller samples are noise.
- Use `segment_by: country` for international comparisons — a carrier strong domestically may be weak across borders.
- Pair this skill with `delivery-time-analysis` for the time-only view; this skill adds cost and on-time dimensions.
- A carrier with great transit time but high cost may still win if your customers value speed (high AOV stores) — overlay this report with customer-facing NPS or review data.
- Run quarterly during contract review windows to bring data, not gut feel, to carrier negotiations.
