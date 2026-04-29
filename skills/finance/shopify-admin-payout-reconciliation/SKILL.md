---
name: shopify-admin-payout-reconciliation
role: finance
description: "Read-only: reconciles Shopify Payments payouts against the order transactions that funded them and flags amount discrepancies."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - shopifyPaymentsAccount:query
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Reconciles Shopify Payments payouts to the order transactions that contributed to them. For each payout, sums gross sales, refunds, adjustments, and fees, and compares the computed net to the payout's reported `net` amount. Discrepancies are flagged with a delta and the suspected cause. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_shopify_payments_payouts,read_orders`
- API scopes: `read_shopify_payments_payouts`, `read_orders`
- Store must use Shopify Payments. If the store uses only third-party gateways, this skill exits cleanly with a message.

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 30 | Lookback window covering payouts issued in this period |
| tolerance | number | no | 0.01 | Acceptable delta in store currency before flagging a discrepancy |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Reconciliation output is informational; do not treat flagged discrepancies as confirmed errors before reviewing the underlying transactions in the Shopify admin.

## Workflow Steps

1. **OPERATION:** `shopifyPaymentsAccount` — query
   **Inputs:** select `payouts(first: 100, query: "issued_at:>='<NOW - days_back days>'")` with `id`, `issuedAt`, `status`, `net`, `gross`, `summary { chargesGross, chargesFee, refundsGross, refundsFee, adjustmentsGross, adjustmentsFee, retriedPayoutsGross, retriedPayoutsFee }`
   **Expected output:** All payouts in the window. If account is null, exit — store does not use Shopify Payments.

2. For each payout, compute reconciliation expectation:
   ```
   expected_net = chargesGross - chargesFee
                - refundsGross + refundsFee   (refundsFee is normally negative / reversed)
                + adjustmentsGross - adjustmentsFee
                + retriedPayoutsGross - retriedPayoutsFee
   ```
   `delta = reported_net - expected_net`

3. **OPERATION:** `orders` — query (only for flagged payouts to drill down)
   **Inputs:** `query: "transactions:'gateway:shopify_payments processed_at:>=<payout.issuedAt - 7d> processed_at:<=<payout.issuedAt + 1d>'"`, `first: 250`
   **Expected output:** Candidate orders that may have contributed to the payout, used for an order-level cross-check on top discrepancies

4. Classify each payout:
   - `ok` if `|delta| <= tolerance`
   - `discrepancy` otherwise — record sign (positive: payout overpaid us; negative: payout underpaid)

5. Aggregate totals across the window: total payouts, total reconciled, total discrepancies, sum of absolute deltas

## GraphQL Operations

```graphql
# shopifyPaymentsAccount:query — validated against api_version 2025-01
query PayoutReconciliation($payoutQuery: String!, $payoutAfter: String) {
  shopifyPaymentsAccount {
    id
    payoutSchedule { interval }
    payouts(first: 100, after: $payoutAfter, query: $payoutQuery) {
      edges {
        node {
          id
          issuedAt
          status
          net { amount currencyCode }
          gross { amount currencyCode }
          summary {
            chargesGross { amount currencyCode }
            chargesFee { amount currencyCode }
            refundsFeeGross { amount currencyCode }
            refundsFee { amount currencyCode }
            adjustmentsGross { amount currencyCode }
            adjustmentsFee { amount currencyCode }
            retriedPayoutsGross { amount currencyCode }
            retriedPayoutsFee { amount currencyCode }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
}
```

```graphql
# orders:query — validated against api_version 2025-01
query OrdersFundingPayout($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        processedAt
        totalPriceSet { shopMoney { amount currencyCode } }
        totalReceivedSet { shopMoney { amount currencyCode } }
        transactions {
          id
          gateway
          kind
          status
          processedAt
          amountSet { shopMoney { amount currencyCode } }
        }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}
```

## Session Tracking

**Claude MUST emit the following output at each stage. This is mandatory.**

**On start**, emit:
```
╔══════════════════════════════════════════════╗
║  SKILL: Payout Reconciliation                ║
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
PAYOUT RECONCILIATION  (<days_back> days)
  Payouts in window:    <n>
  Reconciled (ok):      <n>
  Discrepancies:        <n>   ⚠️
  Sum of abs deltas:    $<amount>

  Top discrepancies:
    Payout <date>  Reported: $<n>  Expected: $<n>  Δ: $<n>

  Output: payout_reconciliation_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "payout-reconciliation",
  "store": "<domain>",
  "period_days": 30,
  "payouts_count": 0,
  "reconciled_count": 0,
  "discrepancy_count": 0,
  "sum_abs_delta": 0,
  "currency": "USD",
  "output_file": "payout_reconciliation_<date>.csv"
}
```

## Output Format
CSV file `payout_reconciliation_<YYYY-MM-DD>.csv` with columns:
`payout_id`, `issued_at`, `status`, `reported_net`, `expected_net`, `delta`, `currency`, `charges_gross`, `charges_fee`, `refunds_gross`, `refunds_fee`, `adjustments_gross`, `verdict`

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| `shopifyPaymentsAccount` is null | Store does not use Shopify Payments | Exit cleanly; suggest reconciling via the third-party gateway dashboard |
| Currency mismatch within payout | Multi-currency store | Reconcile only payouts in the presentment currency that matches account currency; flag others as `currency_mismatch` |
| Payout still `IN_TRANSIT` | Not yet final | Skip — reconcile after status moves to `PAID` |

## Best Practices
- Run weekly on the morning after a payout is scheduled — same-day reconciliation catches discrepancies while transactions are easy to investigate.
- For any flagged discrepancy, drill in: refunds processed inside the payout window often show up in the next payout's `refundsGross`, which can look like an underpayment if you forget to reconcile across windows.
- Use this skill alongside your accounting export — these numbers should match your bookkeeping software's deposit records to the cent.
- Tolerance > $0.01 should be used cautiously: anything above a few cents typically reflects a real fee or adjustment that deserves an explanation.
- This skill does not detect fraud; it detects accounting deltas. If you suspect fraud, escalate via the Shopify admin's payout detail view.
