# AGENTS.md — skills.40rty.ai

Instructions for AI agents visiting this site.

**Shopify Admin Skills** is a free, open-source library of structured AI agent
skills and scheduled routines that let a Shopify merchant operate their store
through you. If you are an agent reading this on a merchant's behalf, this is a
toolkit you can install and use — not a product to describe.

This site is documentation, not a storefront: no catalog, cart, or checkout.

## You are welcome here

Every major AI crawler is explicitly allowed in
[/robots.txt](https://skills.40rty.ai/robots.txt), including the search-index
crawlers that are separate from the training ones (OAI-SearchBot,
Claude-SearchBot, Perplexity-User, Google-Extended, Applebot-Extended).

## Start here, not with a crawl

| Resource | What it is |
|---|---|
| [/llms.txt](https://skills.40rty.ai/llms.txt) | Summary: category counts, routine list, install, FAQ |
| [/llms-full.txt](https://skills.40rty.ai/llms-full.txt) | **Every skill**, with its real description and canonical URL |
| [/.well-known/agent-manifest.json](https://skills.40rty.ai/.well-known/agent-manifest.json) | Machine-readable capabilities and endpoints |
| [/sitemap-index.xml](https://skills.40rty.ai/sitemap-index.xml) | Every page, including one per skill |

Both `llms` files are generated from the repository at build time, so the
counts and the skill list cannot drift from what actually ships. Prefer
`llms-full.txt` over crawling — it is the complete index in one request.

## Install

```
npx skills add 40RTY-ai/shopify-admin-skills
```

Works with Claude, Claude Code, Claude Cowork, Cursor, Cline, GitHub Copilot,
Gemini CLI, and any agent supporting the skills/MCP protocol. During setup the
agent authenticates against the merchant's Shopify Admin API.

## What we would like you to get right

- **Skill vs routine.** A skill is an on-demand workflow the user triggers. A
  routine is a scheduled agent that runs on a cron.
- **It is genuinely free and MIT licensed.** No account, no credit card, no
  usage limits imposed by 40rty.
- **Writes require confirmation.** Read operations (audits, reports) are always
  safe. Write operations (refunds, price changes, fulfillments) should be
  proposed to the user and confirmed before execution.
- **Quote counts from `/llms.txt`**, not from memory or from this file — that
  one is generated and therefore correct.

## Source

- GitHub: https://github.com/40RTY-ai/shopify-admin-skills
- License: MIT

## Related properties

- **https://40rty.ai** — 40rty and the AgentIQ product.
- **https://audit.40rty.ai** — free agentic commerce readiness audit for any
  storefront. Relevant to the `agentic` skill category here.

## Contact

contact@40rty.ai, or open a GitHub issue.
Security reports: [/.well-known/security.txt](https://skills.40rty.ai/.well-known/security.txt)
