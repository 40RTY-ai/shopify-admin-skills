# Store Operator Routines

Pre-built Claude Code routine definitions that turn your Shopify store into an **always-on, self-monitoring operation**. Each routine combines multiple skills into automated workflows that run on a schedule.

## What Are Routines?

Claude Code routines are scheduled agents that fire on a cron expression and run autonomously. Each fire is a full Claude Code session that can:
- Invoke any skill in this repo
- Query the Shopify Admin GraphQL API
- Send Slack/email alerts via configured MCP servers
- Persist state to files or databases

Routines run on Claude Code's scheduling infrastructure — your machine doesn't need to be on.

## Available Routines

### Daily / High-frequency

| Routine | Schedule | Purpose |
|---|---|---|
| [morning-store-briefing](morning-store-briefing.md) | Daily 8 AM | Orders, revenue, fulfillment digest |
| [low-stock-watchdog](low-stock-watchdog.md) | Daily 7 AM | Inventory + demand forecast alerts |
| [abandoned-cart-patrol](abandoned-cart-patrol.md) | Every 4h | Cart recovery opportunities |
| [fraud-sentinel](fraud-sentinel.md) | Every 2h | High-risk order alerting |
| [fulfillment-sla-watchdog](fulfillment-sla-watchdog.md) | Weekdays 10 AM + 3 PM | Overdue fulfillments |
| [price-anomaly-scanner](price-anomaly-scanner.md) | Daily 6 AM | Pricing error detection |
| [vip-customer-watcher](vip-customer-watcher.md) | Daily 9 AM | VIP order + issue alerts |
| [payout-recon-daily](payout-recon-daily.md) | Daily 6 AM | Shopify Payments reconciliation |
| [new-product-launch-tracker](new-product-launch-tracker.md) | Daily 10 AM | First-week performance of new products |

### Weekly

| Routine | Schedule | Purpose |
|---|---|---|
| [weekly-business-review](weekly-business-review.md) | Monday 8 AM | Comprehensive weekly performance |
| [return-fraud-watch](return-fraud-watch.md) | Monday 9 AM | Suspicious return patterns |
| [discount-roi-weekly](discount-roi-weekly.md) | Tuesday 9 AM | Discount campaign performance |
| [catalog-health-weekly](catalog-health-weekly.md) | Wednesday 7 AM | Product data quality scan |
| [customer-churn-watch](customer-churn-watch.md) | Wednesday 8 AM | At-risk customer identification |
| [seo-coverage-weekly](seo-coverage-weekly.md) | Thursday 7 AM | SEO metadata gap report |
| [dead-stock-weekly](dead-stock-weekly.md) | Sunday 9 AM | Markdown candidates report |

### Monthly / Quarterly

| Routine | Schedule | Purpose |
|---|---|---|
| [monthly-financial-close](monthly-financial-close.md) | 1st @ 8 AM | Monthly P&L, payouts, taxes, refunds |
| [staff-activity-monthly](staff-activity-monthly.md) | 1st @ 10 AM | Staff permission audit |
| [inventory-aging-monthly](inventory-aging-monthly.md) | 15th @ 7 AM | Aging buckets + carrying cost |
| [quarterly-business-review](quarterly-business-review.md) | Quarterly @ 9 AM | Comprehensive QBR with trends + cohorts |

## Install

### Prerequisites
1. Claude Code with the `shopify-admin-skills` plugin loaded
2. Authenticated Shopify session — recommended: a **Shopify Custom App** with a permanent Admin API access token (CLI tokens expire and routines run headlessly)
3. Optional: Slack MCP configured if you want alerts pushed to a channel

### Option A — Smart onboarding (recommended)

The smart installer profiles your store, asks 3 questions, and installs only the routines that fit. **Don't dump all 20 routines on a store that doesn't need them.**

Paste the prompt from [INSTALL.md](INSTALL.md) into Claude Code. Claude will:
1. Silently profile your store (volume, catalog size, locations, subscriptions, payments)
2. Ask 3 questions about your priorities, alert destination, and aggressiveness
3. Score and recommend a tailored routine set
4. Show the plan with reasoning before installing
5. Tailor cron schedules and Slack channels to your answers

**This is the path you want for most stores.**

### Option B — Per-routine via `/schedule`

For one routine at a time, use the built-in `/schedule` command in Claude Code. Open the target routine markdown file, copy the contents of the `### Prompt` code block, and paste it along with the cron expression from the frontmatter.

### Option C — Bulk install (advanced, not recommended for new stores)

Paste this into Claude Code to install **every** routine without filtering:

```
Install all routines from routines/ in this repo. For each .md file
in routines/ (skip README.md and INSTALL.md), parse the YAML frontmatter
to get routine_id, description, and cron, then extract the prompt from
the "### Prompt" code block.

For each routine, call mcp__scheduled-tasks__create_scheduled_task with:
  taskId: <routine_id>
  cronExpression: <cron>
  description: <description>
  prompt: <extracted prompt>
  notifyOnCompletion: true

After all routines are created, run mcp__scheduled-tasks__list_scheduled_tasks
and confirm each routine is enabled and shows next run time.
```

This installs all 20 routines blindly. Use only if you've already vetted each routine for your store.

### Option D — Programmatic via install script

```bash
node scripts/install-routines.mjs            # print plan + Claude install prompt
node scripts/install-routines.mjs --json     # emit routine config as JSON
node scripts/install-routines.mjs --schedule # emit /schedule commands
```

The script parses each routine markdown file and emits ready-to-use install data.

## Manage Installed Routines

In Claude Code:
- **List:** `/schedule list` (or call `mcp__scheduled-tasks__list_scheduled_tasks`)
- **Pause/resume:** `/schedule update <taskId> --enabled false`
- **Modify cron:** `/schedule update <taskId> --cron "<new expression>"`

## Authoring New Routines

Routine markdown files use this format:

```markdown
---
routine_id: my-routine-id
description: "One-line description"
cron: "0 8 * * *"
skills_used:
  - skill-name-1
  - skill-name-2
notify: slack
---

## Routine Title

### Prompt

```
The full prompt that Claude will execute on each fire.
Reference skills by name — Claude will invoke them.
\```
```

Run `node scripts/install-routines.mjs` after adding to verify your file parses correctly.

## Cost Considerations

Each routine fire is a full Claude Code session. With all 8 routines at default frequencies, expect ~20–25 sessions per day. Adjust frequencies or pause routines you don't need.
