---
name: shopify-admin-discount-cost-trend
role: finance
description: "Read-only: tracks total discount dollars given over configurable time buckets (week/month/quarter), broken down by discount type and code."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Tracks how much money the store gave away in discounts over time, bucketed by week, month, or quarter, and broken down by discount code and discount type (percentage / fixed amount / free shipping / automatic). Answers: "is our discount spend trending up or down, and which campaigns are driving it?" Read-only — no mutations. Complements `discount-roi-calculator` (per-discount return) with a longitudinal view of total cost.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders`
- API scopes: `read_orders`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| period | string | no | month | Bucket size: `week`, `month`, or `quarter` |
| periods_back | integer | no | 12 | Number of buckets to report |
| top_codes | integer | no | 10 | Top discount codes to break out individually; remainder grouped as `other` |
| include_shipping_discounts | bool | no | true | Whether to count shipping discounts in the totals |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. Compute window from `period` × `periods_back` (e.g., `month` × 12 → last 12 calendar months starting from the first day of the bucket 11 months ago)

2. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<window_start>' financial_status:paid"`, `first: 250`, select `createdAt`, `discountCodes`, `currentTotalDiscountsSet`, `totalDiscountsSet`, `cartDiscountAmountSet`, `discountApplications { allocationMethod, targetType, value, ... on DiscountCodeApplication { code }, ... on AutomaticDiscountApplication { title }, ... on ManualDiscountApplication { title } }`, `shippingLines { discountAllocations { allocatedAmountSet } }`, pagination cursor
   **Expected output:** All paid orders in the window with discount data; paginate until `hasNextPage: false`

3. For each order, attribute discount cost:
   - `cart_discount` = `currentTotalDiscountsSet.shopMoney.amount`
   - `shipping_discount` = sum of `shippingLines.discountAllocations.allocatedAmountSet` (only if `include_shipping_discounts: true`)
   - `total_discount` = cart_discount + shipping_discount
   - Attribute by code: prefer first `discountApplications.code` for code discounts, `title` for automatic / manual

4. Bucket each order into its period (week-of-year, year-month, or year-quarter) and aggregate:
   - Total discount cost per bucket
   - Per discount code per bucket
   - Per discount type per bucket (percentage, fixed_amount, shipping, automatic)

5. Identify top codes by total cost across the window; aggregate the rest as `other`

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query DiscountCostTrend($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        discountCodes
        currentTotalDiscountsSet { shopMoney { amount currencyCode } }
        totalDiscountsSet { shopMoney { amount currencyCode } }
        cartDiscountAmountSet { shopMoney { amount currencyCode } }
        discountApplications(first: 10) {
          edges {
            node {
              allocationMethod
              targetType
              targetSelection
              value {
                ... on PricingPercentageValue { percentage }
                ... on MoneyV2 { amount currencyCode }
              }
              ... on DiscountCodeApplication { code }
              ... on AutomaticDiscountApplication { title }
              ... on ManualDiscountApplication { title description }
            }
          }
        }
        shippingLines(first: 5) {
          edges {
            node {
              title
              discountAllocations {
                allocatedAmountSet { shopMoney { amount currencyCode } }
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

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Discount Cost Trend                  ║
║  Store: <store domain>                       ║
║  Period: <period> × <periods_back>           ║
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
DISCOUNT COST TREND  (last <periods_back> <period>s)
  Total discount cost:    $<amount>
  Avg per <period>:        $<amount>
  Latest <period>:         $<amount>   (<delta_vs_prev_pct>% vs prior)

  By bucket:
    2025-Q1  $<n>   (cart $<n> / shipping $<n>)
    2025-Q2  $<n>   (cart $<n> / shipping $<n>)

  By discount type:
    code            $<n>   (<pct>%)
    automatic       $<n>   (<pct>%)
    manual          $<n>   (<pct>%)
    shipping        $<n>   (<pct>%)

  Top codes (by total cost):
    "<code>"        $<n>   (<pct>%)
    "<code>"        $<n>   (<pct>%)
    other           $<n>   (<pct>%)

  Output: discount_cost_trend_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "discount-cost-trend",
  "store": "<domain>",
  "period": "month",
  "periods_back": 12,
  "total_discount_cost": 0,
  "by_bucket": [],
  "by_type": { "code": 0, "automatic": 0, "manual": 0, "shipping": 0 },
  "top_codes": [],
  "currency": "USD",
  "output_file": "discount_cost_trend_<date>.csv"
}
```

## Output Format
CSV file `discount_cost_trend_<YYYY-MM-DD>.csv` with columns:
`bucket`, `discount_code_or_title`, `discount_type`, `orders_count`, `cart_discount`, `shipping_discount`, `total_discount`, `currency`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Stacked discount codes | Multiple codes on one order | Attribute proportionally to each code by their `value` share, or label as `multi-code` if equal |
| Manual discount with no title | Cashier-entered with empty title | Group as `manual:untitled` |
| Multi-currency orders | Presentment currency != shop currency | Sum on `shopMoney.amount` (shop currency) for consistency |

## Best Practices
- Use `period: week` for promotional businesses with frequent campaigns; `period: month` for stores with steady evergreen offers; `period: quarter` for board reporting.
- A flat or rising trend with no campaign activity often points to **automatic discount creep** — review automatic discounts that have no end date.
- Cross-reference the latest bucket against `discount-roi-calculator` to verify the cost increase is producing matching incremental revenue.
- Set `include_shipping_discounts: false` if your accounting books shipping subsidy separately from product discounts.
- Set up monthly automation: discount spend that drifts above budget should trigger a finance review before it shows up in margin reports.
