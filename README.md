<h1 align="center">Shopify Admin Skills.</h1>

<img width="1788" height="744" alt="Screenshot 2026-04-13 at 14 25 45 (1)" src="https://github.com/user-attachments/assets/e52d1227-dddf-4e19-a5b9-5f7379caf8e0" />


<p align="center">
  <strong>AI agent skills + scheduled routines to operate your Shopify store.</strong>
  <br />
  106 skills across 10 categories, plus 20 always-on routines that monitor inventory, fraud, fulfillment, finance, and customer health on a schedule.
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

106 skills across 10 categories:

| Category | Skills | Examples |
|---|---|---|
| [Marketing](skills/marketing/) | 6 | Cart recovery, win-back, loyalty, VIP, promo codes, attribution |
| [Merchandising](skills/merchandising/) | 25 | Pricing, stock, demand forecast, variant performance, COGS, vendor consolidation |
| [Customer Support](skills/customer-support/) | 8 | Order lookup, refunds, returns, address correction, customer merge, timeline export |
| [Customer Ops](skills/customer-ops/) | 11 | RFM, churn risk, CAC, deliverability, chargeback watch, cohort, B2B |
| [Conversion](skills/conversion-optimization/) | 10 | FBT, cross-sell, discount ROI, traffic-by-page, post-purchase survey, gift messages |
| [Fulfillment Ops](skills/fulfillment-ops/) | 11 | Digest, routing, tracking, SLA, shipping rates, carrier comparison, bundles |
| [Finance](skills/finance/) | 12 | Profit, payout recon, gift card liability, MRR, discount trend, tax, AOV |
| [Order Intelligence](skills/order-intelligence/) | 9 | Fraud, auto-tagging, attribution, cancellation, product affinity, partial-refund patterns |
| [Returns](skills/returns/) | 6 | Reason analysis, fraud detection, restock, cost attribution, SLA |
| [Store Management](skills/store-management/) | 8 | Redirects, drafts, discounts, pages, staff audit, file storage, metafield definitions |

## Routines

20 ready-to-use **scheduled routines** that run autonomously on Claude Code's infrastructure. Each routine fires on a cron schedule, invokes one or more skills, and reports back via Slack or file output.

**Daily / High-frequency:** `morning-store-briefing`, `low-stock-watchdog`, `abandoned-cart-patrol`, `fraud-sentinel`, `fulfillment-sla-watchdog`, `price-anomaly-scanner`, `vip-customer-watcher`, `payout-recon-daily`, `new-product-launch-tracker`

**Weekly:** `weekly-business-review`, `return-fraud-watch`, `discount-roi-weekly`, `catalog-health-weekly`, `customer-churn-watch`, `seo-coverage-weekly`, `dead-stock-weekly`

**Monthly / Quarterly:** `monthly-financial-close`, `staff-activity-monthly`, `inventory-aging-monthly`, `quarterly-business-review`

### Smart install (recommended)

Don't dump all 20 routines on a store that doesn't need them. The smart installer profiles your store, asks 3 questions, and installs only the routines that fit.

See [routines/INSTALL.md](routines/INSTALL.md) for the smart install prompt, or [routines/README.md](routines/README.md) for all install paths and per-routine details.

## How it works

**Skills** — each is a `SKILL.md` file that teaches your agent a complete workflow against the Shopify Admin GraphQL API. When invoked, the agent queries your store, previews mutations with `dry_run: true`, executes on confirmation, and reports exactly what happened.

**Routines** — pre-built scheduled-task definitions that combine skills into automated workflows. Install once via Claude Code, then they fire on schedule autonomously — no machine needs to stay on.

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
