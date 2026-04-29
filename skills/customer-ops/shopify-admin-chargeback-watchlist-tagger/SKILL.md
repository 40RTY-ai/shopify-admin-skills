---
name: shopify-admin-chargeback-watchlist-tagger
role: customer-ops
description: "Identifies customers with disputed or charged-back orders and tags their customer record for proactive review on future orders."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
  - customerUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Scans historical orders for any associated chargeback or dispute, then tags the customer record with `chargeback-history` (configurable). Future orders from these customers can be filtered or held for manual review by ops. Reduces repeated chargeback losses without blocking customers outright. Defaults to `dry_run: true`.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,read_customers,write_customers`
- API scopes: `read_orders`, `read_customers`, `write_customers`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 730 | Historical window to scan for disputes (2 years default) |
| watchlist_tag | string | no | chargeback-history | Tag applied to flagged customers |
| include_won_disputes | bool | no | false | If false, only tag customers whose disputes were lost or are open |
| dry_run | bool | no | true | Preview without applying tags |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ⚠️ `customerUpdate` modifies customer tags that are visible to staff and may drive segmentation rules. Tag a customer incorrectly and you may downgrade their experience or block their orders. Run with `dry_run: true` first and review the list before committing. Won disputes (where the merchant won) are excluded by default to avoid false positives.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>' chargeback_status:*"` (any chargeback state), `first: 250`, select `disputes { id, status, initiatedAs, finalizedOn }`, `customer { id, displayName, tags, defaultEmailAddress { emailAddress } }`, `totalPriceSet`, pagination cursor
   **Expected output:** All orders that have at least one dispute in the window

2. Group disputes by customer. For each customer:
   - Skip if every dispute has status `WON` and `include_won_disputes: false`
   - Skip if customer already carries `watchlist_tag`
   - Otherwise add to tagging queue

3. **OPERATION:** `customerUpdate` — mutation
   **Inputs:** `input: { id, tags: [<existing tags>, watchlist_tag] }` for each queued customer
   **Expected output:** Updated customer with new tag list; `userErrors`

4. If `dry_run: true`, do not call mutation — just report the queue.

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query OrdersWithDisputes($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        disputes {
          id
          status
          initiatedAs
          finalizedOn
        }
        customer {
          id
          displayName
          defaultEmailAddress {
            emailAddress
          }
          numberOfOrders
          amountSpent {
            amount
            currencyCode
          }
          tags
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
mutation TagChargebackCustomer($input: CustomerInput!) {
  customerUpdate(input: $input) {
    customer {
      id
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
║  SKILL: Chargeback Watchlist Tagger          ║
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
CHARGEBACK WATCHLIST  (<days_back> days)
  Orders with disputes:    <n>
  Unique customers:        <n>
  Disputes lost/open:      <n>
  Disputes won (excluded): <n>
  Already tagged:          <n>
  ─────────────────────────────
  Customers to tag:        <n>
  Tags applied:            <n>   (or [DRY RUN] would apply)
  Errors:                  <n>
  Output: chargeback_watchlist_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "chargeback-watchlist-tagger",
  "store": "<domain>",
  "dry_run": true,
  "orders_with_disputes": 0,
  "unique_customers": 0,
  "customers_to_tag": 0,
  "tags_applied": 0,
  "errors": 0,
  "output_file": "chargeback_watchlist_<date>.csv"
}
```

## Output Format
CSV file `chargeback_watchlist_<YYYY-MM-DD>.csv` with columns:
`customer_id`, `email`, `name`, `dispute_count`, `latest_dispute_status`, `latest_dispute_initiated_as`, `total_disputed_amount`, `currency`, `existing_tags`, `tag_to_apply`, `action`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `userErrors` on customerUpdate | Customer not found / archived | Log error, skip, continue |
| Order without a customer | Guest checkout dispute | Cannot tag — record in CSV with `action: skipped_guest` |
| Dispute with status `null` | Very recent dispute, not yet categorized | Treat as open / not won |

## Best Practices
- Always start with `dry_run: true` and audit the CSV — false positives damage customer trust.
- Combine `watchlist_tag` with a Shopify Flow or order-routing rule that holds new orders from tagged customers for manual approval.
- Re-run quarterly so the watchlist stays current — chargeback patterns change as your store and customer base grow.
- Keep `include_won_disputes: false` (default). If you won, the bank ruled in your favor — do not penalize the customer.
- For repeat offenders (multiple disputes), consider escalating beyond a tag — review manually before allowing further orders.
