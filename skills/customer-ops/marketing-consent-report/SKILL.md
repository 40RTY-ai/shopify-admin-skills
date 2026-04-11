---
name: marketing-consent-report
role: customer-ops
description: "Read-only: audits email and SMS marketing consent status across the customer base for compliance and segmentation."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - customers:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Scans all customer records and reports the breakdown of email and SMS marketing consent status (subscribed, unsubscribed, pending, never asked). Used for compliance audits, GDPR/CAN-SPAM reviews, and understanding the addressable marketing audience. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_customers`
- API scopes: `read_customers`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| channel | string | no | both | Consent channel to audit: `email`, `sms`, or `both` |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `customers` — query
   **Inputs:** `first: 250`, select `emailMarketingConsent { marketingState, consentUpdatedAt }`, `smsMarketingConsent { marketingState, consentUpdatedAt }`, pagination cursor
   **Expected output:** All customers with consent states; paginate until `hasNextPage: false`

2. Count customers by consent state for each channel

3. Calculate: addressable audience (subscribed), at-risk (pending), unreachable (unsubscribed/not asked)

## GraphQL Operations

```graphql
# customers:query — validated against api_version 2025-01
query MarketingConsentAudit($after: String) {
  customers(first: 250, after: $after) {
    edges {
      node {
        id
        displayName
        defaultEmailAddress {
          emailAddress
        }
        emailMarketingConsent {
          marketingState
          consentUpdatedAt
          marketingOptInLevel
        }
        smsMarketingConsent {
          marketingState
          consentUpdatedAt
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
║  SKILL: Marketing Consent Report             ║
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
MARKETING CONSENT REPORT
  Total customers: <n>

  Email Marketing:
    Subscribed:    <n>  (<pct>%)  ← addressable
    Unsubscribed:  <n>  (<pct>%)
    Pending:       <n>  (<pct>%)
    Not asked:     <n>  (<pct>%)

  SMS Marketing:
    Subscribed:    <n>  (<pct>%)
    Unsubscribed:  <n>  (<pct>%)
    Not asked:     <n>  (<pct>%)
  Output: consent_audit_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "marketing-consent-report",
  "store": "<domain>",
  "total_customers": 0,
  "email": { "subscribed": 0, "unsubscribed": 0, "pending": 0, "not_asked": 0 },
  "sms": { "subscribed": 0, "unsubscribed": 0, "not_asked": 0 },
  "output_file": "consent_audit_<date>.csv"
}
```

## Output Format
CSV file `consent_audit_<YYYY-MM-DD>.csv` with columns:
`customer_id`, `email`, `email_marketing_state`, `email_consent_updated_at`, `sms_marketing_state`, `sms_consent_updated_at`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| No customers | Empty store | Exit with 0 results |

## Best Practices
- "Subscribed" is your addressable marketing audience — a low subscription rate may indicate checkout opt-in is not prominent enough.
- "Pending" means a customer provided their email but has not confirmed consent — this is common for double opt-in flows.
- Run before major campaigns to get an accurate count of the addressable audience; your ESP (Klaviyo, etc.) will show a different number if it has additional unsubscribes not synced back to Shopify.
- GDPR compliance note: customers in the EU with `marketingOptInLevel: SINGLE_OPT_IN` may require a re-consent campaign depending on your legal basis for processing.
