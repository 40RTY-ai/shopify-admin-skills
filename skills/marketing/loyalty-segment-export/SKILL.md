---
name: loyalty-segment-export
role: marketing
description: "Identify high-LTV customers by order count and lifetime spend, tag them, and export a loyalty-ready contact list."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - customers:query
  - tagsAdd:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Segments your highest-value customers by order count and total lifetime spend, tags them in Shopify, and exports a list ready for loyalty program enrollment or VIP campaign targeting. This skill handles the data layer; managing rewards points or sending loyalty emails requires an external tool.

## Prerequisites
- Authenticated Shopify CLI session: `shopify auth login --store <domain>`
- API scopes: `read_customers`, `write_customers`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain |
| format | string | no | human | `human` or `json` |
| dry_run | bool | no | false | Preview without tagging |
| min_orders | integer | no | 3 | Minimum lifetime order count |
| min_spend | float | no | 200 | Minimum lifetime spend (store currency) |
| tag | string | no | loyalty-vip | Tag applied to qualifying customers |

## Workflow Steps

1. **OPERATION:** `customers` — query
   **Inputs:** filter `orders_count:>=(min_orders)`, `total_spent:>=(min_spend)`, `first: 250`, pagination
   **Expected output:** List with `id`, `defaultEmailAddress { emailAddress }`, `firstName`, `lastName`, `ordersCount`, `totalSpentV2`; paginate until `hasNextPage: false`

2. **OPERATION:** `tagsAdd` — mutation
   **Inputs:** Customer `id`, tag from `tag` parameter
   **Expected output:** Confirmation per customer; collect `userErrors`

## GraphQL Operations

```graphql
# customers:query — validated against api_version 2025-04
query LoyaltyCustomers($first: Int!, $after: String, $query: String) {
  customers(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        defaultEmailAddress {
          emailAddress
        }
        firstName
        lastName
        ordersCount
        totalSpentV2 {
          amount
          currencyCode
        }
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
# tagsAdd:mutation — validated against api_version 2025-01
mutation TagsAdd($id: ID!, $tags: [String!]!) {
  tagsAdd(id: $id, tags: $tags) {
    node { id }
    userErrors { field message }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Loyalty Segment Export               ║
║  Store: <store domain>                       ║
║  Started: <YYYY-MM-DD HH:MM UTC>             ║
╚══════════════════════════════════════════════╝
```

**After each step**, emit:
```
[N/TOTAL] <QUERY|MUTATION>  <OperationName>
          → Params: <brief summary>
          → Result: <count or outcome>
```

If `dry_run: true`, prefix mutation steps with `[DRY RUN]` and do not execute.

**On completion**, for `format: human`:
```
══════════════════════════════════════════════
OUTCOME SUMMARY
  VIP customers found:  <n>
  Customers tagged:     <n>
  Errors:               <n>
  Output:               loyalty_segment_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit the standard JSON schema with `outcome` keys: `vip_customers_found`, `customers_tagged`, `errors`, `output_file`.

## Output Format
CSV `loyalty_segment_<YYYY-MM-DD>.csv` with columns:
`customer_id`, `email`, `first_name`, `last_name`, `orders_count`, `total_spent`, `currency`, `tag_applied`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | Rate limit | Wait 2s, retry up to 3 times |
| `userErrors` on tagsAdd | Invalid customer ID | Log, skip, continue |

## Best Practices
- Before running, check if customers already have the loyalty tag — add `NOT tag:loyalty-vip` to your query filter to skip already-enrolled customers.
- Export and review the customer list before tagging if you're unsure about the threshold values — use `dry_run: true` to see the count, then adjust `min_orders` and `min_spend` before committing.
- Combine with `customer-win-back`: tag high-LTV lapsed customers with both `loyalty-vip` and a win-back tag to identify your highest-priority re-engagement targets.
