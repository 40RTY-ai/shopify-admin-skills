---
name: shopify-admin-gift-message-extraction
role: conversion-optimization
description: "Read-only: extracts gift messages, gift recipients, and gift flags from order custom attributes and notes for fulfillment teams to print on packing slips."
toolkit: shopify-admin, shopify-admin-execution
api_version: "2025-01"
graphql_operations:
  - orders:query
status: stable
compatibility: Claude Code, Cursor, Codex, Gemini CLI
---

## Purpose
Pulls gift messages, gift-recipient names, and "is_gift" flags from order custom attributes and order notes for orders that are pending or in-progress fulfillment. Produces a single sheet that the fulfillment team can use to print gift cards / inserts and route gift orders correctly. Read-only — no mutations.

## Prerequisites
- Authenticated Shopify CLI session: `shopify store auth --store <domain> --scopes read_orders`
- API scopes: `read_orders`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| store | string | yes | — | Store domain (e.g., mystore.myshopify.com) |
| days_back | integer | no | 7 | Lookback window of orders to scan |
| status | string | no | unfulfilled | Order status filter: `unfulfilled`, `partial`, `any` |
| message_keys | array | no | `["gift_message","gift_note","Gift Message","Gift Note","message","note_to_recipient"]` | Custom attribute keys (any case) that may contain a gift message |
| recipient_keys | array | no | `["gift_recipient","recipient_name","Gift Recipient","To"]` | Custom attribute keys that may contain a recipient name |
| flag_keys | array | no | `["is_gift","gift","Gift Wrap","gift_wrap"]` | Custom attribute keys whose presence/value marks an order as a gift |
| include_order_note | bool | no | true | Also scan the order-level `note` field for free-text gift messages |
| format | string | no | human | Output format: `human` or `json` |

## Safety

> ℹ️ Read-only skill — no mutations are executed. Output may contain personal text written by customers — handle the resulting CSV with the same care as any customer data export.

## Detection Rules

For each order:

1. **Custom attributes** — for each `lineItem.customAttributes` and `order.customAttributes`:
   - If `key` (case-insensitive) ∈ `message_keys` → capture as `gift_message`
   - If `key` ∈ `recipient_keys` → capture as `gift_recipient`
   - If `key` ∈ `flag_keys` AND value is truthy (`true`, `yes`, `1`, non-empty string) → set `is_gift: true`
2. **Order note** — if `include_order_note: true` and `order.note` matches `/gift|recipient|deliver to|message:/i`, capture the note as a `note_hint`
3. An order qualifies for the report if `is_gift: true` OR `gift_message` was captured OR `gift_recipient` was captured

## Workflow Steps

1. Compute filter: `created_at:>='<NOW - days_back days>'` and translate `status` → `fulfillment_status:unfulfilled` / `:partial` / no filter

2. **OPERATION:** `orders` — query
   **Inputs:** `query: <filter>`, `first: 250`, select `name`, `note`, `customAttributes { key, value }`, `lineItems { name, quantity, customAttributes { key, value } }`, `shippingAddress`, `customer { displayName, defaultEmailAddress { emailAddress } }`, pagination cursor
   **Expected output:** Candidate orders

3. Apply detection rules to each order

4. Build report rows — one per qualifying order, including line items so packers know what to wrap

## GraphQL Operations

```graphql
# orders:query — validated against api_version 2025-01
query OrdersForGiftExtraction($query: String!, $after: String) {
  orders(first: 250, after: $after, query: $query) {
    edges {
      node {
        id
        name
        createdAt
        note
        displayFulfillmentStatus
        customAttributes {
          key
          value
        }
        shippingAddress {
          firstName
          lastName
          address1
          address2
          city
          provinceCode
          countryCodeV2
          zip
          phone
        }
        customer {
          id
          displayName
          defaultEmailAddress {
            emailAddress
          }
        }
        lineItems(first: 50) {
          edges {
            node {
              id
              name
              quantity
              sku
              customAttributes {
                key
                value
              }
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
║  SKILL: Gift Message Extraction              ║
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
GIFT MESSAGE EXTRACTION  (<days_back> days, status: <status>)
  Orders scanned:        <n>
  Gift orders:           <n>
   ↳ With message:       <n>
   ↳ With recipient:     <n>
   ↳ Flag only:          <n>
  Found in order note:   <n>

  Output: gift_messages_<date>.csv
══════════════════════════════════════════════
```

For `format: json`, emit:
```json
{
  "skill": "gift-message-extraction",
  "store": "<domain>",
  "period_days": 7,
  "orders_scanned": 0,
  "gift_orders": 0,
  "with_message": 0,
  "with_recipient": 0,
  "flag_only": 0,
  "from_order_note": 0,
  "output_file": "gift_messages_<date>.csv"
}
```

## Output Format
CSV file `gift_messages_<YYYY-MM-DD>.csv` with columns:
`order_name`, `created_at`, `is_gift`, `gift_recipient`, `gift_message`, `note_hint`, `ship_to_name`, `ship_to_address`, `line_items_summary`, `customer_email`

`line_items_summary` is a `qty × title` list joined with `; `.

## Error Handling
| Error | Cause | Recovery |
|-------|-------|----------|
| `THROTTLED` | API rate limit exceeded | Wait 2 seconds, retry up to 3 times |
| Custom attribute key naming inconsistent across themes | Different storefront templates write different keys | Caller can extend `message_keys` / `recipient_keys` / `flag_keys` |
| Encoded HTML in messages | Storefront stored HTML entities | Decode `&amp;`, `&#39;`, `&quot;` before printing |
| Multi-line messages | Customer pressed Enter inside the input | CSV cells can contain newlines — quote properly when exporting |

## Best Practices
- Run twice a day on the morning and afternoon pick wave — gift messages are time-sensitive and missing one ruins the experience.
- Check custom-attribute key naming against your theme's gift-message implementation; extend `message_keys` / `recipient_keys` if your theme uses non-default keys.
- For peak gifting seasons (Mother's Day, Valentine's, December), expand `days_back` to 14 and switch `status: any` to capture orders already in fulfillment.
- Treat the CSV as PII — gift messages can contain personal sentiments. Restrict access to fulfillment staff who need it.
- Sort the output by `ship_to_address` so packers can pull all gift orders going to the same address together.
