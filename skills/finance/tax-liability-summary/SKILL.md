---
name: tax-liability-summary
role: finance
description: "Read-only: aggregates tax collected by jurisdiction from order tax lines for filing prep."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Aggregates tax amounts collected across all orders in a period, broken down by tax jurisdiction (state/province, country) and tax rate. Produces a summary suitable for periodic tax filing prep. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders`
- API scopes: `read_orders`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 90 | Lookback window (use 30/90 to match filing periods) |
| group_by | string | no | jurisdiction | Breakdown: `jurisdiction` or `rate` |
| exclude_refunded | bool | no | true | Exclude tax from fully refunded orders |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Safe to run at any time. This report is for internal preparation purposes only — consult a tax professional for actual filing obligations.

## Workflow Steps

1. **OPERATION:** `orders` — query
   **Inputs:** `query: "financial_status:paid created_at:>='<NOW - days_back days>'"`, `first: 250`, select `taxLines { title, rate, priceSet }`, `refunds { refundLineItems }`, pagination cursor
   **Expected output:** All paid orders with tax lines; paginate until `hasNextPage: false`

2. If `exclude_refunded`: subtract tax amounts from fully refunded orders

3. Group by `group_by` (jurisdiction title or rate); sum `taxLine.priceSet.shopMoney.amount`

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query TaxLiabilityOrders($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        displayFinancialStatus
        totalTaxSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        taxLines {
          title
          rate
          priceSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
        shippingAddress {
          countryCode
          provinceCode
        }
        refunds {
          totalRefundedSet {
            shopMoney {
              amount
              currencyCode
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Tax Liability Summary                ║
║  Store: <store domain>                       ║
║  Started: <YYYY-MM-DD HH:MM UTC>             ║
╚══════════════════════════════════════════════╝
```

**After each step**, emit:
```
[N/TOTAL] <QUERY|MUTATION>  <OperationName>
          → Params: <brief summary of key inputs>
          → Result: <count or outcome>
```

**On completion**, emit:

For `format: human` (default):
```
══════════════════════════════════════════════
TAX LIABILITY SUMMARY  (<days_back> days)
  Orders analyzed:   <n>
  Total tax collected: $<amount>

  By Jurisdiction:
    CA - California     $<amount>  (<n> orders)
    NY - New York       $<amount>  (<n> orders)
  Output: tax_liability_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "tax-liability-summary",
  "store": "<domain>",
  "period_days": 90,
  "orders_analyzed": 0,
  "total_tax_collected": 0,
  "currency": "USD",
  "by_jurisdiction": [],
  "output_file": "tax_liability_<date>.csv"
}
```

## Output Format
CSV file `tax_liability_<YYYY-MM-DD>.csv` with columns:
`jurisdiction`, `country_code`, `province_code`, `tax_rate`, `order_count`, `total_tax_collected`, `currency`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| No tax lines on orders | Tax not configured or tax-exempt orders | Report $0 for those orders |
| Orders with partial refunds | Tax credit complex to calculate | Flag in output; exclude from totals if `exclude_refunded: true` |

## Best Practices
- This report reflects tax *collected* from customers — it is not a substitute for Shopify Tax or a professional nexus analysis.
- Align `days_back` with your filing period (30 days for monthly filers, 90 for quarterly).
- For multi-state US merchants, check that Shopify Tax is configured correctly for each nexus state before relying on this output.
- The `jurisdiction` field in `taxLines.title` is set by Shopify Tax and typically includes state/province names — verify the format matches your filing system.
