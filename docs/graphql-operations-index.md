# GraphQL Operations Index

Cross-reference table mapping every Shopify Admin GraphQL operation used across operator skills to the skills that use it.

**Maintained by:** CI script (`scripts/validate-operations-index.mjs`). Do not edit operation names — they must exactly match the `graphql_operations` frontmatter in each `SKILL.md`.

| Operation | Type | API Version | Skills Using It |
|-----------|------|-------------|-----------------|
| abandonedCheckouts | query | 2025-01 | marketing/abandoned-cart-recovery, conversion-optimization/checkout-abandonment-report |
| articles | query | 2025-01 | store-management/page-content-audit |
| collection | query | 2025-01 | merchandising/collection-reorganization |
| collectionReorderProducts | mutation | 2025-01 | merchandising/collection-reorganization |
| collections | query | 2025-01 | merchandising/seo-metadata-audit, merchandising/collection-membership-audit |
| companies | query | 2025-01 | customer-ops/b2b-company-overview |
| companyLocations | query | 2025-01 | customer-ops/b2b-company-overview |
| customer | query | 2025-01 | conversion-optimization/gift-card-issuance |
| customerUpdate | mutation | 2025-01 | customer-ops/customer-note-bulk-annotator |
| customers | query | 2025-01 | marketing/customer-win-back, marketing/loyalty-segment-export, finance/average-order-value-trends, customer-ops/duplicate-customer-finder, customer-ops/customer-note-bulk-annotator, customer-ops/marketing-consent-report, customer-ops/customer-spend-tier-tagger, customer-ops/customer-cohort-analysis, order-intelligence/repeat-purchase-rate |
| discountCodeBulkCreate | mutation | 2025-01 | marketing/abandoned-cart-recovery |
| discountCodeDelete | mutation | 2025-01 | store-management/discount-hygiene-cleanup |
| discountNodes | query | 2025-01 | conversion-optimization/discount-ab-analysis, store-management/discount-hygiene-cleanup |
| draftOrderCreate | mutation | 2025-01 | customer-support/refund-and-reorder |
| draftOrderDelete | mutation | 2025-01 | store-management/draft-order-cleanup |
| draftOrders | query | 2025-01 | store-management/draft-order-cleanup |
| fulfillmentCreate | mutation | 2025-01 | fulfillment-ops/bulk-fulfillment-creation |
| fulfillmentOrderHold | mutation | 2025-01 | fulfillment-ops/order-hold-and-release, order-intelligence/high-risk-order-tagger |
| fulfillmentOrderMove | mutation | 2025-01 | fulfillment-ops/fulfillment-location-routing |
| fulfillmentOrderReleaseHold | mutation | 2025-01 | fulfillment-ops/order-hold-and-release |
| fulfillmentOrders | query | 2025-01 | fulfillment-ops/fulfillment-status-digest, fulfillment-ops/bulk-fulfillment-creation, fulfillment-ops/fulfillment-location-routing, fulfillment-ops/delivery-time-analysis, fulfillment-ops/split-shipment-planner, finance/revenue-by-location-report |
| fulfillmentOrderSplit | mutation | 2025-01 | fulfillment-ops/split-shipment-planner |
| fulfillmentUpdate | mutation | 2025-01 | fulfillment-ops/tracking-update-bulk |
| giftCardCreate | mutation | 2025-01 | conversion-optimization/gift-card-issuance |
| giftCards | query | 2025-01 | finance/gift-card-balance-report |
| inventoryAdjustQuantities | mutation | 2025-01 | merchandising/inventory-adjustment, merchandising/inventory-transfer-between-locations |
| inventoryItems | query | 2025-01 | merchandising/multi-location-inventory-audit, merchandising/dead-stock-identifier, merchandising/inventory-transfer-between-locations, merchandising/stock-velocity-report, merchandising/inventory-valuation-report |
| locations | query | 2025-01 | merchandising/multi-location-inventory-audit, merchandising/inventory-transfer-between-locations, merchandising/inventory-valuation-report, finance/revenue-by-location-report |
| metafieldsDelete | mutation | 2025-01 | merchandising/metafield-bulk-update |
| metafieldsSet | mutation | 2025-01 | merchandising/metafield-bulk-update |
| order | query | 2025-01 | customer-support/refund-and-reorder, customer-support/address-correction, fulfillment-ops/cancel-and-restock, customer-support/return-initiation, fulfillment-ops/tracking-update-bulk |
| orderCancel | mutation | 2025-01 | fulfillment-ops/cancel-and-restock |
| orders | query | 2025-01 | customer-support/order-lookup-and-summary, conversion-optimization/discount-ab-analysis, conversion-optimization/top-product-performance, fulfillment-ops/fulfillment-status-digest, fulfillment-ops/order-hold-and-release, customer-support/wismo-bulk-status-report, fulfillment-ops/delivery-time-analysis, returns/return-reason-analysis, returns/exchange-vs-refund-ratio, returns/return-processing-sla, finance/refund-rate-analysis, finance/revenue-by-location-report, finance/average-order-value-trends, finance/tax-liability-summary, finance/sales-by-channel-report, finance/shipping-cost-analysis, merchandising/dead-stock-identifier, merchandising/stock-velocity-report, customer-ops/customer-spend-tier-tagger, customer-ops/customer-cohort-analysis, order-intelligence/order-risk-report, order-intelligence/high-risk-order-tagger, order-intelligence/repeat-purchase-rate, order-intelligence/order-notes-and-attributes-report |
| orderUpdate | mutation | 2025-01 | customer-support/address-correction |
| pages | query | 2025-01 | merchandising/seo-metadata-audit, store-management/page-content-audit |
| productUpdate | mutation | 2025-01 | merchandising/product-lifecycle-manager |
| productVariants | query | 2025-01 | merchandising/low-inventory-restock, merchandising/inventory-adjustment, merchandising/duplicate-sku-barcode-detector, merchandising/dead-stock-identifier, merchandising/stock-velocity-report, merchandising/inventory-valuation-report |
| productVariantsBulkUpdate | mutation | 2025-01 | merchandising/bulk-price-adjustment, merchandising/variant-option-normalizer |
| products | query | 2025-01 | merchandising/bulk-price-adjustment, merchandising/product-tag-bulk-update, merchandising/product-lifecycle-manager, merchandising/seo-metadata-audit, merchandising/product-image-audit, merchandising/metafield-bulk-update, merchandising/collection-membership-audit, merchandising/variant-option-normalizer, merchandising/product-data-completeness-score, store-management/publication-channel-audit |
| publications | query | 2025-01 | store-management/publication-channel-audit |
| refundCreate | mutation | 2025-01 | customer-support/refund-and-reorder |
| returnCreate | mutation | 2025-01 | customer-support/return-initiation |
| returns | query | 2025-01 | returns/return-reason-analysis, returns/exchange-vs-refund-ratio, returns/return-processing-sla |
| tagsAdd | mutation | 2025-01 | marketing/abandoned-cart-recovery, marketing/customer-win-back, marketing/loyalty-segment-export, merchandising/product-tag-bulk-update, customer-ops/customer-spend-tier-tagger, order-intelligence/high-risk-order-tagger |
| tagsRemove | mutation | 2025-01 | merchandising/product-tag-bulk-update |
| urlRedirects | query | 2025-01 | store-management/url-redirect-audit |
