---
name: shopify-admin-profit-margin-calculator
role: finance
description: "Read-only: calculates true net profit per order and per product by factoring in COGS, shipping costs, transaction fees, discounts, refunds, and taxes."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
  - inventoryItems:query
  - productVariants:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Calculates true net profit and margin at both order-level and product-level granularity. Unlike basic revenue reports, this skill deducts all cost components — COGS (from inventoryItem.unitCost), shipping costs, transaction/payment processing fees, applied discounts, refund amounts, and duties/taxes — to surface actual margin percentages. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,read_products,read_inventory`
- API scopes: `read_orders`, `read_products`, `read_inventory`
- For accurate results, products should have `inventoryItem.unitCost` populated

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 30 | Lookback window for orders |
| group_by | string | no | order | Grouping: `order`, `product`, or `variant` |
| min_orders | integer | no | 1 | Minimum orders for a product to appear (product/variant mode) |
| include_refunded | boolean | no | true | Include fully refunded orders in calculation |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, select `id`, `name`, `createdAt`, `totalPriceSet`, `subtotalPriceSet`, `totalShippingPriceSet`, `totalTaxSet`, `totalDiscountsSet`, `currentTotalPriceSet`, `displayFinancialStatus`, `refunds { totalRefundedSet }`, `lineItems { variant { id, inventoryItem { id, unitCost { amount, currencyCode } } }, quantity, originalTotalSet, discountedTotalSet }`, pagination cursor
   **Expected output:** All orders in window with full cost breakdown

2. **OPERATION:** `inventoryItems` — query
   **Inputs:** Batch of `inventoryItemIds` from line item variants for any missing unitCost data
   **Expected output:** Unit cost for each inventory item

3. For each order, calculate:
   - **Revenue** = `currentTotalPriceSet.shopMoney.amount`
   - **COGS** = Σ(lineItem.quantity × variant.inventoryItem.unitCost)
   - **Shipping Cost** = `totalShippingPriceSet.shopMoney.amount` (merchant-paid portion estimate)
   - **Discounts** = `totalDiscountsSet.shopMoney.amount`
   - **Transaction Fee** = estimated at 2.9% + $0.30 of total (configurable)
   - **Refunds** = Σ(refunds.totalRefundedSet.shopMoney.amount)
   - **Net Profit** = Revenue - COGS - Shipping - Transaction Fee - Refunds
   - **Margin %** = (Net Profit / Revenue) × 100

4. If `group_by: product` or `variant`, aggregate profits by product/variant across all orders

5. **OPERATION:** `productVariants` — query (enrichment)
   **Inputs:** Variant IDs from profitable/unprofitable items for product title context
   **Expected output:** Product titles, SKUs for display

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query OrdersWithCosts($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        displayFinancialStatus
        totalPriceSet { shopMoney { amount currencyCode } }
        subtotalPriceSet { shopMoney { amount currencyCode } }
        totalShippingPriceSet { shopMoney { amount currencyCode } }
        totalTaxSet { shopMoney { amount currencyCode } }
        totalDiscountsSet { shopMoney { amount currencyCode } }
        currentTotalPriceSet { shopMoney { amount currencyCode } }
        refunds {
          totalRefundedSet { shopMoney { amount currencyCode } }
        }
        lineItems(first: 50) {
          edges {
            node {
              quantity
              originalTotalSet { shopMoney { amount currencyCode } }
              discountedTotalSet { shopMoney { amount currencyCode } }
              variant {
                id
                sku
                inventoryItem {
                  id
                  unitCost { amount currencyCode }
                }
                product {
                  id
                  title
                }
              }
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

```graphql
# productVariants:query — validated against api_version 2025-01
query VariantDetails($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on ProductVariant {
      id
      sku
      title
      product { id title vendor }
    }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Profit & Margin Calculator           ║
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
PROFIT & MARGIN REPORT  (<days_back> days)
  Orders analyzed:     <n>
  Total Revenue:       $<amount>
  Total COGS:          $<amount>
  Total Shipping:      $<amount>
  Total Tx Fees:       $<amount>
  Total Refunds:       $<amount>
  ─────────────────────────────
  Net Profit:          $<amount>
  Overall Margin:      <pct>%

  Top profitable products:
    "<product>"  Margin: <pct>%  Profit: $<n>
  Bottom margin products:
    "<product>"  Margin: <pct>%  Profit: $<n>
  Output: profit_report_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "profit-margin-calculator",
  "store": "<domain>",
  "period_days": 30,
  "orders_analyzed": 0,
  "total_revenue": 0,
  "total_cogs": 0,
  "total_shipping": 0,
  "total_tx_fees": 0,
  "total_refunds": 0,
  "net_profit": 0,
  "overall_margin_pct": 0,
  "currency": "USD",
  "output_file": "profit_report_<date>.csv"
}
```

## Output Format
CSV file `profit_report_<YYYY-MM-DD>.csv` with columns:
`order_id`, `order_name`, `date`, `revenue`, `cogs`, `shipping`, `discounts`, `tx_fees`, `refunds`, `net_profit`, `margin_pct`

For product grouping: `product_id`, `product_title`, `vendor`, `units_sold`, `revenue`, `cogs`, `net_profit`, `margin_pct`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Missing unitCost | Product COGS not set | Flag as "unknown COGS" — include in report but exclude from margin calc |
| Refunded orders | Fully refunded | Include with $0 net revenue if `include_refunded: true` |

## Best Practices
- Populate `inventoryItem.unitCost` on all products for accurate COGS. Without it, margins cannot be calculated.
- Adjust transaction fee estimate based on your payment processor (default 2.9% + $0.30 matches Shopify Payments US).
- Use `group_by: product` to identify which products are margin-positive vs. margin-negative.
- Cross-reference with `stock-velocity-report` to find fast-selling but low-margin items that may need repricing.
- Use results with `bulk-price-adjustment` to increase prices on margin-negative products.
