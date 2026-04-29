---
name: shopify-admin-inventory-aging-report
role: merchandising
description: "Read-only: categorizes inventory into aging buckets (0-30, 31-60, 61-90, 90+ days) based on time since last sale or receipt."
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
Categorizes all inventory into aging buckets based on how long items have been sitting without selling. Calculates carrying cost exposure by bucket to prioritize markdown or liquidation decisions. Goes deeper than dead-stock identification by providing aging granularity. Inspired by warehouse management features in apps like Prediko and Inventory Planner. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,read_products,read_inventory`
- API scopes: `read_orders`, `read_products`, `read_inventory`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain |
| buckets | string | no | 0-30,31-60,61-90,91-180,181+ | Comma-separated aging buckets in days |
| carrying_cost_pct | float | no | 25 | Annual carrying cost as % of inventory value (industry avg 20-30%) |
| vendor_filter | string | no | — | Scope to specific vendor |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `productVariants` — query
   **Inputs:** `first: 250`, select `id`, `sku`, `inventoryQuantity`, `inventoryItem { id, unitCost }`, `product { title, vendor, status }`, pagination cursor
   **Expected output:** All variants with stock and cost data

2. Filter to variants with `inventoryQuantity > 0`

3. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - 365 days>'"`, `first: 250`, select `createdAt`, `lineItems { variant { id }, quantity }`, pagination cursor
   **Expected output:** Sales history to determine last-sold date per variant

4. For each stocked variant, determine aging:
   - Find most recent order containing this variant → last_sold_date
   - If never sold, use product creation date as proxy
   - **Age** = today - last_sold_date
   - Assign to aging bucket

5. **OPERATION:** `inventoryItems` — query
   **Inputs:** Inventory item IDs for cost data
   **Expected output:** Unit costs for value calculation

6. Calculate per bucket:
   - Total units
   - Total value (units × unitCost)
   - Monthly carrying cost = (value × carrying_cost_pct / 100) / 12
   - % of total inventory value

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
        product { id title vendor status createdAt }
        inventoryItem {
          id
          unitCost { amount currencyCode }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

```graphql
# orders:query — validated against api_version 2025-01
query RecentSales($query: String!, $after: String) {
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
# inventoryItems:query — validated against api_version 2025-01
query InventoryItemCosts($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on InventoryItem {
      id
      unitCost { amount currencyCode }
    }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Inventory Aging Report               ║
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
INVENTORY AGING REPORT
  Total SKUs with stock:  <n>
  Total inventory value:  $<amount>
  ─────────────────────────────
  AGING BUCKETS:
  0-30 days:    <n> SKUs  $<value> (<pct>%)  ✅ Fresh
  31-60 days:   <n> SKUs  $<value> (<pct>%)  ⚠️ Watch
  61-90 days:   <n> SKUs  $<value> (<pct>%)  ⚠️ Aging
  91-180 days:  <n> SKUs  $<value> (<pct>%)  🔴 Stale
  181+ days:    <n> SKUs  $<value> (<pct>%)  🔴 Dead

  Monthly carrying cost: $<amount>
  Annual carrying cost:  $<amount>

  Top aging items by value:
    "<product>" SKU:<sku>  Age:<n>d  Qty:<n>  Value:$<n>

  Output: inventory_aging_<date>.csv
══════════════════════════════════════════════
```

## Output Format
CSV file `inventory_aging_<YYYY-MM-DD>.csv` with columns:
`variant_id`, `sku`, `product_title`, `vendor`, `quantity`, `unit_cost`, `total_value`, `last_sold_date`, `age_days`, `aging_bucket`, `monthly_carrying_cost`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Missing unitCost | No COGS data | Use $0 for value — flag as "cost unknown" |
| No sales history | New product or never sold | Use product creation date as aging start |

## Best Practices
- Use `carrying_cost_pct: 25` as default (includes storage, insurance, opportunity cost, shrinkage).
- Items in 90+ day buckets are strong candidates for markdowns — use `bulk-price-adjustment`.
- Cross-reference with `dead-stock-identifier` and `stock-velocity-report` for a complete inventory health picture.
- Run monthly to track aging trends and measure liquidation effectiveness.
