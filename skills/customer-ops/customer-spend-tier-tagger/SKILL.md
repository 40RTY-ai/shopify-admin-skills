---
name: customer-spend-tier-tagger
role: customer-ops
description: "Calculates lifetime spend per customer and applies tier tags (Bronze/Silver/Gold/Platinum) based on configurable thresholds."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - customers:query
  - orders:query
  - tagsAdd:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Queries all customers, calculates their lifetime spend using order history, and assigns a spend-tier tag (Bronze/Silver/Gold/Platinum by default). Enables VIP segmentation for loyalty programs, exclusive offers, and CX prioritization without a third-party loyalty app. Extends the existing `loyalty-segment-export` skill with a write step.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_customers,read_orders,write_customers`
- API scopes: `read_customers`, `read_orders`, `write_customers`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| tiers | object | no | see below | Spend thresholds per tier (in store currency) |
| tag_prefix | string | no | tier | Tag prefix (e.g., `tier:bronze`, `tier:silver`) |
| remove_old_tiers | bool | no | true | Remove existing tier tags before applying new ones |
| dry_run | bool | no | true | Preview without executing mutations |
| format | string | no | human | Output format: `human` or `json` |

Default tiers (store currency):
```
bronze:   $0–$249
silver:   $250–$999
gold:     $1,000–$4,999
platinum: $5,000+
```

## Safety

> ⚠️ `tagsAdd` adds tags to customer records visible to staff and used by marketing segments. If `remove_old_tiers: true`, existing tier tags matching `tag_prefix` are removed before new ones are applied. Run with `dry_run: true` to review the tier distribution before committing.

## Workflow Steps

1. **OPERATION:** `customers` — query
   **Inputs:** `first: 250`, select `id`, `amountSpent`, pagination cursor
   **Expected output:** All customers with lifetime spend; paginate until `hasNextPage: false`

2. Assign tier to each customer based on `amountSpent.amount` vs. `tiers` thresholds

3. **OPERATION:** `orders` — query (optional — for verification of spend figures)

4. **OPERATION:** `tagsAdd` — mutation
   **Inputs:** Customer `id`, `tags: ["<tag_prefix>:<tier>"]`
   **Expected output:** Updated customer tags; `userErrors`

## GraphQL Operations

```graphql
# customers:query — validated against api_version 2025-01
query CustomerSpendLevels($after: String) {
  customers(first: 250, after: $after) {
    edges {
      node {
        id
        displayName
        defaultEmailAddress {
          emailAddress
        }
        amountSpent {
          amount
          currencyCode
        }
        numberOfOrders
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
# orders:query — validated against api_version 2025-01
query CustomerOrderHistory($customerId: String!, $after: String) {
  orders(first: 250, after: $after, query: $customerId) {
    edges {
      node {
        id
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
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

```graphql
# tagsAdd:mutation — validated against api_version 2025-01
mutation TagsAdd($id: ID!, $tags: [String!]!) {
  tagsAdd(id: $id, tags: $tags) {
    node {
      id
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
║  SKILL: Customer Spend Tier Tagger           ║
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
  Customers processed:  <n>
  Bronze:    <n>  (<pct>%)
  Silver:    <n>  (<pct>%)
  Gold:      <n>  (<pct>%)
  Platinum:  <n>  (<pct>%)
  Tags applied: <n>
  Errors:       <n>
  Output:       tier_tagging_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "customer-spend-tier-tagger",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "dry_run": true,
  "tier_distribution": { "bronze": 0, "silver": 0, "gold": 0, "platinum": 0 },
  "tags_applied": 0,
  "errors": 0,
  "output_file": "tier_tagging_<date>.csv"
}
```

## Output Format
CSV file `tier_tagging_<YYYY-MM-DD>.csv` with columns:
`customer_id`, `name`, `email`, `lifetime_spend`, `currency`, `tier`, `previous_tags`, `new_tags`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `userErrors` on tagsAdd | Invalid customer ID | Log error, skip customer, continue |
| No customers | Empty store | Exit with 0 results |

## Best Practices
- Run monthly to keep tier assignments current — customers who increase their spend will move up tiers automatically.
- Use `remove_old_tiers: true` to ensure each customer has exactly one tier tag at any time.
- Adjust `tiers` thresholds to your store's AOV and LTV distribution — the defaults work for stores with $50–100 AOV.
- After tagging, create Shopify Customer Segments using tag filters to target each tier in email campaigns.
