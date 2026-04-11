---
name: url-redirect-audit
role: store-management
description: "Read-only: lists all URL redirects, flags redirect chains (A→B→C) and duplicate targets."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - urlRedirects:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Queries all URL redirects in the store and identifies redirect chains (where redirect target A is itself redirected to B), duplicate targets (multiple paths pointing to the same destination), and orphaned redirects (pointing to non-existent pages). Redirect chains add latency and hurt SEO. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_content`
- API scopes: `read_content`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time.

## Workflow Steps

1. **OPERATION:** `urlRedirects` — query
   **Inputs:** `first: 250`, pagination cursor
   **Expected output:** All redirects with `fromPath`, `target`; paginate until `hasNextPage: false`

2. Build path map: `fromPath → target`

3. Detect chains: for each redirect, check if `target` appears as a `fromPath` in any other redirect

4. Detect duplicates: targets with more than one source path

## GraphQL Operations

```graphql
# urlRedirects:query — validated against api_version 2025-01
query URLRedirects($after: String) {
  urlRedirects(first: 250, after: $after) {
    edges {
      node {
        id
        path
        target
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
║  SKILL: URL Redirect Audit                   ║
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
URL REDIRECT AUDIT
  Total redirects:    <n>
  Redirect chains:    <n>
  Duplicate targets:  <n>

  Chains:
    /old-page → /intermediate → /final
  Duplicates:
    /path-a → /product/x
    /path-b → /product/x  (same target)
  Output: redirect_audit_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "url-redirect-audit",
  "store": "<domain>",
  "total_redirects": 0,
  "chains": 0,
  "duplicate_targets": 0,
  "output_file": "redirect_audit_<date>.csv"
}
```

## Output Format
CSV file `redirect_audit_<YYYY-MM-DD>.csv` with columns:
`redirect_id`, `from_path`, `target`, `issue_type`, `chain_path`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| No redirects | New store or clean setup | Exit with ✅ no redirects found |

## Best Practices
- Redirect chains (A→B→C) add an extra HTTP round-trip — consolidate them to a direct redirect (A→C).
- After fixing chains or removing duplicates, use Shopify Admin → Navigation → URL Redirects to make the corrections. Bulk deletion is not available in the Admin API but individual redirects can be deleted via `urlRedirectDelete` mutation.
- Run after every major store migration or product/collection restructuring where URLs change in bulk.
