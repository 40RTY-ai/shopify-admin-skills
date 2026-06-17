---
name: shopify-admin-agentic-metafields-setup
role: agentic
description: "Define and populate agentic-commerce metafields (material, attributes, key features, specs, sizing) so AI agents can filter and match products to specific shopper requirements."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - metafieldDefinitions:query
  - metafieldDefinitionCreate:mutation
  - products:query
  - metafieldsSet:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
audit_signals:
  - listing-metafields
  - variant-metadata
  - sizing-specs-structured
---

## Purpose
AI agents answer constrained queries — "squat-proof leggings under $60", "eucalyptus slip-ons", "machine-washable wool" — by filtering on structured attributes. If those attributes live only in prose (or nowhere), the agent can't filter and your products drop out of the result set. This skill establishes a small, standard set of **agentic metafield definitions** (material, key features, care, fit, specs) and populates them across the catalog from existing product signals, so agents can match products to requirements. Fixes `listing-metafields`, `variant-metadata`, and `sizing-specs-structured`.

## Prerequisites
- Authenticated Shopify CLI session (`shopify auth login --store <domain>`)
- Required API scopes: `read_products`, `write_products`, `read_metaobject_definitions`, `write_metaobject_definitions` (for definitions)

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
| namespace | string | no | agentic | Metafield namespace to create/populate under |
| keys | string | no | material,features,care,fit,specs | Comma list of metafield keys to ensure exist |
| collection_id | string | no | — | Limit population to a collection GID |
| tag | string | no | — | Limit population to a product tag |
| populate_from | string | no | tags,options,description | Sources to infer values from (no fabrication beyond these) |

## Safety

> ⚠️ Step 2 (`metafieldDefinitionCreate`) and Step 4 (`metafieldsSet`) write store schema + product data. Definitions are cheap to add but clutter the admin if mis-namespaced; values written from inference can be wrong. Run `dry_run: true`, review the proposed definitions and the value preview, and only populate values inferred with high confidence — leave the rest blank for human fill.

## Workflow Steps

1. **OPERATION:** `metafieldDefinitions` — query
   **Inputs:** `ownerType: PRODUCT`, `namespace: <namespace>`
   **Expected output:** Which target keys already have definitions (skip those).

2. **OPERATION:** `metafieldDefinitionCreate` — mutation
   **Inputs:** one per missing key: `{ namespace, key, name, ownerType: PRODUCT, type: "single_line_text_field" | "list.single_line_text_field" }`
   **Expected output:** Created definitions; collect `userErrors` (e.g. already-taken).

3. **OPERATION:** `products` — query
   **Inputs:** `first: 250`, optional filter; fields `tags`, `options`, `descriptionHtml`, existing `metafields(namespace)`; paginate.
   **Expected output:** Products + the signals to infer attribute values from.

4. **OPERATION:** `metafieldsSet` — mutation
   **Inputs:** batches of `{ ownerId, namespace, key, value, type }` for confidently-inferred, currently-empty values.
   **Expected output:** Set metafields; collect `userErrors`.

## GraphQL Operations

```graphql
# metafieldDefinitions:query — validated against api_version 2025-01
query AgenticMetafieldDefs($namespace: String!) {
  metafieldDefinitions(first: 50, ownerType: PRODUCT, namespace: $namespace) {
    edges { node { id namespace key name type { name } } }
  }
}
```

```graphql
# metafieldDefinitionCreate:mutation — validated against api_version 2025-01
mutation AgenticMetafieldDefCreate($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition { id namespace key }
    userErrors { field message code }
  }
}
```

```graphql
# products:query — validated against api_version 2025-01
query AgenticMetafieldProducts($first: Int!, $after: String, $query: String, $namespace: String!) {
  products(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        title
        tags
        options { name values }
        descriptionHtml
        metafields(first: 20, namespace: $namespace) {
          edges { node { key value } }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

```graphql
# metafieldsSet:mutation — validated against api_version 2025-01
mutation AgenticMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { id namespace key }
    userErrors { field message code }
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
`human`: definitions created + a CSV of populated values (`product, key, value, source`). `json`: `{ definitions_created, metafields_set, products_touched, errors, output_file }`.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit | Wait 2s, retry up to 3 times |
| `TAKEN` on definition | Key already defined elsewhere | Reuse the existing definition, continue to population |
| `userErrors` on set | Type mismatch (e.g. list vs single) | Coerce value to the definition's type, retry once, else skip |

## Best Practices
- Keep the namespace small and standard (`agentic`) and the key set tight — agents and storefront filters both benefit from consistency.
- Only write values you can infer with high confidence from real signals; a wrong "material: leather" misleads every agent. Leave low-confidence fields blank.
- Use `list.single_line_text_field` for multi-value attributes (features, materials) so filters work as OR-sets.
- Follow with `shopify-admin-agentic-description-enrichment` so the prose and the structured data agree.
