---
name: shopify-admin-return-fraud-detector
role: returns
description: "Read-only: identifies customers with abnormal return behavior — high return rate, wardrobing patterns, or serial returner profiles — for manual review."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
  - returns:query
  - customers:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Surfaces customers whose return behavior deviates statistically from the store baseline so support and operations can review them before approving the next return. Three abuse patterns are detected: (1) high return rate (≥40% of orders returned), (2) wardrobing — full-order returns within a short window after delivery, and (3) serial returners — many returns relative to peers, including across separated orders. Read-only — no mutations. Output is a candidate list, not an automatic block list.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,read_returns,read_customers`
- API scopes: `read_orders`, `read_returns`, `read_customers`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |
| days_back | integer | no | 365 | Lookback window for orders and returns |
| min_orders | integer | no | 3 | Minimum lifetime orders for a customer to be evaluated (avoid penalizing one-off accidents) |
| return_rate_threshold | float | no | 0.40 | Fraction of orders returned to flag as high (default 40%) |
| wardrobing_window_days | integer | no | 14 | Window between delivery and return-initiated to flag as wardrobing |
| serial_threshold | integer | no | 5 | Minimum total returns to flag as serial returner |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time. Output flags candidates for human review only — never block or restrict customers automatically based on this report. False positives are common (genuine size issues, address-correction returns, etc.); investigate before action.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, select `id`, `customer { id }`, `displayFulfillmentStatus`, `processedAt`, `fulfillments { deliveredAt, deliveryStatus }`, `totalPriceSet`, `lineItems(first: 50) { quantity }`, pagination cursor
   **Expected output:** All orders in window grouped by `customer.id`; paginate until done

2. **OPERATION:** `returns` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, select `id`, `status`, `createdAt`, `order { id customer { id } }`, `returnLineItems(first: 50) { node { quantity } }`, `totalQuantity`, pagination cursor
   **Expected output:** All returns in window joined to their order and customer

3. **OPERATION:** `customers` — query
   **Inputs:** For flagged candidate IDs from step 4, batch via `query: "id:<ids>"`, select `displayName`, `defaultEmailAddress { emailAddress }`, `numberOfOrders`, `amountSpent`, `tags`
   **Expected output:** Identifiable contact data for the candidates list

4. Compute per-customer metrics over the window:
   - `total_orders` = count of orders with `customer.id`
   - `total_returns` = count of distinct returns linked to that customer
   - `return_rate` = `total_returns` / `total_orders`
   - `wardrobing_count` = number of returns initiated within `wardrobing_window_days` of delivery where `Σ returnLineItems.quantity ≥ Σ lineItems.quantity` (full-order return)
   - Flag rules:
     - `high_return_rate` if `total_orders >= min_orders` AND `return_rate >= return_rate_threshold`
     - `wardrobing` if `wardrobing_count >= 2`
     - `serial_returner` if `total_returns >= serial_threshold`

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query OrdersForReturnFraud($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        processedAt
        displayFulfillmentStatus
        totalPriceSet {
          shopMoney { amount currencyCode }
        }
        customer {
          id
        }
        lineItems(first: 50) {
          edges {
            node {
              id
              quantity
            }
          }
        }
        fulfillments {
          deliveredAt
          status
          displayStatus
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
# returns:query — validated against api_version 2025-01
query ReturnsForFraud($query: String!, $after: String) {
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
          customer {
            id
          }
        }
        returnLineItems(first: 50) {
          edges {
            node {
              id
              quantity
              returnReason
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
# customers:query — validated against api_version 2025-01
query CustomerContactBatch($query: String!) {
  customers(first: 250, query: $query) {
    edges {
      node {
        id
        displayName
        firstName
        lastName
        defaultEmailAddress {
          emailAddress
        }
        phone
        numberOfOrders
        amountSpent {
          amount
          currencyCode
        }
        tags
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
║  SKILL: Return Fraud Detector                ║
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
RETURN FRAUD CANDIDATES  (<days_back> days)
  Customers evaluated:      <n>
  Flagged candidates:       <n>

  By rule:
    High return rate (≥<pct>%):  <n>
    Wardrobing pattern:           <n>
    Serial returner (≥<n>):       <n>

  Top suspects (by composite risk):
    <name>  <email>  Orders: <n>  Returns: <n>  Rate: <pct>%  Flags: <list>
  Output: return_fraud_candidates_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "return-fraud-detector",
  "store": "<domain>",
  "period_days": 365,
  "customers_evaluated": 0,
  "flagged_candidates": 0,
  "by_rule": {
    "high_return_rate": 0,
    "wardrobing": 0,
    "serial_returner": 0
  },
  "output_file": "return_fraud_candidates_<date>.csv"
}
```

## Output Format
CSV file `return_fraud_candidates_<YYYY-MM-DD>.csv` with columns:
`customer_id`, `name`, `email`, `phone`, `total_orders`, `total_returns`, `return_rate_pct`, `wardrobing_count`, `flags`, `lifetime_spend`, `last_return_date`, `tags`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Customer is null on order | Guest checkout | Skip for fraud analysis (cannot link multiple orders to a guest reliably) |
| Return missing `order.customer` | Order was anonymized or deleted | Skip return |
| `deliveredAt` missing | Order has not delivered yet | Cannot evaluate wardrobing — skip that flag for the order |

## Best Practices
- Treat output as a review queue, never an automatic action — manually validate before tagging or restricting any account.
- Tune `return_rate_threshold` to your category baseline. Apparel stores typically run 20–30% return rates; flagging at 40% picks out outliers. For electronics or homewares, lower the threshold to 15–20%.
- Cross-reference with `return-reason-analysis` — if a customer's returns are concentrated on one product, the issue may be product quality, not customer abuse.
- Pair with `customer-merge` candidates from `duplicate-customer-finder` — fraudsters often create duplicate accounts to dodge return-rate flags.
- Run quarterly with a 12-month window for stable signal; running monthly produces noisy flags from new customers with one return.
