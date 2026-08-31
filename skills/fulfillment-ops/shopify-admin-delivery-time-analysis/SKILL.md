---
name: shopify-admin-delivery-time-analysis
role: fulfillment-ops
description: 'Read-only: calculates average time from fulfillment creation to delivery by carrier using fulfillment and order data.'
toolkit: 'shopify-admin, shopify-admin-execution'
api_version: 2025-01
graphql_operations:
  - 'orders:query'
  - 'fulfillmentOrders:query'
status: stable
compatibility: 'Claude Code, Cursor, Codex, Gemini CLI'
execution_adapters:
  shopify-mcp:
    pagination_max_first: 50
    auth: connector-managed
    operations:
      - skill_op: 'orders:query'
        prefer_tool: list-orders
        fallback: graphql_query
      - skill_op: 'fulfillmentOrders:query'
        prefer_tool: graphql_query
  shopify-cli:
    pagination_max_first: 250
    auth: cli-session
---

## Purpose
Analyzes fulfilled orders to calculate average transit time (fulfillment created → delivered) broken down by carrier. Surfaces which carriers are consistently slow or missing delivery confirmations. Read-only — no mutations.

## Prerequisites
Either auth path works. See [docs/execution-adapters.md](../../docs/execution-adapters.md).

- **Shopify MCP connector** (recommended, official): `https://setup.shopify.com/mcp` — connect via `/mcp` in Claude Code; switch stores with the `switch-shop` tool. The connector must be installed with the scopes listed below.
- **Shopify CLI:** `shopify auth login --store <domain>` with the scopes listed below.
- API scopes: `read_orders`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 30 | Lookback window for fulfilled orders |
| min_orders | integer | no | 5 | Minimum orders per carrier to include in averages |
| location_id | string | no | — | Filter by fulfillment location (optional) |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "fulfillment_status:shipped created_at:>='<NOW - days_back days>'"`, `first: 250`, pagination cursor
   **Expected output:** Orders with `fulfillments { createdAt, updatedAt, deliveredAt, trackingInfo { company } }`; paginate until `hasNextPage: false`

2. Calculate transit times per carrier: `deliveredAt - createdAt` (skip orders where `deliveredAt` is null)

3. **OPERATION:** `fulfillmentOrders` — query (optional, for location breakdown)
   **Inputs:** `assignedLocationId: <location_id>`, `status: CLOSED`, `first: 250`
   **Expected output:** Fulfilled orders per location for location-level segmentation

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query FulfilledOrders($first: Int!, $query: String!, $after: String) {
  orders(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        fulfillments {
          id
          createdAt
          updatedAt
          deliveredAt
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
# fulfillmentOrders:query — validated against api_version 2025-01
query FulfillmentOrdersByLocation($first: Int!, $locationId: ID!, $after: String) {
  fulfillmentOrders(
    assignedLocationId: $locationId
    first: $first
    after: $after
    query: "status:closed"
  ) {
    edges {
      node {
        id
        assignedLocation {
          location {
            id
            name
          }
        }
        order {
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
║  SKILL: Delivery Time Analysis               ║
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
DELIVERY TIME ANALYSIS  (<days_back> days)
  Orders analyzed:     <n>
  With delivery data:  <n>

  Carrier              Orders  Avg Days  Min  Max
  ─────────────────────────────────────────────
  UPS                  <n>     <d>       <d>  <d>
  USPS                 <n>     <d>       <d>  <d>
  FedEx                <n>     <d>       <d>  <d>
  (carriers below min_orders threshold excluded)
  Output: delivery_analysis_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "delivery-time-analysis",
  "store": "<domain>",
  "period_days": 30,
  "carriers": [
    { "name": "UPS", "orders": 0, "avg_days": 0, "min_days": 0, "max_days": 0 }
  ],
  "output_file": "delivery_analysis_<date>.csv"
}
```

## Output Format
CSV file `delivery_analysis_<YYYY-MM-DD>.csv` with columns:
`order_name`, `fulfillment_id`, `carrier`, `fulfilled_at`, `delivered_at`, `transit_days`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `deliveredAt` is null | Carrier hasn't confirmed delivery | Exclude from averages, count as "in transit" |
| No fulfilled orders in window | Period too short or no orders | Exit with summary: 0 orders |

## Best Practices
- Set `min_orders: 10` for statistically meaningful averages — carriers with fewer orders will skew results.
- `deliveredAt` is populated only when the carrier confirms delivery via tracking events; some carriers do not report this, so null values are expected.
- Run monthly to track carrier performance over time and inform carrier contract negotiations.
- Cross-reference with the `wismo-bulk-status-report` skill to correlate slow delivery carriers with WISMO ticket volume.
