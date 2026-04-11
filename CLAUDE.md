# Shopify Admin Skills — Claude Session Guide

## Cold Start Checklist

Run this from the repo root in a terminal **before** starting Claude Code:

```bash
chmod +x scripts/dev-session.sh
./scripts/dev-session.sh [store-domain]
# Default store: 91pqhx-iy.myshopify.com
```

This script: authenticates with the store → verifies the connection → launches `claude --plugin-dir .`

---

## Manual Cold Start (step by step)

### 1. Authenticate with the store (terminal — interactive)
```bash
shopify store auth --store 91pqhx-iy.myshopify.com \
  --scopes read_orders,read_customers,read_products,write_products,read_checkouts,read_discounts,read_inventory
```

### 2. Verify the connection
```bash
shopify store execute --store 91pqhx-iy.myshopify.com --query 'query { shop { name id } }'
# Expected: { "shop": { "name": "...", "id": "gid://shopify/Shop/..." } }
```

### 3. Launch Claude Code with the local plugin
```bash
claude --plugin-dir /Users/tamired/ws/shopify-admin-skills
```

> The **Shopify AI Toolkit** plugin (`shopify-plugin:*`) is permanently installed and loads automatically.  
> The **shopify-admin-skills** plugin (`shopify-store-skills:*`) is loaded via `--plugin-dir`.

---

## Validating Plugins Are Loaded

At the start of a session, Claude should confirm both plugins are active.

**Shopify AI Toolkit** — skills that should be available:
- `shopify-plugin:shopify-admin` (GraphQL doc search + validation)
- `shopify-plugin:shopify-admin-execution` (store execution workflow)

**shopify-admin-skills** — skills that should be available:
- `shopify-store-skills:abandoned-cart-recovery`
- `shopify-store-skills:bulk-price-adjustment`
- `shopify-store-skills:low-inventory-restock`
- `shopify-store-skills:collection-reorganization`
- `shopify-store-skills:order-lookup-and-summary`
- `shopify-store-skills:refund-and-reorder`
- `shopify-store-skills:address-correction`
- `shopify-store-skills:discount-ab-analysis`
- `shopify-store-skills:checkout-abandonment-report`
- `shopify-store-skills:top-product-performance`
- `shopify-store-skills:customer-win-back`
- `shopify-store-skills:loyalty-segment-export`

---

## Store Details

| Field | Value |
|-------|-------|
| Store domain | `91pqhx-iy.myshopify.com` |
| Shop GID | `gid://shopify/Shop/81491230913` |
| Auth account | `tamired@gmail.com` |
| API version | `2025-01` |

---

## Running a Skill

Every skill in `skills/<role>/<name>/SKILL.md` follows this pattern:

1. Use `shopify-plugin:shopify-admin` to validate the GraphQL operation
2. Use `shopify-plugin:shopify-admin-execution` to execute against the store
3. Always pass `dry_run: true` on first run for any mutation skill

Example — look up recent orders:
```bash
shopify store execute --store 91pqhx-iy.myshopify.com \
  --query 'query { orders(first: 5, sortKey: CREATED_AT, reverse: true) { edges { node { id name displayFinancialStatus } } } }'
```

---

## Validation Script

```bash
pnpm validate:index
# Expected: ✅ GraphQL Operations Index valid — 12 skill(s), 15 operation(s) checked.
```
