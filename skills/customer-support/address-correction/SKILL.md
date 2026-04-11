---
name: address-correction
role: customer-support
description: "Update the shipping address on an unfulfilled order before it ships."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - order:query
  - orderUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Corrects a shipping address on an unfulfilled order without navigating the Shopify admin UI. This skill is useful when a customer provides a correction after placing the order — for example, a typo in the street address or a wrong ZIP code. It replaces the manual address editing flow in the Shopify admin by executing the address update directly via the Admin API. The update must be performed before the order is fulfilled; this skill will abort with an error if the order has already been fulfilled or is partially fulfilled. Once fulfillment begins, the Shopify order record cannot be updated through this skill.

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
| new_address | object | yes | — | New shipping address: `address1`, `address2` (optional), `city`, `province`, `country`, `zip`, `phone` (optional), `first_name`, `last_name` |

## Safety

> ⚠️ Step 2 executes `orderUpdate` which immediately changes the shipping address on record. If the order is already with a fulfillment partner, notify them separately — this skill updates the Shopify record only. This skill will abort with an error if `displayFulfillmentStatus` is not `UNFULFILLED`. Address changes cannot be applied to partially or fully fulfilled orders.

## Workflow Steps

1. **OPERATION:** `order` — query
   **Inputs:** `id: <order_id>`
   **Expected output:** Order name, `displayFulfillmentStatus`, current `shippingAddress`; if `displayFulfillmentStatus != "UNFULFILLED"`, abort with message: "Cannot update address: order has already been fulfilled."

2. **OPERATION:** `orderUpdate` — mutation
   **Inputs:** `input.id: <order_id>`, `input.shippingAddress: <new_address object>`
   **Expected output:** Updated `shippingAddress` on the order, `userErrors`

## GraphQL Operations

```graphql
# order:query — validated against api_version 2025-01
query OrderForAddressCheck($id: ID!) {
  order(id: $id) {
    id
    name
    displayFulfillmentStatus
    shippingAddress {
      address1
      address2
      city
      province
      country
      zip
      phone
      firstName
      lastName
    }
  }
}
```

```graphql
# orderUpdate:mutation — validated against api_version 2025-01
mutation OrderUpdate($input: OrderInput!) {
  orderUpdate(input: $input) {
    order {
      id
      shippingAddress {
        address1
        address2
        city
        province
        country
        zip
        phone
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
║  SKILL: address-correction                   ║
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
  Order:          <name>
  Address updated: yes
  Errors:          0
  Output:          none
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "address-correction",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": false,
  "steps": [
    { "step": 1, "operation": "OrderForAddressCheck", "type": "query", "params_summary": "order_id: <id>", "result_summary": "UNFULFILLED, address confirmed", "skipped": false },
    { "step": 2, "operation": "OrderUpdate", "type": "mutation", "params_summary": "order_id: <id>, new_address: <summary>", "result_summary": "address updated", "skipped": false }
  ],
  "outcome": {
    "order_name": "<name>",
    "address_updated": true,
    "errors": 0,
    "output_file": null
  }
}
```

## Output Format
No CSV output. The skill reports the updated address in the session completion summary. The new address is shown in the `[2/2]` step output.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `displayFulfillmentStatus != UNFULFILLED` | Order is already fulfilled or partially fulfilled | Cannot update address; contact the carrier directly |
| `userErrors` from orderUpdate | Invalid address fields (e.g., invalid country code) | Verify ISO country code and province/state format |
| Order not found | Invalid order GID | Use `order-lookup-and-summary` skill to find the correct order ID |

## Best Practices
1. Always run `dry_run: true` first — Step 1 shows the current address for confirmation before Step 2 commits the change.
2. Country must be the ISO 3166-1 alpha-2 code (e.g., `US`, `CA`, `GB`) — not the full country name.
3. This skill only updates the Shopify order record. If you use a third-party fulfillment provider, also update the address in their system.
4. For phone field, use E.164 format (e.g., `+15551234567`).
5. After updating, use the `order-lookup-and-summary` skill to confirm the address change took effect.
