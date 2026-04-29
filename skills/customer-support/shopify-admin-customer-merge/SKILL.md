---
name: shopify-admin-customer-merge
role: customer-support
description: "Merges duplicate customer records: invokes Shopify's native customer merge API where supported, otherwise consolidates the loser record's tags and notes into the winner via customerUpdate."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - customer:query
  - customerMerge:mutation
  - customerUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Resolves duplicate customer records identified by `duplicate-customer-finder`. Where the Shopify Admin API exposes `customerMerge` (a native merge that moves orders, addresses, subscriptions, and metafields onto a winner record), this skill calls it directly. When `customerMerge` is unavailable or fails for the given account pair, the skill falls back to consolidating searchable metadata — tags, notes, marketing consent — onto the winner via `customerUpdate`, then writes a clear annotation to the loser record so staff can complete the merge manually in Shopify Admin.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_customers,write_customers`
- API scopes: `read_customers`, `write_customers`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |
| dry_run | bool | no | true | Preview merge plan without executing mutations |
| customer_winner_id | string | yes | — | GID of the customer record to keep (e.g., `gid://shopify/Customer/12345`) |
| customer_loser_id | string | yes | — | GID of the customer record to merge into the winner |
| use_native_merge | bool | no | true | Try `customerMerge` first; if it fails or is unavailable, fall back to consolidation via `customerUpdate` |
| merge_tags | bool | no | true | Union the loser's tags onto the winner |
| merge_note | bool | no | true | Append the loser's note to the winner (with timestamp prefix) |
| annotate_loser | bool | no | true | Write a note on the loser record pointing to the winner GID for manual cleanup |

## Safety

> ⚠️ Steps 2–4 execute mutations that modify customer records. `customerMerge` is irreversible — once orders and addresses are moved to the winner, the loser record is closed and cannot be split back. Run with `dry_run: true` first to confirm winner/loser GIDs and the merge plan. The default is `dry_run: true`. Always verify both records belong to the same human (matching email, phone, name) using `duplicate-customer-finder` output before committing. Do not merge a customer with active subscriptions or unfulfilled orders without confirming downstream systems will follow the new owner GID.

## Workflow Steps

1. **OPERATION:** `customer` — query (called twice: winner and loser)
   **Inputs:** `id: <customer_id>`, select `id`, `displayName`, `firstName`, `lastName`, `defaultEmailAddress { emailAddress }`, `phone`, `tags`, `note`, `numberOfOrders`, `amountSpent`, `emailMarketingConsent { marketingState }`, `smsMarketingConsent { marketingState }`, `addresses(first: 25) { id }`, `createdAt`
   **Expected output:** Both records' full identity payload — abort if either GID does not resolve

2. **OPERATION:** `customerMerge` — mutation (only if `use_native_merge: true` and not `dry_run`)
   **Inputs:** `customerOneId: <customer_winner_id>`, `customerTwoId: <customer_loser_id>`, `overrideFields`: prefer winner's name/email/phone/locale/marketing-consent
   **Expected output:** `job.id` (merge runs asynchronously), `userErrors`. If `userErrors` indicates merge is not supported for this pair (B2B, gift card holder, subscriber, etc.), proceed to step 3 fallback.

3. **OPERATION:** `customerUpdate` — mutation (winner) — fallback path or when `use_native_merge: false`
   **Inputs:** `input.id: <customer_winner_id>`, `input.tags: <union of winner.tags and loser.tags>` (only if `merge_tags`), `input.note: <winner.note + "\n[YYYY-MM-DD] Merged from <loser_email>:\n" + loser.note>` (only if `merge_note`)
   **Expected output:** `customer.id`, `customer.tags`, `customer.note`, `userErrors`

4. **OPERATION:** `customerUpdate` — mutation (loser) — only if `annotate_loser: true`
   **Inputs:** `input.id: <customer_loser_id>`, `input.note: "<existing note>\n[YYYY-MM-DD] DUPLICATE — merge target: <customer_winner_id>. Manually close in Shopify Admin once orders are reviewed."`, `input.tags: <existing + ["duplicate", "merged-loser"]>`
   **Expected output:** `customer.id`, `customer.tags`, `customer.note`, `userErrors`

## GraphQL Operations

```graphql
# customer:query — validated against api_version 2025-01
query CustomerForMerge($id: ID!) {
  customer(id: $id) {
    id
    displayName
    firstName
    lastName
    defaultEmailAddress {
      emailAddress
    }
    phone
    tags
    note
    numberOfOrders
    amountSpent {
      amount
      currencyCode
    }
    emailMarketingConsent {
      marketingState
      marketingOptInLevel
      consentUpdatedAt
    }
    smsMarketingConsent {
      marketingState
      marketingOptInLevel
      consentUpdatedAt
    }
    addresses(first: 25) {
      id
      address1
      city
      provinceCode
      countryCodeV2
      zip
    }
    createdAt
  }
}
```

```graphql
# customerMerge:mutation — validated against api_version 2025-01
mutation CustomerMerge(
  $customerOneId: ID!
  $customerTwoId: ID!
  $overrideFields: CustomerMergeOverrideFields
) {
  customerMerge(
    customerOneId: $customerOneId
    customerTwoId: $customerTwoId
    overrideFields: $overrideFields
  ) {
    job {
      id
      done
    }
    resultingCustomerId
    userErrors {
      field
      message
      code
    }
  }
}
```

```graphql
# customerUpdate:mutation — validated against api_version 2025-01
mutation CustomerConsolidate($input: CustomerInput!) {
  customerUpdate(input: $input) {
    customer {
      id
      displayName
      tags
      note
    }
    userErrors {
      field
      message
    }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Customer Merge                       ║
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

If `dry_run: true`, prefix every mutation step with `[DRY RUN]` and do not execute it.

**On completion**, emit:

For `format: human` (default):
```
══════════════════════════════════════════════
CUSTOMER MERGE OUTCOME
  Winner:           <name> (<email>)  Orders: <n>  Spent: $<n>
  Loser:            <name> (<email>)  Orders: <n>  Spent: $<n>
  Path used:        <native|fallback|skipped>
  Merge job:        <id or "n/a">
  Tags consolidated: <n>
  Note appended:    <yes/no>
  Loser annotated:  <yes/no>
  Errors:           <n>
  Output:           none
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "customer-merge",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": true,
  "winner_id": "<gid>",
  "loser_id": "<gid>",
  "outcome": {
    "path": "native|fallback",
    "merge_job_id": "<id or null>",
    "resulting_customer_id": "<gid or null>",
    "tags_consolidated": 0,
    "note_appended": false,
    "loser_annotated": false,
    "errors": 0,
    "output_file": null
  }
}
```

## Output Format
No CSV output. The session summary reports the merge job ID, the resulting customer GID, and which path was taken. For batch merges, run this skill once per pair and capture the JSON output.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `customerMerge` userError: customer has subscriptions | Active subscription on loser | Cancel subscription before merge or use fallback path |
| `customerMerge` userError: B2B customer | Company-affiliated record | Use fallback path; manual merge in Shopify Admin |
| `customerMerge` userError: gift card holder | Loser owns gift card balance | Transfer gift card or use fallback path |
| Either GID not found | Wrong ID or deleted customer | Re-run `duplicate-customer-finder` |
| Merge job pending | Async merge not yet complete | Re-query `Job(id)` to confirm `done: true` |

## Best Practices
1. Always run `duplicate-customer-finder` first to confirm the pair is genuinely duplicate. Manual misclassifications are unrecoverable.
2. Pick the winner deliberately: typically the record with more orders, the verified email, or the older `createdAt`. Avoid making the marketing-consenting record the loser.
3. Run `dry_run: true` first; the preview shows both records' order counts and spend so you can sanity-check before committing.
4. For large dedup runs, write a wrapper script that calls this skill once per pair and feeds it from `duplicate-customer-finder`'s CSV output — never batch merges in a single call.
5. After native merge, the `job.done: false` response is normal — Shopify processes merges asynchronously. Re-query the job ID until completion before assuming the loser is closed.
6. The fallback path (`customerUpdate` consolidation only) does not move orders. It preserves searchability via tags/notes so a human can finish the merge in Shopify Admin (Customers → Merge).
