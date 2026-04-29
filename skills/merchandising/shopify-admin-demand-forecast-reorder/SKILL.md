---
name: shopify-admin-demand-forecast-reorder
role: merchandising
description: "Read-only: forecasts demand per SKU using sales velocity and seasonality, then calculates reorder points and suggested purchase order quantities."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
  - productVariants:query
  - inventoryItems:query
  - inventoryLevels:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Forecasts future demand for each SKU based on historical sales velocity, trend analysis, and optional seasonality adjustments. Calculates reorder points (when to order) and suggested reorder quantities (how much to order) factoring in vendor lead times and safety stock. Replicates core functionality of apps like Prediko, Inventory Planner, and Fabrikatör. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,read_products,read_inventory`
- API scopes: `read_orders`, `read_products`, `read_inventory`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain |
| days_back | integer | no | 90 | Historical sales window for velocity calculation |
| forecast_days | integer | no | 30 | Days into the future to forecast demand |
| lead_time_days | integer | no | 14 | Default vendor lead time in days |
| safety_stock_days | integer | no | 7 | Extra days of safety stock buffer |
| vendor_filter | string | no | — | Scope to specific vendor |
| only_low_stock | boolean | no | false | Only show items projected to stock out within forecast window |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, select `createdAt`, `lineItems { variant { id }, quantity }`, pagination cursor
   **Expected output:** All orders with line items for sales velocity calculation

2. Calculate per-variant sales velocity:
   - Daily sales rate = total units sold / days_back
   - Weekly trend: compare last 30 days vs prior 30 days for trend direction
   - Forecasted demand = daily_rate × forecast_days × trend_multiplier

3. **OPERATION:** `productVariants` — query
   **Inputs:** All variant IDs with sales history, `first: 250`, pagination cursor
   **Expected output:** Variant details (SKU, title, product title, vendor)

4. **OPERATION:** `inventoryLevels` — query
   **Inputs:** Inventory item IDs for stocked variants
   **Expected output:** Current available quantities per location

5. Calculate reorder metrics:
   - **Days of Stock** = current_inventory / daily_sales_rate
   - **Reorder Point** = (lead_time_days + safety_stock_days) × daily_sales_rate
   - **Reorder Quantity** = forecast_days × daily_sales_rate + safety_stock - current_inventory
   - **Stockout Date** = today + (current_inventory / daily_sales_rate) days
   - **Order-By Date** = stockout_date - lead_time_days

6. Sort by urgency: items closest to stockout first

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query SalesHistory($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        createdAt
        lineItems(first: 50) {
          edges {
            node {
              quantity
              variant { id }
            }
          }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

```graphql
# productVariants:query — validated against api_version 2025-01
query VariantInfo($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on ProductVariant {
      id
      sku
      title
      product { id title vendor }
      inventoryQuantity
      inventoryItem { id }
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
      unitCost { amount currencyCode }
      tracked
      inventoryLevels(first: 10) {
        edges {
          node {
            quantities(names: ["available"]) {
              name
              quantity
            }
            location { id name }
          }
        }
      }
    }
  }
}
```

```graphql
# inventoryLevels:query — validated against api_version 2025-01
query LocationInventory($locationId: ID!, $after: String) {
  location(id: $locationId) {
    inventoryLevels(first: 250, after: $after) {
      edges {
        node {
          quantities(names: ["available"]) { name quantity }
          item { id variant { id sku product { title } } }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Demand Forecast & Reorder Planner    ║
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
DEMAND FORECAST & REORDER PLAN  (<days_back>d history → <forecast_days>d forecast)
  SKUs analyzed:       <n>
  Avg daily velocity:  <n> units/day
  ─────────────────────────────
  ⚠️  URGENT (stockout <7 days):
    "<product>" SKU:<sku>  Stock:<n>  Days left:<n>  ORDER BY: <date>
    Reorder qty: <n> units  Est. cost: $<n>

  ⏰ PLAN AHEAD (stockout 7-30 days):
    "<product>" SKU:<sku>  Stock:<n>  Days left:<n>  ORDER BY: <date>

  ✅ HEALTHY (>30 days stock):
    <n> SKUs with adequate stock

  Output: reorder_plan_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "demand-forecast-reorder",
  "store": "<domain>",
  "history_days": 90,
  "forecast_days": 30,
  "lead_time_days": 14,
  "skus_analyzed": 0,
  "urgent_reorders": [],
  "planned_reorders": [],
  "healthy_skus": 0,
  "output_file": "reorder_plan_<date>.csv"
}
```

## Output Format
CSV file `reorder_plan_<YYYY-MM-DD>.csv` with columns:
`variant_id`, `sku`, `product_title`, `vendor`, `current_stock`, `daily_velocity`, `trend`, `days_of_stock`, `stockout_date`, `reorder_point`, `reorder_qty`, `order_by_date`, `est_cost`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Zero sales velocity | Product never sold in window | Skip from reorder calc — flag as "no demand data" |
| No inventory tracking | Variant not tracked | Skip — cannot forecast untracked items |

## Best Practices
- Set `lead_time_days` per vendor if possible; default 14 is conservative.
- Use `safety_stock_days: 14` for high-value or slow-ship items.
- Run weekly and pipe output into a purchase order workflow.
- Cross-reference with `stock-velocity-report` for velocity validation.
- Use with `dead-stock-identifier` to avoid reordering items that aren't selling.
- For seasonal products, use a longer `days_back` (180-365) to capture seasonal patterns.
