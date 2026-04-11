# GraphQL Operations Index

Cross-reference table mapping every Shopify Admin GraphQL operation used across operator skills to the skills that use it.

**Maintained by:** CI script (`scripts/validate-operations-index.mjs`). Do not edit operation names — they must exactly match the `graphql_operations` frontmatter in each `SKILL.md`.

| Operation | Type | API Version | Skills Using It |
|-----------|------|-------------|-----------------|
| abandonedCheckouts | query | 2025-01 | marketing/abandoned-cart-recovery, conversion-optimization/checkout-abandonment-report |
| collection | query | 2025-01 | merchandising/collection-reorganization |
| collectionReorderProducts | mutation | 2025-01 | merchandising/collection-reorganization |
| customer | query | 2025-01 | conversion-optimization/gift-card-issuance |
| customers | query | 2025-01 | marketing/customer-win-back, marketing/loyalty-segment-export |
| discountCodeBulkCreate | mutation | 2025-01 | marketing/abandoned-cart-recovery |
| discountNodes | query | 2025-01 | conversion-optimization/discount-ab-analysis |
| draftOrderCreate | mutation | 2025-01 | customer-support/refund-and-reorder |
| fulfillmentOrderHold | mutation | 2025-01 | fulfillment-ops/order-hold-and-release |
| fulfillmentOrderReleaseHold | mutation | 2025-01 | fulfillment-ops/order-hold-and-release |
| fulfillmentOrders | query | 2025-01 | fulfillment-ops/fulfillment-status-digest |
| giftCardCreate | mutation | 2025-01 | conversion-optimization/gift-card-issuance |
| inventoryAdjustQuantities | mutation | 2025-01 | merchandising/inventory-adjustment |
| inventoryItems | query | 2025-01 | merchandising/multi-location-inventory-audit |
| locations | query | 2025-01 | merchandising/multi-location-inventory-audit |
| order | query | 2025-01 | customer-support/refund-and-reorder, customer-support/address-correction, fulfillment-ops/cancel-and-restock, customer-support/return-initiation |
| orderCancel | mutation | 2025-01 | fulfillment-ops/cancel-and-restock |
| orders | query | 2025-01 | customer-support/order-lookup-and-summary, conversion-optimization/discount-ab-analysis, conversion-optimization/top-product-performance, fulfillment-ops/fulfillment-status-digest, fulfillment-ops/order-hold-and-release, customer-support/wismo-bulk-status-report |
| orderUpdate | mutation | 2025-01 | customer-support/address-correction |
| products | query | 2025-01 | merchandising/bulk-price-adjustment, merchandising/product-tag-bulk-update |
| productVariants | query | 2025-01 | merchandising/low-inventory-restock, merchandising/inventory-adjustment |
| productVariantsBulkUpdate | mutation | 2025-01 | merchandising/bulk-price-adjustment |
| refundCreate | mutation | 2025-01 | customer-support/refund-and-reorder |
| returnCreate | mutation | 2025-01 | customer-support/return-initiation |
| tagsAdd | mutation | 2025-01 | marketing/abandoned-cart-recovery, marketing/customer-win-back, marketing/loyalty-segment-export, merchandising/product-tag-bulk-update |
| tagsRemove | mutation | 2025-01 | merchandising/product-tag-bulk-update |
