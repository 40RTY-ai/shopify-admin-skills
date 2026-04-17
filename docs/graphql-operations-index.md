# GraphQL Operations Index

Cross-reference table mapping every Shopify Admin GraphQL operation used across operator skills to the skills that use it.

**Maintained by:** CI script (`scripts/validate-operations-index.mjs`). Do not edit operation names — they must exactly match the `graphql_operations` frontmatter in each `SKILL.md`.

| Operation | Type | API Version | Skills Using It |
|-----------|------|-------------|-----------------|
| abandonedCheckouts | query | 2025-01 | marketing/shopify-admin-abandoned-cart-recovery, conversion-optimization/shopify-admin-checkout-abandonment-report |
| articles | query | 2025-01 | store-management/shopify-admin-page-content-audit |
| collection | query | 2025-01 | merchandising/shopify-admin-collection-reorganization |
| collectionReorderProducts | mutation | 2025-01 | merchandising/shopify-admin-collection-reorganization |
| collections | query | 2025-01 | merchandising/shopify-admin-seo-metadata-audit, merchandising/shopify-admin-collection-membership-audit |
| companies | query | 2025-01 | customer-ops/shopify-admin-b2b-company-overview |
| companyLocations | query | 2025-01 | customer-ops/shopify-admin-b2b-company-overview |
| customer | query | 2025-01 | conversion-optimization/shopify-admin-gift-card-issuance |
| customerUpdate | mutation | 2025-01 | customer-ops/shopify-admin-customer-note-bulk-annotator |
| customers | query | 2025-01 | marketing/shopify-admin-customer-win-back, marketing/shopify-admin-loyalty-segment-export, finance/shopify-admin-average-order-value-trends, customer-ops/shopify-admin-duplicate-customer-finder, customer-ops/shopify-admin-customer-note-bulk-annotator, customer-ops/shopify-admin-marketing-consent-report, customer-ops/shopify-admin-customer-spend-tier-tagger, customer-ops/shopify-admin-customer-cohort-analysis, order-intelligence/shopify-admin-repeat-purchase-rate |
| discountCodeBulkCreate | mutation | 2025-01 | marketing/shopify-admin-abandoned-cart-recovery |
| discountCodeDelete | mutation | 2025-01 | store-management/shopify-admin-discount-hygiene-cleanup |
| discountNodes | query | 2025-01 | conversion-optimization/shopify-admin-discount-ab-analysis, store-management/shopify-admin-discount-hygiene-cleanup |
| draftOrderCreate | mutation | 2025-01 | customer-support/shopify-admin-refund-and-reorder |
| draftOrderDelete | mutation | 2025-01 | store-management/shopify-admin-draft-order-cleanup |
| draftOrders | query | 2025-01 | store-management/shopify-admin-draft-order-cleanup |
| fulfillmentCreate | mutation | 2025-01 | fulfillment-ops/shopify-admin-bulk-fulfillment-creation |
| fulfillmentOrderHold | mutation | 2025-01 | fulfillment-ops/shopify-admin-order-hold-and-release, order-intelligence/shopify-admin-high-risk-order-tagger |
| fulfillmentOrderMove | mutation | 2025-01 | fulfillment-ops/shopify-admin-fulfillment-location-routing |
| fulfillmentOrderReleaseHold | mutation | 2025-01 | fulfillment-ops/shopify-admin-order-hold-and-release |
| fulfillmentOrders | query | 2025-01 | fulfillment-ops/shopify-admin-fulfillment-status-digest, fulfillment-ops/shopify-admin-bulk-fulfillment-creation, fulfillment-ops/shopify-admin-fulfillment-location-routing, fulfillment-ops/shopify-admin-delivery-time-analysis, fulfillment-ops/shopify-admin-split-shipment-planner, finance/shopify-admin-revenue-by-location-report |
| fulfillmentOrderSplit | mutation | 2025-01 | fulfillment-ops/shopify-admin-split-shipment-planner |
| fulfillmentUpdate | mutation | 2025-01 | fulfillment-ops/shopify-admin-tracking-update-bulk |
| giftCardCreate | mutation | 2025-01 | conversion-optimization/shopify-admin-gift-card-issuance |
| giftCards | query | 2025-01 | finance/shopify-admin-gift-card-balance-report |
| inventoryAdjustQuantities | mutation | 2025-01 | merchandising/shopify-admin-inventory-adjustment, merchandising/shopify-admin-inventory-transfer-between-locations |
| inventoryItems | query | 2025-01 | merchandising/shopify-admin-multi-location-inventory-audit, merchandising/shopify-admin-dead-stock-identifier, merchandising/shopify-admin-inventory-transfer-between-locations, merchandising/shopify-admin-stock-velocity-report, merchandising/shopify-admin-inventory-valuation-report |
| locations | query | 2025-01 | merchandising/shopify-admin-multi-location-inventory-audit, merchandising/shopify-admin-inventory-transfer-between-locations, merchandising/shopify-admin-inventory-valuation-report, finance/shopify-admin-revenue-by-location-report |
| metafieldsDelete | mutation | 2025-01 | merchandising/shopify-admin-metafield-bulk-update |
| metafieldsSet | mutation | 2025-01 | merchandising/shopify-admin-metafield-bulk-update |
| order | query | 2025-01 | customer-support/shopify-admin-refund-and-reorder, customer-support/shopify-admin-address-correction, fulfillment-ops/shopify-admin-cancel-and-restock, customer-support/shopify-admin-return-initiation, fulfillment-ops/shopify-admin-tracking-update-bulk |
| orderCancel | mutation | 2025-01 | fulfillment-ops/shopify-admin-cancel-and-restock |
| orders | query | 2025-01 | customer-support/shopify-admin-order-lookup-and-summary, conversion-optimization/shopify-admin-discount-ab-analysis, conversion-optimization/shopify-admin-top-product-performance, fulfillment-ops/shopify-admin-fulfillment-status-digest, fulfillment-ops/shopify-admin-order-hold-and-release, customer-support/shopify-admin-wismo-bulk-status-report, fulfillment-ops/shopify-admin-delivery-time-analysis, returns/shopify-admin-return-reason-analysis, returns/shopify-admin-exchange-vs-refund-ratio, returns/shopify-admin-return-processing-sla, finance/shopify-admin-refund-rate-analysis, finance/shopify-admin-revenue-by-location-report, finance/shopify-admin-average-order-value-trends, finance/shopify-admin-tax-liability-summary, finance/shopify-admin-sales-by-channel-report, finance/shopify-admin-shipping-cost-analysis, merchandising/shopify-admin-dead-stock-identifier, merchandising/shopify-admin-stock-velocity-report, customer-ops/shopify-admin-customer-spend-tier-tagger, customer-ops/shopify-admin-customer-cohort-analysis, order-intelligence/shopify-admin-order-risk-report, order-intelligence/shopify-admin-high-risk-order-tagger, order-intelligence/shopify-admin-repeat-purchase-rate, order-intelligence/shopify-admin-order-notes-and-attributes-report, merchandising/shopify-admin-variant-performance-report, order-intelligence/shopify-admin-product-affinity-cross-sell |
| orderUpdate | mutation | 2025-01 | customer-support/shopify-admin-address-correction |
| pages | query | 2025-01 | merchandising/shopify-admin-seo-metadata-audit, store-management/shopify-admin-page-content-audit |
| productUpdate | mutation | 2025-01 | merchandising/shopify-admin-product-lifecycle-manager |
| productVariants | query | 2025-01 | merchandising/shopify-admin-low-inventory-restock, merchandising/shopify-admin-inventory-adjustment, merchandising/shopify-admin-duplicate-sku-barcode-detector, merchandising/shopify-admin-dead-stock-identifier, merchandising/shopify-admin-stock-velocity-report, merchandising/shopify-admin-inventory-valuation-report, merchandising/shopify-admin-variant-performance-report |
| productVariantsBulkUpdate | mutation | 2025-01 | merchandising/shopify-admin-bulk-price-adjustment, merchandising/shopify-admin-variant-option-normalizer |
| products | query | 2025-01 | merchandising/shopify-admin-bulk-price-adjustment, merchandising/shopify-admin-product-tag-bulk-update, merchandising/shopify-admin-product-lifecycle-manager, merchandising/shopify-admin-seo-metadata-audit, merchandising/shopify-admin-product-image-audit, merchandising/shopify-admin-metafield-bulk-update, merchandising/shopify-admin-collection-membership-audit, merchandising/shopify-admin-variant-option-normalizer, merchandising/shopify-admin-product-data-completeness-score, store-management/shopify-admin-publication-channel-audit |
| publications | query | 2025-01 | store-management/shopify-admin-publication-channel-audit |
| refundCreate | mutation | 2025-01 | customer-support/shopify-admin-refund-and-reorder |
| returnCreate | mutation | 2025-01 | customer-support/shopify-admin-return-initiation |
| returns | query | 2025-01 | returns/shopify-admin-return-reason-analysis, returns/shopify-admin-exchange-vs-refund-ratio, returns/shopify-admin-return-processing-sla |
| shopifyqlQuery | query | 2025-01 | conversion-optimization/shopify-admin-traffic-by-page-report |
| tagsAdd | mutation | 2025-01 | marketing/shopify-admin-abandoned-cart-recovery, marketing/shopify-admin-customer-win-back, marketing/shopify-admin-loyalty-segment-export, merchandising/shopify-admin-product-tag-bulk-update, customer-ops/shopify-admin-customer-spend-tier-tagger, order-intelligence/shopify-admin-high-risk-order-tagger |
| tagsRemove | mutation | 2025-01 | merchandising/shopify-admin-product-tag-bulk-update |
| urlRedirects | query | 2025-01 | store-management/shopify-admin-url-redirect-audit |
