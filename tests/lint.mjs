#!/usr/bin/env node
// Structural verification for BP_For_AL_DEV. Run: node tests/lint.mjs
//
// Checks §12 of docs/DESIGN.md:
//   1  marketplace.json / plugin.json parse and carry required fields
//   2  every command references a skill that exists, and is permitted the tool that loads it
//   3  no agent frontmatter pins a model, and no agent may spawn further agents
//   4  every relative markdown link resolves
//   5  no SKILL.md, agent or command exceeds its line budget
//   6  nothing customer-specific ships — §3.1's guarantee, enforced rather than promised

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN = join(ROOT, "plugins", "bp-al");

const failures = [];
const notes = [];
const fail = (check, msg) => failures.push(`${check}: ${msg}`);

// Everything the plugin is allowed to say by way of example. Fictional, and confined to
// docs/ and tests/ — never inside plugins/. Adding to these lists is a deliberate act.
const ALLOWED_EXAMPLE_NAMES = [
  "Contoso Warehouse Ext",
  "Contoso Core",
  "Contoso",
  "Fabrikam Field Service Test",
  "Fabrikam Field Service",
  "Fabrikam Core",
  "Fabrikam",
];
const ALLOWED_EXAMPLE_IDS = new Set([
  "50100", "50149", "50200", "50201", "50299", "50300", "50349",
]);

// Budgets are per-file context cost, and raising one is a deliberate act recorded in DESIGN
// §12 — never a reflex when a file grows. al-conventions/SKILL.md keeps the tightest of them
// because it is the only file here that must stay an index: its whole job is to keep eight
// reference bodies out of context until one is reached for.
const LINE_BUDGETS = [
  [/skills[\\/]al-conventions[\\/]SKILL\.md$/, 60],
  [/skills[\\/][^\\/]+[\\/]SKILL\.md$/, 150],
  [/agents[\\/][^\\/]+\.md$/, 110],
  [/commands[\\/][^\\/]+\.md$/, 40],
];

// ---------------------------------------------------------------- helpers

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === ".git" || entry === "node_modules") continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const rel = (p) => relative(ROOT, p).split(sep).join("/");

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

function readJson(path, check) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    fail(check, `${rel(path)} does not parse — ${e.message}`);
    return null;
  }
}

const allFiles = walk(ROOT);
const textFiles = allFiles.filter((p) => /\.(md|json|jsonc|mjs|js|al|txt)$/i.test(p));

// ------------------------------------------------- 1. manifests

const marketplacePath = join(ROOT, ".claude-plugin", "marketplace.json");
const pluginPath = join(PLUGIN, ".claude-plugin", "plugin.json");

if (!existsSync(marketplacePath)) fail("manifests", "missing .claude-plugin/marketplace.json");
if (!existsSync(pluginPath)) fail("manifests", "missing plugins/bp-al/.claude-plugin/plugin.json");

const marketplace = existsSync(marketplacePath) ? readJson(marketplacePath, "manifests") : null;
const plugin = existsSync(pluginPath) ? readJson(pluginPath, "manifests") : null;

if (marketplace) {
  for (const field of ["name", "description", "owner", "plugins"]) {
    if (!marketplace[field]) fail("manifests", `marketplace.json has no "${field}"`);
  }
  for (const entry of marketplace.plugins ?? []) {
    if (!entry.name) fail("manifests", "a marketplace plugin entry has no name");
    if (!entry.description) fail("manifests", `plugin "${entry.name}" has no description`);
    if (typeof entry.source === "string") {
      const target = resolve(ROOT, entry.source);
      if (!existsSync(join(target, ".claude-plugin", "plugin.json")))
        fail("manifests", `plugin "${entry.name}" source "${entry.source}" has no plugin.json`);
    }
  }
}

if (plugin) {
  for (const field of ["name", "description", "version", "license"]) {
    if (!plugin[field]) fail("manifests", `plugin.json has no "${field}"`);
  }
}

// ------------------------------------------------- 2. commands reference real skills/agents

const skillsDirEarly = join(PLUGIN, "skills");
const agentsDirEarly = join(PLUGIN, "agents");
const knownSkills = new Set(
  existsSync(skillsDirEarly)
    ? readdirSync(skillsDirEarly).filter((d) =>
        existsSync(join(skillsDirEarly, d, "SKILL.md")))
    : []
);
const knownAgents = new Set(
  existsSync(agentsDirEarly)
    ? readdirSync(agentsDirEarly)
        .filter((f) => f.endsWith(".md"))
        .map((f) => f.replace(/\.md$/, ""))
    : []
);

const commandDir = join(PLUGIN, "commands");
const commandFiles = existsSync(commandDir)
  ? readdirSync(commandDir).filter((f) => f.endsWith(".md")).map((f) => join(commandDir, f))
  : [];

if (commandFiles.length === 0) fail("commands", "no command files found");

for (const file of commandFiles) {
  const text = readFileSync(file, "utf8");
  const fm = frontmatter(text);
  if (!fm) {
    fail("commands", `${rel(file)} has no frontmatter`);
  } else if (!fm.description) {
    fail("commands", `${rel(file)} has no description`);
  }

  // A command whose body reaches for a skill or an agent must be permitted the tool that
  // does it. `allowed-tools` is a whitelist: a command that says "load the skill" without
  // listing `Skill` is a command that cannot do the only thing it exists to do, and the
  // failure is silent at run time.
  let wantsSkill = false;
  let wantsAgent = false;
  for (const m of text.matchAll(/`bp-al:([a-z0-9-]+)`/g)) {
    const name = m[1];
    if (knownSkills.has(name)) wantsSkill = true;
    else if (knownAgents.has(name)) wantsAgent = true;
    else
      fail("commands", `${rel(file)} references "bp-al:${name}", which is neither a skill nor an agent`);
  }

  const allowed = (fm?.["allowed-tools"] ?? "").split(",").map((t) => t.trim());
  if (allowed.length && allowed[0] !== "") {
    if (wantsSkill && !allowed.includes("Skill"))
      fail("commands", `${rel(file)} loads a skill but its allowed-tools omits "Skill"`);
    if (wantsAgent && !allowed.includes("Agent"))
      fail("commands", `${rel(file)} dispatches an agent but its allowed-tools omits "Agent"`);
  } else if (wantsSkill || wantsAgent) {
    fail("commands", `${rel(file)} reaches for a skill or agent but declares no allowed-tools`);
  }
}

// Every skill and agent must be reachable from somewhere, or it is dead weight that no
// command can ever load. This is the plugin's own version of the reachability check it
// makes stage 3 perform on AL.
const pluginMarkdown = walk(PLUGIN)
  .filter((p) => p.endsWith(".md"))
  .map((p) => [p, readFileSync(p, "utf8")]);

for (const name of [...knownSkills, ...knownAgents]) {
  const ownFile = (p) =>
    p.endsWith(join("skills", name, "SKILL.md")) || p.endsWith(join("agents", `${name}.md`));
  const referenced = pluginMarkdown.some(
    ([p, text]) => !ownFile(p) && text.includes(`bp-al:${name}`)
  );
  if (!referenced)
    fail("commands", `"${name}" is referenced by nothing — no command or skill can reach it`);
}

// ------------------------------------------------- 3. agents

const agentDir = join(PLUGIN, "agents");
const agentFiles = existsSync(agentDir)
  ? readdirSync(agentDir).filter((f) => f.endsWith(".md")).map((f) => join(agentDir, f))
  : [];

for (const file of agentFiles) {
  const fm = frontmatter(readFileSync(file, "utf8"));
  if (!fm) {
    fail("agents", `${rel(file)} has no frontmatter`);
    continue;
  }
  if (!fm.name) fail("agents", `${rel(file)} has no name`);
  if (!fm.description) fail("agents", `${rel(file)} has no description`);
  if (fm.model !== undefined && fm.model !== "inherit")
    fail("agents", `${rel(file)} pins model "${fm.model}" — subagents must inherit the session's model`);
  if (fm.effort === undefined)
    fail("agents", `${rel(file)} sets no effort — §10 requires a reduced, explicit budget`);
  if (fm.tools && /\bAgent\b/.test(fm.tools))
    fail("agents", `${rel(file)} grants the Agent tool — subagents may not spawn further agents`);
}

// ------------------------------------------------- 4. relative links resolve

for (const file of allFiles.filter((p) => p.endsWith(".md"))) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = m[1].trim();
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const clean = target.split("#")[0];
    if (!clean) continue;
    if (!existsSync(resolve(dirname(file), clean)))
      fail("links", `${rel(file)} links to "${target}", which does not exist`);
  }
}

// ------------------------------------------------- 5. line budgets

for (const file of walk(PLUGIN)) {
  if (!file.endsWith(".md")) continue;
  const budget = LINE_BUDGETS.find(([re]) => re.test(file));
  if (!budget) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/).length;
  if (lines > budget[1])
    fail("budgets", `${rel(file)} is ${lines} lines, over its budget of ${budget[1]}`);
}

// ------------------------------------------------- 6. nothing customer-specific ships
//
// Two rules, because the guarantee has two halves. The shipped plugin carries no example at
// all; the repository's examples are fictional ones that are declared above.

const GUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const ID_LIKE = /\b\d{5,8}\b/g;

for (const file of textFiles) {
  const relPath = rel(file);
  const shipped = relPath.startsWith("plugins/");
  const raw = readFileSync(file, "utf8");
  const text = raw.replace(GUID, "");

  for (const m of text.matchAll(ID_LIKE)) {
    const id = m[0];
    if (shipped) {
      fail("purity", `${relPath} contains the object-ID-like literal ${id} — shipped files carry no IDs`);
    } else if (!ALLOWED_EXAMPLE_IDS.has(id)) {
      fail("purity", `${relPath} contains ${id}, which is not a declared fictional example ID`);
    }
  }

  if (shipped) {
    for (const name of ALLOWED_EXAMPLE_NAMES) {
      if (text.includes(name))
        fail("purity", `${relPath} names "${name}" — examples belong in docs/ and tests/, never in plugins/`);
    }
  }
}

// Every app.json anywhere in the repository must be a declared fictional one.
for (const file of allFiles.filter((p) => p.endsWith("app.json"))) {
  const app = readJson(file, "purity");
  if (!app) continue;
  for (const field of ["name", "publisher"]) {
    const value = app[field];
    if (value && !ALLOWED_EXAMPLE_NAMES.includes(value))
      fail("purity", `${rel(file)} has ${field} "${value}", which is not a declared fictional example`);
  }
}

// ------------------------------------------------- placeholders (reported, not failed)

let placeholders = 0;
for (const file of textFiles) {
  if (rel(file) === "tests/lint.mjs") continue; // this script names the placeholder to find it
  const hits = readFileSync(file, "utf8").match(/<owner>/g);
  if (hits) {
    placeholders += hits.length;
    notes.push(`${rel(file)}: ${hits.length} x <owner>`);
  }
}

// ------------------------------------------------- report

if (notes.length) {
  console.log(`TODO  <owner> placeholder in ${notes.length} file(s), ${placeholders} occurrence(s):`);
  for (const n of notes) console.log(`        ${n}`);
  console.log("      Fill these in before the first push.\n");
}

if (failures.length === 0) {
  console.log("lint: PASS");
  process.exit(0);
}

console.log(`lint: FAIL — ${failures.length} problem(s)\n`);
for (const f of failures) console.log(`  ${f}`);
process.exit(1);
