<p align="center">
  <img src="https://img.shields.io/badge/Shopify-Admin%20Skills-96bf48?style=for-the-badge&logo=shopify&logoColor=white" alt="Shopify Admin Skills" />
</p>

<h1 align="center">Shopify Admin Skills</h1>

<p align="center">
  <strong>AI agent skills to operate your Shopify store with extended capabilities.</strong>
  <br />
  Native Shopify Admin GraphQL — no apps, no UI navigation, just your agent and your store.
</p>

<p align="center">
  <a href="#install"><img src="https://img.shields.io/badge/install-quick%20start-blue?style=flat-square" alt="Install" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome" /></a>
</p>

---

## Skills

### Marketing

| Skill | Description |
|-------|-------------|
| [`abandoned-cart-recovery`](skills/marketing/abandoned-cart-recovery/) | Query abandoned checkouts, generate unique discount codes per customer, tag for re-engagement |
| [`customer-win-back`](skills/marketing/customer-win-back/) | Identify customers who haven't ordered in N days, export a re-engagement list, tag in Shopify |
| [`loyalty-segment-export`](skills/marketing/loyalty-segment-export/) | Identify high-LTV customers by order count and spend, tag them, export a loyalty contact list |

### Merchandising

| Skill | Description |
|-------|-------------|
| [`bulk-price-adjustment`](skills/merchandising/bulk-price-adjustment/) | Update variant prices by percentage or fixed amount across a collection or tag, with floor/ceiling constraints |
| [`collection-reorganization`](skills/merchandising/collection-reorganization/) | Reorder products in a manual collection — in-stock to top, out-of-stock to bottom |
| [`inventory-adjustment`](skills/merchandising/inventory-adjustment/) | Apply quantity adjustments to specific variants at specific locations after cycle counts or sync corrections |
| [`low-inventory-restock`](skills/merchandising/low-inventory-restock/) | Find all variants below a stock threshold, export a restock list grouped by vendor |
| [`multi-location-inventory-audit`](skills/merchandising/multi-location-inventory-audit/) | Audit inventory across all locations, flag negative available or committed > on-hand |
| [`product-tag-bulk-update`](skills/merchandising/product-tag-bulk-update/) | Add or remove tags on products matching a collection, tag, or query — for campaigns or catalog cleanup |

### Customer Support

| Skill | Description |
|-------|-------------|
| [`order-lookup-and-summary`](skills/customer-support/order-lookup-and-summary/) | Retrieve full order details by email, order number, or phone |
| [`refund-and-reorder`](skills/customer-support/refund-and-reorder/) | Process full or partial refund, optionally create a replacement draft order |
| [`address-correction`](skills/customer-support/address-correction/) | Update shipping address on an unfulfilled order before it ships |
| [`return-initiation`](skills/customer-support/return-initiation/) | Create a Shopify Return record with line items, quantities, and reason |
| [`wismo-bulk-status-report`](skills/customer-support/wismo-bulk-status-report/) | Flag shipped orders with stale tracking and unfulfilled orders past SLA |

### Conversion & Optimization

| Skill | Description |
|-------|-------------|
| [`checkout-abandonment-report`](skills/conversion-optimization/checkout-abandonment-report/) | Aggregate abandoned checkout data by cart value bucket and hour of day |
| [`discount-ab-analysis`](skills/conversion-optimization/discount-ab-analysis/) | Compare redemption rates and revenue across discount codes over a date range |
| [`gift-card-issuance`](skills/conversion-optimization/gift-card-issuance/) | Issue gift cards as store credit — goodwill, post-return incentive, or loyalty reward |
| [`top-product-performance`](skills/conversion-optimization/top-product-performance/) | Rank products by revenue, units sold, and refund rate over a date range |

### Fulfillment Ops

| Skill | Description |
|-------|-------------|
| [`fulfillment-status-digest`](skills/fulfillment-ops/fulfillment-status-digest/) | Daily triage digest — open orders segmented by fulfillment age, flagged for holds or exceptions |
| [`order-hold-and-release`](skills/fulfillment-ops/order-hold-and-release/) | Place or release fulfillment holds in batch with a reason and optional expiry |
| [`cancel-and-restock`](skills/fulfillment-ops/cancel-and-restock/) | Cancel an unfulfilled order, restock inventory, notify customer — single workflow |

---

## Install

```bash
npx skills add 40RTY-ai/shopify-admin-skills
```

Works with Claude Code, Cursor, Cline, Copilot, Gemini CLI, and any agent that reads `SKILL.md` files.

## How skills work

Each `SKILL.md` is a complete workflow — GraphQL operations, parameters, guardrails, and output format. Your agent reads the skill, queries your store, previews changes, executes, and reports what it did.

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
