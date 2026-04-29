---
name: shopify-admin-email-deliverability-audit
role: customer-ops
description: "Read-only: scans the customer database for malformed emails, role accounts, disposable domains, and bounce-suspect patterns to protect sender reputation."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - customers:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Scans the entire customer list and flags addresses that will hurt email deliverability if included in marketing sends: syntactically invalid addresses, role accounts (info@, admin@, sales@), known disposable / temporary domains, and suspected hard-bounce patterns. Output is a suppression list ready to import into your email platform. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_customers`
- API scopes: `read_customers`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| marketing_consent_only | bool | no | true | Only scan customers who currently accept marketing — those are the ones at risk of being mailed |
| disposable_domains | array | no | built-in list | Override built-in disposable-domain list |
| role_localparts | array | no | `["info","admin","sales","support","contact","noreply","help","webmaster","postmaster"]` | Local-part prefixes to flag as role accounts |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time. No emails are sent, no marketing consent is changed.

## Detection Rules

For each customer email, run these checks in order and assign one or more flags:

1. **`invalid_syntax`** — fails RFC 5322 local-part / domain validation, missing `@`, contains whitespace, double dots, leading/trailing dot
2. **`role_account`** — local part exactly matches a `role_localparts` entry (case-insensitive)
3. **`disposable_domain`** — domain matches the disposable-domain list (mailinator, guerrillamail, tempmail-style domains, etc.)
4. **`plus_alias`** — contains `+` in local part (informational; not a deliverability problem on its own, but useful for de-duplication)
5. **`bounce_suspect`** — heuristics: numeric-only local part, length > 64 chars, ALL-CAPS, repeated characters (`aaaaa`), keyboard rolls (`asdfghjk`)
6. **`duplicate`** — same normalized email already seen in the customer set

A customer can carry multiple flags; the most severe (`invalid_syntax` > `bounce_suspect` > `disposable_domain` > `role_account` > `plus_alias`) drives the recommended action.

## Workflow Steps

1. **OPERATION:** `customers` — query
   **Inputs:** `first: 250`, select `id`, `defaultEmailAddress { emailAddress, marketingState }`, `numberOfOrders`, `tags`, pagination cursor. If `marketing_consent_only: true`, filter `query: "email_marketing_state:subscribed"`
   **Expected output:** All targeted customers with email; paginate until `hasNextPage: false`

2. Run detection rules over each email; collect flags

3. Aggregate counts per flag, build suppression list

## GraphQL Operations

```graphql
# customers:query — validated against api_version 2025-01
query DeliverabilityAudit($query: String, $after: String) {
  customers(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        displayName
        defaultEmailAddress {
          emailAddress
          marketingState
        }
        numberOfOrders
        amountSpent {
          amount
          currencyCode
        }
        tags
        createdAt
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
║  SKILL: Email Deliverability Audit           ║
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
EMAIL DELIVERABILITY AUDIT
  Customers scanned:       <n>
  Subscribed customers:    <n>
  ─────────────────────────────
  Invalid syntax:          <n> (<pct>%)   🔴 suppress
  Role accounts:           <n> (<pct>%)   ⚠️ suppress
  Disposable domains:      <n> (<pct>%)   ⚠️ suppress
  Bounce-suspect patterns: <n> (<pct>%)   ⚠️ review
  Plus aliases:            <n> (<pct>%)   ℹ️ informational
  Duplicates:              <n> (<pct>%)   ℹ️ informational

  Recommended suppression: <n>  (<pct>% of subscribed)
  Output: deliverability_audit_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "email-deliverability-audit",
  "store": "<domain>",
  "customers_scanned": 0,
  "flags": {
    "invalid_syntax": 0,
    "role_account": 0,
    "disposable_domain": 0,
    "bounce_suspect": 0,
    "plus_alias": 0,
    "duplicate": 0
  },
  "recommended_suppressions": 0,
  "output_file": "deliverability_audit_<date>.csv"
}
```

## Output Format
CSV file `deliverability_audit_<YYYY-MM-DD>.csv` with columns:
`customer_id`, `email`, `flags`, `recommended_action`, `marketing_state`, `order_count`, `total_spent`, `created_at`

`recommended_action` is one of: `suppress`, `review`, `keep`.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Customer with no email | Phone-only / POS account | Skip, do not include in suppression list |
| Disposable list out of date | New temp-mail domain not in built-in list | Caller can override via `disposable_domains` parameter |
| Unicode local parts | Internationalized email addresses | Normalize via NFC; do not flag valid IDN domains |

## Best Practices
- Run before every large promotional send — high invalid / bounce rates above 2% put your sending domain reputation at risk.
- Treat `role_account` flags as soft-suppression: those addresses rarely consent to marketing meaningfully and frequently mark mail as spam.
- Re-audit quarterly even if the customer list is static — domain reputation lists change, and disposable-email providers add new domains.
- Pair with `marketing-consent-report` to confirm consent state aligns with what your email service provider has on file.
- Hand the resulting suppression CSV to your email service provider's import-suppression-list feature; do not silently delete customers from Shopify based on this audit.
