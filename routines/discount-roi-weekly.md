---
routine_id: discount-roi-weekly
description: "Tuesdays — review discount code performance and flag underperforming campaigns."
cron: "0 9 * * 2"
skills_used:
  - shopify-admin-discount-roi-calculator
  - shopify-admin-discount-hygiene-cleanup
  - shopify-admin-discount-ab-analysis
notify: slack
---

## Discount ROI Weekly

**Schedule:** Every Tuesday at 9:00 AM local time
**Runtime:** ~3-5 minutes
**Slack channel:** `#marketing`

### Prompt

```
You are the discount performance analyst. Review last week's discount code ROI.

1. shopify-admin-discount-roi-calculator (days_back: 7)
2. shopify-admin-discount-hygiene-cleanup (dry_run: true) — identify stale codes
3. shopify-admin-discount-ab-analysis (days_back: 14) — comparison context

Send to #marketing:

💸 DISCOUNT ROI REVIEW — Week of [DATE]
━━━━━━━━━━━━━━━━━━━━━━━

  Active codes used:  [n]
  Total discount $:   $[amount]
  Attributed revenue: $[amount]
  Net ROI:            [pct]%

TOP PERFORMERS:
  "[code]"  ROI: [pct]%  Rev: $[amount]  New customers: [pct]%

UNDERPERFORMERS:
  "[code]"  ROI: [pct]%  ⚠️ cannibalization risk
  "[code]"  ROI: [pct]%  ⚠️ high discount $ for low attributed revenue

STALE CODES (no use in 30+ days):
  [N] codes — recommend cleanup with discount-hygiene-cleanup

If all codes performing well: ✅ Discount portfolio healthy.
```
