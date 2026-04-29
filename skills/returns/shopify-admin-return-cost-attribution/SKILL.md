---
name: shopify-admin-return-cost-attribution
role: returns
description: "Read-only: calculates the true cost of returns by reason and product — refund dollars, restocking impact, shipping cost lost, and COGS impact for items written off."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - returns:query
  - orders:query
  - inventoryItems:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Quantifies the full cost of returns over a window — not just the refunded amount. Combines refund totals, lost shipping revenue, COGS for non-restockable items (e.g., `DEFECTIVE` returns), and restocking workload to produce a per-reason and per-product return P&L. Read-only — no mutations. Use to prioritize which return reasons or product lines deserve operational fixes (e.g., better packaging, better size guides, more accurate listings).

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,read_returns,read_inventory`
- API scopes: `read_orders`, `read_returns`, `read_inventory`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |
| days_back | integer | no | 90 | Lookback window for returns |
| group_by | string | no | reason | Aggregation level: `reason`, `product`, `sku`, or `reason_x_product` |
| min_returns | integer | no | 3 | Minimum returns per group to include in summary |
| writeoff_reasons | array | no | `["DEFECTIVE"]` | Return reasons whose items are treated as non-restockable (full COGS write-off) |
| flat_restocking_cost | float | no | 5.00 | Average labor cost per return line item to model restocking workload |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time. Cost figures are estimates derived from `unitCost`, refund totals, and the `flat_restocking_cost` parameter — calibrate the flat-cost figure to your operation before treating outputs as accounting truth.

## Workflow Steps

1. **OPERATION:** `returns` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, select `id`, `status`, `createdAt`, `order { id name totalShippingPriceSet }`, `returnLineItems(first: 50) { node { quantity returnReason fulfillmentLineItem { lineItem { id title variant { id sku inventoryItem { id } } discountedTotalSet originalUnitPriceSet } } } }`, pagination cursor
   **Expected output:** All returns in window joined to their order shipping cost and per-line-item pricing

2. **OPERATION:** `orders` — query
   **Inputs:** For each return's `order.id`, fetch `refunds { totalRefundedSet, refundLineItems { lineItem { id }, quantity, subtotalSet, totalTaxSet } }` to attribute the refunded amount to specific line items
   **Expected output:** Refund-side data per return order; sum refunded $ per `lineItem.id`

3. **OPERATION:** `inventoryItems` — query
   **Inputs:** Batch unique `inventoryItem.id` values gathered in step 1, `nodes(ids: $ids)`
   **Expected output:** `unitCost` per inventory item for COGS impact calculation

4. For each return line item, compute:
   - `refund_amount` = matched refundLineItem.subtotalSet for this lineItem × proportion of returned quantity
   - `shipping_loss` = order.totalShippingPriceSet allocated by line-item value share for full-order returns; 0 for partial returns
   - `cogs_writeoff` = `unitCost × quantity` if `returnReason in writeoff_reasons`; 0 otherwise (assumed restockable)
   - `restocking_labor` = `flat_restocking_cost × quantity`
   - `total_return_cost` = `refund_amount + shipping_loss + cogs_writeoff + restocking_labor`
   Then aggregate by the chosen `group_by` dimension.

## GraphQL Operations

```graphql
# returns:query — validated against api_version 2025-01
query ReturnsForCostAttribution($query: String!, $after: String) {
  returns(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        status
        createdAt
        totalQuantity
        order {
          id
          name
          totalShippingPriceSet {
            shopMoney { amount currencyCode }
          }
          totalPriceSet {
            shopMoney { amount currencyCode }
          }
        }
        returnLineItems(first: 50) {
          edges {
            node {
              id
              quantity
              returnReason
              returnReasonNote
              fulfillmentLineItem {
                lineItem {
                  id
                  title
                  quantity
                  discountedTotalSet {
                    shopMoney { amount currencyCode }
                  }
                  originalUnitPriceSet {
                    shopMoney { amount currencyCode }
                  }
                  variant {
                    id
                    sku
                    inventoryItem {
                      id
                    }
                  }
                  product {
                    id
                    title
                    vendor
                  }
                }
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
# orders:query — validated against api_version 2025-01
query OrderRefundsForReturns($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        refunds {
          id
          createdAt
          totalRefundedSet {
            shopMoney { amount currencyCode }
          }
          refundLineItems(first: 50) {
            edges {
              node {
                quantity
                subtotalSet {
                  shopMoney { amount currencyCode }
                }
                totalTaxSet {
                  shopMoney { amount currencyCode }
                }
                lineItem {
                  id
                }
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
query InventoryUnitCosts($ids: [ID!]!) {
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
║  SKILL: Return Cost Attribution              ║
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
RETURN COST ATTRIBUTION  (<days_back> days, group: <group_by>)
  Returns analyzed:    <n>
  Total return cost:   $<amount>
    Refund $:          $<amount>  (<pct>%)
    Shipping loss:     $<amount>  (<pct>%)
    COGS write-off:    $<amount>  (<pct>%)
    Restocking labor:  $<amount>  (<pct>%)

  Top cost drivers:
    <group>   Returns: <n>  Total cost: $<n>  Avg/return: $<n>  Top reason: <reason>
  Output: return_cost_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "return-cost-attribution",
  "store": "<domain>",
  "period_days": 90,
  "group_by": "reason",
  "returns_analyzed": 0,
  "totals": {
    "total_cost": 0,
    "refund": 0,
    "shipping_loss": 0,
    "cogs_writeoff": 0,
    "restocking_labor": 0,
    "currency": "USD"
  },
  "groups": [],
  "output_file": "return_cost_<date>.csv"
}
```

## Output Format
CSV file `return_cost_<YYYY-MM-DD>.csv` with columns:
`group_key`, `return_count`, `units`, `refund_amount`, `shipping_loss`, `cogs_writeoff`, `restocking_labor`, `total_cost`, `avg_cost_per_return`, `top_return_reason`, `currency`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Missing `unitCost` on inventory item | Cost not recorded | Treat COGS as 0 and flag the row in output |
| Refund not yet processed for return | Customer hasn't been refunded | Use line item discounted total as the refund estimate |
| Return spans multiple refunds | Partial refund history | Sum refunds tied to the line items in the return |
| Order has no shipping cost | Free shipping | Shipping loss = 0 |

## Best Practices
- Use `group_by: reason_x_product` to find lethal combos like `DEFECTIVE × <vendor X's hero SKU>` — they reveal supplier quality issues that can be addressed at the source.
- Re-run after `unitCost` is updated for any product line — accurate cost is the input most likely to be stale.
- Pair with `return-reason-analysis` (which reports volume) to compare "what returns most" with "what costs most"; they often diverge.
- Calibrate `flat_restocking_cost` annually based on warehouse staff hourly cost × average minutes-per-return.
- For DEFECTIVE returns showing high COGS write-off, escalate to vendor for credit; the cost-per-return metric makes the business case.
