---
name: publication-channel-audit
role: store-management
description: "Read-only: shows which products are published to which sales channels and flags unpublished active products."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - products:query
  - publications:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Queries all active products and the publications (sales channels) they are visible on. Flags products that are active but missing from key channels (e.g., Online Store, Google Shopping, Meta). Prevents silent revenue loss from products that exist in the catalog but are invisible on sales channels. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_products,read_publications`
- API scopes: `read_products`, `read_publications`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| required_channels | array | no | ["Online Store"] | Channel names that all active products should be on |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `publications` — query
   **Inputs:** `first: 50`
   **Expected output:** All available publications (sales channels) with `id`, `name`

2. **OPERATION:** `products` — query
   **Inputs:** `query: "status:active"`, `first: 250`, select `publishedOnCurrentPublication`, `resourcePublications { publication { name } }`, pagination cursor
   **Expected output:** Active products with their channel publication status

3. For each product: check if it appears in each `required_channels` — flag if missing from any

## GraphQL Operations

```graphql
# publications:query — validated against api_version 2025-01
query SalesChannels {
  publications(first: 50) {
    edges {
      node {
        id
        name
        supportsFuturePublishing
        app {
          title
        }
      }
    }
  }
}
```

```graphql
# products:query — validated against api_version 2025-01
query ProductPublications($after: String) {
  products(first: 250, after: $after, query: "status:active") {
    edges {
      node {
        id
        title
        handle
        status
        resourcePublications(first: 20) {
          edges {
            node {
              publication {
                id
                name
              }
              publishDate
              isPublished
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

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Publication Channel Audit            ║
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
PUBLICATION CHANNEL AUDIT
  Active products:          <n>
  Sales channels found:     <n>
  Products missing channels: <n>

  Missing from "Online Store":
    "<product title>"  (<handle>)
  Output: publication_audit_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "publication-channel-audit",
  "store": "<domain>",
  "active_products": 0,
  "channels_found": 0,
  "missing_channel_count": 0,
  "output_file": "publication_audit_<date>.csv"
}
```

## Output Format
CSV file `publication_audit_<YYYY-MM-DD>.csv` with columns:
`product_id`, `title`, `handle`, `channel_name`, `is_published`, `publish_date`, `issue`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Channel not found | Required channel not installed or renamed | Report channel as missing in summary |
| No active products | Empty catalog | Exit with 0 results |

## Best Practices
- Run after any bulk product import — products are not always published to all channels by default.
- For multi-channel stores (Google, Meta, TikTok), add all critical channels to `required_channels` to catch products missing from any of them.
- Products unpublished from a channel may be intentional (e.g., wholesale-only items) — review the flagged list before publishing.
- Pair with `product-data-completeness-score` — products with low data completeness scores should be fixed before being published to additional channels.
