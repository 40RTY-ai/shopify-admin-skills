---
name: high-risk-order-tagger
role: order-intelligence
description: "Tags orders flagged as high-risk for manual review and optionally places fulfillment holds to prevent shipping."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
  - tagsAdd:mutation
  - fulfillmentOrderHold:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Queries recent high-risk orders and takes two protective actions: tags the order for staff visibility and optionally places a fulfillment hold to prevent the order from shipping until reviewed. Complements `order-risk-report` (which only reads) with write actions that create a reviewable queue. Inspired by Shopify's Fraud Filter and Flow fraud prevention automation.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,write_orders,write_fulfillments`
- API scopes: `read_orders`, `write_orders`, `write_fulfillments`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 1 | Lookback window (default: last 24 hours) |
| min_order_value | float | no | 0 | Only flag orders above this value |
| tag | string | no | fraud-review | Tag applied to flagged orders |
| hold_fulfillment | bool | no | true | Also place a fulfillment hold on flagged orders |
| hold_reason | string | no | UNKNOWN_PAYMENT_RISK | Fulfillment hold reason |
| dry_run | bool | no | true | Preview without executing mutations |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ⚠️ `fulfillmentOrderHold` prevents orders from being fulfilled until the hold is explicitly released. Customers will experience a shipping delay while on hold. Use `hold_fulfillment: false` if you only want to tag without blocking fulfillment. Run with `dry_run: true` to confirm the order list before committing. Release holds with the `order-hold-and-release` skill after review.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "risk_level:high created_at:>='<NOW - days_back days>'"`, `first: 250`, select `riskLevel`, `fulfillmentOrders`, `totalPriceSet`
   **Expected output:** High-risk orders in window

2. **OPERATION:** `tagsAdd` — mutation
   **Inputs:** Order `id`, `tags: [<tag>]`
   **Expected output:** Updated order tags; `userErrors`

3. **OPERATION:** `fulfillmentOrderHold` — mutation (if `hold_fulfillment: true`)
   **Inputs:** `fulfillmentOrderId`, `reason: <hold_reason>`, `reasonNotes: "High-risk order — awaiting fraud review"`
   **Expected output:** `heldFulfillmentOrder { id, status }`, `userErrors`

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query HighRiskOrders($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        riskLevel
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        tags
        fulfillmentOrders(first: 5) {
          edges {
            node {
              id
              status
            }
          }
        }
        customer {
          id
          displayName
          numberOfOrders
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
# tagsAdd:mutation — validated against api_version 2025-01
mutation TagsAdd($id: ID!, $tags: [String!]!) {
  tagsAdd(id: $id, tags: $tags) {
    node {
      id
    }
    userErrors {
      field
      message
    }
  }
}
```

```graphql
# fulfillmentOrderHold:mutation — validated against api_version 2025-01
mutation FulfillmentOrderHold($id: ID!, $fulfillmentHold: FulfillmentOrderHoldInput!) {
  fulfillmentOrderHold(id: $id, fulfillmentHold: $fulfillmentHold) {
    fulfillmentOrder {
      id
      status
    }
    userErrors {
      field
      message
    }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: High Risk Order Tagger               ║
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

If `dry_run: true`, prefix every mutation step with `[DRY RUN]` and do not execute it.

**On completion**, emit:

For `format: human` (default):
```
══════════════════════════════════════════════
OUTCOME SUMMARY
  High-risk orders found:  <n>
  Orders tagged:           <n>
  Fulfillment holds placed: <n>
  Errors:                  <n>
  Output:                  risk_tagging_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "high-risk-order-tagger",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "dry_run": true,
  "outcome": {
    "orders_found": 0,
    "tagged": 0,
    "holds_placed": 0,
    "errors": 0,
    "output_file": "risk_tagging_<date>.csv"
  }
}
```

## Output Format
CSV file `risk_tagging_<YYYY-MM-DD>.csv` with columns:
`order_name`, `order_id`, `risk_level`, `total_price`, `currency`, `tag_applied`, `hold_placed`, `customer_name`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `userErrors` on hold | Order already fulfilled or hold already exists | Log as skipped, continue |
| No high-risk orders | Clean period | Exit with 0 flagged |

## Best Practices
- Run within 1–2 hours of order placement — most fraud orders are placed and expected to ship same-day.
- After a hold is placed, use `order-risk-report` to review the risk indicators in detail before deciding to cancel or release.
- Release legitimate orders with the `order-hold-and-release` skill to minimize shipping delay.
- Orders from repeat customers (`numberOfOrders > 3`) are unlikely to be fraudulent — consider filtering them out with `min_order_value` or a separate query.
