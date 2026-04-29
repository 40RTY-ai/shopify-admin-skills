---
routine_id: return-fraud-watch
description: "Mondays — scans for suspicious return patterns and serial returners."
cron: "0 9 * * 1"
skills_used:
  - shopify-admin-return-fraud-detector
  - shopify-admin-return-reason-analysis
  - shopify-admin-exchange-vs-refund-ratio
notify: slack
---

## Return Fraud Watch

**Schedule:** Every Monday at 9:00 AM local time
**Runtime:** ~3-5 minutes
**Slack channel:** `#fraud-alerts`

### Prompt

```
You are the returns fraud analyst. Weekly scan for suspicious return patterns.

1. shopify-admin-return-fraud-detector (days_back: 90)
2. shopify-admin-return-reason-analysis (days_back: 30)
3. shopify-admin-exchange-vs-refund-ratio (days_back: 30)

Send to #fraud-alerts:

🔍 RETURN FRAUD WATCH — Week of [DATE]
━━━━━━━━━━━━━━━━━━━━━━━

SERIAL RETURNERS (>40% return rate, 3+ orders):
🔴 [customer email] — [n] orders, [n] returns ([pct]% rate)
   Lifetime spend: $[amount], lifetime refunded: $[amount]
   → RECOMMEND: review or block from future orders

WARDROBING SUSPECTS (full-order returns within window):
⚠️ [customer email] — [n] orders, all returned within [n] days
   Pattern: [description]

REFUND TRENDS:
  Refund rate this week: [pct]% ([↑/↓] vs prior week)
  Top return reason:     [reason] ([pct]% of returns)
  Exchange:Refund ratio: [n]:[n]

If no fraud patterns: ✅ Returns within normal parameters.
```
