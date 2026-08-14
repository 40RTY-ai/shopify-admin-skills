import type { APIRoute } from 'astro';
import { readRoutines, readSkills, skillsByCategory } from '../lib/catalog';

/**
 * `/llms-full.txt` — the complete reference for an AI agent.
 *
 * Generated for the same reason as `llms.txt` (the hand-written copy had drifted
 * on every count), plus one the summary does not have: the skills reference used
 * to be a prose sketch that named a handful of skills per category. Now every
 * skill is listed with its real frontmatter description and its canonical URL.
 *
 * That list is the single most useful thing on this domain for a model. It turns
 * "Shopify Admin Skills has a lot of skills" into "here is the exact skill that
 * does what you asked, and where to read it" — which is the difference between
 * being described and being used.
 *
 * `public/llms-full.txt` was deleted when this landed; a static file of the same
 * name would shadow this route.
 */

const SCOPES = [
  'read_products', 'write_products', 'read_orders', 'write_orders',
  'read_customers', 'write_customers', 'read_inventory', 'write_inventory',
  'read_discounts', 'write_discounts', 'read_fulfillments', 'write_fulfillments',
  'read_returns', 'write_returns', 'read_price_rules', 'write_price_rules',
  'read_publications', 'write_publications', 'read_shopify_payments_payouts',
].join(', ');

export const GET: APIRoute = () => {
  const skills = readSkills();
  const routines = readRoutines();
  const grouped = skillsByCategory(skills);

  let section = 0;
  const skillsReference = [...grouped.entries()]
    .map(([category, items]) => {
      section += 1;
      const rows = items
        .map((s) => `- **${s.name}** — ${s.description}\n  ${s.url}`)
        .join('\n');
      return `### 3.${section} ${category} (${items.length})\n\n${rows}`;
    })
    .join('\n\n');

  const routinesTable = routines
    .map((r) => `| ${r.title} | \`${r.cron}\` | ${r.description} |`)
    .join('\n');

  return new Response(`# Shopify Admin Skills — Full Documentation for AI Agents

**Source:** https://skills.40rty.ai
**Summary file:** https://skills.40rty.ai/llms.txt
**Generated:** at build time from the repository, so every count and every skill
below reflects what actually ships.

---

## 1. Product Overview

**Shopify Admin Skills** is a free, open-source library of ${skills.length} structured AI agent skills and ${routines.length} automated routines for Shopify store operators, across ${grouped.size} categories. Built by 40rty.

Each skill is a structured prompt that guides an AI agent through a specific Shopify store operation using the Shopify Admin GraphQL API. Skills work with any MCP-compatible AI agent: Claude (claude.ai), Claude Code (CLI), Claude Cowork, Cursor, Cline, GitHub Copilot, and Gemini CLI.

**Key differentiator:** unlike generic Shopify automation tools, these are agent-native — designed to run inside the AI assistant the merchant already uses, with no separate dashboard, no SaaS subscription, and no vendor lock-in.

---

## 2. Installation

### Option A — Terminal (any agent)
\`\`\`
npx skills add 40RTY-ai/shopify-admin-skills
\`\`\`
Works with Claude Code, Claude Cowork, Cursor, Cline, Copilot, Gemini CLI.

### Option B — Claude / Claude Cowork (guided)
Paste the install prompt into Claude or Claude Cowork. Claude acts as a concierge: installs plugins, authenticates with your Shopify store, and walks you through your first skill interactively.

### What gets installed
- **${skills.length} skills** — on-demand agent workflows for every Shopify operation
- **${routines.length} routines** — scheduled agents that run automatically on a cron

### Authentication
During setup, the agent authenticates with your Shopify Admin API using this default scope set:
\`${SCOPES}\`

---

## 3. Skills Reference (${skills.length} skills across ${grouped.size} categories)

Every skill that ships, with its own documentation page.

${skillsReference}

---

## 4. Routines Reference (${routines.length} scheduled agents)

Routines are always-on agents installed via \`mcp__scheduled-tasks__create_scheduled_task\`. They run on a cron, profile your store, and alert when thresholds are breached.

| Routine | Schedule (cron) | Purpose |
|---------|-----------------|---------|
${routinesTable}

---

## 5. Technical Details

### Compatibility
- **Claude** (claude.ai web + desktop)
- **Claude Code** (CLI)
- **Claude Cowork** (team workspace)
- **Cursor**
- **Cline**
- **GitHub Copilot**
- **Gemini CLI**
- Any agent supporting the \`npx skills\` protocol or MCP tool calling

### How Skills Work
Each skill is a SKILL.md file containing:
- Structured frontmatter (name, description, category, required scopes)
- Step-by-step agent instructions using Shopify Admin GraphQL
- Output format specification
- Error handling guidance

Agents read the skill file, authenticate with the merchant's Shopify store, execute the GraphQL operations, and return results as a clean human-readable summary.

### Data & Privacy
- Skills run locally in the merchant's AI agent
- No data is sent to 40rty servers
- Shopify API credentials are stored locally by the agent
- All operations use the official Shopify Admin API — no scraping

### License
MIT — free to use, fork, and extend.

---

## 6. Frequently Asked Questions

**What AI agents does this work with?**
Claude (claude.ai), Claude Code (CLI), Claude Cowork, Cursor, Cline, GitHub Copilot, Gemini CLI, and any MCP-compatible agent.

**Is this free?**
Yes. Fully open source under MIT. No account, no credit card, no usage limits imposed by 40rty.

**What is a skill vs a routine?**
A skill is an on-demand workflow you trigger manually ("find abandoned carts from the last 7 days"). A routine is a scheduled agent that runs automatically on a cron (e.g. every morning).

**Does it change my Shopify store automatically?**
Only when you explicitly ask it to. Read operations (audits, reports) are always safe. Write operations (refunds, price changes, fulfillments) require the agent to propose changes and wait for your confirmation.

**How is this different from Shopify Flow?**
Shopify Flow runs rule-based automations. Shopify Admin Skills uses language model reasoning — your agent interprets open-ended requests, adapts to context, and handles edge cases that rules cannot anticipate.

**What Shopify plan do I need?**
Skills work on all Shopify plans. Some features (B2B, multi-location inventory) require Shopify Plus.

**How do I request a new skill?**
Open a GitHub issue at https://github.com/40RTY-ai/shopify-admin-skills or email the 40rty team via https://40rty.ai.

**Who built this?**
40rty — the team behind AgentIQ, the Answer Engine Optimization (AEO) platform that helps Shopify merchants get their products selected by ChatGPT, Perplexity, Gemini, and other AI shopping agents.

---

## 7. Use Case Queries (semantic search intents)

- "Shopify AI agent automation"
- "Claude Code Shopify skills"
- "Claude Cowork Shopify integration"
- "AI agent Shopify store management"
- "automate Shopify with AI"
- "Shopify abandoned cart recovery AI agent"
- "Shopify inventory audit AI"
- "Shopify fraud detection AI"
- "Claude Shopify Admin API"
- "Shopify MCP tools"
- "AI skills npx install"
- "Shopify scheduled AI routines"
- "open source Shopify automation"
- "Shopify AI reporting agent"
- "Cursor Shopify plugin"
- "Cline Shopify integration"
- "allow AI crawlers on my Shopify store"

---

## 8. Related Products

**AgentIQ by 40rty** — the commercial Shopify app that optimizes your product catalog for AI-driven product discovery and Answer Engine Optimization (AEO). Makes your products visible and selectable by ChatGPT, Perplexity, Gemini, and Copilot.

- Site: https://40rty.ai
- Shopify App Store: https://apps.shopify.com/fourty-ai
- Free AI visibility audit for any storefront: https://audit.40rty.ai

---

## 9. Source & Links

- Skills site: https://skills.40rty.ai
- Skills directory: https://skills.40rty.ai/skills/
- Routines directory: https://skills.40rty.ai/routines/
- Sitemap: https://skills.40rty.ai/sitemap-index.xml
- GitHub: https://github.com/40RTY-ai/shopify-admin-skills
- Summary (llms.txt): https://skills.40rty.ai/llms.txt
- 40rty main site: https://40rty.ai
- 40rty llms.txt: https://40rty.ai/llms.txt
- License: MIT
`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
