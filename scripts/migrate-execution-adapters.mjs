#!/usr/bin/env node
// One-shot migration: add execution_adapters frontmatter, update Prerequisites,
// and parameterize hardcoded `first: 250` -> `$first` across every SKILL.md.
//
// Idempotent: running twice is a no-op for already-migrated skills.
// Re-run anytime if the canonical shape changes.

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import { glob } from 'glob'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// Per-op preferred MCP tool. Skill ops not in this map fall back to graphql_query/mutation.
const PREFER_TOOL = {
  'orders:query': 'list-orders',
  'customers:query': 'list-customers',
  'products:query': 'search_products',
  'product:query': 'get-product',
  'shop:query': 'get-shop-info',
  'collection:query': 'get-collection',
  'inventoryLevels:query': 'get-inventory-levels',
  'inventorySetQuantities:mutation': 'set-inventory',
  'productCreate:mutation': 'create-product',
  'productUpdate:mutation': 'update-product',
  'collectionCreate:mutation': 'create-collection',
  'collectionUpdate:mutation': 'update-collection',
  'collectionAddProductsV2:mutation': 'add-to-collection',
  'discountCodeBasicCreate:mutation': 'create-discount',
  'productBulkUpdate:mutation': 'bulk-update-product-status',
}

function buildAdaptersBlock(graphqlOps) {
  const ops = (graphqlOps || []).map((op) => {
    const isMutation = op.endsWith(':mutation')
    const prefer = PREFER_TOOL[op] || (isMutation ? 'graphql_mutation' : 'graphql_query')
    const fallback = isMutation ? 'graphql_mutation' : 'graphql_query'
    return prefer === fallback
      ? { skill_op: op, prefer_tool: prefer }
      : { skill_op: op, prefer_tool: prefer, fallback }
  })

  return {
    'shopify-mcp': {
      pagination_max_first: 50,
      auth: 'connector-managed',
      operations: ops,
    },
    'shopify-cli': {
      pagination_max_first: 250,
      auth: 'cli-session',
    },
  }
}

const PREREQ_BLOCK = `## Prerequisites
Either auth path works. See [docs/execution-adapters.md](REL_DOCS_PATH).

- **Shopify MCP connector** (recommended, official): \`https://setup.shopify.com/mcp\` — connect via \`/mcp\` in Claude Code; switch stores with the \`switch-shop\` tool. The connector must be installed with the scopes listed below.
- **Shopify CLI:** \`shopify auth login --store <domain>\` with the scopes listed below.`

function rewritePrerequisites(body, relDocsPath) {
  // Replace the entire `## Prerequisites` section (up to the next `## ` heading)
  // with the dual-auth block. Preserve any "API scopes:" line that follows.
  const re = /## Prerequisites\n([\s\S]*?)(?=\n## )/
  const match = body.match(re)
  if (!match) return body

  const original = match[1]

  // Already migrated?
  if (original.includes('Shopify MCP connector')) return body

  // Try to extract a "scopes" line so we don't lose it.
  const scopesLine = original
    .split('\n')
    .find((l) => /api scopes?:/i.test(l) || /required api scopes/i.test(l))

  const newBlock = PREREQ_BLOCK.replace('REL_DOCS_PATH', relDocsPath)
  const replacement = scopesLine
    ? `## Prerequisites\n${newBlock.replace('## Prerequisites\n', '')}\n- ${scopesLine.replace(/^[-*]\s*/, '')}\n`
    : `## Prerequisites\n${newBlock.replace('## Prerequisites\n', '')}\n`

  return body.replace(re, replacement)
}

function parameterizeFirst(body) {
  // Replace literal `first: 250` in GraphQL blocks with `first: $first`,
  // and inject `$first: Int!` into the query signature when needed.
  if (!/first:\s*250/.test(body)) return body

  // For each ```graphql ... ``` block, rewrite first:250 and add $first variable.
  return body.replace(/```graphql\n([\s\S]*?)```/g, (full, code) => {
    if (!/first:\s*250/.test(code)) return full

    let next = code.replace(/first:\s*250/g, 'first: $first')

    // Inject $first: Int! into the operation signature if absent.
    next = next.replace(/(query|mutation)(\s+\w+)?\s*\(([^)]*)\)/, (sig, op, name, vars) => {
      if (/\$first\s*:/.test(vars)) return sig
      const trimmed = vars.trim()
      const newVars = trimmed ? `$first: Int!, ${trimmed}` : `$first: Int!`
      return `${op}${name || ''}(${newVars})`
    })

    // If the signature has no parens at all, add one.
    next = next.replace(/(query|mutation)(\s+\w+)?\s*\{/, (sig, op, name) => {
      if (sig.includes('(')) return sig
      return `${op}${name || ''}($first: Int!) {`
    })

    return '```graphql\n' + next + '```'
  })
}

function migrateSkill(filePath) {
  const raw = readFileSync(filePath, 'utf8')
  const parsed = matter(raw)

  const changes = []

  // 1. Add execution_adapters block if missing.
  if (!parsed.data.execution_adapters) {
    parsed.data.execution_adapters = buildAdaptersBlock(parsed.data.graphql_operations)
    changes.push('execution_adapters')
  }

  // 2. Rewrite Prerequisites section.
  // Compute relative path from skill file to docs/execution-adapters.md
  const rel = filePath.replace(ROOT + '/', '')
  const depth = rel.split('/').length - 1 // skills/<role>/<name>/SKILL.md => 3 ".."
  const relDocsPath = '../'.repeat(depth - 1) + 'docs/execution-adapters.md'

  let body = parsed.content
  const newBody = rewritePrerequisites(body, relDocsPath)
  if (newBody !== body) {
    body = newBody
    changes.push('prerequisites')
  }

  // 3. Parameterize `first: 250`.
  const paramBody = parameterizeFirst(body)
  if (paramBody !== body) {
    body = paramBody
    changes.push('first-param')
  }

  if (changes.length === 0) return null

  const out = matter.stringify(body, parsed.data, {
    lineWidth: -1, // don't wrap long YAML lines
  })
  writeFileSync(filePath, out)
  return changes
}

async function main() {
  const skillFiles = await glob('skills/**/SKILL.md', { cwd: ROOT, absolute: true })
  let changedCount = 0
  const changeStats = { execution_adapters: 0, prerequisites: 0, 'first-param': 0 }

  for (const f of skillFiles) {
    const changes = migrateSkill(f)
    if (changes) {
      changedCount++
      for (const c of changes) changeStats[c] = (changeStats[c] || 0) + 1
      console.log(`updated  ${f.replace(ROOT + '/', '')}  [${changes.join(', ')}]`)
    }
  }

  console.log(`\n${changedCount}/${skillFiles.length} skill(s) updated`)
  console.log(`  +execution_adapters: ${changeStats.execution_adapters}`)
  console.log(`  prerequisites rewrite: ${changeStats.prerequisites}`)
  console.log(`  first:250 parameterized: ${changeStats['first-param']}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
