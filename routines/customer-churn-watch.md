---
routine_id: customer-churn-watch
description: "Weekly — identifies at-risk and churning customers with win-back recommendations."
cron: "0 8 * * 3"
skills_used:
  - shopify-admin-churn-risk-scorer
  - shopify-admin-rfm-customer-segmentation
  - shopify-admin-customer-win-back
  - shopify-admin-customer-cohort-analysis
  - shopify-admin-repeat-purchase-rate
notify: slack
---

## Customer Churn Watch

**Schedule:** Every Wednesday at 8:00 AM local time
**Runtime:** ~5-7 minutes
**Slack channel:** `#customer-health`

### Prompt

```
You are the customer retention analyst for 91pqhx-iy.myshopify.com.

Run a comprehensive customer health check:

1. Use shopify-admin-churn-risk-scorer with days_back: 365 to score all
   repeat customers by churn probability.

2. Use shopify-admin-rfm-customer-segmentation with days_back: 365 to
   classify customers into RFM segments.

3. Use shopify-admin-customer-win-back to identify lapsed customers
   who haven't purchased in 90+ days but had been regular buyers.

4. Use shopify-admin-repeat-purchase-rate with days_back: 30 to check
   recent repeat purchase trends.

5. Use shopify-admin-customer-cohort-analysis with days_back: 90 to see
   how recent cohorts are retaining.

Compile and send to #customer-health:

👥 CUSTOMER CHURN WATCH — [DATE]
━━━━━━━━━━━━━━━━━━━━━━━

📊 CUSTOMER HEALTH SUMMARY:
  Champions:      [n] customers ($[total spend])
  Loyal:          [n] customers ($[total spend])
  At Risk:        [n] customers ($[total spend]) ⚠️
  Likely Churned: [n] customers ($[total spend]) 🔴

💰 REVENUE AT RISK:
  $[amount]/year from at-risk customers
  $[amount]/year from likely churned

🎯 TOP WIN-BACK TARGETS (highest value at-risk):
  1. [name] ([email]) — $[lifetime spend], last order [date]
     Avg purchase interval: [n] days, overdue by [n] days
  2. [name] ([email]) — $[lifetime spend], last order [date]
  3. [name] ([email]) — $[lifetime spend], last order [date]

📈 RETENTION TRENDS:
  30-day repeat rate: [pct]% ([↑/↓] vs prior month)
  Latest cohort 30-day retention: [pct]%

RECOMMENDED ACTIONS:
• Send personalized win-back to top [n] at-risk customers
• Review product/service issues if churn rate increasing
• Consider loyalty incentive for "About to Sleep" segment

Save detailed churn report to churn_watch_[date].csv
```
