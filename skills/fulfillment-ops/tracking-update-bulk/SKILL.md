---
name: tracking-update-bulk
role: fulfillment-ops
description: "Batch-update tracking numbers and URLs on existing fulfillments when a carrier reassigns tracking IDs."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - order:query
  - fulfillmentUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Looks up existing fulfillments on orders and updates their tracking numbers and carrier URLs in bulk. Used when a carrier reissues tracking IDs after a label reprint, a 3PL batch-uploads corrected tracking, or a carrier integration pushes wrong tracking numbers. Replaces manual tracking corrections in Shopify Admin order by order.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,write_fulfillments`
- API scopes: `read_orders`, `write_fulfillments`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| updates | array | yes | — | List of `{order_id, fulfillment_id, tracking_number, tracking_url, carrier}` objects |
| notify_customer | bool | no | false | Resend shipping confirmation with updated tracking |
| dry_run | bool | no | true | Preview updates without executing mutations |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ⚠️ `fulfillmentUpdate` overwrites existing tracking info. Set `notify_customer: false` unless you explicitly want to resend shipment notifications — customers will receive a new email for every updated fulfillment if enabled. Run with `dry_run: true` to confirm the fulfillment list before committing.

## Workflow Steps

1. **OPERATION:** `order` — query
   **Inputs:** `id: <order_id>` for each order in `updates`
   **Expected output:** Order with `fulfillments { id, trackingInfo }` to confirm existing fulfillment IDs match

2. **OPERATION:** `fulfillmentUpdate` — mutation
   **Inputs:** `fulfillmentId: <id>`, `trackingInfoUpdateInput: { company, number, url }`, `notifyCustomer`
   **Expected output:** `fulfillment { id, trackingInfo }`, `userErrors`

## GraphQL Operations

```graphql
# order:query — validated against api_version 2025-01
query OrderFulfillments($id: ID!) {
  order(id: $id) {
    id
    name
    fulfillments {
      id
      status
      trackingInfo {
        company
        number
        url
      }
    }
  }
}
```

```graphql
# fulfillmentUpdate:mutation — validated against api_version 2025-01
mutation FulfillmentUpdate($fulfillmentId: ID!, $trackingInfoInput: FulfillmentTrackingInput!, $notifyCustomer: Boolean) {
  fulfillmentUpdate(
    fulfillmentId: $fulfillmentId
    trackingInfoUpdateInput: $trackingInfoInput
    notifyCustomer: $notifyCustomer
  ) {
    fulfillment {
      id
      status
      trackingInfo {
        company
        number
        url
      }
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
║  SKILL: Tracking Update Bulk                 ║
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
  Fulfillments targeted:   <n>
  Tracking numbers updated: <n>
  Notifications sent:       <n>
  Errors:                   <n>
  Output:                   tracking_update_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "tracking-update-bulk",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": true,
  "outcome": {
    "targeted": 0,
    "updated": 0,
    "notifications_sent": 0,
    "errors": 0,
    "output_file": "tracking_update_<date>.csv"
  }
}
```

## Output Format
CSV file `tracking_update_<YYYY-MM-DD>.csv` with columns:
`order_name`, `fulfillment_id`, `old_tracking_number`, `new_tracking_number`, `carrier`, `notify_customer`, `status`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `userErrors` on fulfillmentUpdate | Fulfillment cancelled or not found | Log error, skip, continue |
| Fulfillment ID not on order | Stale ID in updates list | Log mismatch, skip, continue |

## Best Practices
- Keep `notify_customer: false` unless the carrier is tracking a replacement shipment — customers find repeated shipping emails confusing and may open unnecessary support tickets.
- Provide `fulfillment_id` directly in the `updates` input when possible to skip the order lookup step entirely.
- For 3PL integrations that send corrected tracking via CSV, parse the CSV into the `updates` array before running this skill.
