---
name: shopify-admin-partial-refund-pattern-detector
role: order-intelligence
description: "Read-only: surfaces orders with multiple partial refunds or unusually high partial-refund-to-total ratios that may indicate fraud, chronic complaints, or process gaps."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Scans recent orders, extracts every refund, and flags orders that have either (a) two or more partial refunds, or (b) a partial-refund-to-order-total ratio above a configurable threshold. These patterns frequently indicate friendly fraud (incremental claims), an unhappy repeat customer pattern, or a staff workflow gap (refunding piecemeal instead of issuing one full credit). Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders`
- API scopes: `read_orders`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 90 | Lookback window for orders to analyze |
| min_partials | integer | no | 2 | Minimum number of partial refunds to flag an order |
| ratio_threshold | float | no | 0.5 | Flag orders where total refunded / order total exceeds this ratio (still partial, i.e. below 1.0) |
| min_order_value | float | no | 25 | Skip low-value orders below this amount |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time. Flagged orders are advisory — confirm with refund notes and customer history before taking action against a customer account.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>' financial_status:partially_refunded"`, `first: 250`, select `refunds { id, createdAt, totalRefundedSet, note }`, `totalPriceSet`, `customer`, pagination cursor
   **Expected output:** All partially refunded orders with full refund history; paginate until `hasNextPage: false`

2. For each order, count refunds and sum `totalRefundedSet.shopMoney.amount`. Compute `ratio = total_refunded / order_total`.

3. Flag orders meeting either condition: `refund_count >= min_partials` OR `ratio >= ratio_threshold` (and `ratio < 1.0` so fully refunded orders are excluded).

4. Group flagged orders by `customer.id` to surface repeat-offender customers (more than one flagged order in the window).

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query PartialRefundPatterns($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        displayFinancialStatus
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        totalRefundedSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        refunds {
          id
          createdAt
          note
          totalRefundedSet {
            shopMoney {
              amount
              currencyCode
            }
          }
          refundLineItems(first: 50) {
            edges {
              node {
                quantity
                lineItem {
                  id
                  title
                  sku
                }
              }
            }
          }
        }
        customer {
          id
          displayName
          defaultEmailAddress {
            emailAddress
          }
          numberOfOrders
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
║  SKILL: Partial Refund Pattern Detector      ║
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
PARTIAL REFUND PATTERN REPORT  (<days_back> days)
  Partially refunded orders:   <n>
  Flagged (multi-refund):      <n>
  Flagged (high ratio):        <n>
  Repeat-flagged customers:    <n>

  Top flagged customers by amount:
    <customer>  Orders: <n>  Refunded: $<n>  Ratio: <pct>%
  Output: partial_refund_patterns_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "partial-refund-pattern-detector",
  "store": "<domain>",
  "period_days": 90,
  "partially_refunded_orders": 0,
  "flagged_multi_refund": 0,
  "flagged_high_ratio": 0,
  "repeat_flagged_customers": 0,
  "output_file": "partial_refund_patterns_<date>.csv"
}
```

## Output Format
CSV file `partial_refund_patterns_<YYYY-MM-DD>.csv` with columns:
`order_name`, `order_id`, `customer_email`, `customer_lifetime_orders`, `order_total`, `total_refunded`, `refund_ratio`, `refund_count`, `flag_reason`, `first_refund_at`, `last_refund_at`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Order has refund but `totalRefundedSet` is zero | Refund recorded as $0 (note only, no money moved) | Skip from ratio calc, count refund |
| Customer is null (guest order) | No customer attached | Group by email instead of customer ID |
| No partially refunded orders | Clean window | Exit with summary: 0 flagged |

## Best Practices
- Combine `min_partials: 2` and `ratio_threshold: 0.5` for the most useful signal — single small partial refunds are usually legitimate.
- Sort by `refund_ratio` descending: high ratios on high-value orders are the strongest fraud signal.
- A repeat-flagged customer with `numberOfOrders > 5` is often a chronic complainer, not a fraudster — review the refund notes before action.
- Use this skill quarterly alongside `order-risk-report` to detect post-purchase fraud that fraud filters miss at checkout.
- Refund `note` content frequently reveals the pattern (e.g., "item missing" repeated three times) — read the notes before flagging a customer.
