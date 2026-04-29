---
routine_id: catalog-health-weekly
description: "Wednesdays — comprehensive product data quality scan."
cron: "0 7 * * 3"
skills_used:
  - shopify-admin-product-data-completeness-score
  - shopify-admin-product-image-audit
  - shopify-admin-cogs-completeness-audit
  - shopify-admin-duplicate-sku-barcode-detector
  - shopify-admin-vendor-consolidation
  - shopify-admin-variant-option-normalizer
notify: slack
---

## Catalog Health Weekly

**Schedule:** Every Wednesday at 7:00 AM local time
**Runtime:** ~5-8 minutes
**Slack channel:** `#catalog-ops`

### Prompt

```
You are the catalog quality auditor. Weekly comprehensive product data scan.

1. shopify-admin-product-data-completeness-score
2. shopify-admin-product-image-audit
3. shopify-admin-cogs-completeness-audit
4. shopify-admin-duplicate-sku-barcode-detector
5. shopify-admin-vendor-consolidation
6. shopify-admin-variant-option-normalizer

Send to #catalog-ops:

📋 CATALOG HEALTH REPORT — [DATE]
━━━━━━━━━━━━━━━━━━━━━━━

OVERALL HEALTH SCORE: [pct]%

DATA QUALITY ISSUES:
  Missing images:           [n] products
  Missing alt text:         [n] images
  Missing COGS:             [n] variants ⚠️ blocks margin calc
  Missing vendor:           [n] products
  Missing product type:     [n] products
  Duplicate SKUs:           [n] pairs
  Duplicate barcodes:       [n] pairs
  Vendor name variants:     [n] groups (e.g., "Acme" vs "ACME")
  Variant option drift:     [n] products with inconsistent options

WEEK OVER WEEK:
  Health score:  [pct]% ([↑/↓] vs last week)
  New issues:    [n]
  Resolved:      [n]

TOP PRIORITY:
1. [Most-impacting issue]
2. [Second most]
3. [Third]

Save full audit to catalog_health_[date].csv

If health score >90%: ✅ Catalog in good shape.
```
