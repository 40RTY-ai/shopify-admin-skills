---
name: inventory-valuation-report
role: merchandising
description: "Read-only: calculates total inventory value (quantity × cost) per location and per vendor for accounting and insurance."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - inventoryItems:query
  - locations:query
  - productVariants:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Calculates the total inventory value (on-hand quantity × unit cost) broken down by location and vendor. Used for periodic balance sheet reconciliation, insurance valuation, and cost-of-goods reporting. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_products,read_inventory`
- API scopes: `read_products`, `read_inventory`
- Unit costs must be set on inventory items for accurate valuation (variants without cost are included at $0)

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| breakdown | string | no | both | Breakdown level: `location`, `vendor`, or `both` |
| include_zero_cost | bool | no | true | Include items with no cost set (shown as $0) |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `locations` — query
   **Inputs:** `first: 50`, active locations only
   **Expected output:** All active location IDs and names

2. **OPERATION:** `productVariants` — query
   **Inputs:** `first: 250`, select `sku`, `inventoryQuantity`, `product { vendor }`, `inventoryItem { id, unitCost }`, pagination cursor
   **Expected output:** All variants with cost and stock; paginate until `hasNextPage: false`

3. **OPERATION:** `inventoryItems` — query
   **Inputs:** Batch by inventory item IDs; fetch `inventoryLevels` per location
   **Expected output:** Per-location quantities for each inventory item

4. Calculate: for each (variant, location) pair: `value = quantity × unit_cost`; aggregate by location and vendor

## GraphQL Operations

```graphql
# locations:query — validated against api_version 2025-01
query ActiveLocationsForValuation {
  locations(first: 50, includeInactive: false) {
    edges {
      node {
        id
        name
        isActive
      }
    }
  }
}
```

```graphql
# productVariants:query — validated against api_version 2025-01
query VariantsForValuation($after: String) {
  productVariants(first: 250, after: $after) {
    edges {
      node {
        id
        sku
        inventoryQuantity
        product {
          id
          title
          vendor
        }
        inventoryItem {
          id
          unitCost {
            amount
            currencyCode
          }
          tracked
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
# inventoryItems:query — validated against api_version 2025-01
query InventoryLevelsByLocation($ids: [ID!]!) {
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
            quantities(names: ["on_hand"]) {
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

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Inventory Valuation Report           ║
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
INVENTORY VALUATION REPORT
  Total inventory value:  $<amount> <currency>
  SKUs included:          <n>  (of which <n> have no cost)

  By Location:
    Warehouse A          $<amount>
    Warehouse B          $<amount>

  By Vendor:
    Vendor X             $<amount>
    Vendor Y             $<amount>
  Output: inventory_valuation_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "inventory-valuation-report",
  "store": "<domain>",
  "total_value": 0,
  "currency": "USD",
  "skus_included": 0,
  "zero_cost_skus": 0,
  "by_location": [],
  "by_vendor": [],
  "output_file": "inventory_valuation_<date>.csv"
}
```

## Output Format
CSV file `inventory_valuation_<YYYY-MM-DD>.csv` with columns:
`variant_id`, `sku`, `product_title`, `vendor`, `location`, `quantity_on_hand`, `unit_cost`, `total_value`, `currency`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| No unit cost set | Variants without cost data | Include at $0, flag in report |
| No active locations | Store has no locations configured | Exit with error |

## Best Practices
- Run at month-end for balance sheet reconciliation — compare with your accounting system to identify discrepancies.
- Items with no cost set will appear as $0 and understate total value. Use the output to identify and fill cost gaps before the next run.
- For insurance purposes, use the total value as the minimum replacement cost baseline — add a markup for retail pricing if required by your policy.
- Pair with `dead-stock-identifier` to understand what portion of your inventory value is tied up in slow-moving stock.
