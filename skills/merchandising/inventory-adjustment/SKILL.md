---
name: inventory-adjustment
role: merchandising
description: "Apply inventory quantity adjustments to specific variants at specific locations — after a cycle count, 3PL return batch, or sync discrepancy correction."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - productVariants:query
  - inventoryAdjustQuantities:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Applies inventory quantity corrections to specific variants at specific locations — the programmatic equivalent of manually editing inventory in the Shopify admin. Use after a cycle count reveals discrepancies, after a 3PL return batch posts late, or after the `multi-location-inventory-audit` skill identifies Available/Committed drift. Replaces manual row-by-row inventory editing in the Shopify admin.

## Prerequisites
- `shopify auth login --store <domain>`
- API scopes: `read_products`, `write_inventory`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |
| dry_run | bool | no | false | Preview operations without executing mutations |
| adjustments | array | yes | — | Array of `{sku, location_id, delta}` objects. `delta` is the signed quantity change (e.g., `+5` to add 5 units, `-3` to remove 3) |
| reason | string | no | `correction` | Adjustment reason logged to audit trail: `correction`, `cycle_count`, `damaged`, `received`, `reservation_created`, `reservation_deleted`, `shrinkage` |
| reference_document_uri | string | no | — | URI to link the adjustment to a PO, return, or cycle count document |

## Safety

> ⚠️ Step 2 executes `inventoryAdjustQuantities` which immediately changes live inventory quantities. Incorrect adjustments can cause overselling (if you reduce too far) or inflated stock counts (if you add incorrectly). Run with `dry_run: true` to see the before/after quantities per SKU before committing. The `reason` field is logged permanently in Shopify's inventory activity history.

## Workflow Steps

1. **OPERATION:** `productVariants` — query
   **Inputs:** For each `{sku}` in `adjustments`: look up the variant by SKU to get its `inventoryItem.id`; also fetch current `inventoryQuantity` for before/after comparison
   **Expected output:** Map of `{sku → inventoryItemId, currentQuantity}` for all adjustment targets; abort if any SKU is not found

2. **OPERATION:** `inventoryAdjustQuantities` — mutation
   **Inputs:** `changes` array of `{inventoryItemId, locationId, delta, ledgerDocumentUri}` using the reason and reference_document_uri parameters
   **Expected output:** `inventoryAdjustmentGroup.changes` with `quantityAfterChange` per item; `userErrors`

## GraphQL Operations

```graphql
# productVariants:query — validated against api_version 2025-01
query VariantBySku($first: Int!, $query: String) {
  productVariants(first: $first, query: $query) {
    edges {
      node {
        id
        sku
        inventoryQuantity
        inventoryItem {
          id
          tracked
        }
        product {
          title
        }
      }
    }
  }
}
```

```graphql
# inventoryAdjustQuantities:mutation — validated against api_version 2025-01
mutation InventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
  inventoryAdjustQuantities(input: $input) {
    inventoryAdjustmentGroup {
      id
      reason
      changes {
        name
        delta
        quantityAfterChange
        item {
          id
          sku
        }
        location {
          id
          name
        }
      }
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
║  SKILL: inventory-adjustment                 ║
║  Store: <store domain>                       ║
║  Started: <YYYY-MM-DD HH:MM UTC>             ║
╚══════════════════════════════════════════════╝
```

**After each step**, emit:
```
[N/TOTAL] <QUERY|MUTATION>  <OperationName>
          → Params: <brief summary of key inputs>
          → Result: <count or outcome, e.g., "143 records returned">
```

If `dry_run: true`, prefix every mutation step with `[DRY RUN]` and do not execute it.

**On completion**, emit:

For `format: human` (default):
```
══════════════════════════════════════════════
OUTCOME SUMMARY
  SKUs adjusted:        <value>
  Total units added:    <value>
  Total units removed:  <value>
  Errors:               <count, 0 if none>
  Output:               <filename or "none">
══════════════════════════════════════════════
```

For `format: json`, emit a JSON object with this schema:
```json
{
  "skill": "inventory-adjustment",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": false,
  "steps": [
    {
      "step": 1,
      "operation": "<OperationName>",
      "type": "query|mutation",
      "params_summary": "<string>",
      "result_summary": "<string>",
      "skipped": false
    }
  ],
  "outcome": {
    "skus_adjusted": 0,
    "total_units_added": 0,
    "total_units_removed": 0,
    "errors": 0,
    "output_file": "<filename|null>"
  }
}
```

## Output Format
CSV file `inventory-adjustments-<YYYY-MM-DD>.csv` with columns: `sku`, `product_title`, `location_name`, `quantity_before`, `delta`, `quantity_after`, `reason`.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| SKU not found | SKU doesn't exist in store | Verify SKU spelling; use `low-inventory-restock` to browse valid SKUs |
| `inventoryItem.tracked: false` | Variant has inventory tracking disabled | Enable tracking in Shopify admin before adjusting |
| `userErrors` from mutation | Invalid delta, invalid location, or permission issue | Check `write_inventory` scope and verify location GID |
| Delta would push quantity below 0 | Adjustment removes more than available | Confirm correct delta value; use negative delta only for known stock removals |

## Best Practices
1. Always run `dry_run: true` first — the before/after CSV preview lets you confirm every change before it hits live inventory.
2. Use `reason: cycle_count` with a `reference_document_uri` pointing to your count sheet — this creates a permanent audit trail in Shopify's inventory activity log.
3. Batch all corrections from a single count session into one command rather than applying one-at-a-time — the audit trail groups them under a single `inventoryAdjustmentGroup`.
4. After adjusting, run `multi-location-inventory-audit` again to confirm all discrepancies are resolved.
5. For 3PL return batches, use `reason: received` and link the return batch document URI — this makes reconciliation with your 3PL invoice straightforward.
