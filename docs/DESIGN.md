# BP_For_AL_DEV — Design

**Status:** approved 2026-09-20 · **Plugin:** `bp-al` · **Licence:** MIT

A Claude Code plugin for Microsoft Dynamics 365 Business Central AL development.
Command-driven, contract-driven, and — the constraint everything else is downstream
of — **safe to add to a repository that is already halfway through its life**.

---

## 1. Purpose

Give an AL developer a repeatable `spec → implement → review` pipeline that:

- works on any Business Central project, from a three-object per-tenant extension to a
  multi-app localisation product,
- adapts to the repository it finds instead of demanding the repository adapt to it,
- produces AL that compiles clean, adds no analyzer warnings, and is written to the
  performance patterns the platform rewards,
- costs nothing when idle and little when used.

## 2. Non-goals (v1)

Presales or estimation agents · documentation generation · release notes · translation
tooling · a rules engine · **bundling** an MCP server.

Two of the original non-goals have since been met rather than abandoned, and the distinction
each turns on is worth keeping:

- **Test execution** was deferred, not rejected — `tests.runCommand` was reserved for it. It is
  now detected, confirmed by a human like `build.command`, and run by stages 2 and 3. `null`
  stays a legal value, so a repository whose tests run only in CI loses nothing.
- **A bundled MCP server** is still a non-goal, and `/bp-al:mcp` does not violate it. The plugin
  vendors no package, pins no version and starts no process. It offers a first-party HTTP
  endpoint, asks which symbol server the human already trusts, and writes what they approve.
  Bundling would mean choosing a package on their behalf that then runs on every session.

## 3. Governing principle — describe, don't prescribe

Comparable plugins initialise a project by *imposing* structure: a rules directory, a
generated `CLAUDE.md`, a plans folder. BP inverts this. It reads the repository as it
stands and records what it found in one file.

Where the project already has authority — `CONVENTIONS.md`, `ARCHITECTURE.md`, per-module
architecture notes, an existing `CLAUDE.md` — the profile **records their paths**. It never
copies their content.

This is three properties for the price of one:

- **Adoption.** Nothing to restructure, so the plugin can be added on any day of a project.
- **Tokens.** Authority is read on demand by the stage that needs it, not injected per turn.
- **Correctness.** Copied rules drift from their source and are then confidently wrong.
  A pointer cannot drift.

### 3.1 What ships, and what is yours

The line between the two is absolute, and every reader of this repository should be able to
state it:

| Ships with the plugin | Supplied by your project |
|---|---|
| The pipeline, its stages and gates | Object ID ranges, prefixes and affixes |
| The AL quality baseline (§7) — platform-level practice, true on every BC project | Publisher, app names, folder layout |
| The profile *schema* | Dependency names and where their source lives |
| Detection logic for filling the profile in | The build command |
| Review checks that are language- or platform-level | Which areas are sensitive (`hotspots`) |
| | Which APIs are banned here (`forbidden`) |
| | Which documents are authoritative |

**No customer name, no publisher, no ID range, no naming convention and no business rule is
bundled.** Everything in that right-hand column is discovered by `/bp-al:scan` or typed by
the developer, and lives only in that project's own `.claude/bp-al.json`.

### 3.2 Precedence

When the project's own authority contradicts the shipped baseline, **the project wins**, and
the reviewer states that it was overridden rather than silently conforming.

This matters more than it looks. Generic BC advice is sometimes precisely wrong for a given
project — a rounding helper that is best practice platform-wide can be forbidden in a
statutory context where the regulator requires truncation. A plugin that cannot be overruled
by the repository it is running in is a hazard in exactly the projects that need it most.

## 4. Adopt-in-place contract

These ship in the README as guarantees. They are the reason the plugin is safe to hand to
a colleague mid-project.

1. Its entire configuration footprint is one file: `.claude/bp-al.json`. The only other
   things it ever writes are the change you asked for, the spec documents described in
   guarantee 4 on the `product` tier, and `.mcp.json` — which only `/bp-al:mcp` writes, only on
   an explicit yes, and never by merging over an entry you already had.
2. It never creates a directory layout, and never moves or renames anything.
3. Its own tooling never edits `CLAUDE.md`, `README`, `app.json`, or any other file it did not
   create. **The change you asked for is the one exception, and it is bounded by the approved
   spec:** stage 2 edits only the files that spec names — which can include `app.json` (a
   dependency, a feature flag, a version), the document where the project records claimed
   object IDs, or a translation file the build regenerated. A file the spec does not name is
   out of scope and reported as such.
4. Spec documents are written only where the profile already points, and only on the
   `product` tier.
5. What cannot be determined is recorded as `null`, and the affected stage degrades
   **loudly** — reporting `UNVERIFIED` — rather than guessing.
6. Uninstalling is deleting one JSON file — two if you took the optional MCP setup.

It must work on a repository that has uncommitted changes, a non-standard layout, several
apps, or no documentation at all.

## 5. Commands

All commands are namespaced `/bp-al:`.

| Command | Behaviour |
|---|---|
| `/bp-al:scan` | Profile the repository, write or refresh `.claude/bp-al.json`, report findings and gaps. Idempotent. |
| `/bp-al:spec <request>` | Stage 1 — turn a request into a contract. |
| `/bp-al:implement [spec]` | Stage 2 — write AL, run the declared build command, iterate to clean. |
| `/bp-al:review [spec]` | Stage 3 — independent verification in a fresh context. |
| `/bp-al:go <request>` | Stages 1–3 chained, with a human gate between each. |
| `/bp-al:check [range]` | The stage 3 checks over a diff with no spec. No criteria, no scope, no gate. |
| `/bp-al:appsource [app]` | AppSource submission readiness. Reports only; never gates, never writes. |
| `/bp-al:mcp` | Offers optional MCP servers and writes `.mcp.json` on an explicit yes. |

`go` only sequences the first three. All behaviour lives in the stage skills, so the
chained and standalone paths cannot drift apart.

`check` is the same principle applied again: it is `al-review` in a no-spec mode, not a second
implementation of the checks. The two checks that need a contract — acceptance criteria and
scope — report `no spec` rather than passing. A criterion derived from the code it is checking
is a tautology with a tick beside it, and `check` exists precisely for the changes that never
had a contract, which on a repository halfway through its life is most of them.

### 5.1 `/bp-al:scan` detection order

Each step falls through to the next:

- **Apps** — glob `**/app.json`, excluding `.alpackages`, `node_modules`, `.git`. Each match
  is an app. Read `name`, `publisher`, `id`, `idRanges`, `dependencies`, `internalsVisibleTo`.
- **Test apps** — a dependency on a Microsoft test library, or a `Subtype = Test` codeunit, or
  an app name matching `*Test*`. (`app.json`'s `target` takes only `Cloud` and `OnPrem`.)
- **Prefix / affix** — `AppSourceCop.json` `mandatoryPrefix` / `mandatoryAffixes`; otherwise
  the most common object-name prefix across `.al` files.
- **Analyzers** — the `al.codeAnalyzers` entries in `.vscode/settings.json`, plus any
  `AppSourceCop.json` / `PerTenantExtensionCop` settings. Recorded so the warning gate (§7.2)
  knows what the compiler will actually emit.
- **Build command** — an AL build task in `.vscode/tasks.json`; otherwise `build.ps1` /
  `build.cmd` at the repository root; otherwise a resolvable `alc.exe`; otherwise `null`.
  **Always presented to the human for confirmation before being written.** Build invocations
  go stale — this field is never inferred silently.
- **Authority documents** — `CLAUDE.md`, `CONVENTIONS.md`, `ARCHITECTURE.md`, `DECISIONS.md`,
  `CONTRIBUTING.md`, and any per-folder architecture notes. Recorded in precedence order,
  `CLAUDE.md` first.
- **Spec directory** — an existing `docs/specs`, `docs/adr`, or `docs/`. If none exists,
  `specs.mode` is set to `inline`. A directory is never created.
- **Tier** — `product` if any of: more than one app; a test app is present; a dependency on a
  non-Microsoft app; more than 100 `.al` files. Otherwise `customisation`.

`scan` never overwrites a field a human has edited. It reports which fields it would change
and asks.

## 6. The profile — `.claude/bp-al.json`

Data, not prose. Hand-editable; `docs/PROFILE.md` documents every field.

**Every value below is discovered from your repository or entered by you.** The example uses
a fictional extension purely to show the shape.

```jsonc
{
  "version": 1,
  "tier": "customisation",                 // "product" | "customisation"
  "apps": [
    { "path": "app",
      "name": "Contoso Warehouse Ext",
      "idRanges": [[50100, 50149]],
      "prefix": "CWE",
      "isTest": false }
  ],
  "dependencies": [
    { "name": "Contoso Core", "sourcePath": "../contoso-core" }
  ],
  "analyzers": ["CodeCop", "UICop", "PerTenantExtensionCop"],
  "build": {
    "command": null,
    "cwd": null,
    "warningPolicy": "no-new"              // "no-new" | "zero" | "ignore"
  },
  "tests": { "present": false, "path": null, "runCommand": null },
  "authority": ["CONTRIBUTING.md"],
  "specs": { "mode": "inline", "dir": null },
  "appsource": {
    "target": "pte",                       // "appsource" | "pte" | null
    "previousVersionPath": null            // the published .app to compare against
  },
  "hotspots": ["**/Posting/**"],
  "forbidden": [
    { "pattern": "\\bCommit\\(", "why": "transaction boundaries belong to the caller" }
  ],
  "policy": {
    "blockOn":  ["error", "forbidden", "criterion-not-met", "warning-delta"],
    "advisory": ["scope", "reachability", "performance", "hotspot", "style"],
    "requireTests": false
  }
}
```

`hotspots` and `forbidden` are the generic mechanism behind project-specific safety rules —
"flag any change in this area for human review", and "this API is banned here even though it
is fine elsewhere". The plugin ships the mechanism; each project supplies the content. A
small customisation leaves both empty and loses nothing.

`dependencies[].sourcePath` generalises the rule that a needed object may already exist in a
base application: search those paths before reporting anything as missing.

`build.command` is confirmed by a human, never inferred silently.

`policy` is the strictness knob, and the only one that is not detected: it is written with the
defaults above and never re-proposed on a refresh. Nothing in it turns a check off. Every
category is still looked for, found and reported; `policy` decides which ones stop stage 3.
The defaults sit at the loose end deliberately — `scope` and `reachability` findings are
routinely *correct* on a brownfield repository, because adjacent fixes are normal and an
AppSource app publishes surface nothing in its own tree calls.

## 7. The AL quality baseline

This is what makes the plugin worth installing rather than just prompting well. It is
platform-level knowledge — true on every Business Central project, independent of customer,
publisher or domain — held as eleven reference files under `skills/al-conventions/references/`
and loaded **only** by the stage that needs the theme in question.

A short index in `SKILL.md` names the themes so an agent knows when to reach for one. The
bodies never enter context unprompted, and the index is the one file here held to a tight line
budget, because keeping them out is its entire job.

`performance` · `warnings` · `correctness` · `extension-model` are the four the pipeline was
built around. The other seven were added afterwards, and every one covers a class of defect
that ships green: a suite that asserts less than it claims, a subscriber that rolls back its
publisher, an API field renamed by a cosmetic edit, an upgrade that re-runs because nobody set
the tag, a codeunit nobody but SUPER can execute, a field with no `ApplicationArea` that simply
does not render, an incident with no signal because nobody emitted one in advance.

`testing` · `events` · `api` · `upgrade` · `permissions` · `pages` · `telemetry`.

### 7.1 Performance, by construction

Written into the implementer's instructions rather than left for review to catch:

- Partial records — declare the fields actually read; don't drag whole rows across the wire.
- No `CalcFields` inside a loop; calculate before it or use auto-calc.
- `FindSet` with `repeat..until`, and the writable overload only when actually modifying.
- Existence is a dedicated check, never a count or a first-record fetch.
- Filter before reading, and on a key that supports the filter.
- Aggregate with the platform's own facilities — FlowFields, SIFT, query objects — rather
  than accumulating in AL.
- No nested loops over large tables; stage into a temporary table instead.
- `Commit` is not a control-flow tool. Transaction boundaries belong to the caller.
- Set-based operations in preference to per-record modifies where semantics allow.
- Keep work out of page triggers that fire per row.

### 7.2 Warnings: a delta gate, not a count

Demanding zero warnings breaks instantly on a brownfield repository that already has
hundreds, and demanding nothing breaks the discipline of one that has none. So the gate is
**the change in warnings, not the total**.

Stage 2 captures the warning set before it touches anything and again after the build. The
default policy `no-new` fails on any warning that was not already there. A project that
holds a true zero sets `zero`; a project not ready to care sets `ignore`.

The plugin deliberately ships **no hardcoded list of analyzer IDs**. Which cops run differs
per project — AppSource versus per-tenant, plus any third-party analyzers — and a bundled
list would be wrong somewhere and stale everywhere. The codes come from the compiler the
project actually runs; the plugin supplies only the discipline of comparing before with
after.

A warning is treated as a finding, not lint. New code that cannot be made warning-free is
reported with the reason, never suppressed to make a gate go green.

### 7.3 Correctness and platform idiom

Permission coverage for every new object · user-facing text as labels rather than literals ·
validation at system boundaries · extension by event rather than modification, with
subscribers guarded where the platform requires it · obsoletion rather than deletion, with
the full obsolete metadata · upgrade logic whenever persisted shape changes · translation
artefacts kept in step with new labels · no aborting a batch on one bad row · actionable,
structured errors.

### 7.4 Extension-model judgement

When a table extension is right and when a new table is · what may and may not change in a
published interface others subscribe to · visibility and access for test projects · what
belongs in a dependency rather than the extension in front of it.

### 7.5 Precedence, again

Everything in §7 yields to the project's own authority and to `forbidden`. The baseline is
a default, not a mandate. See §3.2.

## 8. Tier behaviour

**`customisation`** — `go` produces a short inline contract (problem, objects touched,
acceptance criteria, out of scope), one confirmation, edits applied directly in the main
context, build, brief review pass in the same context. **No subagents. No files written
beyond the code.**

**`product`** — contract written to `specs.dir`, gate, bounded implementer subagent, build to
clean, gate, reviewer in a fresh context, verdict. The spec survives into the pull request
beside the diff that satisfies it.

`--quick` and `--deep` override the tier default for a single run.

## 9. Stage contracts

### Stage 1 — spec

**In:** the request, the profile, and only the authority documents covering the area touched.

**Out:** problem statement · rule source (regulation, ticket, specification section) ·
objects to add or change, with IDs where the project claims them · acceptance criteria, each
independently checkable · explicit out-of-scope · `hotspots` hit.

**Gate:** human approval.

### Stage 2 — implement

**In:** the approved spec and the profile.

**Must:** honour `forbidden` and the §7 baseline; claim object IDs per the project's own
rules; capture the pre-change warning set; run `build.command`; iterate to zero errors and to
the profile's `warningPolicy`.

**Out:** files changed · build exit code · errors and the **warning delta** · `UNVERIFIED`
when `build.command` is `null`.

**Gate:** human approval.

### Stage 3 — review

Runs in a **fresh context** and **must not receive the implementer's transcript**. The
independence is the point: a reviewer that can see why each choice was made reviews the
reasoning rather than the result.

**Checks:**

- Re-runs the build itself. It does not trust a reported result.
- Every acceptance criterion, individually.
- The warning delta, recomputed rather than accepted.
- `forbidden` patterns across the diff.
- The §7 performance patterns, as a review dimension in their own right.
- `hotspots` touched → flagged for human review regardless of correctness.
- **Reachability** — every new object or procedure has a call path, a subscription, or one of
  a closed list of exemptions. A complete, correct, reviewed and entirely uncalled object
  passes every other mechanical check there is.
- Tests, when `tests.runCommand` is set. Never an inferred result.

Reachability has an exemption list because AL publishes surface that is uncalled **by design**
— event publishers, `[EventSubscriber]` and handler procedures, `Install`/`Upgrade` codeunits,
permission sets, API pages and queries, interface implementations, and the public surface of
an app that declares `internalsVisibleTo` or that another app depends on. These report as
`PUBLIC SURFACE`. The list is closed: anything not on it is `UNREFERENCED`, whatever it looks
like it is for. Without this, an AppSource-bound app fails the check everywhere it is doing
the right thing, and a check that is always wrong is a check people learn to skip.

**Out:** findings as `file:line` with their category, split `BLOCKING` / `ADVISORY` · verdict
`VERIFIED`, `BLOCKED` or `UNVERIFIED` · an explicit statement of what could not be verified
and why · any place the project's authority overrode the baseline.

Blocking versus advisory comes from `policy`, not from the reviewer's judgement, and the
reviewer may not re-tag a finding to change the outcome. Three verdicts rather than two:
`UNVERIFIED` outranks `BLOCKED`, because you cannot block on what you did not see. The two
were one word in the first draft, and the conflation cost real information — "this is wrong"
and "I could not tell" call for different things from the human.

## 10. Subagent and token policy

- **Nothing always-on.** No injected rules, no per-turn hooks. Idle cost is zero.
- Profile read once per run, by the stage that needs it.
- Authority documents and §7 reference files read on demand, by theme; never duplicated into
  context wholesale.
- `SKILL.md` files stay short and act as indexes; bodies load only on the branch that reaches
  for them.
- **Agent definitions omit `model:`.** Subagents inherit the model the developer is running,
  so a colleague on a smaller model stays on it and nobody inherits a pinned model's cost.
- Subagents run at reduced reasoning effort with an explicit budget: a stated question, a
  search-call ceiling, a required output shape, and no authority to spawn further agents.
  The budget is structural — an instruction to "be brief" does nothing.
- Mechanical lookups are direct tool calls in the main context. Grep results are small; file
  dumps are not, and it is file dumps that isolation exists to contain.
- Stage hand-off is the spec file, never a transcript.
- The `customisation` tier spawns no subagents at all.

## 11. Repository layout

```
AL_ClaudeCode_Plugin/
├─ .claude-plugin/marketplace.json
├─ plugins/bp-al/
│  ├─ .claude-plugin/plugin.json
│  ├─ commands/   scan · spec · implement · review · go · check · appsource · mcp
│  ├─ agents/     al-implementer.md · al-reviewer.md      (no model pinned)
│  └─ skills/
│     ├─ al-profile/     detection and profile authoring
│     ├─ al-spec/ · al-implement/ · al-review/
│     ├─ al-appsource/   submission readiness; reports only
│     └─ al-conventions/ SKILL.md (index) + references/
│        ├─ performance.md · warnings.md · correctness.md · extension-model.md
│        ├─ testing.md · events.md · api.md · upgrade.md
│        └─ permissions.md · pages.md · telemetry.md
├─ tests/
│  ├─ fixtures/tiny-pte/ · fixtures/multi-app-product/   (each with expected-profile.json)
│  ├─ lint.mjs          structural, scripted
│  └─ BEHAVIOURAL.md    the fixture-driven procedure of §12, which needs a live session
├─ docs/DESIGN.md · docs/PROFILE.md
├─ README.md · LICENSE
```

Installation:

```
/plugin marketplace add ratanlimbu/AL_ClaudeCode_Plugin
/plugin install bp-al
/bp-al:scan
```

## 12. Verification

**Structural, scripted (`tests/lint.mjs`)** — `marketplace.json` and `plugin.json` parse and
carry required fields; every command references a skill that exists **and declares the tool
that loads it**; no agent frontmatter pins `model:`; every relative link resolves; no
`SKILL.md` exceeds its line budget; **no file in the repository contains a customer name,
publisher, or object ID range** — a grep-based guard against §3.1 eroding over time.

The `allowed-tools` check exists because the failure it catches is silent: `allowed-tools` is
a whitelist, so a command whose body says "load the skill" while its frontmatter omits `Skill`
cannot do the only thing it exists to do, and nothing about the file looks wrong. All five
commands shipped that way until it was added.

The agent line budget is 110, raised from 100 when the `policy` block landed. A nine-category
vocabulary and a closed exemption list are irreducible data, and shaving prose to fit a round
number costs more than ten lines do. Raising a budget is a deliberate act and is recorded here
rather than done quietly.

**Behavioural, fixture-driven** — run `/bp-al:scan` against each fixture and compare the
produced profile with a golden file, using `tests/profile-diff.mjs`, which reports differing
paths rather than a verdict. `null` and absent are distinct there, because the profile's
degrade-loudly design rests on the difference, and arrays compare by index, because `authority`
is in precedence order.

The comparison is a script, and `lint.mjs` self-tests it against deliberately corrupted
profiles, because the inline snippet it replaced could not fail: the array form of
`JSON.stringify`'s replacer is an allowlist applied at every level, so it emptied every nested
object and compared a wrong build command equal to the right one. A checker that cannot fail is
indistinguishable from one that passes, and nothing else in this suite would have noticed. Then assert that `git status` inside the fixture shows
`.claude/bp-al.json` and **nothing else**. Guarantee 2 of the adopt-in-place contract is the
one most likely to regress, so it gets its own before-and-after tree diff.

Fixture `.al` files are stored CRLF, matching real AL repositories, so scripted edits that
silently rewrite line endings are caught.

## 13. Decisions taken

| Decision | Choice | Why |
|---|---|---|
| Command namespace | `/bp-al:` | Short to type; the surface colleagues touch most. |
| Licence | MIT | Matches the surrounding BC/AL tooling ecosystem. |
| Profile location | `.claude/bp-al.json` | Already-conventional directory; one file to delete. |
| Orchestration | `go` sequences the three stages | Both chained and standalone paths, one implementation. |
| Model selection | inherit, never pin | Portability across colleagues; no surprise cost. |
| Warning gate | delta, not count | Works on brownfield and greenfield without configuration. |
| Analyzer IDs | never bundled | They differ per project and go stale; read the compiler instead. |
| Strictness | `policy` in the profile, defaults loose | Brownfield and greenfield need the same checks and different consequences; the alternative is people switching checks off. |
| Advisory findings | reported in full, never suppressed | Advisory decides what stops the pipeline, not what gets looked for or said. |
| Verdicts | three, not two | `UNVERIFIED` and `BLOCKED` answer different questions; conflating them loses the answer. |
| Reachability exemptions | a closed list | AL publishes uncalled surface by design; a check that is always wrong is one people skip. |
| `check` | a mode of `al-review`, not a new skill | Same reason `go` only sequences: one implementation cannot drift from itself. |
| `appsource` | reports, never gates, never writes | Submission readiness is a list of decisions, several commercial. A command that edits `app.json` to satisfy a checklist has guessed at them. |
| MCP symbol server | offered, never named | Pinning an npm package puts a supply-chain decision in someone's repository, running every session. |
| Test execution | detected and confirmed like `build.command` | A stale test invocation reads as a broken suite. `null` stays legal, so CI-only repositories lose nothing. |

## 14. Confirmed at implementation — 2026-09-21

- **GitHub owner** — resolved to `ratanlimbu/AL_ClaudeCode_Plugin`, taken from the repository's
  own `origin` remote rather than guessed. It was carried as a literal placeholder until the
  first push, with `tests/lint.mjs` reporting every occurrence on each run as a `TODO` — a
  report rather than a failure, so it never blocked work meanwhile. The check stays in the
  lint: it costs nothing and catches a placeholder reintroduced by a later edit.

  The product name and the repository name are deliberately different. `BP_For_AL_DEV` is what
  the plugin is called; `AL_ClaudeCode_Plugin` is where it lives. Only the install path and
  the homepage use the latter.
- **Agent frontmatter key for reasoning effort** — verified against the installed plugin
  schema: **`effort:` is real**, taking `low` · `medium` · `high` · `xhigh`, alongside `name`,
  `description`, `model`, `color` and `tools`. Both agents set `effort: medium` and omit
  `model:` entirely, so they inherit the session's model. The lint enforces both halves: no
  agent may pin a model to anything but `inherit`, and every agent must state an effort.

Also settled while building: `model: inherit` is a legal value, so the lint permits it rather
than requiring the key's absence — the rule §10 wants is *never pinned*, not *never present*.

- **Verified against the installed official marketplace**, rather than against memory, by
  surveying every command, skill and agent in `claude-plugins-official`:
  - `effort:` is real — eight official agents use it.
  - `Skill` is a legal `allowed-tools` entry — three official commands list it.
  - `allowed-tools` as a bare comma-separated list is the dominant form, used ninety times
    against a handful of JSON arrays.
  - `version:` in a `SKILL.md` frontmatter is used by fifteen official skills.
  - Both manifests match the official shape exactly, including the `$schema` URL.

- **The subagent tool has two names.** Every `allowed-tools` list in the official marketplace
  spells it `Task`; this client's own tool listing calls it `Agent`. Nothing in this repository
  can determine which a given Claude Code build honours, so every command and skill that
  dispatches lists **both**, and the lint requires both. An unrecognised name in a whitelist is
  inert; a missing one silently blocks the only thing the command exists to do — the same
  failure mode as the omitted `Skill`, found the same way.

  The reverse check takes both spellings too: an agent granted either can spawn further agents,
  which §10 forbids.

## 15. Deferred

Estimation and pre-sales · documentation and release-note generation · translation tooling
beyond the completeness check in `al-appsource` · a Copilot/AI-extensibility theme · running
AppSourceCop's breaking-change analysis directly rather than reporting whether it can run.

Delivered since the first draft, and no longer deferred: test execution, `/bp-al:check`, MCP as
an opt-in rather than a bundled dependency, and the `permissions`, `pages` and `telemetry`
themes.
