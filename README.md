<h1 align="center">Shopify Admin Skills.</h1>

<img width="1788" height="744" alt="Screenshot 2026-04-13 at 14 25 45 (1)" src="https://github.com/user-attachments/assets/e52d1227-dddf-4e19-a5b9-5f7379caf8e0" />


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

**Any agent (Cursor, Cline, Copilot, Gemini CLI, Codex)**

```bash
npx skills add 40RTY-ai/shopify-admin-skills
```

**Claude Code**

```
/plugin marketplace add 40RTY-ai/shopify-admin-skills
/plugin install shopify-admin-skills@shopify-admin-skills
```

## Skills

63 skills across 10 categories:

| Category | Skills | Examples |
|---|---|---|
| [Marketing](skills/marketing/) | 3 | Abandoned cart recovery, win-back, loyalty exports |
| [Merchandising](skills/merchandising/) | 18 | Bulk pricing, inventory audits, SEO, dead stock, metafields |
| [Customer Support](skills/customer-support/) | 5 | Order lookup, refunds, returns, address correction, WISMO |
| [Customer Ops](skills/customer-ops/) | 6 | Duplicate finder, spend tiers, cohort analysis, B2B |
| [Conversion](skills/conversion-optimization/) | 4 | Discount A/B, abandonment reports, gift cards |
| [Fulfillment Ops](skills/fulfillment-ops/) | 8 | Digest, holds, routing, tracking, delivery SLA |
| [Finance](skills/finance/) | 7 | Revenue, refund rates, AOV, tax, shipping costs |
| [Order Intelligence](skills/order-intelligence/) | 4 | Fraud risk, high-risk tagging, repeat purchase |
| [Returns](skills/returns/) | 3 | Reason analysis, exchange ratios, SLA |
| [Store Management](skills/store-management/) | 5 | Redirects, drafts, discounts, pages, channels |

## How skills work

Each skill is a `SKILL.md` file that teaches your agent a complete workflow against the Shopify Admin GraphQL API. When invoked, the agent queries your store, previews mutations with `dry_run: true`, executes on confirmation, and reports exactly what happened.

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
