---
name: shopify-admin-bundle-availability-check
role: fulfillment-ops
description: "Read-only: for native bundle products and metafield-defined bundles, verifies every component variant has sufficient stock to fulfill the bundle's effective availability."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - products:query
  - productVariants:query
  - inventoryItems:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Walks every product flagged as a bundle (either via Shopify's native `requiresComponents` mechanic or a `bundle.components` metafield convention), then verifies each component variant has sufficient inventory to back the bundle's quantity ratio. Surfaces bundles that are listed as in-stock on the storefront but cannot actually be fulfilled because one component has run out. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_products,read_inventory`
- API scopes: `read_products`, `read_inventory`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| metafield_namespace | string | no | bundle | Metafield namespace where bundle component definitions live |
| metafield_key | string | no | components | Metafield key that holds the JSON list of `{variantId, quantity}` |
| safety_stock | integer | no | 0 | Treat component as out-of-stock if on-hand minus this buffer is below required |
| only_listed | bool | no | true | Only check bundle products with status `ACTIVE` |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time. The skill reads inventory and metafields only; it never adjusts component quantities or bundle availability.

## Workflow Steps

1. **OPERATION:** `products` — query
   **Inputs:** `first: 250`, `query: "metafield:<namespace>.<key>:* OR product_type:bundle"`, select `requiresSellingPlan`, `status`, `metafield(namespace, key)`, `variants`, pagination cursor
   **Expected output:** Bundle products and their parent variants; paginate until `hasNextPage: false`

2. For each bundle, parse component list. Native bundles use `productVariant.requiresComponents` and `productVariant.productVariantComponents`. Metafield bundles parse JSON value into `[{variantId, quantity}]`.

3. **OPERATION:** `productVariants` — query
   **Inputs:** Batched IDs of all unique component variants, select `inventoryQuantity`, `inventoryItem { id }`, `product { title }`
   **Expected output:** On-hand quantity per component

4. **OPERATION:** `inventoryItems` — query
   **Inputs:** Batched component inventory item IDs, select `tracked`, `inventoryLevels(first: 25) { quantities }`
   **Expected output:** Per-location quantity for each component

5. For each bundle, compute `max_buildable_units = floor(min over components of (component_on_hand - safety_stock) / required_qty)`. Flag bundles where `max_buildable_units == 0` (broken bundle) or `< min_listed_inventory_threshold`.

## GraphQL Operations

```graphql
# products:query — validated against api_version 2025-01
query BundleProducts($query: String!, $after: String, $namespace: String!, $key: String!) {
  products(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        title
        status
        productType
        metafield(namespace: $namespace, key: $key) {
          id
          value
          type
        }
        variants(first: 100) {
          edges {
            node {
              id
              title
              sku
              inventoryQuantity
              requiresComponents
              productVariantComponents(first: 50) {
                edges {
                  node {
                    quantity
                    productVariant {
                      id
                      sku
                      inventoryQuantity
                      product {
                        id
                        title
                      }
                    }
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
# productVariants:query — validated against api_version 2025-01
query ComponentVariantStock($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on ProductVariant {
      id
      sku
      inventoryQuantity
      product {
        id
        title
      }
      inventoryItem {
        id
        tracked
      }
    }
  }
}
```

```graphql
# inventoryItems:query — validated against api_version 2025-01
query ComponentInventoryLevels($ids: [ID!]!) {
  nodes(ids: $ids) {
    ... on InventoryItem {
      id
      tracked
      inventoryLevels(first: 25) {
        edges {
          node {
            location {
              id
              name
            }
            quantities(names: ["available", "on_hand", "committed"]) {
              name
              quantity
            }
          }
        }
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
║  SKILL: Bundle Availability Check            ║
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
BUNDLE AVAILABILITY CHECK
  Bundles inspected:       <n>
  Fully buildable:         <n>
  Constrained (low):       <n>
  Broken (cannot build):   <n>

  Top broken bundles:
    "<bundle>"  Bottleneck: "<component>"  Need: <n>  Have: <n>
  Output: bundle_availability_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "bundle-availability-check",
  "store": "<domain>",
  "bundles_inspected": 0,
  "fully_buildable": 0,
  "constrained": 0,
  "broken": 0,
  "issues": [],
  "output_file": "bundle_availability_<date>.csv"
}
```

## Output Format
CSV file `bundle_availability_<YYYY-MM-DD>.csv` with columns:
`bundle_product_id`, `bundle_title`, `bundle_variant_sku`, `max_buildable_units`, `bottleneck_component_sku`, `bottleneck_component_title`, `bottleneck_required_qty`, `bottleneck_on_hand`, `status`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Metafield value is invalid JSON | Malformed configuration | Skip bundle, log warning, include in error count |
| Component variant ID does not resolve | Component product was deleted | Mark bundle as `BROKEN_REFERENCE`, include in output |
| Component is `tracked: false` | Untracked inventory | Treat component as infinitely available, note in output |

## Best Practices
- Run daily for stores with many bundles; surface broken bundles before customers can buy something you cannot ship.
- Use `safety_stock` to keep a buffer for non-bundle sales of the same component — bundles share inventory with standalone variants.
- Pair with `inventory-adjustment` or `low-inventory-restock` to action a broken bundle into a reorder.
- For native bundles, `requiresComponents: true` is authoritative — prefer it over metafield conventions when both exist.
- A bundle with `max_buildable_units = 0` should also be temporarily unpublished until the bottleneck component is restocked; consider chaining this skill with `product-lifecycle-manager`.
