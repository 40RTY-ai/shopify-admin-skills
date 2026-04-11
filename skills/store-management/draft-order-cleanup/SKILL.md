---
name: draft-order-cleanup
role: store-management
description: "Finds stale draft orders older than N days and optionally deletes them to reduce admin clutter."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - draftOrders:query
  - draftOrderDelete:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Queries open draft orders older than a configurable age and optionally deletes them. Draft orders accumulate from abandoned B2B quotes, incomplete manual orders, or old integrations and clutter the admin. Stale drafts also inflate pending revenue metrics.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,write_orders`
- API scopes: `read_orders`, `write_orders`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| older_than_days | integer | no | 30 | Delete drafts older than this many days |
| dry_run | bool | no | true | Preview drafts to delete without executing mutation |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ⚠️ `draftOrderDelete` permanently deletes draft orders. Deleted drafts cannot be recovered. Run with `dry_run: true` to review the list before committing. Check that no stale drafts represent active B2B quotes awaiting customer approval before deleting.

## Workflow Steps

1. **OPERATION:** `draftOrders` — query
   **Inputs:** `query: "status:open created_at:<='<NOW - older_than_days days>'"`, `first: 250`, pagination cursor
   **Expected output:** Stale open draft orders; paginate until `hasNextPage: false`

2. **OPERATION:** `draftOrderDelete` — mutation
   **Inputs:** `id: <draft_order_id>`
   **Expected output:** `deletedId`, `userErrors`

## GraphQL Operations

```graphql
# draftOrders:query — validated against api_version 2025-01
query StaleDraftOrders($query: String!, $after: String) {
  draftOrders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        status
        createdAt
        updatedAt
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        customer {
          id
          displayName
          defaultEmailAddress {
            emailAddress
          }
        }
        tags
        note
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
# draftOrderDelete:mutation — validated against api_version 2025-01
mutation DraftOrderDelete($input: DraftOrderDeleteInput!) {
  draftOrderDelete(input: $input) {
    deletedId
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
║  SKILL: Draft Order Cleanup                  ║
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
  Stale drafts found:   <n>
  Drafts deleted:       <n>
  Total value cleared:  $<amount>
  Errors:               <n>
  Output:               draft_cleanup_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "draft-order-cleanup",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "older_than_days": 30,
  "dry_run": true,
  "outcome": {
    "drafts_found": 0,
    "drafts_deleted": 0,
    "value_cleared": 0,
    "currency": "USD",
    "errors": 0,
    "output_file": "draft_cleanup_<date>.csv"
  }
}
```

## Output Format
CSV file `draft_cleanup_<YYYY-MM-DD>.csv` with columns:
`draft_id`, `draft_name`, `customer_name`, `customer_email`, `created_at`, `total_value`, `currency`, `action`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `userErrors` on delete | Draft already completed or cancelled | Log as skipped, continue |
| No stale drafts | All drafts are recent or none exist | Exit with 0 results |

## Best Practices
- Set `older_than_days: 60` or higher for B2B stores where quotes may have longer sales cycles.
- Review the dry-run list for drafts with notes or high value before deleting — these may be legitimate pending quotes.
- For B2B scenarios, consider filtering out drafts tagged with `b2b-quote` or similar before running the delete step.
- Run monthly as a routine admin hygiene task.
