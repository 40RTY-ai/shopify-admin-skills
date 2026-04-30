---
name: shopify-admin-promo-code-bulk-generator
role: marketing
description: "Bulk-creates a batch of unique discount codes for campaigns, giveaways, or partner distributions — each code is its own DiscountCodeBasic with single-use limit by default."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - discountCodeBasicCreate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Generates N unique discount codes (e.g., 100 codes for an influencer giveaway, 500 for a partner distribution drop) with a shared prefix and configurable value, usage limit, and validity window. Each code is created as a standalone `DiscountCodeBasic` discount node so it can be tracked independently in Shopify Admin and revoked individually if leaked. Typical use: handing each code to a different recipient where each redemption must be tied to one person.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes write_discounts`
- API scopes: `read_discounts`, `write_discounts`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |
| dry_run | bool | no | true | Preview the codes that would be created without executing mutations |
| prefix | string | yes | — | Prefix for every generated code (e.g., `GIVEAWAY` produces `GIVEAWAY-A4F2X9`) |
| count | integer | yes | — | Number of unique codes to generate (max 1000 per run) |
| value_type | string | yes | — | Discount type: `percentage`, `fixed_amount`, or `free_shipping` |
| value | float | conditional | — | Numeric value: percent off (1–100) for `percentage`; currency amount for `fixed_amount`; ignored for `free_shipping` |
| usage_limit | integer | no | 1 | How many times each individual code can be redeemed |
| starts_at | string | no | now | ISO8601 datetime when codes become valid |
| ends_at | string | no | — | ISO8601 datetime when codes expire (omit for no expiry) |
| applies_to | string | no | order | Code applies to: `order` (entire order) or `shipping_only` (with `free_shipping` value type) |

## Safety

> ⚠️ Step 1 executes one `discountCodeBasicCreate` mutation per generated code. Once created, codes appear immediately in Shopify Admin and become redeemable at `starts_at`. Codes cannot be deleted in bulk via the Admin API — they must be removed individually with `discountCodeDelete`. Run with `dry_run: true` to confirm the count, prefix, and value before committing. The default is `dry_run: true`. For high counts (>100), confirm `usage_limit` matches intent — a single high-limit code is usually preferable to N single-use codes if uniqueness per recipient is not required.

## Workflow Steps

1. Generate `count` unique random suffixes (6 alphanumeric uppercase characters per suffix). Concatenate as `<prefix>-<suffix>`. Validate no in-memory duplicates and no length > 32.

2. **OPERATION:** `discountCodeBasicCreate` — mutation (one call per code)
   **Inputs:** `basicCodeDiscount.title: "<prefix> bulk generation <date>"`, `basicCodeDiscount.code: <generated_code>`, `basicCodeDiscount.startsAt: <starts_at>`, `basicCodeDiscount.endsAt: <ends_at>`, `basicCodeDiscount.usageLimit: <usage_limit>`, `basicCodeDiscount.appliesOncePerCustomer: true`, `basicCodeDiscount.customerGets.value`: percent / fixed-amount / free-shipping union per `value_type`, `basicCodeDiscount.customerGets.items.all: true`, `basicCodeDiscount.customerSelection.all: true`
   **Expected output:** `codeDiscountNode.id`, `codeDiscountNode.codeDiscount.codes.edges[0].node.code`, `userErrors`

## GraphQL Operations

```graphql
# discountCodeBasicCreate:mutation — validated against api_version 2025-01
mutation PromoCodeCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
  discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
    codeDiscountNode {
      id
      codeDiscount {
        ... on DiscountCodeBasic {
          title
          startsAt
          endsAt
          usageLimit
          appliesOncePerCustomer
          codes(first: 1) {
            edges {
              node {
                code
              }
            }
          }
          customerGets {
            value {
              ... on DiscountPercentage {
                percentage
              }
              ... on DiscountAmount {
                amount {
                  amount
                  currencyCode
                }
              }
              ... on DiscountOnQuantity {
                effect {
                  ... on DiscountPercentage {
                    percentage
                  }
                }
              }
            }
          }
        }
      }
    }
    userErrors {
      field
      message
      code
    }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Promo Code Bulk Generator            ║
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
PROMO CODE BULK GENERATION
  Prefix:           <prefix>
  Codes requested:  <n>
  Codes created:    <n>  (or "skipped — dry_run")
  Value type:       <type>
  Value:            <amount>
  Usage limit/code: <n>
  Valid:            <starts_at> → <ends_at>
  Errors:           <n>
  Output:           promo_codes_<prefix>_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "promo-code-bulk-generator",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": true,
  "prefix": "<prefix>",
  "outcome": {
    "codes_requested": 0,
    "codes_created": 0,
    "value_type": "<type>",
    "value": 0,
    "usage_limit_per_code": 1,
    "starts_at": "<ISO8601>",
    "ends_at": "<ISO8601 or null>",
    "errors": 0,
    "output_file": "promo_codes_<prefix>_<date>.csv"
  }
}
```

## Output Format
CSV file `promo_codes_<prefix>_<YYYY-MM-DD>.csv` with columns:
`code`, `discount_node_id`, `value_type`, `value`, `usage_limit`, `starts_at`, `ends_at`, `created_at`, `status`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `userErrors.code: TAKEN` | Code collision with existing discount | Regenerate suffix and retry that code |
| `userErrors` invalid value | Percentage outside 1–100 or negative fixed amount | Validate before submission |
| `count > 1000` | Run-size guardrail | Split into multiple runs |
| Network failure mid-batch | Partial completion | CSV records `created` vs `pending`; rerun with the pending suffix list only |

## Best Practices
- Use `usage_limit: 1` for influencer-style giveaways where each recipient gets a private code; use `usage_limit: N` only when codes are distributed publicly with a hard cap.
- Pick a meaningful `prefix` (e.g., `INFLUENCER-Q2`, `GIVEAWAY-LAUNCH`) so codes are easy to filter in Shopify Admin and in revenue reports.
- Always set `ends_at` — open-ended codes lead to long-tail discount cost and complicate ROI analysis.
- Run `dry_run: true` first and inspect the generated suffixes; codes are not deletable in bulk if a mistake is made.
- For `free_shipping`, set `applies_to: shipping_only` and leave `value` unset; Shopify ignores numeric value for free-shipping discounts.
- Pair with `discount-roi-calculator` after the campaign to measure ROI per code prefix.
