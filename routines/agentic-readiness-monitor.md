---
routine_id: agentic-readiness-monitor
description: "Weekly Agentic Commerce Readiness check — re-scores the catalog for AI-agent findability and alerts when new gaps appear (lost barcodes, blank alt text, reset robots rules)."
cron: "0 9 * * 1"
skills_used:
  - shopify-admin-agentic-readiness-audit
notify: slack
---

## Agentic Readiness Monitor

**Schedule:** Every Monday at 9:00 AM local time
**Runtime:** ~3-5 minutes
**Slack channel:** `#agentic-readiness`

Catches the silent regressions that quietly make a store invisible to AI shoppers — a CSV product import that drops barcodes, a new collection of images with blank alt text, a theme update that resets `robots.txt.liquid`, or policies replaced with an image. It re-scores readiness and only pings you when something moved.

### Prompt

```
You are the store operator for <STORE>.myshopify.com. Run the weekly Agentic Commerce Readiness check.

1. Use shopify-admin-agentic-readiness-audit with format: json to score the store across the five pillars
   (Discoverable, Trusted, Readable, Structured, Matchable).

2. Compare the overall score and each pillar to last week's snapshot stored at
   .agentic/readiness-last.json (if it exists). Compute the deltas.

3. Persist this week's result to .agentic/readiness-last.json for next week.

4. Decide whether to alert:
   - ALERT if the overall score dropped by ≥ 3 points, OR any pillar dropped, OR any
     previously-passing audit_signal regressed (e.g. barcode coverage fell, robots rules lost,
     a policy went missing/image-only).
   - Otherwise post a one-line "steady" status.

5. Send to #agentic-readiness:

🤖 AGENTIC READINESS — [DATE]
━━━━━━━━━━━━━━━━━━━━━━━
Score: [N]/100 ([▲/▼ delta] vs last week)  ·  Grade [X]
Pillars: Discoverable [n] · Trusted [n] · Readable [n] · Structured [n] · Matchable [n]

[If regressions:]
⚠️ New gaps this week:
  • [finding] → run `[fix skill]`
[else:]
✅ Steady — no new gaps.

For each regression, name the exact agentic skill that fixes it (from the readiness audit's routing),
so the operator can run it in one click.
```

> Replace `<STORE>` with your store domain before installing. Install with `/schedule` (Claude Code) or
> `node scripts/install-routines.mjs --schedule`.
