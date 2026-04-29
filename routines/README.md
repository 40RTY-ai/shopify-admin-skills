# Store Operator Routines

Pre-built Claude Code routine definitions that turn your Shopify store into an **always-on, self-monitoring operation**. Each routine combines multiple skills into automated workflows that run on a schedule.

## What Are Routines?

Claude Code routines are scheduled agents that execute autonomously on a cron schedule. They can:
- Run any Shopify admin skill against your store
- Send alerts and reports to Slack
- Write data to files or databases
- Chain multiple skills together into workflows

## Setup

### Prerequisites
1. Claude Code with the `shopify-admin-skills` plugin loaded
2. Authenticated Shopify CLI session (or a custom app with permanent Admin API token)
3. Slack MCP configured (for notification routines)

### Installing a Routine

Use the `/schedule` command in Claude Code, or create programmatically:

```
/schedule create --id <routine-id> --cron "<expression>" --prompt "<from routine file>"
```

Or copy the prompt from any routine file below into the Claude Code routines panel at `claude.ai/code`.

## Available Routines

| Routine | Schedule | Description |
|---------|----------|-------------|
| [morning-store-briefing](morning-store-briefing.md) | Daily 8 AM | Orders, revenue, and issue digest |
| [low-stock-watchdog](low-stock-watchdog.md) | Daily 7 AM | Inventory alerts for items below reorder point |
| [abandoned-cart-patrol](abandoned-cart-patrol.md) | Every 4 hours | Abandoned checkout detection and alerting |
| [fraud-sentinel](fraud-sentinel.md) | Every 2 hours | High-risk order scanning and flagging |
| [fulfillment-sla-watchdog](fulfillment-sla-watchdog.md) | Weekdays 10 AM, 3 PM | Overdue fulfillment detection |
| [weekly-business-review](weekly-business-review.md) | Monday 8 AM | Comprehensive weekly performance report |
| [price-anomaly-scanner](price-anomaly-scanner.md) | Daily 6 AM | Pricing error and anomaly detection |
| [customer-churn-watch](customer-churn-watch.md) | Wednesday 8 AM | At-risk customer identification |

## Authentication Note

Routines run headlessly — the Shopify CLI auth token must be valid when the routine fires. For production use, create a **Shopify Custom App** with a permanent Admin API access token instead of relying on CLI auth.

## Cost Considerations

Each routine run is a full Claude Code session. With all 8 routines at default frequencies, expect ~20-25 sessions per day. Monitor API usage and adjust schedules as needed.
