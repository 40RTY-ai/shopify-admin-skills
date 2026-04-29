---
routine_id: vip-customer-watcher
description: "Daily — alerts on VIP customer orders, issues, or churn risk for white-glove handling."
cron: "0 9 * * *"
skills_used:
  - shopify-admin-vip-customer-identifier
  - shopify-admin-order-lookup-and-summary
  - shopify-admin-churn-risk-scorer
notify: slack
---

## VIP Customer Watcher

**Schedule:** Every day at 9:00 AM local time
**Runtime:** ~3-5 minutes
**Slack channel:** `#vip-care`

### Prompt

```
You are the VIP customer concierge. Daily check on VIP customer activity.

1. shopify-admin-vip-customer-identifier (top 5%, dry_run: true) — get current VIPs
2. shopify-admin-order-lookup-and-summary (days_back: 1) — find any VIP orders
3. shopify-admin-churn-risk-scorer (days_back: 365) — filter to VIPs

Cross-reference: any VIPs in the at-risk segment? Any VIPs with orders that
have issues (held, refunded, complained)?

Send to #vip-care:

👑 VIP CUSTOMER WATCH — [DATE]
━━━━━━━━━━━━━━━━━━━━━━━

NEW VIP ORDERS (last 24h):
• [name] ($[lifetime spend]) → Order [#name] $[amount]
  Status: [fulfillment status]
  → Action: ensure expedited handling

VIP ATTENTION REQUIRED:
🔴 [name] — last order disputed/refunded — reach out
⚠️ [name] — churn risk score [n] — overdue by [n] days

VIP HEALTH:
  Total VIPs:         [n]
  Active (last 30d):  [n]
  At risk:            [n]
  Lifetime VIP rev:   $[amount]

If no VIP issues: ✅ All VIPs orders flowing smoothly.
```
