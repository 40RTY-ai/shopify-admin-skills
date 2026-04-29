---
name: shopify-admin-post-purchase-survey-trigger
role: conversion-optimization
description: "Read-only: identifies orders 7–14 days post-fulfillment that are eligible for a post-purchase survey campaign, excluding refunded or cancelled orders."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Builds the recipient list for a post-purchase survey campaign by selecting orders that were fulfilled between `survey_min_days` and `survey_max_days` ago, are not refunded, not cancelled, and (optionally) belong to customers who consented to marketing. Output is a clean recipient list ready to load into your email or SMS automation. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,read_customers,read_fulfillments`
- API scopes: `read_orders`, `read_customers`, `read_fulfillments`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| survey_min_days | integer | no | 7 | Earliest days after fulfillment to survey (give time for delivery + initial use) |
| survey_max_days | integer | no | 14 | Latest days after fulfillment to survey (recall fades after ~2 weeks) |
| marketing_consent_only | bool | no | true | Restrict to customers with `marketingState: SUBSCRIBED` |
| exclude_repeat_recipients_days | integer | no | 90 | Skip customers who were already on a survey list within this window (caller-tracked) |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. The skill produces a recipient list; the caller is responsible for actually sending the survey via their own email / SMS platform. Honor `marketing_consent_only: true` for promotional surveys to stay compliant with consent rules.

## Workflow Steps

1. Compute window: `latest_fulfilled_at = NOW - survey_min_days`, `earliest_fulfilled_at = NOW - survey_max_days`

2. **OPERATION:** `orders` — query
   **Inputs:** `query: "fulfillment_status:fulfilled financial_status:paid -status:cancelled updated_at:>=<earliest_fulfilled_at>"`, `first: 250`, select `displayFulfillmentStatus`, `displayFinancialStatus`, `cancelledAt`, `fulfillments { createdAt, displayStatus, deliveredAt }`, `refunds { id, createdAt }`, `customer { id, defaultEmailAddress { emailAddress, marketingState }, displayName, locale }`, pagination cursor
   **Expected output:** All candidate orders; paginate until `hasNextPage: false`

3. Filter orders to the survey window using the **earliest fulfillment** `createdAt`:
   - Skip if `fulfilled_at` is outside `[earliest_fulfilled_at, latest_fulfilled_at]`
   - Skip if `cancelledAt != null`
   - Skip if any refund was issued (full or partial)
   - Skip if customer is null (guest order without email)
   - If `marketing_consent_only: true`, skip if `marketingState != SUBSCRIBED`

4. De-duplicate on customer email — multiple orders from the same customer collapse to a single survey invite

5. Output recipient list

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query SurveyEligibleOrders($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        cancelledAt
        displayFinancialStatus
        displayFulfillmentStatus
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        fulfillments(first: 5) {
          id
          createdAt
          displayStatus
          deliveredAt
        }
        refunds {
          id
          createdAt
        }
        customer {
          id
          displayName
          locale
          defaultEmailAddress {
            emailAddress
            marketingState
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
║  SKILL: Post-Purchase Survey Trigger         ║
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
POST-PURCHASE SURVEY LIST
  Window:                 <survey_min_days>–<survey_max_days> days post-fulfillment
  Orders considered:      <n>
  Refunded (excluded):    <n>
  Cancelled (excluded):   <n>
  No consent (excluded):  <n>
  Guest orders (excluded):<n>
  ─────────────────────────────
  Eligible recipients:    <n>
  Output: post_purchase_survey_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "post-purchase-survey-trigger",
  "store": "<domain>",
  "window_min_days": 7,
  "window_max_days": 14,
  "orders_considered": 0,
  "excluded": { "refunded": 0, "cancelled": 0, "no_consent": 0, "guest": 0 },
  "eligible_recipients": 0,
  "output_file": "post_purchase_survey_<date>.csv"
}
```

## Output Format
CSV file `post_purchase_survey_<YYYY-MM-DD>.csv` with columns:
`customer_id`, `email`, `name`, `locale`, `order_name`, `order_total`, `currency`, `fulfilled_at`, `delivered_at`, `days_since_fulfilled`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Order with multiple fulfillments | Split shipment | Use earliest `createdAt` for window calc; surface in CSV as `multi_fulfillment: true` |
| `deliveredAt` null | Carrier didn't report delivery | Use `fulfillments.createdAt` as proxy (may slightly under- or over-shoot) |
| Customer with no email | Phone-only profile | Skip — survey campaigns assume email channel |

## Best Practices
- Send the survey 7–14 days after fulfillment: 7 days is enough for delivery + first use, 14 days is the sweet spot before recall decays.
- For high-cost or considered-purchase categories (furniture, electronics), extend `survey_max_days` to 30 — customers form opinions later.
- Pair with `customer-cohort-analysis` to compare survey-respondent retention vs. non-respondents — engaged respondents are typically your stickiest cohort.
- Never include customers with refunded or cancelled orders — surveying them invites complaints, not feedback you can act on.
- Run this skill on a daily schedule and feed the CSV directly into your email automation; manual cadence ruins the time-window targeting.
