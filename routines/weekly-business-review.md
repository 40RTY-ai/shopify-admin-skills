---
routine_id: weekly-business-review
description: "Monday morning — comprehensive weekly performance report across all store dimensions."
cron: "0 8 * * 1"
skills_used:
  - shopify-admin-top-product-performance
  - shopify-admin-average-order-value-trends
  - shopify-admin-sales-by-channel-report
  - shopify-admin-refund-rate-analysis
  - shopify-admin-repeat-purchase-rate
  - shopify-admin-checkout-abandonment-report
  - shopify-admin-customer-cohort-analysis
  - shopify-admin-profit-margin-calculator
  - shopify-admin-stock-velocity-report
  - shopify-admin-churn-risk-scorer
notify: slack
---

## Weekly Business Review

**Schedule:** Every Monday at 8:00 AM local time
**Runtime:** ~8-12 minutes (runs 10 skills)
**Slack channel:** `#weekly-review`

### Prompt

```
You are the business analyst for 91pqhx-iy.myshopify.com. Generate the Weekly Business Review.

Run each skill with days_back: 7 (comparing to prior week where possible) and compile results:

1. REVENUE & ORDERS
   - shopify-admin-sales-by-channel-report (days_back: 7)
   - shopify-admin-average-order-value-trends (days_back: 14, bucket: week) — compare this week vs last
   - shopify-admin-profit-margin-calculator (days_back: 7, group_by: product)

2. PRODUCTS
   - shopify-admin-top-product-performance (days_back: 7)
   - shopify-admin-stock-velocity-report (days_back: 7)

3. CUSTOMERS
   - shopify-admin-repeat-purchase-rate (days_back: 7)
   - shopify-admin-customer-cohort-analysis (days_back: 7)
   - shopify-admin-churn-risk-scorer (days_back: 365, report only summary counts)

4. CONVERSION
   - shopify-admin-checkout-abandonment-report (days_back: 7)
   - shopify-admin-refund-rate-analysis (days_back: 7)

Format as a comprehensive Slack message to #weekly-review:

📈 WEEKLY BUSINESS REVIEW — Week of [DATE]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 REVENUE
  Total revenue:    $[amount] ([↑/↓][pct]% vs last week)
  Orders:           [n] ([↑/↓][pct]%)
  AOV:              $[amount] ([↑/↓]$[delta])
  Est. net profit:  $[amount] (margin: [pct]%)

  By channel:
  • Online Store: $[amount] ([pct]%)
  • [Other channels...]

🏆 TOP PRODUCTS
  1. [product] — [units] sold, $[revenue]
  2. [product] — [units] sold, $[revenue]
  3. [product] — [units] sold, $[revenue]

👥 CUSTOMERS
  New customers:     [n]
  Repeat rate:       [pct]%
  At-risk customers: [n] (total revenue at risk: $[amount])

🔄 CONVERSION HEALTH
  Cart abandonment: [pct]%
  Refund rate:      [pct]% ($[amount] refunded)

📦 INVENTORY
  Fast movers: [top 3 by velocity]
  Slow movers: [bottom 3 by velocity]

KEY TAKEAWAYS:
• [Biggest positive trend]
• [Biggest concern or action item]
• [Recommendation]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### What It Replaces
- Manual weekly reporting from Shopify analytics
- Features from apps like: Triple Whale (weekly digest), BeProfit (weekly P&L), Lifetimely (cohort reports)
