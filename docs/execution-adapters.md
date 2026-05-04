# Execution Adapters

Skills in this repo describe **what** to do (workflow, GraphQL ops, output shape) without binding to a specific runtime. An **execution adapter** is the layer that actually runs those operations against a Shopify store.

Two adapters are supported:

| Adapter | How it runs | Auth | Best for |
|---|---|---|---|
| `shopify-cli` | `shopify store execute` against local CLI session | `shopify auth login` | Headless / CI runs, multi-store batch |
| `shopify-mcp` | Official Shopify MCP connector (`https://setup.shopify.com/mcp`) | OAuth via `switch-shop` | Interactive Claude Code / Cursor sessions, widget-rich UI |

Skills SHOULD work via either adapter. This doc defines the contract.

---

## Adapter contracts

### `shopify-cli`

- Execution: `shopify store execute --store <domain> --query '<gql>' --variables '<json>'`
- Pagination: no enforced cap on `first`; respects schema limit (250 for most connections)
- Auth: persistent CLI session with declared scopes
- Output: raw JSON to stdout
- Mutations: full schema available

### `shopify-mcp`

- Execution: dedicated tools (`list-orders`, `search_products`, `get-product`, `list-customers`, `get-shop-info`, `run-analytics-query`, `get-collection`, `get-inventory-levels`, `set-inventory`, `create-product`, `update-product`, `create-collection`, `add-to-collection`, `update-collection`, `create-discount`, `bulk-update-product-status`) when an op maps cleanly; raw `graphql_query` / `graphql_mutation` otherwise
- Pagination: `first` capped at **50** per call; paginate via `endCursor`
- Auth: connector-managed OAuth; scopes are fixed at install time (skill cannot request new scopes at runtime)
- Output: dedicated tools render visual widgets in client; `graphql_query` returns JSON only
- Response size: large payloads are written to disk by the harness — author queries that project minimal fields, or paginate aggressively
- Mutations: full schema via `graphql_mutation`

---

## Adapter mapping in skill frontmatter

Add an `execution_adapters` block to a SKILL.md frontmatter to declare per-adapter behavior:

```yaml
execution_adapters:
  shopify-mcp:
    pagination_max_first: 50
    auth: connector-managed
    operations:
      - skill_op: orders:query
        prefer_tool: list-orders         # widget tool
        fallback: graphql_query          # when projection insufficient
      - skill_op: tagsAdd:mutation
        prefer_tool: graphql_mutation    # no dedicated widget tool
  shopify-cli:
    pagination_max_first: 250
    auth: cli-session
```

When an adapter omits `operations`, the executor falls back to raw GraphQL via `graphql_query` / `graphql_mutation`.

---

## Constraints to be aware of

1. **Pagination cap** — MCP `first ≤ 50`. Skills using `first: 250` work via CLI but break via MCP. Use a `$first` variable and let the adapter inject the right value.
2. **Payload size** — MCP harness spills large responses to disk. Project minimal fields.
3. **Scope mismatch** — MCP connector scopes are fixed at install; document required scopes so users can re-install if needed.
4. **Widget vs JSON** — when a dedicated MCP tool exists (`list-orders`, `search_products`, etc.), prefer it for the widget UX. Use `graphql_query` only when its projection is insufficient.
5. **ShopifyQL** — analytics skills can often replace order-aggregation workflows with one `run-analytics-query` call. Declare via an optional `shopifyql_shortcut: |` field on `shopify-mcp`.
