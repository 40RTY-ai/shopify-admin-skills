#!/usr/bin/env node
// Generates skills/agentic/signal-skill-map.json from the audit_signals:
// frontmatter of every agentic FIX skill. audit.40rty.ai vendors this map to
// route a finding → the skill that fixes it.
//
//   node scripts/build-signal-skill-map.mjs           # write the map
//   node scripts/build-signal-skill-map.mjs --check    # fail if committed map is stale
//
// The flagship shopify-admin-agentic-readiness-audit *emits* signals (it is the
// read-only auditor), so it is excluded from the FIX map.

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import { glob } from 'glob'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const OUT = join(ROOT, 'skills/agentic/signal-skill-map.json')
const PLUGIN = 'shopify-admin-skills'
const MARKETPLACE = 'shopify-admin-skills'

// The auditor emits signals rather than fixing them — never a fix target.
const EXCLUDE = new Set(['shopify-admin-agentic-readiness-audit'])

// Deterministic tie-break when a signal is claimed by >1 fix skill.
const OVERRIDES = {
  'variant-metadata': 'shopify-admin-agentic-metafields-setup',
}

async function build() {
  const files = await glob('skills/agentic/*/SKILL.md', { cwd: ROOT, absolute: true })
  const claims = new Map() // signalId -> Set<skillName>
  for (const file of files) {
    const { data } = matter(readFileSync(file, 'utf8'))
    const name = data.name
    if (!name || EXCLUDE.has(name)) continue
    const signals = data.audit_signals ?? []
    if (!Array.isArray(signals)) throw new Error(`${file}: audit_signals must be an array`)
    for (const sig of signals) {
      if (!claims.has(sig)) claims.set(sig, new Set())
      claims.get(sig).add(name)
    }
  }

  const map = {}
  const warnings = []
  for (const [sig, skills] of [...claims].sort(([a], [b]) => a.localeCompare(b))) {
    let skill
    if (skills.size === 1) {
      skill = [...skills][0]
    } else if (OVERRIDES[sig] && skills.has(OVERRIDES[sig])) {
      skill = OVERRIDES[sig]
      warnings.push(`tie-break ${sig} → ${skill} (claimed by ${[...skills].join(', ')})`)
    } else {
      throw new Error(`Signal "${sig}" claimed by multiple skills [${[...skills].join(', ')}] with no OVERRIDES entry — add one.`)
    }
    map[sig] = { skill, plugin: PLUGIN, marketplace: MARKETPLACE }
  }
  return { map, warnings }
}

async function main() {
  const check = process.argv.includes('--check')
  const { map, warnings } = await build()
  const json = JSON.stringify(map, null, 2) + '\n'
  warnings.forEach((w) => console.warn('WARN:', w))

  if (check) {
    let current = ''
    try { current = readFileSync(OUT, 'utf8') } catch {}
    if (current !== json) {
      console.error('ERROR: signal-skill-map.json is stale. Run: node scripts/build-signal-skill-map.mjs')
      process.exit(1)
    }
    console.log(`signal-skill-map.json up to date (${Object.keys(map).length} signals).`)
    return
  }

  writeFileSync(OUT, json)
  console.log(`Wrote ${OUT} (${Object.keys(map).length} signals).`)
}

main().catch((e) => { console.error(e.message); process.exit(1) })
