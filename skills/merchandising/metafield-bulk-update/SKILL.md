---
name: metafield-bulk-update
role: merchandising
description: "Bulk set or delete metafields on products, variants, or customers filtered by tag or collection."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - products:query
  - metafieldsSet:mutation
  - metafieldsDelete:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Queries products (or variants, or customers) matching a filter and bulk-sets or bulk-deletes metafield values. Used for structured data updates like material composition, care instructions, product specifications, or custom attributes that power storefront features.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_products,write_products`
- API scopes: `read_products`, `write_products`
- Metafield namespace and key must already exist or be created on first set

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| resource_type | string | no | product | Resource to update: `product`, `variant`, or `customer` |
| filter | string | yes | — | Filter query (e.g., `tag:summer-2026`, `vendor:Nike`) |
| namespace | string | yes | — | Metafield namespace (e.g., `custom`) |
| key | string | yes | — | Metafield key (e.g., `material`) |
| value | string | no | — | Value to set. If omitted and `action: delete`, metafield is deleted |
| value_type | string | no | single_line_text_field | Metafield type (e.g., `single_line_text_field`, `boolean`, `number_integer`) |
| action | string | no | set | `set` or `delete` |
| dry_run | bool | no | true | Preview without executing mutations |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ⚠️ `metafieldsSet` overwrites existing metafield values — there is no merge. `metafieldsDelete` permanently removes the metafield value from the resource. Run with `dry_run: true` to confirm the affected product list and verify namespace/key are correct before committing.

## Workflow Steps

1. **OPERATION:** `products` — query
   **Inputs:** `query: <filter>`, `first: 250`, select metafield values for the target namespace/key, pagination cursor
   **Expected output:** Products with existing metafield values (for reference); paginate until `hasNextPage: false`

2. **OPERATION:** `metafieldsSet` — mutation (if `action: set`)
   **Inputs:** Array of `{ ownerId, namespace, key, value, type }` objects
   **Expected output:** `metafields { id, key, value }`, `userErrors`

3. **OPERATION:** `metafieldsDelete` — mutation (if `action: delete`)
   **Inputs:** Array of `{ ownerId, namespace, key }` objects
   **Expected output:** `deletedMetafields { ownerId }`, `userErrors`

## GraphQL Operations

```graphql
# products:query — validated against api_version 2025-01
query ProductsWithMetafield($query: String!, $namespace: String!, $key: String!, $after: String) {
  products(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        title
        metafield(namespace: $namespace, key: $key) {
          id
          value
          type
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
# metafieldsSet:mutation — validated against api_version 2025-01
mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      namespace
      key
      value
      type
      owner {
        ... on Product {
          id
          title
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

```graphql
# metafieldsDelete:mutation — validated against api_version 2025-01
mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
  metafieldsDelete(metafields: $metafields) {
    deletedMetafields {
      ownerId
      namespace
      key
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
║  SKILL: Metafield Bulk Update                ║
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
  Resources matched:      <n>
  Metafields set/deleted: <n>
  Errors:                 <n>
  Output:                 metafield_update_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "metafield-bulk-update",
  "store": "<domain>",
  "started_at": "<ISO8601>",
  "completed_at": "<ISO8601>",
  "dry_run": true,
  "namespace": "<ns>",
  "key": "<key>",
  "action": "set",
  "outcome": {
    "matched": 0,
    "updated": 0,
    "errors": 0,
    "output_file": "metafield_update_<date>.csv"
  }
}
```

## Output Format
CSV file `metafield_update_<YYYY-MM-DD>.csv` with columns:
`resource_type`, `resource_id`, `title`, `namespace`, `key`, `old_value`, `new_value`, `action`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `userErrors` — invalid type | `value` doesn't match `value_type` | Log error, skip resource, continue |
| `userErrors` — namespace/key not found on delete | Metafield doesn't exist | Log as skipped (already absent) |
| No products match filter | Filter too narrow | Exit with 0 matches |

## Best Practices
- `metafieldsSet` is batched — the mutation accepts up to 25 metafields per call. The skill automatically batches large product sets.
- Always verify the `namespace` and `key` match your store's metafield definitions — typos create orphaned metafields that don't connect to any theme feature.
- For storefront-powered metafields (e.g., displayed in product templates), confirm the theme reads the correct namespace/key before running at scale.
- Use `dry_run: true` to preview exactly which products and current values will be affected before overwriting.
