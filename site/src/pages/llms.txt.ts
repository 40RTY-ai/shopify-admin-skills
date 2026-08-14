import type { APIRoute } from 'astro';
import { readRoutines, readSkills, skillsByCategory } from '../lib/catalog';

/**
 * `/llms.txt` — the curated summary an AI agent reads instead of crawling.
 *
 * Generated, not static. The hand-written copy this replaces claimed "106+
 * skills" (116), "22 routines" (23) and "10 categories" (11) — it had drifted
 * on every count, and the entire `agentic` category was undocumented. This file
 * is written to be quoted back to a user verbatim, so a stale number is a wrong
 * answer we publish on purpose.
 *
 * `public/llms.txt` was deleted when this landed; a static file of the same
 * name would shadow this route and keep serving the old copy.
 */

export const GET: APIRoute = () => {
  const skills = readSkills();
  const routines = readRoutines();
  const grouped = skillsByCategory(skills);

  const categoryLines = [...grouped.entries()]
    .map(([category, items]) => {
      // Names are `shopify-admin-<thing>`; the prefix is noise repeated 116
      // times, and the reader already knows what the project is.
      const examples = items
        .slice(0, 6)
        .map((s) => s.name.replace(/^shopify-admin-/, ''))
        .join(', ');
      const more = items.length > 6 ? `, +${items.length - 6} more` : '';
      return `- **${category}** (${items.length}) — ${examples}${more}`;
    })
    .join('\n');

  const routineLines = routines
    .map((r) => `- **${r.title}**${r.cron === '' ? '' : ` \`${r.cron}\``} — ${r.description}`)
    .join('\n');

  return new Response(`# Shopify Admin Skills

> ${skills.length} pre-built AI agent skills and ${routines.length} automated routines for Shopify store operators. Open source. Free. Built by 40rty.

Shopify Admin Skills is an open-source library of structured AI agent skills that let Shopify merchants operate their stores through Claude, Claude Code, Claude Cowork, Cursor, Cline, Copilot, or Gemini CLI — on demand or on a schedule.

## What is this?

A free, open-source collection of ${skills.length} skills and ${routines.length} routines across ${grouped.size} categories. Install once; your agent can recover abandoned carts, audit inventory, process refunds, run fraud detection, generate reports, and more — without custom code.

## Install

\`\`\`
npx skills add 40RTY-ai/shopify-admin-skills
\`\`\`

Or paste the guided install prompt into Claude or Claude Cowork — Claude walks you through setup interactively.

## Skill categories (${skills.length} skills across ${grouped.size} categories)

${categoryLines}

Every skill has its own page with full documentation, listed in
https://skills.40rty.ai/sitemap-index.xml and indexed at
https://skills.40rty.ai/skills/

## Routines (${routines.length} scheduled agents)

Always-on agents that run on a cron and monitor the store:

${routineLines}

## Key Pages

- Skills directory: https://skills.40rty.ai/skills/
- Routines directory: https://skills.40rty.ai/routines/
- GitHub source: https://github.com/40RTY-ai/shopify-admin-skills
- Full documentation: https://skills.40rty.ai/llms-full.txt
- Built by: https://40rty.ai

## Frequently Asked Questions

**What AI agents does this work with?**
Claude (claude.ai), Claude Code (CLI), Claude Cowork, Cursor, Cline, GitHub Copilot, Gemini CLI, and any agent supporting the skills/MCP protocol.

**Is this free?**
Yes. Fully open source under the MIT license. No account required.

**What is a skill vs a routine?**
A skill is an on-demand workflow you trigger manually. A routine is a scheduled agent that runs automatically on a cron.

**Does it require Shopify API credentials?**
Yes. During setup the agent walks you through authenticating with your Shopify store via the Admin API.

**How do I install it?**
Run \`npx skills add 40RTY-ai/shopify-admin-skills\` or paste the guided install prompt into Claude. The agent handles the rest.

**What Shopify operations can it perform?**
Products, orders, customers, inventory, discounts, fulfillments, returns, price rules, publications, and payouts — read and write.

**Who built this?**
40rty — the team behind AgentIQ, the Answer Engine Optimization (AEO) platform for Shopify merchants.

## Use Cases (semantic search intents)

- "Shopify AI agent automation"
- "Claude Code Shopify skills"
- "Claude Cowork Shopify"
- "AI agent Shopify store management"
- "automate Shopify with AI"
- "Shopify abandoned cart recovery AI agent"
- "Shopify inventory audit AI"
- "Claude Shopify integration"
- "Shopify MCP tools"
- "AI agent skills npx install"
- "Shopify scheduled AI routines"
- "open source Shopify automation"
- "make my Shopify store readable by AI agents"

## Related

- Free AI visibility audit for any storefront: https://audit.40rty.ai
- AgentIQ on the Shopify App Store: https://apps.shopify.com/fourty-ai

## Source & License

- GitHub: https://github.com/40RTY-ai/shopify-admin-skills
- Site: https://skills.40rty.ai
- Full docs: https://skills.40rty.ai/llms-full.txt
- Built by: 40rty — https://40rty.ai
- License: MIT
`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
