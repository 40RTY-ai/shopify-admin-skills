---
name: cancel-and-restock
role: fulfillment-ops
description: "Cancel an unfulfilled order, optionally restock inventory, and optionally notify the customer — all in a single validated workflow."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - order:query
  - orderCancel:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Cancels an unfulfilled or partially-unfulfilled order with configurable restock, refund, and customer notification options — without navigating the Shopify admin. Useful for fraud exception handling, out-of-stock cancellations, or customer-requested cancellations before dispatch. Cannot cancel orders that are already fully fulfilled.

## Prerequisites
- Authenticated Shopify CLI session: `shopify auth login --store <domain>`
- API scopes: `read_orders`, `write_orders`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |
| dry_run | bool | no | false | Preview operations without executing mutations |
| order_id | string | yes | — | GID of the order (e.g., `gid://shopify/Order/12345`) |
| reason | string | no | `OTHER` | Cancel reason: `CUSTOMER`, `DECLINED`, `FRAUD`, `INVENTORY`, `STAFF`, `OTHER` |
| restock | bool | no | true | Restock inventory for cancelled line items |
| refund | bool | no | true | Issue refund for any captured payments |
| notify_customer | bool | no | true | Send cancellation email to customer |
| staff_note | string | no | — | Internal note recorded on the cancellation |

## Safety

> ⚠️ Steps 2 executes `orderCancel` which is irreversible. A cancelled order cannot be reopened. If `refund: true`, any captured payment is automatically refunded. If `restock: true`, inventory quantities are immediately restored. Run with `dry_run: true` to verify the order state and confirm it is cancellable before committing.

## Workflow Steps

1. **OPERATION:** `order` — query
   **Inputs:** `id: <order_id>`
   **Expected output:** Order `name`, `displayFulfillmentStatus`, `displayFinancialStatus`, `cancelledAt` (must be null), `fulfillmentOrders.status` (must be `OPEN` or `ON_HOLD` — abort if any fulfillment order is `IN_PROGRESS` or `CLOSED`)

2. **OPERATION:** `orderCancel` — mutation
   **Inputs:** `orderId`, `reason`, `restock`, `refund`, `notifyCustomer`, `staffNote`
   **Expected output:** `orderCancelUserErrors` — empty on success; order is now cancelled with `cancelledAt` timestamp

## GraphQL Operations

```graphql
# order:query — validated against api_version 2025-01
query OrderForCancel($id: ID!) {
  order(id: $id) {
    id
    name
    displayFulfillmentStatus
    displayFinancialStatus
    cancelledAt
    totalPriceSet {
      shopMoney { amount currencyCode }
    }
    lineItems(first: 50) {
      edges {
        node {
          id
          title
          quantity
          variant {
            id
            sku
            inventoryQuantity
          }
        }
      }
    }
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
      defaultEmailAddress {
        emailAddress
      }
      firstName
      lastName
    }
  }
}
```

```graphql
# orderCancel:mutation — validated against api_version 2025-01
mutation OrderCancel(
  $orderId: ID!
  $reason: OrderCancelReason!
  $restock: Boolean!
  $refund: Boolean!
  $notifyCustomer: Boolean!
  $staffNote: String
) {
  orderCancel(
    orderId: $orderId
    reason: $reason
    restock: $restock
    refund: $refund
    notifyCustomer: $notifyCustomer
    staffNote: $staffNote
  ) {
    orderCancelUserErrors {
      field
      message
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
║  SKILL: cancel-and-restock                   ║
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
  Order:               <name>
  Cancellation reason: <reason>
  Restocked:           <true|false>
  Refund issued:       <true|false>
  Customer notified:   <true|false>
  Errors:              0
  Output:              none
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "cancel-and-restock",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": false,
  "steps": [
    { "step": 1, "operation": "OrderForCancel", "type": "query", "params_summary": "order <id>", "result_summary": "<status>", "skipped": false },
    { "step": 2, "operation": "OrderCancel", "type": "mutation", "params_summary": "reason: <reason>, restock: <bool>, refund: <bool>, notifyCustomer: <bool>", "result_summary": "cancelled at <timestamp>", "skipped": false }
  ],
  "outcome": {
    "order_name": "<name>",
    "reason": "<reason>",
    "restocked": true,
    "refund_issued": true,
    "customer_notified": true,
    "errors": 0,
    "output_file": null
  }
}
```

## Output Format
No CSV output. The session summary reports the cancellation result inline. If `restock: true`, list the variant SKUs and quantities restored.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `cancelledAt` is not null | Order is already cancelled | No action needed |
| Fulfillment order `status: IN_PROGRESS` | Order is being picked/packed | Contact warehouse to stop — cannot cancel programmatically once IN_PROGRESS |
| `orderCancelUserErrors` | Order has already been fully fulfilled | Use `refund-and-reorder` skill instead |
| Order not found | Invalid order GID | Use `order-lookup-and-summary` skill to find the correct ID |

## Best Practices
1. Always run `dry_run: true` first — check `displayFulfillmentStatus` and fulfillment order statuses before committing to a cancel.
2. Set `reason: FRAUD` for high-risk orders — this reason is logged in Shopify's fraud analytics.
3. If the order has already been captured (status `PAID`), set `refund: true` — an uncredited cancellation will cause customer disputes.
4. For large cancellation batches (e.g., out-of-stock event), loop through order IDs using `format: json` to capture each result for audit logging.
5. If the warehouse has already started picking, do not cancel via API — contact them directly and cancel only after they confirm no physical work has started.
