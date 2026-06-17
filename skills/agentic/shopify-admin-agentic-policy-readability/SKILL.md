---
name: shopify-admin-agentic-policy-readability
role: agentic
description: "Ensure shipping, returns, refund, privacy, and terms policies exist as clean machine-readable text so AI agents can answer shopper questions and close the sale without escalating."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - shop:query
  - shopPolicyUpdate:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
audit_signals:
  - shipping-policy-readable
  - returns-policy-readable
---

## Purpose
Before an AI agent completes a purchase for a shopper it checks the store's policies — "Do they ship to me? What's the return window?" If shipping/returns policies are missing, empty, or buried in an image/PDF, the agent can't answer, loses confidence, and abandons or sends the shopper elsewhere. This skill audits the store's policies and ensures the key ones exist as clean, plain-text/HTML content an agent can read and quote. Fixes `shipping-policy-readable` and `returns-policy-readable`.

## Prerequisites
- Authenticated Shopify CLI session (`shopify auth login --store <domain>`)
- Required API scopes: `read_legal_policies` (or `read_online_store_pages`), `write_legal_policies`

## Parameters
All skills accept these universal parameters:

| Parameter | Type   | Required | Default | Description |
|-----------|--------|----------|---------|-------------|
| store     | string | yes      | —       | Store domain (e.g., mystore.myshopify.com) |
| format    | string | no       | human   | Output format: `human` (default) or `json` |
| dry_run   | bool   | no       | true    | Preview proposed policy bodies without writing (defaults ON — edits live store policies) |

Skill-specific parameters:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| policies | string | no | REFUND_POLICY,SHIPPING_POLICY | Comma list of policy types to ensure: `REFUND_POLICY,SHIPPING_POLICY,PRIVACY_POLICY,TERMS_OF_SERVICE` |
| mode | string | no | audit | `audit` (report gaps only) or `apply` (write supplied/drafted bodies) |
| bodies_dir | string | no | — | Directory of `<POLICY_TYPE>.html` files to use as the source of truth when `mode: apply` |

## Safety

> ⚠️ Step 2 (`shopPolicyUpdate`) replaces a LIVE legal policy's body — this is legally binding content. NEVER auto-generate legal text. In `mode: apply` the skill only writes bodies you supply via `bodies_dir`; it will not invent policy language. Default is `mode: audit` + `dry_run: true`. Have legal/ops review every body before `mode: apply`.

## Workflow Steps

1. **OPERATION:** `shop` — query
   **Inputs:** none; read `shopPolicies { type body url }`
   **Expected output:** Which target policies are present, empty, or image-only (heuristic: very short body or body that's just an `<img>`/link).

2. **COMPUTE (no API):** classify each policy as OK / missing / thin / image-only. In `audit` mode, stop here and report. In `apply` mode, load the matching `<TYPE>.html` from `bodies_dir` for each gap and emit a before/after preview.

3. **OPERATION:** `shopPolicyUpdate` — mutation (only in `mode: apply`, not `dry_run`)
   **Inputs:** `shopPolicy: { id: <policy id>, body: <supplied HTML> }` per gap.
   **Expected output:** Updated policy; collect `userErrors`.

## GraphQL Operations

```graphql
# shop:query — validated against api_version 2025-01
query PolicyAudit {
  shop {
    shopPolicies {
      id
      type
      body
      url
    }
  }
}
```

```graphql
# shopPolicyUpdate:mutation — validated against api_version 2025-01
mutation PolicyUpdate($shopPolicy: ShopPolicyInput!) {
  shopPolicyUpdate(shopPolicy: $shopPolicy) {
    shopPolicy { id type url }
    userErrors { field message }
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
`human`: a policy table (`type, status, length, readable?`) + the audit verdict; in `apply` mode, the before/after for each written policy. `json`: `{ policies:[{ type, status, readable }], updated, errors, output_file }`.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit | Wait 2s, retry up to 3 times |
| `ACCESS_DENIED` | Missing `write_legal_policies` | Stay in audit mode; report gaps for manual fill |
| `bodies_dir` missing a type | No supplied body for a gap | Skip that policy, keep it in the gap report |

## Best Practices
- Default to `mode: audit` — this skill's main value is finding image-only or empty policies; writing legal text is a human decision.
- Make policies concrete and parseable: state the return window in days, shipping timeframes, and regions in plain sentences — that's what agents quote.
- Avoid image/PDF-only policies entirely; agents (and many shoppers) can't read them.
- Keep the canonical policy text in `bodies_dir` under version control so re-applying after edits is auditable.
