#!/usr/bin/env node
// Validates that graphql_operations frontmatter in every SKILL.md
// matches the entries in docs/graphql-operations-index.md
// Exits with code 1 if any mismatch is found.

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import matter from 'gray-matter'
import { glob } from 'glob'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

async function main() {
  const skillFiles = await glob('skills/**/SKILL.md', { cwd: ROOT, absolute: true })

  if (skillFiles.length === 0) {
    console.log('No skill files found under skills/ — nothing to validate.')
    process.exit(0)
  }

  // Parse frontmatter from each skill
  const skillOps = new Map() // skillPath -> Set<"OperationName:type">
  for (const file of skillFiles) {
    const content = readFileSync(file, 'utf8')
    const { data } = matter(content)
    const ops = data.graphql_operations ?? []
    if (!Array.isArray(ops)) {
      console.error(`ERROR: ${file}: graphql_operations must be an array`)
      process.exit(1)
    }
    for (const op of ops) {
      if (!/^[A-Za-z][A-Za-z0-9_]*:(query|mutation)$/.test(op)) {
        console.error(`ERROR: ${file}: invalid graphql_operations entry "${op}" — must be "OperationName:query" or "OperationName:mutation"`)
        process.exit(1)
      }
    }
    const relativePath = file.replace(ROOT + '/', '')
    skillOps.set(relativePath, new Set(ops))
  }

  // Parse operations index table
  const indexPath = join(ROOT, 'docs/graphql-operations-index.md')
  if (!existsSync(indexPath)) {
    console.error('ERROR: docs/graphql-operations-index.md not found')
    process.exit(1)
  }

  const indexContent = readFileSync(indexPath, 'utf8')
  const indexOps = new Map() // "OperationName:type" -> Set<skillPath>

  for (const line of indexContent.split('\n')) {
    // Match table rows: | OperationName | query|mutation | version | skills |
    const match = line.match(/^\|\s*([A-Za-z]+)\s*\|\s*(query|mutation)\s*\|[^|]*\|\s*([^|]+)\|/)
    if (!match) continue
    const opKey = `${match[1]}:${match[2]}`
    const skillsCell = match[3].trim()
    const indexedSkills = skillsCell.split(',').map(s => s.trim()).filter(Boolean)
    indexOps.set(opKey, new Set(indexedSkills))
  }

  const errors = []

  // Every op in skill frontmatter must be in the index
  for (const [skillPath, ops] of skillOps) {
    for (const op of ops) {
      if (!indexOps.has(op)) {
        errors.push(`MISSING FROM INDEX: "${op}" used in ${skillPath} but not found in docs/graphql-operations-index.md`)
      } else {
        // The skill should be listed in the index row
        const indexedSkills = indexOps.get(op)
        const skillDir = skillPath.replace('/SKILL.md', '').replace('skills/', '')
        const found = [...indexedSkills].some(s => s.trim() === skillDir)
        if (!found) {
          errors.push(`SKILL NOT LISTED: "${op}" index row does not include ${skillDir} — add it to docs/graphql-operations-index.md`)
        }
      }
    }
  }

  // Every op in the index must be used by at least one skill
  for (const [opKey, indexedSkills] of indexOps) {
    const usedByAnySkill = [...skillOps.values()].some(ops => ops.has(opKey))
    if (!usedByAnySkill) {
      errors.push(`STALE INDEX ENTRY: "${opKey}" is in the index but not used by any skill`)
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ GraphQL Operations Index validation failed:\n')
    for (const err of errors) console.error(`  • ${err}`)
    console.error(`\n${errors.length} error(s) found. Update docs/graphql-operations-index.md to fix.\n`)
    process.exit(1)
  }

  console.log(`✅ GraphQL Operations Index valid — ${skillFiles.length} skill(s), ${indexOps.size} operation(s) checked.`)
}

main().catch(err => { console.error(err); process.exit(1) })
