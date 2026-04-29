---
name: shopify-admin-cogs-completeness-audit
role: merchandising
description: "Read-only: identifies products and variants that are missing inventoryItem.unitCost so margin and inventory valuation reports stay accurate."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - productVariants:query
  - inventoryItems:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Scans every variant in the catalog and surfaces those whose `inventoryItem.unitCost` is missing or zero. Cost of goods sold (COGS) is the foundation for margin reporting, profit-based pricing decisions, and inventory valuation — a single missing cost silently corrupts every downstream calculation. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_products,read_inventory`
- API scopes: `read_products`, `read_inventory`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| status_filter | string | no | ACTIVE | Variant product status to audit: `ACTIVE`, `DRAFT`, `ARCHIVED`, or `ALL` |
| vendor_filter | string | no | — | Optional vendor to scope the audit |
| include_zero_cost | bool | no | true | Treat `unitCost = 0` as missing (recommended; zero cost is rarely intentional) |
| only_stocked | bool | no | true | Limit to variants with `inventoryQuantity > 0` |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time. The skill flags missing data; remediation should happen through a follow-up workflow that you control.

## Workflow Steps

1. **OPERATION:** `productVariants` — query
   **Inputs:** `first: 250`, `query: <built from status_filter and vendor_filter>`, select `sku`, `price`, `inventoryQuantity`, `inventoryItem { id }`, `product { title, vendor, status, productType }`, pagination cursor
   **Expected output:** All matching variants; paginate until `hasNextPage: false`

2. **OPERATION:** `inventoryItems` — query
   **Inputs:** Batched `inventoryItemIds` (≤100 per request)
   **Expected output:** `unitCost { amount, currencyCode }`, `tracked`

3. Filter to variants where `unitCost == null` or `unitCost.amount == 0` (when `include_zero_cost: true`). Compute potential margin gap as `price - 0 = price` for the missing-cost variants — this is the fictional margin downstream reports will show.

4. Summarize: count missing, % of catalog, total stock-value impact (`sum of inventoryQuantity * price` across missing rows since you cannot value them on cost).

## GraphQL Operations

```graphql
# productVariants:query — validated against api_version 2025-01
query VariantsForCogsAudit($query: String, $after: String) {
  productVariants(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        sku
        title
        price
        inventoryQuantity
        product {
          id
          title
          vendor
          status
          productType
        }
        inventoryItem {
          id
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
# inventoryItems:query — validated against api_version 2025-01
query InventoryItemCosts($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on InventoryItem {
      id
      tracked
      sku
      unitCost {
        amount
        currencyCode
      }
    }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: COGS Completeness Audit              ║
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
COGS COMPLETENESS AUDIT
  Variants audited:        <n>
  Missing unit cost:       <n>  (<pct>%)
  Stocked + missing cost:  <n>
  Catalog value at risk:   $<amount> (priced, not costed)

  Top vendors by missing variants:
    <vendor>  Missing: <n>  Stocked: <n>
  Output: cogs_audit_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "cogs-completeness-audit",
  "store": "<domain>",
  "variants_audited": 0,
  "missing_cost": 0,
  "missing_cost_pct": 0,
  "stocked_missing": 0,
  "value_at_risk": 0,
  "currency": "USD",
  "output_file": "cogs_audit_<date>.csv"
}
```

## Output Format
CSV file `cogs_audit_<YYYY-MM-DD>.csv` with columns:
`variant_id`, `inventory_item_id`, `sku`, `product_title`, `vendor`, `product_status`, `price`, `unit_cost`, `inventory_quantity`, `value_at_price`, `currency`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `inventoryItem` is null | Variant has no inventory item (rare) | Skip, note in error count |
| `unitCost.currencyCode` differs from store currency | Multi-currency cost capture | Treat as present; do not flag, surface currency mismatch separately |
| All variants have costs | Healthy catalog | Exit with summary: 0 missing, 100% complete |

## Best Practices
- Run monthly; whenever new vendors or product lines are onboarded, run on day one of activation to catch missing costs before margin reports are trusted.
- Filter by `vendor_filter` to assign remediation work to the buyer responsible for that vendor's data.
- Pair with `inventory-valuation-report` — that report will silently treat missing-cost SKUs as worthless inventory unless this audit is clean.
- Treat `unitCost = 0` as missing by default. Genuine zero-cost SKUs (free samples, GWP) are rare; tag those with a `zero-cost-intentional` product tag and exclude them from the audit via `vendor_filter` or downstream filtering.
- Use the CSV as a worklist: hand it to the merchandising team for cost capture, then re-run weekly until the missing count is zero.
