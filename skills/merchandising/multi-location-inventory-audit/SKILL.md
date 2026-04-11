---
name: multi-location-inventory-audit
role: merchandising
description: "Audit inventory levels across all active locations, flagging variants where Available quantity is negative or Committed exceeds On Hand — a signal of inventory sync drift."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - locations:query
  - inventoryItems:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Surfaces inventory sync discrepancies across locations — specifically variants where `available` is negative or `committed` > `on_hand`, which indicate drift between Shopify's committed counter and actual physical stock. Common causes: 3PL delays posting returns, WMS deductions stacking with Shopify's committed count, or multi-store sync issues. Read-only — no mutations. Replaces manual inventory reconciliation spreadsheets and the need to navigate each location separately in the Shopify admin.

## Prerequisites
- `shopify auth login --store <domain>`
- API scopes: `read_products`, `read_inventory`, `read_locations`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |
| dry_run | bool | no | false | Preview operations without executing mutations |
| location_ids | array | no | — | Specific location GIDs to audit (default: all active locations) |
| flag_negative_available | bool | no | true | Flag variants where `available < 0` |
| flag_committed_exceeds_onhand | bool | no | true | Flag variants where `committed > on_hand` |
| include_untracked | bool | no | false | Include variants with inventory tracking disabled |

## Workflow Steps

1. **OPERATION:** `locations` — query
   **Inputs:** `first: 50`, `query: "is_active:true"`
   **Expected output:** List of active location IDs and names; filter by `location_ids` parameter if provided

2. **OPERATION:** `inventoryItems` — query (via `location.inventoryLevels`)
   **Inputs:** Per location: fetch inventory levels with `available`, `committed`, `onHand` quantities per variant
   **Expected output:** Per-location inventory matrix; compute discrepancies; collect flagged variants

## GraphQL Operations

```graphql
# locations:query — validated against api_version 2025-01
query ActiveLocations($first: Int!) {
  locations(first: $first, query: "is_active:true") {
    edges {
      node {
        id
        name
        isActive
        inventoryLevels(first: 250) {
          edges {
            node {
              id
              available
              item {
                id
                sku
                tracked
                variant {
                  id
                  displayName
                  product {
                    id
                    title
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
    }
  }
}
```

```graphql
# inventoryItems:query — validated against api_version 2025-01
query InventoryItemLevels($id: ID!, $after: String) {
  location(id: $id) {
    id
    name
    inventoryLevels(first: 250, after: $after) {
      edges {
        node {
          id
          available
          item {
            id
            sku
            tracked
            inventoryLevel(locationId: $id) {
              available
              incoming
            }
            variant {
              id
              displayName
              inventoryQuantity
              product {
                id
                title
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
}
```

Note: `inventoryItems:query` in the frontmatter represents querying inventory item data via location inventory levels. The Shopify Admin API surfaces inventory per location through `location.inventoryLevels`.

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: multi-location-inventory-audit       ║
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
  Locations audited:          <n>
  Variants scanned:           <n>
  Discrepancies found:        <n>
  Negative available:         <n>
  Committed > On Hand:        <n>
  Errors:                     0
  Output:                     inventory-audit-<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "multi-location-inventory-audit",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": false,
  "steps": [
    { "step": 1, "operation": "ActiveLocations", "type": "query", "params_summary": "first: 50, is_active: true", "result_summary": "<n> locations", "skipped": false },
    { "step": 2, "operation": "InventoryItemLevels", "type": "query", "params_summary": "per location, first: 250", "result_summary": "<n> variants scanned", "skipped": false }
  ],
  "outcome": {
    "locations_audited": 0,
    "variants_scanned": 0,
    "discrepancies_found": 0,
    "negative_available_count": 0,
    "committed_exceeds_onhand_count": 0,
    "errors": 0,
    "output_file": "inventory-audit-<date>.csv"
  }
}
```

## Output Format
CSV file `inventory-audit-<YYYY-MM-DD>.csv` with columns: `location_name`, `product_title`, `variant_title`, `sku`, `available`, `flag`.

Also displays an inline summary table:
| Location | Variants Scanned | Discrepancies | Negative Available | Committed > On Hand |
|---------|-----------------|---------------|-------------------|---------------------|

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| No locations returned | No active locations found | Verify at least one active location in Shopify admin |
| `inventoryLevels` empty for a location | Location has no inventory assigned | Expected for fulfillment-only or virtual locations |
| Rate limit (429) | Large inventory + multiple locations | Reduce page size per location to 100 |
| `item.tracked: false` for all variants | Store uses untracked inventory | Enable tracking or set `include_untracked: true` |

## Best Practices
1. Run this audit weekly — inventory drift accumulates gradually and is easiest to fix before it compounds.
2. A negative `available` value does not always indicate a real problem — it can occur legitimately during flash sales. Cross-reference with your order volume before making manual corrections.
3. Use the CSV output with the `inventory-adjustment` skill to apply corrections immediately after the audit identifies discrepancies.
4. Run audit before and after a 3PL returns batch posts to measure whether return inventory is being correctly credited.
5. Filter to a single `location_id` for targeted audits (e.g., just your main warehouse) to reduce API calls on large catalogs.
