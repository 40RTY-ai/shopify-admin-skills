---
name: sales-by-channel-report
role: finance
description: "Read-only: breaks down revenue, units, and AOV by sales channel (Online Store, POS, Draft Orders, etc.)."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Analyzes orders by their source channel to produce a revenue, units sold, and AOV breakdown per channel. Helps multi-channel merchants understand where revenue is coming from — Online Store, POS, Draft Orders (B2B), mobile app, or third-party channels. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders`
- API scopes: `read_orders`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 30 | Lookback window |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, select `channelInformation { channelDefinition { handle, displayName } }`, `totalPriceSet`, `lineItems { quantity }`, pagination cursor
   **Expected output:** Orders with channel attribution; paginate until `hasNextPage: false`

2. Group by `channel.displayName`; calculate per-channel: order count, total revenue, total units, AOV

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query OrdersByChannel($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        channelInformation {
          channelDefinition {
            handle
            displayName
          }
        }
        lineItems(first: 50) {
          edges {
            node {
              quantity
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
║  SKILL: Sales by Channel Report              ║
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
SALES BY CHANNEL  (<days_back> days)
  Total revenue:  $<amount>
  Total orders:   <n>

  Channel             Orders  Revenue    AOV      Units  Share
  ─────────────────────────────────────────────────────────────
  Online Store        <n>     $<n>       $<n>     <n>    <pct>%
  POS                 <n>     $<n>       $<n>     <n>    <pct>%
  Draft Orders        <n>     $<n>       $<n>     <n>    <pct>%
  Output: sales_by_channel_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "sales-by-channel-report",
  "store": "<domain>",
  "period_days": 30,
  "total_revenue": 0,
  "total_orders": 0,
  "currency": "USD",
  "by_channel": [],
  "output_file": "sales_by_channel_<date>.csv"
}
```

## Output Format
CSV file `sales_by_channel_<YYYY-MM-DD>.csv` with columns:
`channel_handle`, `channel_name`, `order_count`, `total_revenue`, `aov`, `total_units`, `revenue_share_pct`, `currency`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Null channel info | Orders from deleted/unknown channels | Group under "Unknown" |
| No orders in window | Quiet period | Exit with 0 revenue |

## Best Practices
- POS orders with unusually low AOV compared to Online Store may indicate staff discount abuse or checkout errors — worth cross-referencing.
- Draft Orders channel represents B2B/wholesale orders — if growing, it may warrant a dedicated B2B reporting workflow.
- Channel mix changes over time signal where marketing spend is working — combine with `average-order-value-trends` for a full picture.
