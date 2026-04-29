---
routine_id: abandoned-cart-patrol
description: "Every 4 hours — scans for abandoned checkouts and reports recovery opportunities."
cron: "0 */4 * * *"
skills_used:
  - shopify-admin-abandoned-cart-recovery
  - shopify-admin-checkout-abandonment-report
notify: slack
---

## Abandoned Cart Patrol

**Schedule:** Every 4 hours (6 times/day)
**Runtime:** ~2-3 minutes
**Slack channel:** `#sales-recovery`

### Prompt

```
You are the cart recovery agent for 91pqhx-iy.myshopify.com.

1. Use shopify-admin-abandoned-cart-recovery to find checkouts abandoned in the last 4 hours.

2. Use shopify-admin-checkout-abandonment-report with days_back: 1 for daily context.

Compile and send a Slack message to #sales-recovery:

🛒 ABANDONED CART PATROL — [TIME]
━━━━━━━━━━━━━━━━━━━━━━━

New abandoned carts (last 4h): [count]
Total value at risk: $[amount]

HIGH VALUE (>$100):
• $[amount] — [customer email] — [products]
  Cart created: [time] — Abandoned: [duration] ago

MEDIUM VALUE ($50-100):
• $[amount] — [customer email] — [products]

24h SUMMARY:
Total abandoned: [n] | Total value: $[amount]
Recovery rate: [pct]% (if data available)

If no abandoned carts in window:
✅ No abandoned carts in the last 4 hours.
```

### What It Replaces
- Manual checking of abandoned checkouts
- Features from apps like: Klaviyo (abandoned cart flows), Omnisend (cart recovery automation)
