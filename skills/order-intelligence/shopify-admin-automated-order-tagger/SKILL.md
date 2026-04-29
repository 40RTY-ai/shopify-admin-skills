---
name: shopify-admin-automated-order-tagger
role: order-intelligence
description: "Mutation: applies tags to orders based on configurable rules (geography, value, product type, risk level, customer tier)."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
  - orderUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Applies tags to orders based on configurable rule sets — geography-based (domestic/international), value-based (high-value, low-value), product-type-based, customer-tier-based, or custom conditions. Replicates the core functionality of apps like Shopify Flow, Leap Auto Tags, and TagRobot. Supports dry-run mode for safe preview.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders,write_orders`
- API scopes: `read_orders`, `write_orders`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain |
| rules | object[] | yes | — | Array of tagging rules (see Rules Format below) |
| days_back | integer | no | 7 | Lookback window for orders to tag |
| skip_tagged | boolean | no | true | Skip orders that already have the target tag |
| dry_run | boolean | no | true | Preview only — don't apply tags |
| format | string | no | human | Output format: `human` or `json` |

## Rules Format

Each rule has a `condition` and a `tag`:

```json
[
  { "condition": "total_price > 500", "tag": "high-value" },
  { "condition": "total_price < 20", "tag": "low-value" },
  { "condition": "shipping_country != US", "tag": "international" },
  { "condition": "shipping_country = US", "tag": "domestic" },
  { "condition": "line_items_count > 5", "tag": "bulk-order" },
  { "condition": "customer_orders > 3", "tag": "repeat-buyer" },
  { "condition": "customer_orders = 1", "tag": "first-time" },
  { "condition": "risk_level = HIGH", "tag": "needs-review" },
  { "condition": "financial_status = PARTIALLY_REFUNDED", "tag": "partial-refund" },
  { "condition": "fulfillment_status = null", "tag": "unfulfilled" },
  { "condition": "discount_codes contains WELCOME", "tag": "welcome-discount" },
  { "condition": "product_type contains Subscription", "tag": "subscription-order" }
]
```

## Safety

> ⚠️ Mutation skill — always run with `dry_run: true` first to preview tag assignments before applying.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "created_at:>='<NOW - days_back days>'"`, `first: 250`, select `id`, `name`, `tags`, `totalPriceSet`, `shippingAddress { countryCode }`, `customer { numberOfOrders }`, `displayFinancialStatus`, `displayFulfillmentStatus`, `riskLevel`, `lineItems { product { productType } }`, `discountCodes`, pagination cursor
   **Expected output:** All recent orders with data needed for rule evaluation

2. For each order, evaluate all rules:
   - Parse each condition against order data
   - Collect all matching tags
   - If `skip_tagged: true`, exclude tags already present on the order

3. If `dry_run: true`: report matches without applying
   If `dry_run: false`:

4. **OPERATION:** `orderUpdate` — mutation (for each order needing new tags)
   **Inputs:** `{ id: <order_id>, tags: <existing_tags + new_tags> }`
   **Expected output:** Updated order with new tags
   **Batch:** Process in batches of 10 to respect rate limits

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query OrdersForTagging($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        tags
        totalPriceSet { shopMoney { amount currencyCode } }
        shippingAddress { countryCode provinceCode }
        customer { id numberOfOrders }
        displayFinancialStatus
        displayFulfillmentStatus
        riskLevel
        discountCodes
        lineItems(first: 20) {
          edges {
            node {
              product { productType }
              quantity
            }
          }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

```graphql
# orderUpdate:mutation — validated against api_version 2025-01
mutation TagOrder($input: OrderInput!) {
  orderUpdate(input: $input) {
    order { id name tags }
    userErrors { field message }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Automated Order Tagger               ║
║  Store: <store domain>                       ║
║  Mode: <DRY RUN | LIVE>                      ║
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
ORDER TAGGING REPORT  (<days_back> days, <mode>)
  Orders scanned:    <n>
  Orders matched:    <n>
  Tags applied:      <n>  (or "would apply" in dry run)
  ─────────────────────────────
  RULE MATCHES:
    "high-value"       → <n> orders
    "international"    → <n> orders
    "first-time"       → <n> orders
    "repeat-buyer"     → <n> orders

  Output: order_tags_<date>.csv
══════════════════════════════════════════════
```

## Output Format
CSV file `order_tags_<YYYY-MM-DD>.csv` with columns:
`order_id`, `order_name`, `existing_tags`, `new_tags`, `matched_rules`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Invalid rule | Unparseable condition | Skip rule, warn in output |
| `ACCESS_DENIED` | Missing write_orders scope | Switch to read-only mode, report matches only |

## Best Practices
- Always run `dry_run: true` first to preview changes.
- Tags are additive — this skill never removes existing tags.
- Use with `order-risk-report` to auto-tag risk levels.
- Combine with Shopify Flow for post-tagging automation (e.g., tag "high-value" → assign to VIP fulfillment queue).
- Useful for filtering orders in Shopify admin — tags make complex order segments searchable.
