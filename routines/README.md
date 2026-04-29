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

| Routine | Schedule | Skills Used |
|---|---|---|
| [morning-store-briefing](morning-store-briefing.md) | Daily 8 AM | 4 skills — orders, fulfillment, top products, AOV |
| [low-stock-watchdog](low-stock-watchdog.md) | Daily 7 AM | 3 skills — demand forecast, restock, velocity |
| [abandoned-cart-patrol](abandoned-cart-patrol.md) | Every 4h | 2 skills — cart recovery, abandonment report |
| [fraud-sentinel](fraud-sentinel.md) | Every 2h | 2 skills — risk report, high-risk tagger |
| [fulfillment-sla-watchdog](fulfillment-sla-watchdog.md) | Weekdays 10 AM + 3 PM | 3 skills — status digest, delivery analysis, split shipment |
| [weekly-business-review](weekly-business-review.md) | Monday 8 AM | 10 skills — comprehensive weekly report |
| [price-anomaly-scanner](price-anomaly-scanner.md) | Daily 6 AM | 2 skills — price audit, completeness score |
| [customer-churn-watch](customer-churn-watch.md) | Wednesday 8 AM | 5 skills — churn scoring, RFM, win-back, repeat rate, cohort |

## Install

### Prerequisites
1. Claude Code with the `shopify-admin-skills` plugin loaded
2. Authenticated Shopify session — recommended: a **Shopify Custom App** with a permanent Admin API access token (CLI tokens expire and routines run headlessly)
3. Optional: Slack MCP configured if you want alerts pushed to a channel

### Option A — One-shot install (recommended)

Paste this into Claude Code:

```
Install all routines from routines/ in this repo. For each .md file
in routines/ (skip README.md), parse the YAML frontmatter to get
routine_id, description, and cron, then extract the prompt from the
"### Prompt" code block.

For each routine, call mcp__scheduled-tasks__create_scheduled_task with:
  taskId: <routine_id>
  cronExpression: <cron>
  description: <description>
  prompt: <extracted prompt>
  notifyOnCompletion: true

After all routines are created, run mcp__scheduled-tasks__list_scheduled_tasks
and confirm each routine is enabled and shows next run time.
```

Claude reads the routine markdown files and creates each scheduled task via the `scheduled-tasks` MCP server.

### Option B — Per-routine via `/schedule`

For one routine at a time, use the built-in `/schedule` command in Claude Code. Open the target routine markdown file, copy the contents of the `### Prompt` code block, and paste it into the schedule prompt field along with the cron expression from the frontmatter.

### Option C — Programmatic via the install script

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
