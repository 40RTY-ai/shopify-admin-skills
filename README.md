<h1 align="center">Shopify Admin Skills.</h1>

<p align="center">
  <strong>AI agent skills + scheduled routines to operate your Shopify store.</strong>
  <br />
  73 skills across 10 categories, plus 8 always-on routines that monitor inventory, fraud, fulfillment, and customer health on a schedule.
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

73 skills across 10 categories:

| Category | Skills | Examples |
|---|---|---|
| [Marketing](skills/marketing/) | 3 | Abandoned cart recovery, win-back, loyalty exports |
| [Merchandising](skills/merchandising/) | 21 | Pricing, stock, demand forecast, aging, SEO, dead stock |
| [Customer Support](skills/customer-support/) | 5 | Order lookup, refunds, returns, address correction, WISMO |
| [Customer Ops](skills/customer-ops/) | 8 | RFM, churn risk, duplicates, spend tiers, cohort, B2B |
| [Conversion](skills/conversion-optimization/) | 7 | FBT, cross-sell, discount ROI, A/B, gift cards |
| [Fulfillment Ops](skills/fulfillment-ops/) | 8 | Digest, holds, routing, tracking, delivery SLA |
| [Finance](skills/finance/) | 8 | Profit/margin, revenue, refund rates, AOV, tax |
| [Order Intelligence](skills/order-intelligence/) | 5 | Fraud risk, auto-tagging, high-risk, repeat purchase |
| [Returns](skills/returns/) | 3 | Reason analysis, exchange ratios, SLA |
| [Store Management](skills/store-management/) | 5 | Redirects, drafts, discounts, pages, channels |

## Routines

8 ready-to-use **scheduled routines** that run autonomously on Claude Code's infrastructure. Each routine fires on a cron schedule, invokes one or more skills, and reports back via Slack or file output.

| Routine | Schedule | What it does |
|---|---|---|
| [morning-store-briefing](routines/morning-store-briefing.md) | Daily 8 AM | Orders, revenue, fulfillment digest |
| [low-stock-watchdog](routines/low-stock-watchdog.md) | Daily 7 AM | Inventory + demand forecast alerts |
| [abandoned-cart-patrol](routines/abandoned-cart-patrol.md) | Every 4h | Cart recovery opportunities |
| [fraud-sentinel](routines/fraud-sentinel.md) | Every 2h | High-risk order alerting |
| [fulfillment-sla-watchdog](routines/fulfillment-sla-watchdog.md) | Weekdays 10 AM + 3 PM | Overdue fulfillments |
| [weekly-business-review](routines/weekly-business-review.md) | Monday 8 AM | Comprehensive weekly report |
| [price-anomaly-scanner](routines/price-anomaly-scanner.md) | Daily 6 AM | Pricing error detection |
| [customer-churn-watch](routines/customer-churn-watch.md) | Wednesday 8 AM | At-risk customer identification |

See [routines/README.md](routines/README.md) for install instructions.

## How it works

**Skills** — each is a `SKILL.md` file that teaches your agent a complete workflow against the Shopify Admin GraphQL API. When invoked, the agent queries your store, previews mutations with `dry_run: true`, executes on confirmation, and reports exactly what happened.

**Routines** — pre-built scheduled-task definitions that combine skills into automated workflows. Install once via Claude Code, then they fire on schedule autonomously — no machine needs to stay on.

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
