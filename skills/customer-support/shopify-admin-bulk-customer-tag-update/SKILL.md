---
name: shopify-admin-bulk-customer-tag-update
role: customer-support
description: "Adds and/or removes tags across a filtered set of customers — supports query-based selection, explicit ID lists, and union/replace tag modes."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - customers:query
  - customerUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Applies bulk tag changes (add, remove, or both) to customers selected by a query filter (e.g., `total_spent:>=500`, `tag:newsletter`) or by an explicit list of customer GIDs. Tags are how Shopify segments customers for discounts, marketing, and support workflows; this skill makes batch changes safe, dry-runnable, and auditable. Use when migrating from one tag taxonomy to another, when retiring a campaign-specific tag, or when applying a new segment tag identified by an analytics report.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_customers,write_customers`
- API scopes: `read_customers`, `write_customers`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |
| dry_run | bool | no | true | Preview matching customers and the planned tag changes without executing mutations |
| filter | string | conditional | — | Customer query filter (e.g., `tag:newsletter`, `total_spent:>=500`); required if `customer_ids` is omitted |
| customer_ids | array | conditional | — | Explicit list of customer GIDs; required if `filter` is omitted |
| add_tags | array | no | [] | Tags to add (union with existing tags) |
| remove_tags | array | no | [] | Tags to remove (set difference) |
| mode | string | no | merge | Tag write mode: `merge` (apply add/remove to existing) or `replace` (overwrite tags entirely with `add_tags` only) |
| max_customers | integer | no | 1000 | Run-size cap; abort if filter matches more than this |

## Safety

> ⚠️ Step 2 executes one `customerUpdate` mutation per customer in the matched set. Tag changes are immediate and visible to staff and to any apps reading customer tags (loyalty, marketing automation, segmentation). `mode: replace` overwrites existing tags entirely — manually-applied operational tags will be lost. The default is `dry_run: true` and `mode: merge`. Always run dry-run first, review the matched count, and confirm `add_tags`/`remove_tags` are spelled correctly — Shopify tags are case-sensitive.

## Workflow Steps

1. **OPERATION:** `customers` — query
   **Inputs:** When `filter` is set: `query: <filter>`, `first: 250`, pagination cursor. When `customer_ids` is set: batch query with `query: "id:<id1> OR id:<id2> ..."` (chunk into batches of 25 IDs). Select `id`, `displayName`, `defaultEmailAddress { emailAddress }`, `tags`.
   **Expected output:** Customer list with current tags. Abort if `match_count > max_customers`.

2. For each matched customer, compute the target tag set:
   - If `mode: merge`: `target = (existing ∪ add_tags) \ remove_tags`
   - If `mode: replace`: `target = add_tags` (remove_tags ignored)
   Skip the customer if `target == existing` (no-op).

3. **OPERATION:** `customerUpdate` — mutation
   **Inputs:** For each customer with a non-empty diff: `input: { id: <customer_id>, tags: <target_tag_array> }`
   **Expected output:** `customer.id`, `customer.tags`, `userErrors`; collect failures

## GraphQL Operations

```graphql
# customers:query — validated against api_version 2025-01
query CustomersForBulkTagging($query: String!, $after: String) {
  customers(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        displayName
        firstName
        lastName
        defaultEmailAddress {
          emailAddress
        }
        tags
        numberOfOrders
        amountSpent {
          amount
          currencyCode
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
# customerUpdate:mutation — validated against api_version 2025-01
mutation CustomerTagsUpdate($input: CustomerInput!) {
  customerUpdate(input: $input) {
    customer {
      id
      displayName
      tags
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
║  SKILL: Bulk Customer Tag Update             ║
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
BULK TAG UPDATE OUTCOME
  Filter:           <filter or "<n> explicit IDs">
  Mode:             <merge|replace>
  Add tags:         <list>
  Remove tags:      <list>
  Customers matched: <n>
  Customers updated: <n>  (or "skipped — dry_run")
  No-op (already in state): <n>
  Errors:           <n>
  Output:           bulk_tag_update_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "bulk-customer-tag-update",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": true,
  "mode": "merge",
  "outcome": {
    "matched": 0,
    "updated": 0,
    "noop": 0,
    "errors": 0,
    "add_tags": [],
    "remove_tags": [],
    "output_file": "bulk_tag_update_<date>.csv"
  }
}
```

## Output Format
CSV file `bulk_tag_update_<YYYY-MM-DD>.csv` with columns:
`customer_id`, `name`, `email`, `previous_tags`, `tags_added`, `tags_removed`, `new_tags`, `status`

The `status` column reports `updated`, `noop`, or `error: <message>`.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `userErrors` on customerUpdate | Invalid input or read-only customer | Log error, skip customer, continue |
| `match_count > max_customers` | Filter is too broad | Refine filter or raise `max_customers` deliberately |
| Both `filter` and `customer_ids` empty | No selection | Abort with parameter error |
| Tag is empty string | Whitespace-only entry | Strip and skip empty values |
| Case-mismatched remove_tag | Tags are case-sensitive | Re-run with exact casing |

## Best Practices
- Always run with `dry_run: true` first — review the matched count and a sample of `previous_tags` → `new_tags` diffs before committing.
- Prefer `mode: merge` (the default) for almost all use cases — `mode: replace` is appropriate only when fully resetting a customer's tag taxonomy and you have an audited backup of prior tags.
- Tags are case-sensitive: `VIP` and `vip` are distinct in Shopify. Standardize casing in your taxonomy.
- For ongoing operational segments, prefer date-stamped tag names (e.g., `cohort-2026-Q2`) so historical cohorts remain identifiable as new tags accumulate.
- Pair with `vip-customer-identifier` or `customer-spend-tier-tagger` to feed segment tags from analytics outputs into the customer record.
- Use `remove_tags` as the cleanup pass after a campaign — leaving stale campaign tags clutters segmentation in marketing tools.
- When `customer_ids` is supplied directly (e.g., from another skill's CSV), the run is fully deterministic — no filter ambiguity.
