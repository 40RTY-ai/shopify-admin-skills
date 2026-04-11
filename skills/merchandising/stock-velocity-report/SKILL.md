---
name: stock-velocity-report
role: merchandising
description: "Read-only: calculates days-of-supply and sell-through rate per SKU and location for replenishment planning."
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
Calculates two critical replenishment metrics for every stocked SKU:
- **Days of Supply (DoS)**: how many days of stock remain at current sales velocity
- **Sell-Through Rate**: percentage of stock sold vs. total received in the period

Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_products,read_orders,read_inventory`
- API scopes: `read_products`, `read_orders`, `read_inventory`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 30 | Sales window for velocity calculation |
| dos_alert_threshold | integer | no | 14 | Flag SKUs with fewer than this many days of supply |
| vendor_filter | string | no | — | Optional vendor to scope report |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `productVariants` — query
   **Inputs:** `first: 250`, select `sku`, `inventoryQuantity`, `inventoryItem { id }`, pagination cursor
   **Expected output:** All variants with on-hand quantities; paginate until `hasNextPage: false`

2. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, select `lineItems { variant { id }, quantity }`, pagination cursor
   **Expected output:** Units sold per variant in the window

3. **OPERATION:** `inventoryItems` — query
   **Inputs:** Batch by inventory item IDs for stocked variants
   **Expected output:** Cost and tracked status per item

4. Calculate per SKU:
   - `daily_velocity = units_sold / days_back`
   - `days_of_supply = on_hand / daily_velocity` (∞ if velocity = 0)
   - `sell_through_rate = units_sold / (units_sold + on_hand)` × 100

## GraphQL Operations

```graphql
# productVariants:query — validated against api_version 2025-01
query VariantsForVelocity($query: String, $after: String) {
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
query SalesVelocityData($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        lineItems(first: 50) {
          edges {
            node {
              quantity
              variant {
                id
                sku
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
query InventoryItemDetails($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on InventoryItem {
      id
      sku
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
║  SKILL: Stock Velocity Report                ║
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
STOCK VELOCITY REPORT  (<days_back>-day window)
  SKUs analyzed:              <n>
  Critical (< <threshold> DoS): <n>
  Healthy (≥ <threshold> DoS):  <n>
  Zero velocity (no sales):   <n>

  Critical SKUs:
    "<product>"  SKU: <sku>  DoS: <n>d  Velocity: <n>/day
  Output: velocity_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "stock-velocity-report",
  "store": "<domain>",
  "period_days": 30,
  "dos_alert_threshold": 14,
  "skus_analyzed": 0,
  "critical_count": 0,
  "healthy_count": 0,
  "zero_velocity_count": 0,
  "output_file": "velocity_<date>.csv"
}
```

## Output Format
CSV file `velocity_<YYYY-MM-DD>.csv` with columns:
`variant_id`, `sku`, `product_title`, `vendor`, `on_hand`, `units_sold`, `daily_velocity`, `days_of_supply`, `sell_through_pct`, `alert`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Zero velocity for all SKUs | No orders in window | Flag all stocked SKUs as "no sales"; check date window |
| Variant without inventory item | Bundle or virtual product | Skip inventory data, calculate velocity from orders only |

## Best Practices
- `days_back: 30` works well for fast movers; use `days_back: 90` for slower-moving or seasonal products.
- SKUs with DoS < 14 and active marketing campaigns are highest priority for reorder — cross-reference with your supplier lead times.
- Zero-velocity SKUs are candidates for the `dead-stock-identifier` workflow — if they've had no sales for 90+ days with stock on hand, consider markdown or discontinuation.
- Run weekly during peak season to catch fast-depleting SKUs before they go out of stock.
