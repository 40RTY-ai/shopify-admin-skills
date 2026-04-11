---
name: shipping-cost-analysis
role: finance
description: "Read-only: aggregates shipping revenue charged to customers vs. actual shipping line costs by carrier and method."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Compares the shipping amount charged to customers against the actual shipping cost recorded on orders, broken down by carrier and shipping method. Identifies where shipping is being subsidized (charged less than cost) or over-charged. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders`
- API scopes: `read_orders`
- Actual shipping costs are only available if recorded via the Shopify Admin API or carrier-calculated shipping; manually entered orders may lack cost data.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 30 | Lookback window |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "financial_status:paid created_at:>='<NOW - days_back days>'"`, `first: 250`, select `shippingLines { title, discountedPriceSet, originalPriceSet, carrierIdentifier }`, pagination cursor
   **Expected output:** Orders with shipping line details; paginate until `hasNextPage: false`

2. For each shipping line: record carrier (from `title` or `carrierIdentifier`), charged amount (`discountedPriceSet`), and actual cost if available

3. Group by carrier/method; calculate total charged, total cost, net subsidy/overage

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query ShippingCostAnalysis($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        totalShippingPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        shippingLines(first: 5) {
          edges {
            node {
              id
              title
              carrierIdentifier
              originalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              discountedPriceSet {
                shopMoney {
                  amount
                  currencyCode
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

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Shipping Cost Analysis               ║
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
SHIPPING COST ANALYSIS  (<days_back> days)
  Orders analyzed:     <n>
  Total charged to customers: $<amount>
  Free shipping orders:       <n>

  By Carrier/Method:
    "Standard Shipping"  Orders: <n>  Charged: $<n>  Avg: $<n>
    "Express"            Orders: <n>  Charged: $<n>  Avg: $<n>
  Output: shipping_cost_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "shipping-cost-analysis",
  "store": "<domain>",
  "period_days": 30,
  "orders_analyzed": 0,
  "total_shipping_charged": 0,
  "free_shipping_order_count": 0,
  "currency": "USD",
  "by_method": [],
  "output_file": "shipping_cost_<date>.csv"
}
```

## Output Format
CSV file `shipping_cost_<YYYY-MM-DD>.csv` with columns:
`order_name`, `shipping_method`, `carrier`, `charged_amount`, `original_price`, `discount_applied`, `currency`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| No shipping lines | Digital products or free shipping store | Report $0 shipping revenue |
| Carrier identifier missing | Custom or manual shipping methods | Use `title` as carrier name |

## Best Practices
- Free shipping orders show $0 charged but the actual carrier cost is your subsidy — knowing this per carrier helps evaluate free shipping threshold decisions.
- `originalPriceSet` vs `discountedPriceSet` difference represents shipping discounts applied to customers — useful for understanding total shipping subsidy cost.
- Pair with `average-order-value-trends` to evaluate whether free shipping thresholds are driving the intended AOV lift.
- For actual carrier cost reconciliation, cross-reference with carrier invoices — Shopify's API only stores what was charged to customers, not what was paid to carriers unless your carrier integration writes those costs back.
