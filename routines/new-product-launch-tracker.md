---
routine_id: new-product-launch-tracker
description: "Daily — tracks first-week performance of recently published products."
cron: "0 10 * * *"
skills_used:
  - shopify-admin-product-lifecycle-manager
  - shopify-admin-stock-velocity-report
  - shopify-admin-top-product-performance
notify: slack
---

## New Product Launch Tracker

**Schedule:** Every day at 10:00 AM local time
**Runtime:** ~3-4 minutes
**Slack channel:** `#merchandising`

### Prompt

```
You are the product launch analyst. Track performance of products published
in the last 14 days.

1. shopify-admin-product-lifecycle-manager — find products published <14 days ago
2. shopify-admin-stock-velocity-report (days_back: 14) — for new products only
3. shopify-admin-top-product-performance (days_back: 14)

Send to #merchandising:

🚀 NEW PRODUCT LAUNCH TRACKER — [DATE]
━━━━━━━━━━━━━━━━━━━━━━━

PRODUCTS LAUNCHED (last 14d): [n]

STRONG STARTS:
  "[product]" — Day [n]: [units] sold, $[revenue]
    Velocity: [n]/day  → trending well

MODERATE:
  "[product]" — Day [n]: [units] sold

WEAK STARTS (zero or near-zero sales after 7+ days):
  "[product]" — Day [n]: [units] sold
    → Suggest: review pricing, listing quality, traffic sources

ATTENTION:
• [N] products with zero sales after 14 days — review or unpublish
• [N] products selling out faster than restock cadence

Save launch tracker to launch_tracker_[date].csv

If no new products in window: skip notification (silent pass).
```
