<h1 align="center">Shopify Admin Skills.</h1>

<p align="center">
  <strong>AI agent skills to operate your Shopify store with extended capabilities.</strong>
  <br />
  Recover abandoned carts, bulk-adjust prices, audit inventory, process refunds — all through your AI agent.
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" /></a>
</p>

---

## Install

```bash
npx skills add 40RTY-ai/shopify-admin-skills
```

Works with **Claude Code, Cursor, Cline, Copilot, Gemini CLI**.

## Installation

### Claude Code (Recommended)

```bash
/plugin marketplace add 40RTY-ai/shopify-store-skills
```

Or add individual skills manually by referencing the `SKILL.md` path in your Claude Code settings.

### Cursor

Install from the Cursor Marketplace, or clone and point your Cursor settings to the `skills/` directory.

### Gemini CLI

```bash
gemini ext install github:40RTY-ai/shopify-store-skills
```

### Manual (Any Agent)

```bash
git clone https://github.com/40RTY-ai/shopify-store-skills.git
```

Reference individual `SKILL.md` files from your agent's skill configuration.

## Skills Catalog

| Role | Skills | What Claude Can Do |
|------|--------|--------------------|
| [Marketing](skills/marketing/) | 3 | Abandoned cart recovery, win-back segments, loyalty exports |
| [Merchandising](skills/merchandising/) | 18 | Bulk pricing, collection ordering, inventory audits, location transfers, stock velocity, dead stock identification, SEO audit, image audit, duplicate SKU detection, metafield updates, product lifecycle management, data completeness scoring |
| [Customer Support](skills/customer-support/) | 5 | Order lookup, refunds, address correction, return initiation, WISMO triage |
| [Conversion & Optimization](skills/conversion-optimization/) | 4 | Discount A/B analysis, abandonment reports, top product performance, gift card issuance |
| [Fulfillment Ops](skills/fulfillment-ops/) | 8 | Fulfillment digest, order holds/releases, cancel and restock, bulk fulfillment creation, location routing, tracking updates, delivery time analysis, split shipments |
| [Returns](skills/returns/) | 3 | Return reason analysis, exchange vs refund ratio, processing SLA tracking |
| [Finance](skills/finance/) | 7 | Refund rate analysis, revenue by location, AOV trends, tax liability summary, gift card balance report, sales by channel, shipping cost analysis |
| [Customer Ops](skills/customer-ops/) | 6 | Duplicate customer finder, bulk note annotation, consent audit, spend tier tagging, cohort analysis, B2B company overview |
| [Order Intelligence](skills/order-intelligence/) | 4 | Fraud risk report, high-risk order tagger, repeat purchase rate, order notes & attributes |
| [Store Management](skills/store-management/) | 5 | URL redirect audit, draft order cleanup, discount hygiene cleanup, publication channel audit, page content audit |

## How Skills Work

Each skill is a `SKILL.md` file that teaches Claude a complete merchant workflow using the Shopify Admin GraphQL API:

```
skills/
  marketing/
    abandoned-cart-recovery/
      SKILL.md    ← GraphQL operations, parameters, session tracking
  merchandising/
    bulk-price-adjustment/
      SKILL.md
  fulfillment-ops/
    bulk-fulfillment-creation/
      SKILL.md
```

When you invoke a skill, Claude:

1. **Queries** your store for the relevant data (orders, products, customers, inventory, etc.)
2. **Executes** mutations with `dry_run: true` preview before committing
3. **Reports** exactly what it did — every GraphQL operation logged, step by step
4. **Outputs** a structured summary (human-readable or JSON for pipelines)

All mutations default to `dry_run: true`. You explicitly opt in to writes.

## Contributing

We welcome contributions from the Shopify community. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

### Quick Start

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/shopify-store-skills.git
cd shopify-store-skills

# 2. Install dependencies
pnpm install

# 3. Scaffold a new skill from the template
mkdir -p skills/<role>/<workflow-slug>
cp docs/skill-template.md skills/<role>/<workflow-slug>/SKILL.md

# 4. Fill in the template, add GraphQL operations, update the index
# 5. Validate
pnpm validate:index

# 6. Open a PR
```

### Good First Issues

Look for issues labeled [`good first issue`](https://github.com/40RTY-ai/shopify-store-skills/labels/good%20first%20issue) — these are operator workflows identified as high-value but not yet built. Pick one, write the GraphQL, and submit a PR.

## Compatibility

| Platform | Support | Install Method |
|----------|---------|----------------|
| Claude Code | Full | Plugin or manual |
| Cursor | Full | Marketplace or manual |
| Codex | Skills + MCP | Plugin |
| Gemini CLI | Full | Extension |
| VS Code | Full | Marketplace |

## Roadmap

- [x] Launch with 12 operator skills across 4 roles
- [x] CI validation script (`pnpm validate:index`)
- [x] GraphQL operations cross-reference index
- [x] Expand to 63 skills across 10 operator roles
- [ ] Community contributions — more workflows per role
- [ ] Automated smoke tests against a dev store
- [ ] Skill versioning aligned with Shopify API versions
- [ ] Publish to Claude Code marketplace for one-command install

## Related Projects

- [Shopify AI Toolkit](https://github.com/Shopify/Shopify-AI-Toolkit) — Official Shopify platform & developer skills
- [shopify-mcp](https://github.com/geli2001/shopify-mcp) — Community MCP server for Shopify Admin API

## License

[MIT](LICENSE) — use it, fork it, build on it.

## Acknowledgments

Built by the community, for the community. Inspired by Shopify's [AI Toolkit launch](https://shopify.dev/docs/apps/build/ai-toolkit) and the growing ecosystem of agentic commerce.
