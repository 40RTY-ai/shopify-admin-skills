---
name: shopify-admin-product-tag-bulk-update
role: merchandising
description: 'Add or remove tags on all products matching a collection, existing tag, or search query — for campaign setup, teardown, or catalog organization.'
toolkit: 'shopify-admin, shopify-admin-execution'
api_version: 2025-01
graphql_operations:
  - 'products:query'
  - 'tagsAdd:mutation'
  - 'tagsRemove:mutation'
status: stable
compatibility: 'Claude Code, Cursor, Codex, Gemini CLI'
execution_adapters:
  shopify-mcp:
    pagination_max_first: 50
    auth: connector-managed
    operations:
      - skill_op: 'products:query'
        prefer_tool: search_products
        fallback: graphql_query
      - skill_op: 'tagsAdd:mutation'
        prefer_tool: graphql_mutation
      - skill_op: 'tagsRemove:mutation'
        prefer_tool: graphql_mutation
  shopify-cli:
    pagination_max_first: 250
    auth: cli-session
---

## Purpose
Adds or removes one or more tags across a set of products in bulk — replacing manual product-by-product editing in the Shopify admin. Use for campaign setup (add `summer-sale` to a collection before launch), campaign teardown (remove `flash-sale` after it ends), or catalog reorganization (retag products moving between categories). Tags drive collection rules, marketing segments, and reporting filters, so bulk accuracy matters. Replaces manual Shopify admin bulk editing and CSV import/export workflows.

## Prerequisites
Either auth path works. See [docs/execution-adapters.md](../../docs/execution-adapters.md).

- **Shopify MCP connector** (recommended, official): `https://setup.shopify.com/mcp` — connect via `/mcp` in Claude Code; switch stores with the `switch-shop` tool. The connector must be installed with the scopes listed below.
- **Shopify CLI:** `shopify auth login --store <domain>` with the scopes listed below.
- API scopes: `read_products`, `write_products`

## Parameters
Universal (store, format, dry_run) + skill-specific:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| action | string | yes | — | `add` or `remove` |
| tags | array | yes | — | One or more tag strings to add or remove (e.g., `["summer-sale", "clearance"]`) |
| collection_id | string | no* | — | GID of a collection — target all products in this collection |
| filter_tag | string | no* | — | Target all products that currently have this tag |
| query_filter | string | no* | — | Shopify product search query (e.g., `"product_type:Apparel"`) |

*One of `collection_id`, `filter_tag`, or `query_filter` is required.

## Safety

> ⚠️ Step 2 executes bulk tag mutations. `tagsRemove` is irreversible — if you remove the wrong tag, you must re-add it manually or run this skill again with `action: add`. Run with `dry_run: true` to see the full product list before committing. For large catalogs (1000+ products), dry_run is strongly recommended before any removal operation.

## Workflow Steps

1. **OPERATION:** `products` — query
   **Inputs:** `first: 250`, `query` built from `collection_id`, `filter_tag`, or `query_filter`; paginate until all matching products fetched
   **Expected output:** List of product GIDs and current tag arrays; confirm target set before proceeding

2. **OPERATION:** `tagsAdd` — mutation (if `action: add`)
   **Inputs:** `id: <productId>`, `tags: <tags array>` per product
   **Expected output:** Updated `node.id` with `userErrors`

   **OR**

2. **OPERATION:** `tagsRemove` — mutation (if `action: remove`)
   **Inputs:** `id: <productId>`, `tags: <tags array>` per product
   **Expected output:** Updated node with `userErrors`

## GraphQL Operations

```graphql
# products:query — validated against api_version 2025-01
query ProductsForTagUpdate($first: Int!, $after: String, $query: String) {
  products(first: $first, after: $after, query: $query) {
    edges {
      node {
        id
        title
        tags
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
# tagsAdd:mutation — validated against api_version 2025-01
mutation TagsAdd($id: ID!, $tags: [String!]!) {
  tagsAdd(id: $id, tags: $tags) {
    node {
      id
    }
    userErrors {
      field
      message
    }
  }
}
```

```graphql
# tagsRemove:mutation — validated against api_version 2025-01
mutation TagsRemove($id: ID!, $tags: [String!]!) {
  tagsRemove(id: $id, tags: $tags) {
    node {
      id
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
║  SKILL: product-tag-bulk-update              ║
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
  Products targeted:    <count>
  Tags added/removed:   <tags list>
  Action:               <add|remove>
  Errors:               <count, 0 if none>
  Output:               <filename or "none">
══════════════════════════════════════════════
```

For `format: json`, emit a JSON object with this schema:
```json
{
  "skill": "product-tag-bulk-update",
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
    "action": "<add|remove>",
    "tags": ["<tag1>", "<tag2>"],
    "products_targeted": 0,
    "mutations_succeeded": 0,
    "errors": 0,
    "output_file": "<filename|null>"
  }
}
```

## Output Format
CSV file `tag-update-<YYYY-MM-DD>.csv` with columns: `product_id`, `product_title`, `action`, `tags_changed`, `previous_tags`, `result`.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| No products returned | Filter matches nothing | Check collection GID or filter_tag spelling |
| `userErrors` from tagsAdd/tagsRemove | Tag string too long or invalid characters | Shopify tag max length is 255 characters; no commas allowed |
| Large product count (1000+) | Many API calls needed for pagination | Expected — the skill paginates automatically; may take longer |
| Tag not present (on remove) | Product doesn't have the tag you're removing | Silently skips — `tagsRemove` on a non-existent tag is a no-op |

## Best Practices
1. Run `dry_run: true` before any `action: remove` — the CSV preview shows exactly which products will lose the tag.
2. To set up a campaign cleanly, run `action: add` at launch and `action: remove` at the end — keeping your product tags tidy prevents collection rule drift.
3. Use `query_filter: "tag:old-campaign-name"` for teardown — it will find exactly the products tagged from the previous run.
4. You can add multiple tags in one run — pass `tags: ["sale", "homepage-featured", "clearance"]` to apply all three atomically.
5. Tags are case-insensitive in Shopify collection rules but case-preserving in the API — use consistent casing to avoid duplicates like `Sale` and `sale`.
