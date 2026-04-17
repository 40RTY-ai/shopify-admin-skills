# Contributing to Shopify Operator Skills

Thank you for contributing! This repo maintains AI agent skills that teach Claude to operate Shopify stores programmatically — no apps, no UI navigation, native Shopify APIs only.

## Prerequisites

- Node.js 18+, pnpm 9+
- A Shopify development store with CLI access (`shopify auth login`)
- Familiarity with Shopify Admin GraphQL API

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/shopify-admin-skills.git
cd shopify-admin-skills
pnpm install
pnpm validate:index  # should pass on a clean clone
```

## Writing a New Skill

### 1. Choose a workflow

Skills live under `skills/<role>/` where role is one of:
`marketing` | `merchandising` | `customer-support` | `customer-ops` | `conversion-optimization` | `fulfillment-ops` | `finance` | `order-intelligence` | `returns` | `store-management`

A valid skill must:
- Be achievable with native Shopify Admin GraphQL only (no 3rd-party APIs)
- Have a clear, verifiable output
- Be executable non-interactively via CLI
- Map to a workflow currently done via a popular Shopify app

### 2. Scaffold

```bash
mkdir -p skills/<role>/<workflow-slug>
cp docs/skill-template.md skills/<role>/<workflow-slug>/SKILL.md
```

### 3. Fill in the template

Required frontmatter fields: `name`, `role`, `description`, `toolkit`, `api_version`, `graphql_operations`, `status`.

Use the `shopify-admin` skill from the [Shopify AI Toolkit](https://github.com/Shopify/Shopify-AI-Toolkit) to search and validate every GraphQL operation before writing it into the skill.

The `## Session Tracking` section must be copied verbatim from `docs/skill-template.md`. Do not paraphrase.

### 4. Update the operations index

Add a row to `docs/graphql-operations-index.md` for every operation in your skill's `graphql_operations` frontmatter:

```
| OperationName | query | 2025-01 | <role>/<workflow-slug> |
```

### 5. Validate and smoke test

```bash
pnpm validate:index   # must pass
pnpm lint             # must pass

# Smoke test: run the skill's GraphQL operations against a dev store
shopify store execute --store <your-dev-store> --query '<query from SKILL.md>'
```

**Scope reference by skill type:**

| Skill type | Required scopes |
|---|---|
| Orders / refunds / returns | `read_orders` + `read_products` (line items traverse the product graph) |
| Products / variants / inventory | `read_products`, `read_inventory` |
| Customers | `read_customers` |
| Analytics (ShopifyQL) | `read_reports` — **not** `read_analytics` |
| Mutations (pricing, tagging, fulfillment) | Corresponding `write_*` scope |

**ShopifyQL notes (`FROM sessions` and analytics queries):**
- `LIKE` is not a supported ShopifyQL operator — filter string columns in-memory after fetching
- Do not alias a column to a name that is already a reserved column name (e.g., `count() AS sessions` fails because `sessions` already exists)
- Available metrics vary by data source; confirm by running the query and inspecting `tableData.columns` — do not assume column names from documentation examples
- `converted_sessions` and `bounce_rate` are **not** available in `FROM sessions`; use `conversion_rate` (returned as a decimal)
- Skills using `shopifyqlQuery` require `read_reports` scope and Shopify Basic plan or above

### 6. Submit a PR

Branch name: `skill/<role>/<workflow-slug>`
One skill per PR. CI must pass. Maintainer runs a smoke test before merge.

## PR Checklist

- [ ] `pnpm validate:index` passes
- [ ] `pnpm lint` passes
- [ ] All required frontmatter fields present
- [ ] `## Session Tracking` section copied verbatim from template
- [ ] `docs/graphql-operations-index.md` updated for all new operations
- [ ] GraphQL validated against `api_version` using Shopify AI Toolkit
