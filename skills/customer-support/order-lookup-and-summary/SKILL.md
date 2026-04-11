---
name: order-lookup-and-summary
role: customer-support
description: "Retrieve and summarize full order details for a customer by email, order number, or phone number."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Retrieves complete order details for a customer without requiring navigation through the Shopify admin UI. Useful for support agents answering customer queries about order status, shipping tracking, and refunds. This skill operates directly on the Shopify-native data layer, returning full order context in a single operation.

## Prerequisites
- Authenticated Shopify CLI session: `shopify auth login --store <domain>`
- API scopes: `read_orders`, `read_customers`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |
| dry_run | bool | no | false | Preview operations without executing mutations |
| lookup_by | string | yes | — | `order_number`, `email`, or `phone` |
| lookup_value | string | yes | — | The value to search for (e.g., `#1001`, `jane@example.com`, `+15551234567`) |
| limit | integer | no | 5 | Maximum number of orders to return |

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `first: <limit>`, `query: "name:<order_number>"` or `"email:<email>"` or `"phone:<phone>"` depending on `lookup_by`
   **Expected output:** Full order objects with financial status, fulfillment status, line items, shipping address, tracking, refunds

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query OrderLookup($first: Int!, $query: String) {
  orders(first: $first, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        processedAt
        displayFinancialStatus
        displayFulfillmentStatus
        totalPriceSet {
          shopMoney { amount currencyCode }
        }
        subtotalPriceSet {
          shopMoney { amount currencyCode }
        }
        totalShippingPriceSet {
          shopMoney { amount currencyCode }
        }
        totalRefundedSet {
          shopMoney { amount currencyCode }
        }
        customer {
          id
          defaultEmailAddress {
            emailAddress
          }
          firstName
          lastName
          phone
        }
        shippingAddress {
          address1
          address2
          city
          province
          country
          zip
          phone
        }
        lineItems(first: 50) {
          edges {
            node {
              title
              quantity
              variant {
                sku
                price
              }
              fulfillmentStatus
            }
          }
        }
        fulfillments {
          trackingInfo {
            number
            url
            company
          }
          status
          createdAt
        }
        refunds {
          createdAt
          totalRefundedSet {
            shopMoney { amount currencyCode }
          }
        }
        note
        tags
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
║  SKILL: order-lookup-and-summary             ║
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
OUTCOME SUMMARY
  Orders found:   <n>
  Errors:         0
  Output:         none
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "order-lookup-and-summary",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": false,
  "steps": [
    { "step": 1, "operation": "OrderLookup", "type": "query", "params_summary": "lookup_by: <type>, lookup_value: <value>, limit: <n>", "result_summary": "<n> orders", "skipped": false }
  ],
  "outcome": {
    "orders_found": 0,
    "errors": 0,
    "output_file": null
  }
}
```

## Output Format
Human-readable formatted summary for each order found (not a CSV). For each order, Claude presents: order number, date, financial and fulfillment status, customer details, line items, shipping address, tracking numbers, and any refunds. For `format: json`, the raw order objects array.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| No orders returned | No match for lookup value | Verify lookup value format (order number must include `#`, e.g., `#1001`) |
| `lookup_by` invalid | Value is not `order_number`, `email`, or `phone` | Use one of the three accepted values |
| Rate limit (429) | Too many requests | Reduce `limit` or wait and retry |

## Best Practices
1. Order number lookups require the `#` prefix (e.g., `#1001`), which maps to the `name` field in the GraphQL query.
2. Phone lookups must use E.164 format (e.g., `+15551234567`); partial numbers will not match.
3. Email lookup returns all orders for that customer — set `limit` to retrieve more than the default 5 if the customer has many orders.
4. For `format: json`, pipe the output to `jq` to extract specific fields for downstream scripts.
5. This skill is read-only — use the `refund-and-reorder` skill if you need to process a refund after looking up the order.
