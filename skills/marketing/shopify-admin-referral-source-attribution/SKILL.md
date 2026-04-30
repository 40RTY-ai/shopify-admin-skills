---
name: shopify-admin-referral-source-attribution
role: marketing
description: "Read-only: parses each order's landing site and referrer URL to break down orders, revenue, and AOV by traffic source — direct, organic, paid, social, email, or referral domain."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Aggregates orders by their first-touch traffic source — extracted from each order's `landingPageUrl`, `referrerUrl`, and any UTM parameters embedded in the landing URL. Produces an attribution table showing orders, revenue, and AOV per source so merchants can see which channels are actually converting. Read-only — no mutations. Use when native Shopify analytics dashboards aren't granular enough or when you need to export raw attribution data for an external model.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders`
- API scopes: `read_orders`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |
| days_back | integer | no | 30 | Lookback window in days |
| min_orders | integer | no | 1 | Minimum orders per source to include in the human-readable summary |
| group_by | string | no | category | Grouping level: `category` (direct/organic/paid/social/email/referral), `domain` (raw referrer host), or `utm_source` (UTM param value) |
| include_utm | bool | no | true | When true, parse `utm_source`, `utm_medium`, `utm_campaign` from `landingPageUrl` query string |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, select `id`, `name`, `createdAt`, `landingPageUrl`, `referrerUrl`, `customerJourneySummary { firstVisit { landingPage referrerUrl source sourceType utmParameters { source medium campaign term content } } }`, `totalPriceSet`, `customer { numberOfOrders }`, pagination cursor
   **Expected output:** Orders with their landing/referrer/UTM data; paginate until `hasNextPage: false`

2. For each order, derive a normalized source:
   - If `customerJourneySummary.firstVisit.utmParameters.source` is set → use it (strongest signal)
   - Else parse UTM params from `landingPageUrl` query string when `include_utm: true`
   - Else extract host from `referrerUrl` and map to a category:
     - empty/null → `direct`
     - google.com / bing.com / duckduckgo.com → `organic-search`
     - googleads/doubleclick → `paid-search`
     - facebook.com / instagram.com / tiktok.com / x.com / twitter.com / pinterest.com / youtube.com → `social-<host>`
     - mail/gmail/outlook hosts → `email`
     - any other host → `referral-<host>`

3. Aggregate by the chosen `group_by` dimension:
   - orders count
   - revenue = Σ `totalPriceSet.shopMoney.amount`
   - AOV = revenue / orders
   - new-customer % (orders where `customer.numberOfOrders == 1` divided by total in source)

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query OrdersForAttribution($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        landingPageUrl
        referrerUrl
        totalPriceSet {
          shopMoney { amount currencyCode }
        }
        customer {
          id
          numberOfOrders
        }
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
              term
              content
            }
          }
          momentsCount {
            count
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
║  SKILL: Referral Source Attribution          ║
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
ATTRIBUTION REPORT  (<days_back> days, group: <group_by>)
  Orders analyzed:    <n>
  Total revenue:      $<amount>
  Sources detected:   <n>

  Top sources by revenue
  ─────────────────────────────────────────
  <source>            Orders: <n>  Revenue: $<n>  AOV: $<n>  New cust: <pct>%
  <source>            Orders: <n>  Revenue: $<n>  AOV: $<n>  New cust: <pct>%
  ...

  Output: attribution_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "referral-source-attribution",
  "store": "<domain>",
  "period_days": 30,
  "group_by": "category",
  "totals": {
    "orders": 0,
    "revenue": 0,
    "currency": "USD"
  },
  "sources": [
    {
      "source": "<name>",
      "orders": 0,
      "revenue": 0,
      "aov": 0,
      "new_customer_pct": 0
    }
  ],
  "output_file": "attribution_<date>.csv"
}
```

## Output Format
CSV file `attribution_<YYYY-MM-DD>.csv` with columns:
`order_id`, `order_name`, `created_at`, `source`, `source_category`, `referrer_url`, `landing_page_url`, `utm_source`, `utm_medium`, `utm_campaign`, `revenue`, `is_new_customer`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Null `landingPageUrl` and `referrerUrl` | POS, draft, or import order | Categorize as `unattributed` |
| Malformed UTM params | Unencoded characters in landing URL | Skip UTM parse, fall back to referrer host |
| `customerJourneySummary` not available | Older order or app-created order | Fall back to top-level `landingPageUrl`/`referrerUrl` |

## Best Practices
- Use `group_by: utm_source` when running structured campaigns with consistent UTM tagging — this is the highest-fidelity attribution signal.
- Use `group_by: category` for board-level summaries; merchants want "how much came from social" before "how much came from `instagram.com/p/abc`".
- Cross-reference with `discount-roi-calculator` — combining "which source drives the order" with "which discount the order used" reveals where paid acquisition actually pays off.
- Beware of "direct" inflation — many email-app and social-app clicks lose their referrer and surface as direct. Use UTM tagging on outbound links to recover that signal.
- Run on a multi-month horizon (`days_back: 90`) for low-volume stores so percentage breakdowns aren't dominated by a handful of orders.
