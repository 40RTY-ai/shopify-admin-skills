---
name: return-processing-sla
role: returns
description: "Read-only: measures average time from return request to refund completion, surfacing SLA breaches."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - returns:query
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Calculates the time from return request creation to refund issuance for all completed returns in a period. Surfaces the average processing time, identifies orders that breached a configurable SLA threshold, and lists the longest-pending open returns. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,read_returns`
- API scopes: `read_orders`, `read_returns`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 30 | Lookback window for return requests |
| sla_days | integer | no | 5 | Maximum acceptable days from request to refund |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `returns` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, pagination cursor
   **Expected output:** Returns with `createdAt`, `status`, `refunds { createdAt }`, `order { name }`

2. For each completed return: calculate `processing_days = refund.createdAt - return.createdAt`

3. Identify SLA breaches: `processing_days > sla_days`

4. **OPERATION:** `orders` — query
   **Inputs:** Filter for orders with `return_status:open` to find pending returns exceeding SLA
   **Expected output:** Open return orders with request dates

## GraphQL Operations

```graphql
# returns:query — validated against api_version 2025-01
query ReturnProcessingTimes($query: String!, $after: String) {
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
        refunds(first: 3) {
          id
          createdAt
          totalRefundedSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
        returnLineItems(first: 10) {
          edges {
            node {
              quantity
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
query OrdersWithOpenReturns($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        returnStatus
        returns(first: 5) {
          edges {
            node {
              id
              status
              createdAt
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
║  SKILL: Return Processing SLA                ║
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
RETURN PROCESSING SLA  (<days_back> days, SLA: <sla_days> days)
  Returns analyzed:          <n>
  Avg processing time:       <d> days
  Within SLA (<sla_days>d):  <n>  (<pct>%)
  SLA breaches:              <n>  (<pct>%)
  Open returns pending:      <n>

  Longest open returns (no refund yet):
    Order <name>  — requested <n> days ago
  Output: return_sla_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "return-processing-sla",
  "store": "<domain>",
  "period_days": 30,
  "sla_days": 5,
  "returns_analyzed": 0,
  "avg_processing_days": 0,
  "within_sla_count": 0,
  "sla_breach_count": 0,
  "open_pending_count": 0,
  "output_file": "return_sla_<date>.csv"
}
```

## Output Format
CSV file `return_sla_<YYYY-MM-DD>.csv` with columns:
`return_id`, `order_name`, `return_requested_at`, `refunded_at`, `processing_days`, `sla_breach`, `return_status`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| No refund on completed return | Exchange-only resolution | Exclude from time calculation, note as exchange |
| No returns in window | No return activity | Exit with summary: 0 returns |

## Best Practices
- Set `sla_days` to match your published returns policy (e.g., "refunds processed within 5 business days").
- Use the open returns list to proactively contact customers whose returns have been waiting more than `sla_days` — reducing WISMO-style "where's my refund" tickets.
- Run weekly as a returns ops health check; pair with `return-reason-analysis` to correlate slow processing with specific return reason types.
- Note that `processing_days` measures calendar days; adjust your SLA threshold accordingly if your team only processes returns on business days.
