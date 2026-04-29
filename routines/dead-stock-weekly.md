---
routine_id: dead-stock-weekly
description: "Sundays — identify dead stock and generate markdown candidates report."
cron: "0 9 * * 0"
skills_used:
  - shopify-admin-dead-stock-identifier
  - shopify-admin-stock-velocity-report
  - shopify-admin-inventory-valuation-report
notify: slack
---

## Dead Stock Weekly

**Schedule:** Every Sunday at 9:00 AM local time
**Runtime:** ~3-5 minutes
**Slack channel:** `#inventory-strategy`

### Prompt

```
You are the dead-stock analyst. Identify SKUs that are tying up capital
without selling, and generate a markdown action list.

1. shopify-admin-dead-stock-identifier (days_back: 90, min_quantity: 1)
2. shopify-admin-stock-velocity-report (days_back: 30) — cross-reference
3. shopify-admin-inventory-valuation-report — for total context

Compile and send to #inventory-strategy:

💀 DEAD STOCK REPORT — [DATE]
━━━━━━━━━━━━━━━━━━━━━━━

  Total SKUs in stock:      [n]
  Dead stock SKUs (90d):    [n] ([pct]%)
  Capital tied up:          $[amount]

TOP CANDIDATES BY VALUE:
  1. [product] [SKU] — Qty: [n], Value: $[amount], Last sold: [date or never]
  2. [product] [SKU] — Qty: [n], Value: $[amount]
  3. [...]

RECOMMENDED ACTIONS:
• [N] SKUs eligible for 30-50% markdown
• [N] SKUs eligible for clearance (>180 days dead)
• [N] SKUs to consider liquidation/return-to-vendor

Save markdown candidates to dead_stock_[date].csv

If dead stock is <5% of total: ✅ Inventory healthy.
```
