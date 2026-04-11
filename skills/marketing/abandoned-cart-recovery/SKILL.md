---
name: abandoned-cart-recovery
role: marketing
description: "Query checkouts abandoned in the last N days, generate unique discount codes per customer, and tag them for re-engagement."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - abandonedCheckouts:query
  - discountCodeBulkCreate:mutation
  - tagsAdd:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Identifies customers who started checkout but did not complete their purchase, generates a unique discount code for each one, and tags them in Shopify so they can be targeted in follow-up campaigns. Replaces the abandoned cart flow functionality of email marketing apps like Klaviyo or Omnisend — this skill handles the Shopify-native data layer (querying, discounts, tagging); sending the actual email requires an external tool.

## Prerequisites
- Authenticated Shopify CLI session: `shopify auth login --store <domain>`
- API scopes: `read_checkouts`, `write_price_rules`, `write_discount_codes`, `write_customers`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |
| dry_run | bool | no | false | Preview operations without executing mutations |
| days_back | integer | no | 7 | Lookback window for abandoned checkouts |
| min_cart_value | float | no | 0 | Minimum cart total to include (USD) |
| discount_pct | integer | no | 10 | Discount percentage to create per customer |
| code_prefix | string | no | RECOVER | Prefix for generated discount codes |
| tag | string | no | cart-recovery | Tag applied to eligible customers |

## Safety

> ⚠️ Steps 2 and 3 execute mutations (discount code creation, customer tagging). Discount codes created via `discountCodeBulkCreate` cannot be bulk-deleted via the Admin API — they must be removed individually or via the price rule. Run with `dry_run: true` to verify eligible customer count before committing.

## Workflow Steps

1. **OPERATION:** `abandonedCheckouts` — query
   **Inputs:** `first: 250`, `query: "created_at:>='<NOW - days_back days>'"`, pagination cursor
   **Expected output:** List of checkout objects with `email`, `totalPrice`, `createdAt`, `lineItems`; paginate until `hasNextPage: false`

2. **OPERATION:** `discountCodeBulkCreate` — mutation
   **Inputs:** For each eligible customer email: a unique code `{code_prefix}-{UUID[:8].toUpperCase()}`, percentage discount `discount_pct`, usage limit 1, expiry 30 days
   **Expected output:** Confirmation of code creation with `code` and `priceRule.id`; collect `userErrors`

3. **OPERATION:** `tagsAdd` — mutation
   **Inputs:** Customer `id` (from checkout `email` lookup), tag string from `tag` parameter
   **Expected output:** Updated customer tags; collect `userErrors`

## GraphQL Operations

```graphql
# abandonedCheckouts:query — validated against api_version 2025-01
query AbandonedCheckouts($first: Int!, $after: String, $query: String) {
  abandonedCheckouts(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        email
        totalPrice
        createdAt
        lineItems {
          edges {
            node {
              title
              quantity
              variant {
                price
              }
            }
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
# discountCodeBulkCreate:mutation — validated against api_version 2025-01
mutation DiscountCodeBulkCreate($priceRuleId: ID!, $codes: [DiscountCodeInput!]!) {
  discountCodeBulkCreate(priceRuleId: $priceRuleId, codes: $codes) {
    bulkCreations {
      id
      done
    }
    userErrors {
      field
      message
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
║  SKILL: Abandoned Cart Recovery              ║
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
  Checkouts found:     <n>
  Eligible customers:  <n>
  Codes created:       <n>
  Customers tagged:    <n>
  Errors:              <n>
  Output:              recovery_list_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "abandoned-cart-recovery",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": false,
  "steps": [
    { "step": 1, "operation": "AbandonedCheckouts", "type": "query", "params_summary": "last 7 days, cart >= $0", "result_summary": "<n> checkouts", "skipped": false },
    { "step": 2, "operation": "DiscountCodeBulkCreate", "type": "mutation", "params_summary": "<n> codes, 10% off, prefix RECOVER", "result_summary": "<n> created", "skipped": false },
    { "step": 3, "operation": "TagsAdd", "type": "mutation", "params_summary": "tag: cart-recovery", "result_summary": "<n> customers tagged", "skipped": false }
  ],
  "outcome": {
    "checkouts_found": 0,
    "eligible_customers": 0,
    "codes_created": 0,
    "customers_tagged": 0,
    "errors": 0,
    "output_file": "recovery_list_<date>.csv"
  }
}
```

## Output Format
CSV file `recovery_list_<YYYY-MM-DD>.csv` with columns:
`customer_email`, `cart_total`, `abandoned_at`, `discount_code`, `discount_pct`, `tag_applied`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `userErrors` on discount creation | Invalid price rule or duplicate code | Log error, skip customer, continue |
| `userErrors` on tagsAdd | Customer ID not found | Log error, skip tag, continue |
| No email on checkout | Guest checkout without email | Skip checkout, do not count as eligible |

## Best Practices
- Run with `dry_run: true` first and confirm eligible customer count — discount codes cannot be bulk-deleted via API and will persist in your price rules until manually removed.
- Set `min_cart_value` to focus recovery effort on higher-value carts (e.g., 50 for $50+). Small carts often have lower recovery intent and may not justify a discount.
- Use a unique `tag` per run (e.g., `cart-recovery-2026-04-11`) so you can identify exactly which customers were targeted in each campaign and avoid re-targeting them in subsequent runs.
- The `code_prefix` should be meaningful to operators reviewing discount codes in Shopify Admin (e.g., `CART10` for a 10% cart recovery discount).
- This skill produces the data layer. Use Shopify Email, Klaviyo, or another email tool to send the generated codes to customers.
