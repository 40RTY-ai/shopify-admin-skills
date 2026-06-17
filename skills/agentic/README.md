# Agentic Commerce Readiness

> Make your store findable, readable, and recommendable by AI shopping agents — ChatGPT, Gemini, Perplexity, and the new wave of agentic checkout.

AI shoppers don't browse your storefront the way humans do. They read your **structured data**, your **policies**, your **robots rules**, and your **catalog feed** — and if those are thin or missing, the agent recommends a competitor whose data is complete. The [**agentiq.report**](https://agentiq.report) audit measures exactly where your store fails that test. **This category fixes it.**

## The closed loop

```
agentiq.report audit  →  finds the gap (a "signal")  →  this category's skill  →  fixes it via the Shopify Admin toolkit
```

Every skill here declares the audit **signals** it remediates in its frontmatter (`audit_signals:`), so a finding in the report maps directly to the skill that resolves it. Run the audit, then run the matching skills.

Start with **`shopify-admin-agentic-readiness-audit`** — it scans your catalog store-side, scores it the way agentiq.report does, and tells you which of the skills below to run for each gap.

## Signal → skill map

| agentiq.report signal | Skill |
|---|---|
| `agentic-listing-schema`, `catalog-intent-alignment` (overview) | `shopify-admin-agentic-readiness-audit` |
| `product-schema-jsonld`, `gtin-sku-pdp`, `variant-metadata` | `shopify-admin-agentic-product-jsonld-backfill` |
| `listing-image-alt-text` | `shopify-admin-agentic-image-alt-text` |
| `listing-description-quality` | `shopify-admin-agentic-description-enrichment` |
| `listing-metafields`, `variant-metadata`, `sizing-specs-structured` | `shopify-admin-agentic-metafields-setup` |
| `category-taxonomy-api`, `catalog-intent-alignment` | `shopify-admin-agentic-product-taxonomy` |
| `robots-ai-rules` | `shopify-admin-agentic-crawler-access` |
| `llms-txt`, `well-known-llms-txt`, `agents-md` | `shopify-admin-agentic-llms-txt` |
| `org-schema`, `machine-contact`, `wikidata-qid` | `shopify-admin-agentic-organization-schema` |
| `shipping-policy-readable`, `returns-policy-readable` | `shopify-admin-agentic-policy-readability` |

## Recommended order

1. **`shopify-admin-agentic-readiness-audit`** — measure first (read-only).
2. **Catalog data** (highest leverage, unblocks AI retrieval + JSON-LD): `product-jsonld-backfill` → `product-taxonomy` → `metafields-setup` → `description-enrichment` → `image-alt-text`.
3. **Discovery & trust** (theme/store level): `crawler-access` → `organization-schema` → `llms-txt` → `policy-readability`.
4. **Re-run the audit** to confirm each pillar moved.

## Safety

The catalog skills only fill blanks by default and support `dry_run: true`. The **theme-editing** skills (`crawler-access`, `organization-schema`, `llms-txt`) write to your **live published theme** and the **policy** skill writes **legal content** — these default to `dry_run`/`audit` mode, write inside clearly-marked managed blocks, and recommend **duplicating the theme first**. Always review the dry-run output before committing.

## Companion routine

`routines/agentic-readiness-monitor.md` re-runs the readiness audit on a schedule and alerts when new gaps appear (e.g. after a product import drops barcodes or a theme update resets robots rules).
