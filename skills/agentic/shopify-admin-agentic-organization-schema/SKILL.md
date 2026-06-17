---
name: shopify-admin-agentic-organization-schema
role: agentic
description: "Inject an Organization JSON-LD block (name, logo, sameAs social links, contactPoint) into the theme so AI agents can verify the store is a real, trusted brand and link it to its public identity."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - shop:query
  - themes:query
  - themeFilesUpsert:mutation
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
audit_signals:
  - org-schema
  - machine-contact
  - wikidata-qid
---

## Purpose
AI assistants check a site's `schema.org/Organization` JSON-LD to confirm it's the real brand (not a counterfeit or reseller) and to connect it to its public identity via `sameAs` (official socials, Wikipedia/Wikidata) and a machine-readable `contactPoint`. Without it, agents hesitate to recommend the store or send buyers to it. This skill builds an Organization JSON-LD block from the shop's data + supplied social links and injects it into the theme layout via a managed snippet. Fixes `org-schema`, `machine-contact`, and supports `wikidata-qid` (through `sameAs`).

## Prerequisites
- Authenticated Shopify CLI session (`shopify auth login --store <domain>`)
- Required API scopes: `read_themes`, `write_themes`

## Parameters
All skills accept these universal parameters:

| Parameter | Type   | Required | Default | Description |
|-----------|--------|----------|---------|-------------|
| store     | string | yes      | —       | Store domain (e.g., mystore.myshopify.com) |
| format    | string | no       | human   | Output format: `human` (default) or `json` |
| dry_run   | bool   | no       | true    | Preview the snippet + injection without writing (defaults ON — edits the live theme) |

Skill-specific parameters:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| theme_id | string | no | — | Theme GID (defaults to published MAIN theme) |
| logo_url | string | no | — | Absolute logo URL (else inferred from theme settings if available) |
| same_as | string | no | — | Comma list of official profile URLs (Instagram, TikTok, LinkedIn, Wikipedia, Wikidata) |
| contact_email | string | no | — | Customer-support email for `contactPoint` (else shop contactEmail) |
| contact_phone | string | no | — | Optional support phone for `contactPoint` |

## Safety

> ⚠️ Step 3 (`themeFilesUpsert`) writes a snippet and edits `layout/theme.liquid` in the LIVE theme. The change is additive (a `{% render %}` in `<head>`), but it publishes immediately and a malformed edit to `theme.liquid` can break rendering. The skill writes the JSON-LD into its own snippet file and inserts a single managed `{% render 'agentic-organization-schema' %}` line inside a `# BEGIN/END` marker block. Defaults `dry_run: true`; duplicate the theme first.

## Workflow Steps

1. **OPERATION:** `shop` — query
   **Inputs:** none
   **Expected output:** Shop name, primary domain, contact email — the core Organization fields.

2. **OPERATION:** `themes` — query
   **Inputs:** `roles: [MAIN]`, `theme.files(filenames: ["layout/theme.liquid", "snippets/agentic-organization-schema.liquid"])`
   **Expected output:** Current layout (to inject the render tag) + whether the snippet already exists.

3. **OPERATION:** `themeFilesUpsert` — mutation
   **Inputs:** write `snippets/agentic-organization-schema.liquid` (the JSON-LD `<script type="application/ld+json">`), and upsert `layout/theme.liquid` with the managed `{% render %}` block added in `<head>` if absent. Skipped on `dry_run`.
   **Expected output:** Upserted files; collect `userErrors`.

## GraphQL Operations

```graphql
# shop:query — validated against api_version 2025-01
query OrgSchemaShop {
  shop {
    name
    primaryDomain { url }
    contactEmail
  }
}
```

```graphql
# themes:query — validated against api_version 2025-01
query OrgSchemaTheme {
  themes(first: 1, roles: [MAIN]) {
    nodes {
      id
      files(filenames: ["layout/theme.liquid", "snippets/agentic-organization-schema.liquid"]) {
        nodes {
          filename
          body { ... on OnlineStoreThemeFileBodyText { content } }
        }
      }
    }
  }
}
```

```graphql
# themeFilesUpsert:mutation — validated against api_version 2025-01
mutation OrgSchemaUpsert($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
  themeFilesUpsert(themeId: $themeId, files: $files) {
    upsertedThemeFiles { filename }
    userErrors { filename code message }
  }
}
```

Snippet body (`snippets/agentic-organization-schema.liquid`):

```liquid
{%- comment -%} managed by shopify-admin-agentic-organization-schema {%- endcomment -%}
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "<shop name>",
  "url": "<primary domain>",
  "logo": "<logo_url>",
  "sameAs": [ "<same_as[0]>", "..." ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer support",
    "email": "<contact_email>"
  }
}
</script>
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
`human`: the generated JSON-LD + the layout diff showing the one inserted render line. `json`: `{ theme_id, json_ld, layout_modified: true|false, wrote: true|false, errors }`.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit | Wait 2s, retry up to 3 times |
| `ACCESS_DENIED` | Missing `write_themes` | Abort; output the snippet so it can be pasted manually |
| `userErrors` on layout upsert | Liquid syntax issue | Write the snippet only, skip the layout edit, surface the manual `{% render %}` instruction |

## Best Practices
- Only put REAL, official URLs in `sameAs` — a wrong profile undermines trust rather than building it. Wikipedia/Wikidata links are especially strong identity signals.
- Inject via a snippet + a single managed render line; never paste JSON-LD inline into `theme.liquid` so re-runs and rollback stay clean.
- Use an absolute, HTTPS `logo` URL (a square PNG works best for knowledge panels).
- Duplicate the theme first and keep `dry_run: true` until you've read the layout diff.
