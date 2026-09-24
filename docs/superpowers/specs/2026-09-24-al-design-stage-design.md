# Stage 0 — `al-design`: an architecture stage for bp-al

**Status:** proposed 2026-09-24 · **Branch:** `feat/al-design`
**Source:** adapted from ALDC's `al-architect` agent and `architecture-template.md`
(DSC-Group-Srl/ALDC-AL-Development-Collection, MIT, © 2025 Javier Armesto González).

## 1. Intent

Some Business Central changes carry decisions that are expensive to reverse — data model
boundaries, which base events to hang on, integration direction, permission shape, upgrade
posture, how the work splits. Today bp-al goes straight from a request to a contract, so those
decisions get made implicitly inside `al-spec` and are never presented as choices.

Add an optional **Stage 0 — design** that, for HIGH-complexity requests only, presents each
real decision with options, trade-offs and a recommendation, gets human approval, and hands an
approved design to `al-spec`, which is then bound by it.

**Success:** a HIGH request run through `/bp-al:go` produces an approved design whose TD-n
decisions the spec cites and does not contradict; a LOW/MEDIUM request runs exactly as today;
the adopt-in-place contract holds unchanged.

**Non-goals:** a subagent; a review-stage conformance check against the design (decided:
design binds the spec only — the spec already carries the decisions into review); writing to
any authority document; a bundled symbol server.

## 2. Decisions taken in brainstorming

| Decision | Choice | Why |
|---|---|---|
| Entry point | `/bp-al:design` command **and** `go` triages first | HIGH work gets design by default; small work pays nothing. |
| Binding | spec only | Smallest change; review already checks the spec. No new policy category. |
| Form | a skill in the main context, no agent | Design pauses for the human's trade-offs, which a subagent cannot do mid-run; the `customisation` tier spawns no subagents (DESIGN §10). |
| Durable decisions | **proposed** authority entries, pasted by the human | Guarantee 3: bp-al never edits a file it did not create. ALDC appends to `memory.md`; bp-al cannot. |

## 3. Components

### 3.1 `plugins/bp-al/skills/al-design/SKILL.md` (≤150 lines)

Frontmatter: `name: al-design`, `version: 0.1.0`,
`allowed-tools: Read, Glob, Grep, Bash, Write, AskUserQuestion`.

Sections, in order:

1. **Triage.** Classify the request and state it in one line; the human confirms or overrides.
   - LOW — one functional area, cause known → no design; go to spec.
   - MEDIUM — two or three areas, integrations internal to BC → no design; decisions go in
     the spec's `OPEN` for resolution at its gate.
   - HIGH — any of: four or more functional areas; an integration outside Business Central;
     a change to persisted shape on an app that has already shipped; a change spanning an app
     boundary others depend on → design.
   Invoked directly via `/bp-al:design` on a LOW/MEDIUM request: say so, recommend
   `/bp-al:spec`, and continue only if the human insists.
2. **In.** The request, `.claude/bp-al.json`, and only the authority documents covering the
   area touched — the same rule and wording discipline as `al-spec`. Profile absent → run
   `bp-al:al-profile` first.
3. **Locate before you design.** Grep the repository and every `dependencies[].sourcePath`.
   Every base or dependency event the design relies on must be found by name; one not found
   on disk is marked `UNVERIFIED` in the design, never assumed (and `/bp-al:mcp` is mentioned
   once as the way to resolve base-app symbols not on disk). Note what already exists,
   half-built or uncalled, as `al-spec` does.
4. **Clarify.** Ask only where the answer changes a decision: business rules, volumes,
   integration direction and timing (real-time vs batch, push vs pull), security and
   compliance, SaaS vs on-prem, target BC version. One question at a time.
5. **Decide.** For each decision with a genuine alternative, present options, trade-offs and a
   recommendation. Decision areas and the `al-conventions` theme each one reads:
   data model (`extension-model`, `performance`) · business logic and events (`events`) ·
   integration (`api`) · security (`permissions`) · upgrade and deployment (`upgrade`) ·
   work-package boundaries (none — decomposition). The theme is read only for the areas the
   design actually touches, per the `al-conventions` index rule.
   Project authority wins over the baseline; a recommendation that follows the baseline
   against a project document says the project overrode it.
6. **Out.** The design in the shape of `references/design-template.md`.
   - `product` tier with `specs.dir` set → written to `<specs.dir>/<req>.design.md`, **only
     after approval**.
   - `customisation` tier, or `specs.mode` = `inline` → inline in the conversation. No file.
   - Durable decisions (a convention, a shared pattern, a platform choice) → a
     `PROPOSED AUTHORITY ENTRIES` block naming the target document from the profile's
     `authority` list, for the human to paste. Never written by the skill.
7. **Gate.** One approval stop. Present decisions, risks and diagrams; do not proceed on
   silence. On approval set **Status: Approved** and write the file (product tier).
8. **Stop / pause rules.** Stop when the request is implementation rather than design, when
   critical information is missing, or when requirements conflict — summarise the state.
   Pause for each decision the human must own. Continue autonomously while exploring.
9. **Hand-off.** Recommend `/bp-al:spec <request>` (once per sub-spec, in order, if
   decomposed). Never auto-continue outside `go`.
10. **Attribution.** One line crediting ALDC under MIT.

### 3.2 `plugins/bp-al/skills/al-design/references/design-template.md`

ALDC's template, adapted:

- Header: date, complexity, **Status** `Proposed → Approved → Superseded`, and
  `Themes applied:` (the `al-conventions` themes actually read — replaces ALDC's
  "Skills applied" / BCQuality line).
- §1 Summary & success criteria (`SC-n` — renamed from ALDC's `AC-n` so it cannot be confused
  with the spec's `CRITERIA`) · §2 Solution architecture (≤3 mermaid diagrams, only where
  prose cannot do it) · §3 Integration boundaries · §4 Quality constraints (security,
  performance, upgrade/rollback) · §5 Technical decisions `TD-n` (problem, decision,
  alternatives rejected, rationale; minimum 3, never padded) · §6 Risks (minimum 3,
  feature-specific) · §7 Spec decomposition (omit if one spec suffices) ·
  `PROPOSED AUTHORITY ENTRIES` · `UNVERIFIED` (what could not be confirmed on disk).
- Rules kept verbatim in spirit: **no AL code, no object/ID tables, no procedure signatures,
  no phase or test lists** — those belong to the spec.
- MIT attribution comment at the top.

Dropped from ALDC: BCQuality task-context and `Known Quality Constraints`, al-mcp/LSP calls,
`bc-dev:skill-*`, `al-file-reader`, the Opus-switch prompt, conductor wave/package sizing,
`memory.md`, `app/requirements/…` paths.

### 3.3 `plugins/bp-al/commands/design.md` (≤40 lines)

`allowed-tools: Skill, Read, Glob, Grep, Bash, Write, AskUserQuestion`. Loads
`bp-al:al-design`; empty request → ask; profile absent → run `al-profile` first; states that
on `product` it writes one file into `specs.dir` after approval and nothing else.

### 3.4 `plugins/bp-al/commands/go.md`

New step before Stage 1: load `bp-al:al-design` for **triage only**; state the result in one
line and let the human override. HIGH → Stage 0 in full, **gate**, then Stage 1 with the
approved design. LOW/MEDIUM → Stage 1 as today. `--quick` skips triage and design.

### 3.5 `plugins/bp-al/skills/al-spec/SKILL.md`

In **In**: if an approved design exists for this request (conversation, or
`<specs.dir>/<req>.design.md` with Status Approved), read it. The spec must not contradict any
`TD-n`; OBJECTS and CRITERIA cite the decision they implement (`per TD-02`). A spec that
needs to depart from a decision stops and raises it in `OPEN` — the human either amends the
design (Status → Superseded, new design) or the spec. A `Proposed` design is a draft and does
not bind.

### 3.6 Docs

- `docs/DESIGN.md` — §2 purpose line; §4 guarantee 4 wording extended to "spec and design
  documents"; §5 command table; §9 **Stage 0 — design** contract (In / Out / Gate); §11
  layout; §13 rows for the four decisions in §2 above; §15 unchanged.
- `README.md` — command table, contract wording, one line of ALDC credit.
- `docs/PROFILE.md` — `specs.dir` now also receives design documents.

## 4. Error handling and degraded modes

| Situation | Behaviour |
|---|---|
| Profile absent | Run `al-profile` first, as every stage does. |
| `product` tier but `specs.dir` null | Design inline; say once that nothing was written and why. |
| Event or object not found on disk | Listed under `UNVERIFIED`; the decision depending on it says so. Never assumed to exist. |
| Request contradicts an authority document | Project wins; surfaced as a decision for the human, not silently resolved. |
| Human disagrees with triage | Their call, both directions. |
| Requirements conflict / critical info missing | Stop and summarise; no design is written. |
| Design file already exists for `<req>` | Do not overwrite; show the diff and ask (guarantee 3 applies to our own files by courtesy). |
| Spec would contradict an approved TD-n | Spec stops at its gate with the conflict in `OPEN`. |

## 5. Verification

- **`node tests/lint.mjs`** passes: new command references an existing skill and lists
  `Skill`; `SKILL.md` ≤150, command ≤40; relative links resolve; check 6 (no 5–8 digit
  literals and no example names under `plugins/`) holds — the template and skill carry no
  IDs, and the attribution line contains no digits beyond the four-digit year.
- **`tests/BEHAVIOURAL.md` Test 6 — design footprint.** On `multi-app-product` (product,
  `specs.dir` set): run `/bp-al:design` with a HIGH request, approve; `git status` shows
  exactly one new file, `<specs.dir>/<req>.design.md`, with Status Approved and at least
  three `TD-` headings, and no object IDs. On `tiny-pte` (customisation): same request →
  design inline, `git status` clean.
- **Test 7 — triage routes.** `/bp-al:go` with a one-field change on `tiny-pte` → triage
  LOW, no design stage. With a HIGH request → design gate appears before the spec.

## 6. Out of scope

Review-stage conformance to TD-n · a design subagent · C4 generation · editing
`ARCHITECTURE.md`/`DECISIONS.md` · profile schema changes.
