#!/usr/bin/env bash
# Cold-start helper for shopify-admin-skills development sessions.
# Usage: ./scripts/dev-session.sh [store-domain]
# Default store: 91pqhx-iy.myshopify.com

set -e

STORE="${1:-91pqhx-iy.myshopify.com}"

echo "==> Checking Shopify CLI version..."
SHOPIFY_VERSION=$(shopify version 2>/dev/null || echo "not found")
echo "    shopify CLI: $SHOPIFY_VERSION"
if [[ "$SHOPIFY_VERSION" < "3.93" ]]; then
  echo "    ⚠️  Upgrade required: npm install -g @shopify/cli@latest"
  exit 1
fi

echo ""
echo "==> Authenticating with $STORE..."
echo "    Scopes: read_orders, read_customers, read_products, write_products,"
echo "            read_checkouts, read_discounts, read_inventory"
shopify store auth --store "$STORE" \
  --scopes read_orders,read_customers,read_products,write_products,read_checkouts,read_discounts,read_inventory

echo ""
echo "==> Verifying store connection..."
RESULT=$(shopify store execute --store "$STORE" --query 'query { shop { name id } }' 2>&1)
if echo "$RESULT" | grep -q '"name"'; then
  SHOP_NAME=$(echo "$RESULT" | grep '"name"' | sed 's/.*"name": "\(.*\)".*/\1/')
  echo "    ✅ Connected to: $SHOP_NAME ($STORE)"
else
  echo "    ❌ Connection failed. Re-run auth:"
  echo "       shopify store auth --store $STORE --scopes read_orders,read_customers"
  exit 1
fi

echo ""
echo "==> Launching Claude Code with shopify-admin-skills plugin..."
echo "    Shopify AI Toolkit plugin: loaded from installed plugins"
echo "    shopify-admin-skills:      loaded from $(pwd)"
echo ""
claude --plugin-dir "$(pwd)"
