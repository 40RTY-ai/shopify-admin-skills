---
name: split-shipment-planner
role: fulfillment-ops
description: "Splits a multi-line fulfillment order into separate shipments for partial or location-specific shipping."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - fulfillmentOrders:query
  - fulfillmentOrderSplit:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Splits a fulfillment order containing multiple line items into two or more separate fulfillment orders, each of which can be shipped independently with its own tracking number. Used when items in an order ship from different locations, on different dates, or require different carriers. Replaces manual split-shipment handling in Shopify Admin.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,write_fulfillments`
- API scopes: `read_orders`, `write_fulfillments`
- Target fulfillment order must be in `OPEN` status

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| fulfillment_order_id | string | yes | — | GID of the fulfillment order to split |
| split_groups | array | yes | — | List of `{line_item_ids: [], quantities: []}` defining each shipment group |
| dry_run | bool | no | true | Preview split without executing mutation |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ⚠️ `fulfillmentOrderSplit` is irreversible — a split fulfillment order cannot be merged back. The original fulfillment order is replaced by multiple new ones. Run with `dry_run: true` to confirm the intended groupings before committing. Ensure all `line_item_ids` in `split_groups` belong to the target fulfillment order.

## Workflow Steps

1. **OPERATION:** `fulfillmentOrders` — query
   **Inputs:** Query for the specific fulfillment order by order ID, filter by `status: OPEN`
   **Expected output:** Fulfillment order with all `lineItems { id, remainingQuantity, variant { sku, title } }`

2. Validate `split_groups` — confirm all line item IDs exist in the fulfillment order and quantities are ≤ remaining quantities

3. **OPERATION:** `fulfillmentOrderSplit` — mutation
   **Inputs:** `fulfillmentOrderId`, `fulfillmentOrderLineItems` array per split group
   **Expected output:** Array of new `fulfillmentOrders { id, lineItems }`, `userErrors`

## GraphQL Operations

```graphql
# fulfillmentOrders:query — validated against api_version 2025-01
query FulfillmentOrderLines($orderId: ID!) {
  order(id: $orderId) {
    id
    name
    fulfillmentOrders(first: 10) {
      edges {
        node {
          id
          status
          lineItems(first: 50) {
            edges {
              node {
                id
                remainingQuantity
                totalQuantity
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
}
```

```graphql
# fulfillmentOrderSplit:mutation — validated against api_version 2025-01
mutation FulfillmentOrderSplit($fulfillmentOrderId: ID!, $fulfillmentOrderLineItems: [FulfillmentOrderLineItemInput!]!) {
  fulfillmentOrderSplit(
    fulfillmentOrderId: $fulfillmentOrderId
    fulfillmentOrderLineItems: $fulfillmentOrderLineItems
  ) {
    fulfillmentOrders {
      id
      status
      lineItems(first: 50) {
        edges {
          node {
            id
            remainingQuantity
            variant {
              sku
              title
            }
          }
        }
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
║  SKILL: Split Shipment Planner               ║
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
  Original fulfillment order: <id>
  Split into:                 <n> shipments
  Errors:                     <n>

  Shipment 1: <line items summary>
  Shipment 2: <line items summary>
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "split-shipment-planner",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": true,
  "original_fulfillment_order_id": "<id>",
  "resulting_fulfillment_orders": [],
  "errors": 0
}
```

## Output Format
Human-readable split summary. No CSV output — split results are viewable in Shopify Admin under the order's fulfillment tab.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry |
| `userErrors` — invalid line item | Line item ID not in fulfillment order | Abort and report mismatch |
| `userErrors` — quantity exceeds remaining | Split quantity > remaining quantity | Abort and report per line item |
| Fulfillment order not OPEN | Already fulfilled or cancelled | Abort with status report |

## Best Practices
- Use `dry_run: true` to preview the resulting shipment groups before splitting — a split cannot be reversed.
- Ensure `split_groups` covers all line items in the fulfillment order; any unassigned items will remain in the original (residual) fulfillment order.
- For orders with items shipping from different warehouses, use the `fulfillment-location-routing` skill to move the split groups to the correct locations after splitting.
