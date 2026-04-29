---
name: shopify-admin-product-affinity-cross-sell
role: order-intelligence
description: "Mine order history to find which products are most frequently bought together, then rank pairs by support, confidence, and lift to power bundles and cross-sell recommendations."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Applies market basket analysis to your order history to surface product pairs that customers naturally buy together. For every co-purchased pair it calculates **support** (how often the pair appears), **confidence** (given product A, how likely is B?), and **lift** (how much more likely than chance). The output is actionable input for product bundles, "frequently bought together" widgets, cross-sell email flows, and homepage recommendations. Read-only — no mutations are executed.

## Prerequisites
- Authenticated Shopify CLI session: `shopify auth login --store <domain>`
- API scopes: `read_orders`, `read_products` (validator-confirmed: line item `product` field traverses the product graph)

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |
| dry_run | bool | no | false | Preview operations without executing mutations |
| date_range_start | string | yes | — | Start date in ISO 8601 (e.g., `2025-01-01`) |
| date_range_end | string | yes | — | End date in ISO 8601 (e.g., `2025-03-31`) |
| min_support | integer | no | 5 | Minimum number of orders a pair must co-appear in to be included |
| min_confidence | float | no | 0.1 | Minimum P(B\|A) threshold (0–1) |
| min_lift | float | no | 1.0 | Only include pairs where lift > this value (> 1 means non-random) |
| top_n | integer | no | 20 | Number of top pairs to show in the ranked output |
| sort_by | string | no | lift | Ranking metric: `lift`, `confidence`, or `support` |
| exclude_tags | string | no | — | Comma-separated product tags to exclude (e.g., `gift-wrap,donation`) |

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `first: 250`, `query: "created_at:>='<date_range_start>' created_at:<='<date_range_end>'"`, pagination cursor; select `lineItems` with `product { id, title }` and `quantity`; skip orders with a single line item
   **Expected output:** All multi-item orders in range; paginate until `hasNextPage: false`; build a product frequency map (`product_id → order_count`) and a pair frequency map (`(product_a_id, product_b_id) → co_occurrence_count`)

2. **In-memory analysis:**
   - For each order with ≥ 2 distinct products, enumerate every unique unordered pair and increment the pair counter
   - Compute metrics for each pair that meets `min_support`:
     - **Support** = `pair_count / total_orders`
     - **Confidence A→B** = `pair_count / count(orders containing A)`
     - **Confidence B→A** = `pair_count / count(orders containing B)`
     - **Lift** = `support / (P(A) × P(B))`
   - Filter by `min_confidence` and `min_lift`; sort by `sort_by`; truncate to `top_n`

## GraphQL Operations

```graphql
# orders:query (multi-item basket analysis) — validated against api_version 2025-01
query OrdersForAffinityAnalysis($first: Int!, $after: String, $query: String) {
  orders(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        createdAt
        lineItems(first: 50) {
          edges {
            node {
              quantity
              product {
                id
                title
                tags
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

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: product-affinity-cross-sell          ║
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

**On completion**, emit:

For `format: human` (default):
```
══════════════════════════════════════════════
OUTCOME SUMMARY
  Orders analysed:      <n>
  Unique products:      <n>
  Pairs evaluated:      <n>
  Pairs above threshold:<n>
  Date range:           <start> to <end>
  Sort by:              <lift|confidence|support>
  Errors:               0
  Output:               product_affinity_<date>.csv
══════════════════════════════════════════════
```

Followed by an inline ranked table of the top `top_n` pairs:

| Rank | Product A | Product B | Support | Conf A→B | Conf B→A | Lift |
|------|-----------|-----------|---------|----------|----------|------|
| 1 | ... | ... | ... | ...% | ...% | ... |

For `format: json`, emit:
```json
{
  "skill": "product-affinity-cross-sell",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": false,
  "steps": [
    { "step": 1, "operation": "OrdersForAffinityAnalysis", "type": "query", "params_summary": "<date_range_start> to <date_range_end>", "result_summary": "<n> orders, <n> multi-item baskets", "skipped": false }
  ],
  "outcome": {
    "orders_analysed": 0,
    "unique_products": 0,
    "pairs_evaluated": 0,
    "pairs_above_threshold": 0,
    "date_range_start": "<date_range_start>",
    "date_range_end": "<date_range_end>",
    "sort_by": "lift",
    "results": [],
    "errors": 0,
    "output_file": "product_affinity_<date>.csv"
  }
}
```

## Output Format
CSV file `product_affinity_<YYYY-MM-DD>.csv` with one row per qualifying pair:

| Column | Description |
|--------|-------------|
| `rank` | Position in sorted output |
| `product_a_id` | Shopify product GID for the first item |
| `product_a_title` | Product A name |
| `product_b_id` | Shopify product GID for the second item |
| `product_b_title` | Product B name |
| `co_occurrence_count` | Number of orders containing both products |
| `support` | `co_occurrence_count / total_orders` |
| `confidence_a_to_b` | P(B\|A) — likelihood of B given A is in cart |
| `confidence_b_to_a` | P(A\|B) — likelihood of A given B is in cart |
| `lift` | How much more likely than random co-occurrence |
| `recommendation_type` | `bundle_candidate` if lift > 2, else `cross_sell` |

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit from paginating large order history | Wait 2 s, retry up to 3 times; narrow date range if persistent |
| `product` is null on line item | Product was deleted after purchase | Skip that item from pair analysis; count the order in the total |
| Zero pairs above threshold | Store has few multi-item orders or thresholds too strict | Lower `min_support` to 2 and `min_confidence` to 0.05, or widen date range |
| Combinatorial explosion | Stores with very large line item counts per order | The pair-enumeration loop skips orders with > 20 distinct products to cap O(n²) growth |

## Best Practices
1. Use at least 90 days of order history — short windows produce noisy lift scores because the probability denominators are small.
2. **Lift > 2** is a strong bundle signal: customers are buying these products together at least twice as often as chance would predict.
3. **Confidence A→B > 30%** makes for a reliable "frequently bought with" widget: three in ten shoppers who buy A also buy B.
4. Filter out accessories and add-ons (like gift wrap or donation SKUs) with `exclude_tags` before ranking — they inflate support scores without being meaningful cross-sell pairs.
5. Use the `recommendation_type` column to split your output: `bundle_candidate` pairs are best for pre-built bundles or volume discounts; `cross_sell` pairs are better suited to cart upsells and post-purchase email recommendations.
6. Re-run quarterly — seasonal products enter and exit the top pairs list, and ignoring that produces stale recommendations.
