---
name: shopify-admin-order-attribution-report
role: order-intelligence
description: "Read-only: parses UTM source/medium/campaign from order landing site URLs to attribute revenue, AOV, and conversion volume to marketing channels."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Pulls recent orders, extracts the UTM parameters embedded in each order's `landingPageUrl` query string, and rolls up revenue, order count, and average order value (AOV) by `utm_source`, `utm_medium`, and `utm_campaign`. Builds a marketing attribution report directly from first-party Shopify order data — no external analytics tool required. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders`
- API scopes: `read_orders`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 30 | Lookback window for orders to attribute |
| group_by | string | no | source | Primary grouping dimension: `source`, `medium`, `campaign`, or `source_medium` |
| min_orders | integer | no | 1 | Minimum orders per group to include in the report |
| include_organic | bool | no | true | When false, omit orders with no UTM parameters from the breakdown |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time. Attribution accuracy depends on whether the storefront propagates UTM parameters into the checkout — orders that bypass the storefront (POS, draft orders, subscriptions) will not have landing site URLs.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>' financial_status:paid"`, `first: 250`, select `landingPageUrl`, `referrerUrl`, `customerJourneySummary`, `totalPriceSet`, pagination cursor
   **Expected output:** All paid orders in the window with landing page URLs; paginate until `hasNextPage: false`

2. For each order, parse `landingPageUrl` query string and extract `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`. Orders without UTM params are bucketed as `(direct/organic)` if `include_organic: true`.

3. Aggregate by the `group_by` dimension: sum order count, sum revenue (in shop currency), compute AOV = revenue / orders.

4. Sort groups by revenue descending; filter out groups below `min_orders`.

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
        displayFinancialStatus
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        customerJourneySummary {
          firstVisit {
            landingPage
            source
            sourceType
            referrerUrl
            utmParameters {
              source
              medium
              campaign
              term
              content
            }
          }
          lastVisit {
            landingPage
            source
            sourceType
            utmParameters {
              source
              medium
              campaign
            }
          }
          momentsCount
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
║  SKILL: Order Attribution Report             ║
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
ORDER ATTRIBUTION REPORT  (<days_back> days)
  Orders attributed:   <n>
  Total revenue:       $<amount>
  Untagged (direct):   <n>  (<pct>%)

  Top sources by revenue:
    <source>     Orders: <n>   Revenue: $<n>   AOV: $<n>
    <source>     Orders: <n>   Revenue: $<n>   AOV: $<n>
  Output: attribution_report_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "order-attribution-report",
  "store": "<domain>",
  "period_days": 30,
  "group_by": "source",
  "orders_attributed": 0,
  "total_revenue": 0,
  "currency": "USD",
  "groups": [
    { "key": "google", "orders": 0, "revenue": 0, "aov": 0 }
  ],
  "output_file": "attribution_report_<date>.csv"
}
```

## Output Format
CSV file `attribution_report_<YYYY-MM-DD>.csv` with columns:
`group_key`, `utm_source`, `utm_medium`, `utm_campaign`, `orders`, `revenue`, `aov`, `currency`, `pct_of_revenue`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `landingPageUrl` is null | Order placed via POS, draft, or subscription | Bucket as `(direct/organic)`, count separately |
| Malformed query string | Manual or partial UTM tagging | Skip parse failure, treat as direct, log count |
| `customerJourneySummary` access denied | Store on plan that does not expose this field | Fall back to `landingPageUrl` parsing only |

## Best Practices
- Use `group_by: source_medium` to distinguish paid traffic (`google/cpc`) from organic (`google/organic`).
- A high `(direct/organic)` percentage usually means UTM tagging is missing on paid campaigns — fix the campaign URLs, not the report.
- Run weekly during active campaigns to track attribution drift; run monthly for steady-state reporting.
- Cross-reference revenue here with ad spend from your ad platforms to compute true ROAS — this skill provides the order-side numerator only.
- For multi-touch attribution, also surface `customerJourneySummary.firstVisit` vs `lastVisit` to compare first-click vs last-click models.
