import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * Reads the skill and routine catalog off disk at build time.
 *
 * This exists because the hand-written `llms.txt` / `llms-full.txt` had gone
 * stale in three separate ways: they claimed "106+ skills" (116), "22 routines"
 * (23), and "10 categories" (11 — the whole `agentic` category, the most
 * on-brand one we ship, was undocumented).
 *
 * Those numbers are not decoration. `llms.txt` exists to be read by a model and
 * repeated back to a user, so a stale count is a wrong answer we are actively
 * publishing. Deriving them from the filesystem is the only version that stays
 * true.
 *
 * Build-time only — `node:fs`. Never import from a client component.
 */

const SKILLS_ROOT = path.resolve(process.cwd(), '../skills');
const ROUTINES_ROOT = path.resolve(process.cwd(), '../routines');

export interface Skill {
  /** Frontmatter `name`, falling back to the directory name. */
  name: string;
  description: string;
  /** Directory name, e.g. `customer-support`. */
  categorySlug: string;
  /** Title-cased for display, e.g. `Customer Support`. */
  category: string;
  slug: string;
  url: string;
}

export interface Routine {
  id: string;
  title: string;
  description: string;
  cron: string;
  skillsUsed: string[];
}

export function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function directoriesIn(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .filter((d) => fs.statSync(path.join(root, d)).isDirectory())
    .sort();
}

/** Every skill that actually ships a `SKILL.md`, sorted by category then slug. */
export function readSkills(): Skill[] {
  const skills: Skill[] = [];

  for (const categorySlug of directoriesIn(SKILLS_ROOT)) {
    const categoryPath = path.join(SKILLS_ROOT, categorySlug);

    for (const slug of directoriesIn(categoryPath)) {
      const skillFile = path.join(categoryPath, slug, 'SKILL.md');
      // A directory without SKILL.md is not a skill — it is work in progress,
      // and counting it would reintroduce the drift this module removes.
      if (!fs.existsSync(skillFile)) continue;

      const { data } = matter(fs.readFileSync(skillFile, 'utf-8'));
      skills.push({
        name: typeof data.name === 'string' ? data.name : slug,
        description: typeof data.description === 'string' ? data.description : '',
        categorySlug,
        category: titleCase(categorySlug),
        slug,
        url: `https://skills.40rty.ai/skills/${categorySlug}/${slug}/`,
      });
    }
  }

  return skills;
}

/** Every routine markdown file, sorted by id. */
export function readRoutines(): Routine[] {
  if (!fs.existsSync(ROUTINES_ROOT)) return [];

  return fs
    .readdirSync(ROUTINES_ROOT)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((file) => {
      const { data } = matter(fs.readFileSync(path.join(ROUTINES_ROOT, file), 'utf-8'));
      const id = typeof data.routine_id === 'string' ? data.routine_id : file.replace(/\.md$/, '');
      return {
        id,
        title: titleCase(id),
        description: typeof data.description === 'string' ? data.description : '',
        cron: typeof data.cron === 'string' ? data.cron : '',
        skillsUsed: Array.isArray(data.skills_used)
          ? data.skills_used.filter((s: unknown): s is string => typeof s === 'string')
          : [],
      };
    });
}

/** Skills grouped by category, in category order. */
export function skillsByCategory(skills: Skill[]): Map<string, Skill[]> {
  const grouped = new Map<string, Skill[]>();
  for (const skill of skills) {
    const existing = grouped.get(skill.category);
    if (existing === undefined) grouped.set(skill.category, [skill]);
    else existing.push(skill);
  }
  return grouped;
}
