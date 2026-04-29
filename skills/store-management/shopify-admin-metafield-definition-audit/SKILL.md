---
name: shopify-admin-metafield-definition-audit
role: store-management
description: "Read-only: enumerates every metafield definition across all owner types and flags unused, undocumented, or duplicate-key definitions."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - metafieldDefinitions:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Inventories every metafield definition (PRODUCT, VARIANT, CUSTOMER, ORDER, COLLECTION, COMPANY, LOCATION, and others) and flags definitions that are unused (zero values stored), undocumented (missing description), or share a `namespace.key` collision across owner types. Definition sprawl is a leading source of theme/app bugs and slow Admin search. Read-only — no mutations. Provides the data foundation for a definition-cleanup workflow.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_products,read_customers,read_orders,read_inventory`
- API scopes: read scopes for any owner types in scope (defaults: `read_products`, `read_customers`, `read_orders`)

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| owner_types | string | no | all | Comma-separated owner types to scan (e.g. `PRODUCT,CUSTOMER`); `all` scans every supported type |
| flag_unused | bool | no | true | Flag definitions whose `metafieldsCount` is zero |
| flag_undocumented | bool | no | true | Flag definitions with empty/null `description` |
| flag_duplicates | bool | no | true | Flag `namespace.key` pairs that exist on more than one owner type |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time. No metafield definitions are deleted, updated, or pinned by this skill.

## Workflow Steps

1. Determine the list of owner types to scan from `owner_types` (default: full list).

2. **OPERATION:** `metafieldDefinitions` — query
   **Inputs:** For each owner type: `first: 250`, `ownerType: <TYPE>`, select `id`, `namespace`, `key`, `name`, `description`, `type { name }`, `pinnedPosition`, `metafieldsCount`, `validations { name value }`, pagination cursor
   **Expected output:** All definitions per owner type with usage counts; paginate until `hasNextPage: false`

3. Build flag set per definition:
   - `unused` — `metafieldsCount == 0` and `flag_unused: true`
   - `undocumented` — `description` is null or empty and `flag_undocumented: true`
   - `duplicate_key` — `namespace.key` appears on more than one owner type and `flag_duplicates: true`

4. Group results by owner type for the report and emit per-flag summaries.

## GraphQL Operations

```graphql
# metafieldDefinitions:query — validated against api_version 2025-01
query MetafieldDefinitionAudit($ownerType: MetafieldOwnerType!, $after: String) {
  metafieldDefinitions(first: 250, after: $after, ownerType: $ownerType) {
    edges {
      node {
        id
        namespace
        key
        name
        description
        ownerType
        pinnedPosition
        metafieldsCount
        type {
          name
          category
        }
        validations {
          name
          value
          type
        }
        access {
          admin
          storefront
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
║  SKILL: Metafield Definition Audit           ║
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
METAFIELD DEFINITION AUDIT
  Owner types scanned:    <n>
  Total definitions:      <n>

  By owner type:
    PRODUCT:    <n>   (unused: <n>, undocumented: <n>)
    VARIANT:    <n>   (unused: <n>, undocumented: <n>)
    CUSTOMER:   <n>   (unused: <n>, undocumented: <n>)
    ORDER:      <n>   (unused: <n>, undocumented: <n>)

  Flags:
    Unused definitions:        <n>
    Undocumented definitions:  <n>
    Duplicate keys:            <n>

  Examples:
    PRODUCT  custom.swatch_hex      unused (0 values)
    CUSTOMER custom.vip_tier        undocumented
    ORDER+CUSTOMER  custom.notes    duplicate key across owner types
  Output: metafield_def_audit_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "metafield-definition-audit",
  "store": "<domain>",
  "owner_types_scanned": 0,
  "total_definitions": 0,
  "unused_definitions": 0,
  "undocumented_definitions": 0,
  "duplicate_keys": 0,
  "output_file": "metafield_def_audit_<date>.csv"
}
```

## Output Format
CSV file `metafield_def_audit_<YYYY-MM-DD>.csv` with columns:
`definition_id`, `owner_type`, `namespace`, `key`, `name`, `type`, `description_present`, `metafields_count`, `pinned`, `is_unused`, `is_undocumented`, `is_duplicate_key`, `flags`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `ACCESS_DENIED` for an owner type | Caller lacks the read scope for that resource | Skip that owner type with a warning row in the CSV |
| `metafieldsCount` returns null | Owner type does not expose count, or count is still computing | Treat as `unknown`; do not flag as `unused` |
| Owner type not supported in API version | Newer owner type not yet available | Skip with warning; re-run after API version upgrade |

## Best Practices
- Run quarterly and after any app install/uninstall — apps frequently leave behind their definitions when removed.
- Do NOT bulk-delete unused definitions without first searching the storefront theme for references to that `namespace.key`. Theme liquid may read a definition that has zero saved values yet (e.g., a newly added field that has not been populated).
- Pin the most-used definitions (`pinnedPosition` set) to surface them in the merchant Admin UI; un-pinned but heavily used definitions are a UX smell.
- Duplicate keys across owner types are not always wrong (e.g., `custom.notes` on both ORDER and CUSTOMER may be intentional) but they almost always indicate copy-paste creation — review for consistency in `type` and `validations`.
- Pair with a metafield-value sampling skill (per owner type) before any cleanup to confirm true zero usage; counts can lag in fresh stores.
- Keep the CSV in version control alongside theme/app schema docs — the diff over time is the cleanest record of catalog-data evolution.
