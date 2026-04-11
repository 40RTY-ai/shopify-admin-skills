---
name: dead-stock-identifier
role: merchandising
description: "Read-only: cross-references inventory levels with order velocity to flag items with positive stock but zero sales in N days."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - productVariants:query
  - orders:query
  - inventoryItems:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Identifies SKUs that have positive inventory on hand but have not sold any units in a configurable lookback window. Dead stock ties up capital, warehouse space, and carrying costs. Read-only — no mutations. Provides the data foundation for a markdown or clearance decision.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_products,read_orders,read_inventory`
- API scopes: `read_products`, `read_orders`, `read_inventory`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 90 | Sales lookback window — SKUs with no sales in this period are flagged |
| min_quantity | integer | no | 1 | Minimum on-hand quantity to include (exclude truly zero-stock) |
| vendor_filter | string | no | — | Optional vendor to scope the audit |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `productVariants` — query
   **Inputs:** `first: 250`, `query: <vendor_filter if set>`, select `sku`, `inventoryQuantity`, `inventoryItem { id }`, pagination cursor
   **Expected output:** All variants with stock levels; paginate until `hasNextPage: false`

2. Filter to variants with `inventoryQuantity >= min_quantity`

3. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, select `lineItems { variant { id }, quantity }`, pagination cursor
   **Expected output:** All line items sold in the window to build a "sold variant IDs" set

4. **OPERATION:** `inventoryItems` — query
   **Inputs:** Batch of `inventoryItemIds` for stocked variants
   **Expected output:** Inventory item cost data for dead stock value calculation

5. Cross-reference: variants in step 2 that are NOT in the sold set from step 3 → dead stock

## GraphQL Operations

```graphql
# productVariants:query — validated against api_version 2025-01
query VariantsWithStock($query: String, $after: String) {
  productVariants(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        sku
        inventoryQuantity
        product {
          id
          title
          vendor
          status
        }
        inventoryItem {
          id
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
query OrderLineItemsInPeriod($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        lineItems(first: 50) {
          edges {
            node {
              quantity
              variant {
                id
              }
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
# inventoryItems:query — validated against api_version 2025-01
query InventoryItemCosts($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on InventoryItem {
      id
      unitCost {
        amount
        currencyCode
      }
      tracked
    }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Dead Stock Identifier                ║
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
DEAD STOCK REPORT  (no sales in <days_back> days)
  SKUs with stock:       <n>
  SKUs with zero sales:  <n>  (<pct>%)
  Est. dead stock value: $<amount>

  Top dead stock by value:
    "<product>"  SKU: <sku>  Qty: <n>  Value: $<n>
  Output: dead_stock_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "dead-stock-identifier",
  "store": "<domain>",
  "period_days": 90,
  "stocked_skus": 0,
  "dead_stock_skus": 0,
  "dead_stock_pct": 0,
  "estimated_value": 0,
  "currency": "USD",
  "output_file": "dead_stock_<date>.csv"
}
```

## Output Format
CSV file `dead_stock_<YYYY-MM-DD>.csv` with columns:
`variant_id`, `sku`, `product_title`, `vendor`, `quantity_on_hand`, `days_since_last_sale`, `unit_cost`, `total_cost_value`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| No orders in window | New store or very slow period | All stocked SKUs will be flagged — expected |
| Variant without inventory item | Bundle or virtual product | Skip inventory cost, include in list |

## Best Practices
- Use `days_back: 90` for seasonal products; `days_back: 180` or `days_back: 365` for evergreen catalog.
- Sort by `total_cost_value` descending to prioritize markdown decisions by capital impact.
- Cross-reference with `stock-velocity-report` to distinguish truly dead stock from slow movers that still sell occasionally.
- Use results as input for a discount campaign: apply a markdown tag using `product-tag-bulk-update` and then create a clearance collection.
