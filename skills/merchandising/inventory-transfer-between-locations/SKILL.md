---
name: inventory-transfer-between-locations
role: merchandising
description: "Moves inventory units from one location to another by decrementing the source and incrementing the destination."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - locations:query
  - inventoryItems:query
  - inventoryAdjustQuantities:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Transfers a specified quantity of inventory from a source location to a destination location using paired inventory adjustments (decrement source, increment destination). Used for inter-warehouse rebalancing, pre-positioning stock before a sale, or redistributing inventory after a location change. Replaces manual inventory transfer in Shopify Admin.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_products,write_inventory,read_inventory`
- API scopes: `read_products`, `read_inventory`, `write_inventory`
- Both source and destination must be active Shopify locations

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| source_location_id | string | yes | — | GID of the location to move stock FROM |
| destination_location_id | string | yes | — | GID of the location to move stock TO |
| transfers | array | yes | — | List of `{sku, quantity}` objects to transfer |
| dry_run | bool | no | true | Preview adjustments without executing mutations |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ⚠️ `inventoryAdjustQuantities` directly modifies inventory levels. Decrementing the source below zero is possible if the quantity exceeds available stock — the skill will warn but Shopify does not block negative adjustments. Run with `dry_run: true` to verify available quantities at the source before committing. This does NOT create a transfer order record in Shopify; it is a direct adjustment.

## Workflow Steps

1. **OPERATION:** `locations` — query
   **Inputs:** `first: 50`
   **Expected output:** All locations with `id`, `name` — validate source and destination IDs exist

2. **OPERATION:** `inventoryItems` — query
   **Inputs:** Batch lookup by SKU to get `inventoryItem.id` for each transfer SKU
   **Expected output:** Inventory items with current quantities at source location

3. Validate: for each SKU, confirm `available >= quantity` at source. Warn if not but proceed if `dry_run: false`

4. **OPERATION:** `inventoryAdjustQuantities` — mutation
   **Inputs:** Two changes per SKU: `{ inventoryItemId, locationId: source, delta: -quantity, reason: "correction" }` and `{ inventoryItemId, locationId: destination, delta: +quantity, reason: "correction" }`
   **Expected output:** `inventoryAdjustmentGroup { changes { delta, location } }`, `userErrors`

## GraphQL Operations

```graphql
# locations:query — validated against api_version 2025-01
query ActiveLocations {
  locations(first: 50, includeInactive: false) {
    edges {
      node {
        id
        name
        isActive
        fulfillsOnlineOrders
      }
    }
  }
}
```

```graphql
# inventoryItems:query — validated against api_version 2025-01
query InventoryLevelsAtLocation($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on InventoryItem {
      id
      sku
      inventoryLevels(first: 20) {
        edges {
          node {
            location {
              id
              name
            }
            quantities(names: ["available", "on_hand"]) {
              name
              quantity
            }
          }
        }
      }
    }
  }
}
```

```graphql
# inventoryAdjustQuantities:mutation — validated against api_version 2025-01
mutation InventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
  inventoryAdjustQuantities(input: $input) {
    inventoryAdjustmentGroup {
      createdAt
      reason
      changes {
        delta
        quantityAfterChange
        item {
          id
          sku
        }
        location {
          id
          name
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
║  SKILL: Inventory Transfer Between Locations ║
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
  SKUs transferred:   <n>
  Total units moved:  <n>
  Warnings (low stock): <n>
  Errors:             <n>
  Output:             inventory_transfer_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "inventory-transfer-between-locations",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "dry_run": true,
  "source_location": "<name>",
  "destination_location": "<name>",
  "outcome": {
    "skus_transferred": 0,
    "units_moved": 0,
    "warnings": 0,
    "errors": 0,
    "output_file": "inventory_transfer_<date>.csv"
  }
}
```

## Output Format
CSV file `inventory_transfer_<YYYY-MM-DD>.csv` with columns:
`sku`, `product_title`, `inventory_item_id`, `source_location`, `destination_location`, `quantity_transferred`, `source_qty_before`, `source_qty_after`, `destination_qty_before`, `destination_qty_after`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| SKU not found | SKU not in catalog | Log warning, skip transfer for that SKU |
| `userErrors` on adjustment | Location not stocking item | Log error, skip SKU, continue |
| Quantity would go negative | Transferring more than available | Log warning; abort SKU if `dry_run: false` |

## Best Practices
- Always run with `dry_run: true` first — the skill verifies available quantities and shows exactly what will change.
- This creates raw inventory adjustments, not a transfer order. For audit trail purposes, add a note in the reason field and document the transfer separately.
- For large transfers (50+ SKUs), run during off-peak hours to avoid interfering with live inventory reads by the storefront.
- Pair with `multi-location-inventory-audit` to identify which locations have excess stock before deciding transfer quantities.
