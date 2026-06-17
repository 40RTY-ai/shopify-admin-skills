---
name: shopify-admin-agentic-product-jsonld-backfill
role: agentic
description: "Backfill the structured product/variant fields that power Product JSON-LD — barcode (GTIN), SKU, vendor, product type, weight — so AI agents can quote exact, in-stock items instead of guessing."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - products:query
  - productUpdate:mutation
  - productVariantsBulkUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
audit_signals:
  - product-schema-jsonld
  - gtin-sku-pdp
  - variant-metadata
---

## Purpose
AI shopping agents read a product's structured data (the fields Shopify themes emit as `schema.org/Product` JSON-LD) to confirm price, availability, and identity. Missing barcodes (GTIN), SKUs, vendor, or product type leave the listing ambiguous — so the agent skips it or recommends a competitor whose data is complete. This skill finds products/variants with those gaps and backfills them: vendor and product type at the product level, barcode/SKU at the variant level. Fixes the agentiq.report findings `product-schema-jsonld`, `gtin-sku-pdp`, and `variant-metadata`.

## Prerequisites
- Authenticated Shopify CLI session (`shopify auth login --store <domain>`)
- Required API scopes: `read_products`, `write_products`

## Parameters
All skills accept these universal parameters:

| Parameter | Type   | Required | Default | Description |
|-----------|--------|----------|---------|-------------|
| store     | string | yes      | —       | Store domain (e.g., mystore.myshopify.com) |
| format    | string | no       | human   | Output format: `human` (default) or `json` |
| dry_run   | bool   | no       | false   | Preview mutations without executing |

Skill-specific parameters:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| collection_id | string | no | — | Limit to a collection GID (else whole catalog) |
| tag | string | no | — | Limit to a product tag |
| set_vendor | string | no | — | Vendor to apply where missing (else only reports) |
| set_product_type | string | no | — | Product type to apply where missing |
| barcodes_csv | string | no | — | Path to a CSV of `sku,barcode` to map GTINs onto matching variants |
| fields | string | no | all | Comma list of fields to backfill: `vendor,product_type,barcode,sku` |

## Safety

> ⚠️ Step 3 (`productUpdate`) and Step 4 (`productVariantsBulkUpdate`) write live product/variant data. Barcodes and SKUs are matched from your `barcodes_csv`; a wrong mapping mislabels a product's identity to every agent. Always run `dry_run: true` first and verify the change set CSV. This skill never overwrites a field that already has a value — it only fills blanks.

## Workflow Steps

1. **OPERATION:** `products` — query
   **Inputs:** `first: 250`, optional `query: "tag:'<tag>'"` or collection filter; fields `vendor`, `productType`, `variants{ id sku barcode }`; paginate until `hasNextPage: false`.
   **Expected output:** Products/variants with missing target fields.

2. **COMPUTE (no API):** build the change set — only blank fields, joined to `barcodes_csv` by SKU for barcodes. Emit the preview CSV.

3. **OPERATION:** `productUpdate` — mutation
   **Inputs:** per product `{ id, vendor?, productType? }` (only where blank and a value is supplied).
   **Expected output:** Updated product; collect `userErrors`.

4. **OPERATION:** `productVariantsBulkUpdate` — mutation
   **Inputs:** per product `productId` + `variants: [{ id, barcode?, inventoryItem: { sku? } }]` for blank variant fields.
   **Expected output:** Updated variants; collect `userErrors` across batches.

## GraphQL Operations

```graphql
# products:query — validated against api_version 2025-01
query BackfillProducts($first: Int!, $after: String, $query: String) {
  products(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        title
        vendor
        productType
        variants(first: 100) {
          edges { node { id sku barcode } }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

```graphql
# productUpdate:mutation — validated against api_version 2025-01
mutation BackfillProductFields($input: ProductInput!) {
  productUpdate(input: $input) {
    product { id vendor productType }
    userErrors { field message }
  }
}
```

```graphql
# productVariantsBulkUpdate:mutation — validated against api_version 2025-01
mutation BackfillVariantFields($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id sku barcode }
    userErrors { field message }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: <skill name>                         ║
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
  <Metric label>:   <value>
  Errors:           0
  Output:           <filename or "none">
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "<skill-slug>",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": false,
  "steps": [
    {
      "step": 1,
      "operation": "<OperationName>",
      "type": "query",
      "params_summary": "<string>",
      "result_summary": "<string>",
      "skipped": false
    }
  ],
  "outcome": {
    "metric_key": 0,
    "errors": 0,
    "output_file": null
  }
}
```

## Output Format
`human`: counts of products/variants updated per field + a CSV of every change (`product, variant, field, old, new`). `json`: `{ products_updated, variants_updated, by_field{...}, errors, output_file }`.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit | Wait 2s, retry up to 3 times |
| `userErrors` non-empty | Invalid barcode/SKU format or duplicate | Log message, skip that variant, continue |
| SKU not in CSV | No mapping supplied for that variant | Leave barcode blank, report it as still-missing |

## Best Practices
- Run `shopify-admin-agentic-readiness-audit` first to size the gap, then `dry_run: true` here to review the exact change set.
- Barcodes are GTIN/UPC/EAN — get them from your supplier, never invent them. A wrong GTIN is worse than a blank one.
- This skill only fills blanks; to correct existing-but-wrong values use `shopify-admin-bulk-price-adjustment`-style targeted edits instead.
- Pair with `shopify-admin-agentic-metafields-setup` — barcodes power JSON-LD identity, metafields power agent filtering; you usually want both.
