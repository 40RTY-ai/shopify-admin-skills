---
name: customer-note-bulk-annotator
role: customer-ops
description: "Adds internal notes to customer records in bulk — useful for post-campaign flags, import annotations, or support context."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - customers:query
  - customerUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Queries customers matching a filter (tag, email list, or spend threshold) and appends a note to each customer record. Internal notes are visible to staff in Shopify Admin but not to customers. Used for post-campaign annotation, import source tracking, VIP flags, or support context.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_customers,write_customers`
- API scopes: `read_customers`, `write_customers`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| filter | string | yes | — | Customer filter query (e.g., `tag:vip`, `total_spent:>=500`) |
| note | string | yes | — | Note text to append to matching customers |
| append | bool | no | true | Append to existing note (true) or replace entirely (false) |
| dry_run | bool | no | true | Preview matching customers without executing mutations |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ⚠️ If `append: false`, this overwrites the existing customer note entirely. Existing notes will be lost. Default is `append: true` which safely appends with a timestamp prefix. Run with `dry_run: true` to confirm the customer list before committing.

## Workflow Steps

1. **OPERATION:** `customers` — query
   **Inputs:** `query: <filter>`, `first: 250`, select `id`, `displayName`, `note`, pagination cursor
   **Expected output:** Matching customers with existing notes; paginate until `hasNextPage: false`

2. Construct new note: if `append: true`, prepend `[YYYY-MM-DD] <note>` to existing note (newline-separated); if `append: false`, replace with `<note>`

3. **OPERATION:** `customerUpdate` — mutation
   **Inputs:** `id: <customer_id>`, `note: <new_note>`
   **Expected output:** `customer { id, note }`, `userErrors`

## GraphQL Operations

```graphql
# customers:query — validated against api_version 2025-01
query CustomersByFilter($query: String!, $after: String) {
  customers(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        displayName
        defaultEmailAddress {
          emailAddress
        }
        note
        tags
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
mutation CustomerUpdateNote($input: CustomerInput!) {
  customerUpdate(input: $input) {
    customer {
      id
      displayName
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
║  SKILL: Customer Note Bulk Annotator         ║
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
OUTCOME SUMMARY
  Customers matched:   <n>
  Notes updated:       <n>
  Errors:              <n>
  Output:              annotation_log_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "customer-note-bulk-annotator",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "dry_run": true,
  "filter": "<query>",
  "note": "<text>",
  "append": true,
  "outcome": {
    "matched": 0,
    "updated": 0,
    "errors": 0,
    "output_file": "annotation_log_<date>.csv"
  }
}
```

## Output Format
CSV file `annotation_log_<YYYY-MM-DD>.csv` with columns:
`customer_id`, `name`, `email`, `previous_note`, `new_note`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `userErrors` on customerUpdate | Invalid input or read-only customer | Log error, skip customer, continue |
| No customers match filter | Filter too narrow | Exit with 0 matches |

## Best Practices
- Always use `append: true` unless you explicitly intend to overwrite existing notes — staff notes may contain important history.
- Include a datestamp in the `note` text itself (e.g., `"2026-04-11: Campaign X participant"`) so notes remain interpretable months later.
- Use `dry_run: true` to confirm the customer count before annotating — a broad filter can match thousands of customers unexpectedly.
- For import-source tracking, annotate immediately after the import run to maintain a clear audit trail.
