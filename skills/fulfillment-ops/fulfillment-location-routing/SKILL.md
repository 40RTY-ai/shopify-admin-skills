---
name: fulfillment-location-routing
role: fulfillment-ops
description: "Reassign fulfillment orders from one location to another for warehouse overflow or regional routing."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - fulfillmentOrders:query
  - fulfillmentOrderMove:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Queries open fulfillment orders assigned to a source location and moves them to a destination location. Used when a warehouse is at capacity, a location is closing, or regional routing rules change. Replaces manual reassignment in Shopify Admin — this skill handles bulk location transfers for any number of open orders in a single workflow.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,write_fulfillments`
- API scopes: `read_orders`, `write_fulfillments`
- Both source and destination locations must be active fulfillment locations in Shopify

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| source_location_id | string | yes | — | GID of the location to move orders FROM |
| destination_location_id | string | yes | — | GID of the location to move orders TO |
| order_filter | string | no | — | Optional order name filter (e.g., "#1001,#1002") |
| dry_run | bool | no | true | Preview moves without executing mutations |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ⚠️ `fulfillmentOrderMove` reassigns fulfillment responsibility. This affects which warehouse picks and ships the order. Verify destination location has sufficient stock for all products before moving. Run with `dry_run: true` to confirm the order list and destination before committing.

## Workflow Steps

1. **OPERATION:** `fulfillmentOrders` — query
   **Inputs:** `assignedLocationId: <source_location_id>`, `status: OPEN`, `first: 250`, pagination cursor
   **Expected output:** List of open fulfillment orders; paginate until `hasNextPage: false`

2. **OPERATION:** `fulfillmentOrderMove` — mutation
   **Inputs:** `id: <fulfillment_order_id>`, `newLocationId: <destination_location_id>`
   **Expected output:** `movedFulfillmentOrder { id, assignedLocation { name } }`, `userErrors`

## GraphQL Operations

```graphql
# fulfillmentOrders:query — validated against api_version 2025-01
query FulfillmentOrdersByLocation($locationId: ID!, $after: String) {
  fulfillmentOrders(
    assignedLocationId: $locationId
    first: 250
    after: $after
    query: "status:open"
  ) {
    edges {
      node {
        id
        status
        order {
          id
          name
        }
        assignedLocation {
          location {
            id
            name
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
# fulfillmentOrderMove:mutation — validated against api_version 2025-01
mutation FulfillmentOrderMove($id: ID!, $newLocationId: ID!) {
  fulfillmentOrderMove(id: $id, newLocationId: $newLocationId) {
    movedFulfillmentOrder {
      id
      assignedLocation {
        location {
          id
          name
        }
      }
    }
    originalFulfillmentOrder {
      id
      status
    }
    remainingFulfillmentOrder {
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
║  SKILL: Fulfillment Location Routing         ║
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
  Orders at source location:  <n>
  Orders moved:               <n>
  Errors:                     <n>
  Output:                     routing_log_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "fulfillment-location-routing",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": true,
  "outcome": {
    "orders_at_source": 0,
    "orders_moved": 0,
    "errors": 0,
    "output_file": "routing_log_<date>.csv"
  }
}
```

## Output Format
CSV file `routing_log_<YYYY-MM-DD>.csv` with columns:
`order_name`, `fulfillment_order_id`, `source_location`, `destination_location`, `status`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `userErrors` on fulfillmentOrderMove | Order already fulfilled or location inactive | Log error, skip order, continue |
| Destination location not stocked | Insufficient inventory at destination | Log warning per SKU, continue move |
| No open orders at source | Source has no pending work | Exit with summary: 0 orders found |

## Best Practices
- Always run with `dry_run: true` first — moving a fulfillment order does not move inventory; verify destination stock levels separately using the `multi-location-inventory-audit` skill.
- Use `order_filter` to move specific high-priority orders first rather than the entire queue.
- For location closures, run this skill before the location is deactivated in Shopify Admin.
