---
name: shopify-admin-restock-on-return
role: returns
description: "For approved/closed returns, restocks inventory at the return location by adjusting on-hand quantities for each returned line item."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - returns:query
  - inventoryAdjustQuantities:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Walks through recently approved or closed returns and restocks inventory for each `returnLineItem` whose physical item has been received and inspected. Adjusts the `available` quantity at the return's destination location using `inventoryAdjustQuantities` with reason `restock` and a `referenceDocumentUri` linking to the return record. Use when warehouse processing posts in a separate system from Shopify, or when manual restock has been deferred and needs a clean catch-up run.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_returns,write_inventory,read_locations`
- API scopes: `read_returns`, `read_inventory`, `write_inventory`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |
| dry_run | bool | no | true | Preview restock plan without executing inventory mutations |
| days_back | integer | no | 14 | Lookback window for recently completed returns |
| return_status | string | no | CLOSED | Only restock returns in this status: `CLOSED`, `OPEN`, or `ANY` |
| location_id | string | no | — | If set, restock only returns whose inventory destination matches this location GID |
| restock_only_return_reasons | array | no | — | If set (e.g., `["UNWANTED", "SIZE_TOO_SMALL"]`), restock only items returned for these reasons; `DEFECTIVE` is excluded by default |
| skip_defective | bool | no | true | Exclude `returnLineItem.returnReason: DEFECTIVE` items from restock |

## Safety

> ⚠️ Step 2 executes `inventoryAdjustQuantities` mutations that immediately add units to the `available` count at the destination location. Restocking damaged or unsalable inventory inflates available stock and causes oversells. The default is `dry_run: true` — review the preview CSV to confirm each return line item is genuinely sellable before committing. By default `skip_defective: true` excludes `DEFECTIVE` returns. Each restock posts a permanent entry in Shopify's inventory activity log with reason `restock`.

## Workflow Steps

1. **OPERATION:** `returns` — query
   **Inputs:** `query: "status:<return_status> updated_at:>='<NOW - days_back days>'"` (use `updated_at:>='...'` only when `return_status:ANY`), `first: 250`, select `id`, `name`, `status`, `closedAt`, `order { id name }`, `returnLineItems(first: 50) { quantity, returnReason, fulfillmentLineItem { lineItem { variant { id sku inventoryItem { id tracked } } } } }`, `reverseFulfillmentOrders(first: 5) { reverseDeliveries(first: 5) { deliverable { ... on ReverseDeliveryShippingDeliverable { label { ... } } } }, location { id name } }`, pagination cursor
   **Expected output:** Returns with their line items, return reasons, inventory item IDs, and destination location

2. Build the restock plan: for each `returnLineItem` not previously restocked, where `returnReason` is allowed by params and `inventoryItem.tracked: true`, group by `(inventoryItemId, locationId)` summing `quantity` deltas. Skip items where the variant is missing, where `tracked: false`, or where the return has no destination location.

3. **OPERATION:** `inventoryAdjustQuantities` — mutation
   **Inputs:** `input.reason: "restock"`, `input.name: "available"`, `input.referenceDocumentUri: "shopify://returns/<return_id>"`, `input.changes: [{ inventoryItemId, locationId, delta: +<quantity> }, ...]`
   **Expected output:** `inventoryAdjustmentGroup.changes` with `quantityAfterChange` per item; `userErrors`

## GraphQL Operations

```graphql
# returns:query — validated against api_version 2025-01
query ReturnsForRestock($query: String!, $after: String) {
  returns(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        status
        closedAt
        order {
          id
          name
        }
        returnLineItems(first: 50) {
          edges {
            node {
              id
              quantity
              returnReason
              returnReasonNote
              fulfillmentLineItem {
                lineItem {
                  id
                  title
                  variant {
                    id
                    sku
                    inventoryItem {
                      id
                      tracked
                    }
                  }
                }
              }
            }
          }
        }
        reverseFulfillmentOrders(first: 5) {
          edges {
            node {
              id
              reverseDeliveries(first: 5) {
                edges {
                  node {
                    id
                  }
                }
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
# inventoryAdjustQuantities:mutation — validated against api_version 2025-01
mutation RestockOnReturn($input: InventoryAdjustQuantitiesInput!) {
  inventoryAdjustQuantities(input: $input) {
    inventoryAdjustmentGroup {
      id
      reason
      referenceDocumentUri
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
║  SKILL: Restock on Return                    ║
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
RESTOCK ON RETURN
  Returns scanned:        <n>
  Line items eligible:    <n>
  Skipped (defective):    <n>
  Skipped (untracked):    <n>
  Units restocked:        <n>  (or "skipped — dry_run")
  Adjustment groups:      <n>
  Errors:                 <n>
  Output:                 restock_on_return_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "restock-on-return",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": true,
  "outcome": {
    "returns_scanned": 0,
    "line_items_eligible": 0,
    "skipped_defective": 0,
    "skipped_untracked": 0,
    "units_restocked": 0,
    "adjustment_groups": 0,
    "errors": 0,
    "output_file": "restock_on_return_<date>.csv"
  }
}
```

## Output Format
CSV file `restock_on_return_<YYYY-MM-DD>.csv` with columns:
`return_id`, `return_name`, `order_name`, `sku`, `product_title`, `quantity_restocked`, `return_reason`, `location_name`, `quantity_after`, `inventory_item_id`, `status`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `inventoryItem.tracked: false` | Tracking disabled on variant | Log and skip; require manual enable |
| `userErrors` from inventoryAdjustQuantities | Invalid location or item | Verify GIDs match the return's destination |
| Return has no destination location | No reverse delivery confirmed yet | Skip the return; rerun after delivery is confirmed |
| Variant deleted | Product removed after sale | Skip line item; log for review |

## Best Practices
- Always run with `dry_run: true` first and audit the preview CSV — restocking damaged units inflates inventory and causes oversells downstream.
- Keep `skip_defective: true` for normal operations. Set it to `false` only after explicitly inspecting defective units and confirming they're refurbishable.
- Use `restock_only_return_reasons: ["UNWANTED", "SIZE_TOO_SMALL", "SIZE_TOO_LARGE", "STYLE", "COLOR"]` to focus on reasons that almost always yield resalable inventory.
- Set `location_id` when running per-warehouse — it constrains the run to one site's reverse logistics workflow.
- Cross-reference the post-run output with `multi-location-inventory-audit` to confirm restocked SKUs reconcile cleanly.
- For active returns where physical inspection has not occurred, defer restock until `status: CLOSED` (default) — never restock on `OPEN` returns based solely on customer claim.
