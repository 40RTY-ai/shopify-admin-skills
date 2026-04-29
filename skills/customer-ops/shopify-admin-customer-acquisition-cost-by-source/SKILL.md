---
name: shopify-admin-customer-acquisition-cost-by-source
role: customer-ops
description: "Read-only: estimates customer acquisition cost (CAC) per traffic source by joining order count per landing site / referrer with configurable ad spend."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Estimates customer acquisition cost (CAC) for each traffic source by combining the number of new-customer orders attributed to a landing page / referrer with a configurable ad spend input per source. Output answers: "for every dollar spent on source X, how many new customers did we acquire and at what unit cost?" Read-only — no mutations. Provides the data foundation for paid-media budget reallocation.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,read_customers`
- API scopes: `read_orders`, `read_customers`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 30 | Lookback window for orders to attribute |
| ad_spend | object | no | {} | Map of source name → spend in store currency, e.g. `{"google": 4500, "meta": 3200, "tiktok": 1800}` |
| new_customers_only | bool | no | true | Count only first-order customers as "acquired" |
| min_orders_per_source | integer | no | 5 | Minimum orders for a source to be reported |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time. Ad spend values are caller-provided; this skill does not pull from any ad platform.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, select `customer { id, numberOfOrders }`, `customerJourneySummary { firstVisit { landingPage referrerUrl source } }`, `landingPageUrl`, `referrerUrl`, `totalPriceSet`, pagination cursor
   **Expected output:** All orders in the window with referral and customer attribution; paginate until `hasNextPage: false`

2. Group orders by normalized source. Resolution order:
   - `customerJourneySummary.firstVisit.source` if present
   - Else parse domain from `referrerUrl`
   - Else parse `landingPageUrl` UTM params (utm_source)
   - Else bucket as `direct`

3. If `new_customers_only: true`, drop orders where `customer.numberOfOrders > 1` so each customer is counted once

4. Aggregate per source: `orders_count`, `new_customers_count`, `revenue_attributed`

5. Join with `ad_spend` map: `cac = ad_spend[source] / new_customers_count`. Sources without spend data report `cac: null` (organic / unattributed)

6. Filter to sources with `orders_count >= min_orders_per_source`

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query OrdersWithAttribution($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        landingPageUrl
        referrerUrl
        customerJourneySummary {
          firstVisit {
            landingPage
            referrerUrl
            source
            sourceType
            utmParameters {
              source
              medium
              campaign
            }
          }
        }
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        customer {
          id
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
║  SKILL: Customer Acquisition Cost by Source  ║
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
CAC BY SOURCE  (<days_back> days)
  Orders analyzed:        <n>
  New customers acquired: <n>
  Total ad spend (input): $<amount>
  Blended CAC:            $<amount>

  By Source (sorted by CAC ascending):
    google      Customers: <n>  Spend: $<n>   CAC: $<n>
    meta        Customers: <n>  Spend: $<n>   CAC: $<n>
    direct      Customers: <n>  Spend: —      CAC: organic
    referral    Customers: <n>  Spend: —      CAC: organic

  Output: cac_by_source_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "customer-acquisition-cost-by-source",
  "store": "<domain>",
  "period_days": 30,
  "orders_analyzed": 0,
  "new_customers": 0,
  "blended_cac": 0,
  "currency": "USD",
  "by_source": [],
  "output_file": "cac_by_source_<date>.csv"
}
```

## Output Format
CSV file `cac_by_source_<YYYY-MM-DD>.csv` with columns:
`source`, `orders_count`, `new_customers_count`, `revenue_attributed`, `ad_spend`, `cac`, `currency`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Empty `ad_spend` | No spend provided | Report orders / customers per source with `cac: null` |
| Missing `customerJourneySummary` | Older orders or guest checkout | Fall back to `referrerUrl` → `landingPageUrl` → `direct` |
| All orders from `direct` | No referrer captured | Likely tracking misconfiguration — surface as warning |

## Best Practices
- Provide ad spend for the **same window** as `days_back` — mismatched windows produce misleading CAC numbers.
- Pair with `customer-cohort-analysis` to validate that low-CAC sources also produce high-LTV customers.
- Sources reported as `direct` often hide attribution leakage — investigate UTM tagging and referrer policies before drawing conclusions.
- Treat output as **estimated CAC** — Shopify's first-touch attribution does not capture cross-device journeys, so sources that rely on view-through (display, video) will be undercounted.
- Re-run weekly to catch CAC drift before campaigns become unprofitable.
