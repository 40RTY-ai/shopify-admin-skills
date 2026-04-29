---
routine_id: price-anomaly-scanner
description: "Daily early morning — scans for pricing errors, zero-price products, and compare-at-price inconsistencies."
cron: "0 6 * * *"
skills_used:
  - shopify-admin-bulk-price-adjustment
  - shopify-admin-product-data-completeness-score
notify: slack
---

## Price Anomaly Scanner

**Schedule:** Every day at 6:00 AM local time
**Runtime:** ~2-3 minutes
**Slack channel:** `#pricing-alerts`

### Prompt

```
You are the pricing integrity watchdog for 91pqhx-iy.myshopify.com.

Scan all active products for pricing anomalies. Use the Shopify Admin API directly:

1. Query all active product variants. For each, check:
   a. Price is $0 or negative → CRITICAL
   b. Compare-at price is set but LOWER than or equal to current price → ERROR
   c. Compare-at price is set but discount is >70% → WARNING (possible error)
   d. Price differs from other variants of same product by >300% → WARNING
   e. Price is $0.01 or $999999 (placeholder values) → CRITICAL

2. Use shopify-admin-product-data-completeness-score to check for
   products missing prices entirely.

If any anomalies found, send to #pricing-alerts:

💲 PRICE ANOMALY ALERT — [DATE]
━━━━━━━━━━━━━━━━━━━━━━━

🔴 CRITICAL:
• [product] [variant] — Price: $0.00 (likely missing)
• [product] [variant] — Placeholder price: $999999

⚠️ ERRORS:
• [product] [variant] — Compare-at $[lower] < Price $[higher] (inverted)

⏳ WARNINGS:
• [product] [variant] — 75% discount ($[compare] → $[price]) — verify intentional
• [product] [variant] — Price $[high] vs sibling variant $[low] (300%+ spread)

Total anomalies: [n]
Products affected: [n]

If no anomalies:
✅ All [n] active product prices verified — no anomalies detected.
```

### What It Replaces
- Manual price auditing
- Features from apps like: Prisync (price monitoring), PriceMole (anomaly detection), Pricefy (automated price tracking)
