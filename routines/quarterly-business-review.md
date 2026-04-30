---
routine_id: quarterly-business-review
description: "First day of each quarter — comprehensive QBR with trends, cohorts, top movers, and strategic insights."
cron: "0 9 1 1,4,7,10 *"
skills_used:
  - shopify-admin-customer-cohort-analysis
  - shopify-admin-rfm-customer-segmentation
  - shopify-admin-top-product-performance
  - shopify-admin-sales-by-channel-report
  - shopify-admin-average-order-value-trends
  - shopify-admin-repeat-purchase-rate
  - shopify-admin-profit-margin-calculator
  - shopify-admin-stock-velocity-report
  - shopify-admin-churn-risk-scorer
  - shopify-admin-discount-roi-calculator
notify: slack
---

## Quarterly Business Review

**Schedule:** Jan 1, Apr 1, Jul 1, Oct 1 at 9:00 AM local time
**Runtime:** ~15-20 minutes
**Slack channel:** `#leadership`

### Prompt

```
You are the QBR analyst. Generate the comprehensive quarterly business review
for the previous quarter (90 days).

Run all of these skills with days_back: 90:
1. shopify-admin-profit-margin-calculator (group_by: product)
2. shopify-admin-sales-by-channel-report
3. shopify-admin-average-order-value-trends (bucket: month)
4. shopify-admin-customer-cohort-analysis
5. shopify-admin-rfm-customer-segmentation
6. shopify-admin-repeat-purchase-rate
7. shopify-admin-top-product-performance
8. shopify-admin-stock-velocity-report
9. shopify-admin-churn-risk-scorer
10. shopify-admin-discount-roi-calculator

Compare Q over Q where possible (use days_back: 180 to capture two quarters).

Compile into a Slack canvas or long message:

📈 Q[N] [YEAR] BUSINESS REVIEW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EXECUTIVE SUMMARY (3 lines max)

PERFORMANCE
  Revenue:        $[amount]  ([↑/↓][pct]% QoQ)
  Orders:         [n]        ([↑/↓][pct]% QoQ)
  AOV:            $[amount]  ([↑/↓]$[delta] QoQ)
  Net profit:     $[amount]  (margin: [pct]%)

CUSTOMERS
  New:            [n]
  Returning:      [n] ([pct]%)
  Champions:      [n]
  At-risk:        [n] ($[revenue at risk])
  Cohort retention 30/60/90: [pct]% / [pct]% / [pct]%

PRODUCTS
  Top 5 by revenue:   [list]
  Top 5 by margin:    [list]
  Bottom 5 by velocity: [list — markdown candidates]

CHANNELS
  [channel]: $[amount] ([pct]%) [↑/↓]

DISCOUNT EFFECTIVENESS
  Spend: $[amount] | Attributed revenue: $[amount] | ROI: [pct]%

STRATEGIC TAKEAWAYS (3-5 bullets):
• [Biggest growth driver]
• [Biggest concern]
• [Customer segment opportunity]
• [Product/inventory action item]
• [Operational issue to address]

Save full QBR to qbr_[year]_q[n].csv
```
