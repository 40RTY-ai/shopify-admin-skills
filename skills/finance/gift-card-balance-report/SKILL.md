---
name: gift-card-balance-report
role: finance
description: "Read-only: lists all active gift cards with remaining balance, expiry, and last-used date for liability tracking."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - giftCards:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Queries all active and partially-redeemed gift cards and reports the total outstanding gift card liability (unredeemed balances). Used for balance sheet reporting, accounting for deferred revenue, and auditing unused gift cards before they expire. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_gift_cards`
- API scopes: `read_gift_cards`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| status | string | no | enabled | Filter by status: `enabled`, `disabled`, or `all` |
| expiring_within_days | integer | no | 30 | Flag gift cards expiring within this many days |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `giftCards` — query
   **Inputs:** `query: "status:<status>"`, `first: 250`, pagination cursor
   **Expected output:** All matching gift cards with `balance`, `initialValue`, `expiresOn`, `lastCharacter`, `usedOn`; paginate until `hasNextPage: false`

2. Flag cards expiring within `expiring_within_days`

3. Aggregate: total outstanding balance (liability), count by status, total initial value issued

## GraphQL Operations

```graphql
# giftCards:query — validated against api_version 2025-01
query GiftCardBalances($query: String, $after: String) {
  giftCards(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        balance {
          amount
          currencyCode
        }
        initialValue {
          amount
          currencyCode
        }
        enabled
        expiresOn
        createdAt
        lastCharacters
        customer {
          id
          displayName
          defaultEmailAddress {
            emailAddress
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
║  SKILL: Gift Card Balance Report             ║
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
GIFT CARD BALANCE REPORT
  Active gift cards:          <n>
  Total outstanding balance:  $<amount>  (liability)
  Total initial value issued: $<amount>
  Redeemed to date:           $<amount>
  Expiring in <n> days:       <n> cards  ($<amount>)
  Output: gift_card_balances_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "gift-card-balance-report",
  "store": "<domain>",
  "active_count": 0,
  "total_outstanding_balance": 0,
  "total_initial_value": 0,
  "currency": "USD",
  "expiring_soon_count": 0,
  "expiring_soon_value": 0,
  "output_file": "gift_card_balances_<date>.csv"
}
```

## Output Format
CSV file `gift_card_balances_<YYYY-MM-DD>.csv` with columns:
`gift_card_id`, `last_characters`, `status`, `initial_value`, `balance`, `currency`, `created_at`, `expires_on`, `customer_email`, `expiring_soon`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| No gift cards | Store hasn't issued any | Exit with 0 total liability |
| Gift card with no customer | Issued without customer account | Show as "Anonymous" |

## Best Practices
- The total outstanding balance is a **deferred revenue liability** on your balance sheet — include it in monthly financial close.
- Gift cards expiring within `expiring_within_days` represent imminent liability reduction — no action needed, but useful for forecasting.
- For high-value outstanding balances, cross-reference with `customer-spend-tier-tagger` to target high-balance card holders with reminder campaigns.
- Pair with `gift-card-issuance` (conversion-optimization skill) to track cards issued vs. redeemed over time.
