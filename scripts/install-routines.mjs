#!/usr/bin/env node
// Parse routine markdown files and emit install commands.
//
// Usage:
//   node scripts/install-routines.mjs              # print install plan (human readable)
//   node scripts/install-routines.mjs --json       # emit JSON for each routine (taskId, cron, prompt)
//   node scripts/install-routines.mjs --schedule   # emit /schedule commands for copy-paste
//
// To actually create routines, paste the prompt printed by --plan into Claude Code.
// Claude reads each routine file and calls the scheduled-tasks MCP tool to create the task.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROUTINES_DIR = path.resolve(__dirname, '..', 'routines');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, body: content };
  const yaml = match[1];
  const body = match[2];
  const data = {};
  let key = null;
  let listKey = null;
  for (const line of yaml.split('\n')) {
    if (/^[a-z_]+:\s*$/i.test(line)) {
      listKey = line.split(':')[0];
      data[listKey] = [];
      key = null;
    } else if (/^\s+-\s/.test(line) && listKey) {
      data[listKey].push(line.replace(/^\s+-\s+/, '').replace(/^"|"$/g, ''));
    } else {
      const m = line.match(/^([a-z_]+):\s*(.*)$/i);
      if (m) {
        const v = m[2].trim().replace(/^"|"$/g, '');
        data[m[1]] = v;
        key = m[1];
        listKey = null;
      }
    }
  }
  return { data, body };
}

function extractPrompt(body) {
  const m = body.match(/### Prompt\s*\n+```\s*\n([\s\S]*?)\n```/);
  return m ? m[1].trim() : null;
}

function loadRoutines() {
  const files = fs.readdirSync(ROUTINES_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md');
  return files.map(file => {
    const content = fs.readFileSync(path.join(ROUTINES_DIR, file), 'utf-8');
    const { data, body } = parseFrontmatter(content);
    return {
      file,
      taskId: data.routine_id,
      description: data.description,
      cron: data.cron,
      prompt: extractPrompt(body),
    };
  }).filter(r => r.taskId && r.cron && r.prompt);
}

const args = new Set(process.argv.slice(2));
const routines = loadRoutines();

if (args.has('--json')) {
  console.log(JSON.stringify(routines, null, 2));
} else if (args.has('--schedule')) {
  for (const r of routines) {
    console.log(`# ${r.file}`);
    console.log(`/schedule create --id ${r.taskId} --cron "${r.cron}" --description "${r.description}" --prompt "${r.prompt.replace(/"/g, '\\"').slice(0, 100)}..."`);
    console.log();
  }
} else {
  console.log(`\n📋 Found ${routines.length} routines in routines/\n`);
  for (const r of routines) {
    console.log(`  ✓ ${r.taskId.padEnd(28)} cron: "${r.cron}"`);
  }
  console.log(`
═══════════════════════════════════════════════════════
INSTALL ROUTINES IN CLAUDE CODE
═══════════════════════════════════════════════════════

Copy this prompt into Claude Code and Claude will install
all routines via the scheduled-tasks MCP tool:

───────────────────────────────────────────────────────
Install all routines from routines/ in this repo. For each
.md file in routines/ (skip README.md), parse the YAML
frontmatter to get routine_id, description, and cron, then
extract the prompt from the "### Prompt" code block.

For each routine, call mcp__scheduled-tasks__create_scheduled_task with:
  taskId: <routine_id>
  cronExpression: <cron>
  description: <description>
  prompt: <extracted prompt>
  notifyOnCompletion: true

After all routines are created, run mcp__scheduled-tasks__list_scheduled_tasks
and confirm each routine is enabled and shows next run time.
───────────────────────────────────────────────────────

Or install one at a time with:  /schedule
Or run:                          node scripts/install-routines.mjs --json
`);
}
