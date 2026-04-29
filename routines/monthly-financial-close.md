---
routine_id: monthly-financial-close
description: "First of every month — comprehensive financial close report with P&L, payouts, taxes, and refunds."
cron: "0 8 1 * *"
skills_used:
  - shopify-admin-profit-margin-calculator
  - shopify-admin-payout-reconciliation
  - shopify-admin-tax-liability-summary
  - shopify-admin-refund-rate-analysis
  - shopify-admin-revenue-by-location-report
  - shopify-admin-discount-cost-trend
  - shopify-admin-gift-card-liability-report
notify: slack
---

## Monthly Financial Close

**Schedule:** First of every month at 8:00 AM local time
**Runtime:** ~10-15 minutes
**Slack channel:** `#finance`

### Prompt

```
You are the financial close agent. Generate the monthly financial close report
for the previous month.

Determine date range: previous calendar month (e.g., if today is May 1,
analyze April 1 - April 30).

Run these skills with days_back set to cover the previous month:

1. shopify-admin-profit-margin-calculator (days_back: 31, group_by: order)
2. shopify-admin-payout-reconciliation (days_back: 31)
3. shopify-admin-tax-liability-summary (days_back: 31)
4. shopify-admin-refund-rate-analysis (days_back: 31)
5. shopify-admin-revenue-by-location-report (days_back: 31)
6. shopify-admin-discount-cost-trend (days_back: 31)
7. shopify-admin-gift-card-liability-report

Compile into a Slack message:

📊 MONTHLY FINANCIAL CLOSE — [PREV MONTH YEAR]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REVENUE & PROFIT
  Gross revenue:    $[amount]
  Total COGS:       $[amount]
  Shipping costs:   $[amount]
  Tx fees:          $[amount]
  Refunds:          $[amount] ([pct]% refund rate)
  Discounts given:  $[amount]
  ─────────────────────────────
  Net profit:       $[amount] (margin: [pct]%)

PAYOUTS
  Payouts received: $[amount] ([n] payouts)
  Reconciliation:   ✅ matched / ⚠️ [n] discrepancies

TAX LIABILITY
  Total collected:  $[amount]
  Top jurisdictions: [list]

REVENUE BY LOCATION
  [location]: $[amount] ([pct]%)
  [...]

GIFT CARD LIABILITY
  Outstanding balance: $[amount]

ATTENTION ITEMS:
• [Any reconciliation discrepancies]
• [Refund rate changes month-over-month]
• [Discount spend trends]

Save full close report to monthly_close_[YYYY-MM].csv
```
