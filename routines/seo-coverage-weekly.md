---
routine_id: seo-coverage-weekly
description: "Thursdays — SEO metadata gap report across catalog."
cron: "0 7 * * 4"
skills_used:
  - shopify-admin-seo-metadata-audit
  - shopify-admin-product-data-completeness-score
  - shopify-admin-url-redirect-audit
notify: slack
---

## SEO Coverage Weekly

**Schedule:** Every Thursday at 7:00 AM local time
**Runtime:** ~3-5 minutes
**Slack channel:** `#growth`

### Prompt

```
You are the SEO health monitor. Weekly catalog SEO audit.

1. shopify-admin-seo-metadata-audit
2. shopify-admin-product-data-completeness-score (focus on SEO fields)
3. shopify-admin-url-redirect-audit

Send to #growth:

🔍 SEO COVERAGE REPORT — [DATE]
━━━━━━━━━━━━━━━━━━━━━━━

CATALOG SEO HEALTH:
  Products audited:           [n]
  Missing meta title:         [n] ([pct]%)
  Missing meta description:   [n] ([pct]%)
  Missing alt text on images: [n] ([pct]%)
  Duplicate meta titles:      [n]

URL REDIRECTS:
  Active redirects:    [n]
  Broken redirects:    [n]
  Orphan redirects:    [n]

WEEK OVER WEEK:
  SEO completeness: [pct]% ([↑/↓] vs last week)

TOP PRIORITY FIXES:
1. [n] high-traffic products missing meta titles
2. [n] products with duplicate titles (cannibalization risk)
3. [n] images missing alt text

Save full SEO gap list to seo_audit_[date].csv

If completeness >95%: ✅ SEO catalog healthy.
```
