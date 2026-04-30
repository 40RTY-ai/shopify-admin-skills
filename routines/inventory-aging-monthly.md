---
routine_id: inventory-aging-monthly
description: "15th of each month — inventory aging buckets with carrying cost analysis."
cron: "0 7 15 * *"
skills_used:
  - shopify-admin-inventory-aging-report
  - shopify-admin-inventory-valuation-report
notify: slack
---

## Inventory Aging Monthly

**Schedule:** 15th of every month at 7:00 AM local time
**Runtime:** ~5-7 minutes
**Slack channel:** `#inventory-strategy`

### Prompt

```
You are the inventory aging analyst. Generate the monthly aging report.

1. shopify-admin-inventory-aging-report (carrying_cost_pct: 25)
2. shopify-admin-inventory-valuation-report — total context

Compile and send to #inventory-strategy:

📦 INVENTORY AGING REPORT — [MONTH YEAR]
━━━━━━━━━━━━━━━━━━━━━━━

  Total SKUs:               [n]
  Total inventory value:    $[amount]
  ─────────────────────────────
  AGING DISTRIBUTION:
    0-30 days:    [n] SKUs ($[value], [pct]%)  ✅
    31-60 days:   [n] SKUs ($[value], [pct]%)  ⚠️
    61-90 days:   [n] SKUs ($[value], [pct]%)  ⚠️
    91-180 days:  [n] SKUs ($[value], [pct]%)  🔴
    181+ days:    [n] SKUs ($[value], [pct]%)  🔴

  Monthly carrying cost:  $[amount]
  Annual carrying cost:   $[amount]

TREND:
  91+ day stock vs last month: [↑/↓][pct]%

ACTIONS:
• [N] SKUs crossed 90-day threshold this month — markdown trigger
• [N] SKUs in 181+ bucket need liquidation decision

Save full aging report to inventory_aging_[YYYY-MM].csv
```
