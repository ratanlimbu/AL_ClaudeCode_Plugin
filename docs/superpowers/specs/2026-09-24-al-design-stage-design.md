# Stage 0 — `al-design`: an architecture stage for bp-al

**Status:** proposed 2026-09-24, revised after BC-expert review · **Branch:** `feat/al-design`
**Source:** adapted from ALDC's `al-architect` agent and `architecture-template.md`
(DSC-Group-Srl/ALDC-AL-Development-Collection, MIT, © 2025 Javier Armesto González). Full
licence text ships in `plugins/bp-al/THIRD-PARTY-NOTICES.md` (§3.7).

## 1. Intent

Some Business Central changes carry decisions that are expensive to reverse — data model
boundaries, which base events to hang on, transaction and locking boundaries, integration
direction, public surface, upgrade posture, how the work splits. Today bp-al goes straight from
a request to a contract, so those decisions get made implicitly inside `al-spec` and are never
presented as choices.

Add an optional **Stage 0 — design** that, for HIGH-complexity requests only, presents each
real decision with options, trade-offs and a recommendation, gets human approval, and hands an
approved design to `al-spec`, which is then bound by it.

**Success:** a HIGH request run through `/bp-al:go` produces an approved design whose TD-n
decisions the spec cites and does not contradict; a LOW/MEDIUM request runs as today plus one
triage line; every base event the design relies on is verified against the symbols of the
Business Central version the app targets, or explicitly reported `UNVERIFIED`; the
adopt-in-place contract holds unchanged.

**Non-goals:** a subagent; a review-stage conformance check against the design (decided:
design binds the spec only — the spec already carries the decisions into review); writing to
any authority document; a bundled symbol server; profile schema changes.

## 2. Decisions taken

| Decision | Choice | Why |
|---|---|---|
| Entry point | `/bp-al:design` command **and** `go` triages first | HIGH work gets design by default; small work pays one line. |
| Binding | spec only | Smallest change; review already checks the spec. No new policy category. |
| Form | a skill in the main context, no agent | Design pauses for the human's trade-offs, which a subagent cannot do mid-run; the `customisation` tier spawns no subagents (DESIGN §10). |
| Durable decisions | **proposed** authority entries, pasted by the human | Guarantee 3: bp-al never edits a file it did not create. |
| Triage signals | BC-specific irreversibility, not an area count | "Four functional areas" is not testable; posting, TransferFields parity and public surface are. |
| Event verification | source, then `.alpackages` symbols at the targeted version | Base App source is almost never on disk; symbols almost always are. |
| Minimum counts | a triage check, not a quota | Fewer than three genuine decisions means the request is not HIGH. |
| Attribution | full MIT notice in a notices file | MIT requires the permission notice in substantial portions, not a credit line. |
| Missing knowledge | add an `integration` theme and a locking section | The design stage may only recommend from shipped, verified baseline — not from memory. |

## 3. Components

The skill is split so the index stays short and each body loads only when reached for, as
`al-conventions` does:

```
skills/al-design/
├─ SKILL.md                      the stage — ≤150 lines
└─ references/
   ├─ triage.md                  the LOW/MEDIUM/HIGH signals — the only file go loads to triage
   ├─ decision-areas.md          each area: what to decide, options, the al-conventions theme
   ├─ symbols.md                 how to verify an event or object against .alpackages
   └─ design-template.md         the document shape
```

### 3.1 `references/triage.md` (review items 2, 3, 12)

Classify the request; state it in one line naming the signal that decided it; the human
confirms or overrides in either direction.

**HIGH** — any one of:

- **Posting.** Logic inside a posting routine's transaction (a subscriber on a posting
  codeunit), or a new ledger / entry table.
- **Document → posted document transfer.** Fields added on both a document and its posted
  counterpart (header → posted header, line → posted line). `TransferFields` matches by field
  **number**, so the IDs must agree on every table in the chain — irreversible once shipped.
- **New document type, number series, or dimension handling.**
- **Breaking or migrating persisted change on an app that has shipped** — field type or
  length change, primary-key change, removal or obsoletion, moving data between tables,
  anything needing an upgrade codeunit or `DataTransfer`. **Purely additive fields are not
  HIGH.**
- **Public surface** of an app whose profile `appsource.target` is `appsource`, or whose
  objects are consumed through `internalsVisibleTo` / a dependent app — a new public
  procedure, event, API page or interface.
- **Background execution or concurrency** — Job Queue, `StartSession`, `TaskScheduler`,
  explicit locking. (Page background tasks are read-only and are not a HIGH signal.)
- **Integration outside Business Central** — any HTTP, webhook, business event, Dataverse,
  Power Automate or Azure component.
- **App boundary** — a change spanning two apps, or adding a dependency between them.

**MEDIUM** — no HIGH signal, but more than one object type or app area, or any profile
`hotspots` glob hit (a hotspot hit is **at least MEDIUM**, never LOW).

**LOW** — one object area, cause known, no hotspot.

LOW/MEDIUM → no design; go to `al-spec`. MEDIUM's decisions are raised in the spec's `OPEN`
and resolved at its gate. `go` loads **only this file** to triage (~40 lines), not the skill.

### 3.2 `SKILL.md` (≤150 lines)

Frontmatter: `name: al-design`, `version: 0.1.0`,
`allowed-tools: Read, Glob, Grep, Bash, Write, AskUserQuestion`.

Sections, in order:

1. **Triage** — apply `references/triage.md`. Invoked directly on a LOW/MEDIUM request: say
   so, recommend `/bp-al:spec`, continue only if the human insists. **On the `customisation`
   tier with a HIGH request**, say once that an inline design ends with the conversation and
   recommend re-running with `--deep`; the human decides (item 11).
2. **In** — the request; `.claude/bp-al.json`; only the authority documents covering the area
   touched (same discipline as `al-spec`); and, for every app touched, its `app.json` fields
   `target`, `application`, `platform`, `runtime`, `dependencies`, `internalsVisibleTo`
   (item 6). These are **read, never asked**. Profile absent → run `bp-al:al-profile` first.
3. **Locate before you design** — grep the repository and every `dependencies[].sourcePath`
   for what exists already, half-built or uncalled, as `al-spec` does. Verify every base or
   dependency **event and object** the design relies on per `references/symbols.md`
   (item 1). Record hotspots hit.
4. **Clarify** — ask only where the answer changes a decision **and** the repository cannot
   answer it: business rules, volumes, integration direction and timing (real-time vs batch,
   push vs pull), compliance. One question at a time. Facts are the stage's job; decisions are
   the human's.
5. **Decide** — for each area in `references/decision-areas.md` that the design touches, and
   only those, present options, trade-offs and a recommendation. Read the `al-conventions`
   theme named for that area. **This stage may read one theme per touched area — an explicit,
   bounded exception to the index's "one or two" rule. A design that reaches for more than
   four themes should be decomposed into sub-specs instead** (item 8). Project authority wins
   over the baseline, and a recommendation says when it was overridden.
6. **Minimums as a triage check** — if fewer than three genuine decisions emerge, the request
   was not HIGH: say so and hand to `al-spec` with the decisions made so far as `OPEN`
   entries. Never pad to three (item 7).
7. **Out** — the design in the shape of `references/design-template.md`.
   - `product` tier with `specs.dir` set → `<specs.dir>/<slug>.design.md`, **written only
     after approval**.
   - `customisation` tier, or `specs.mode` = `inline` → inline in the conversation. No file.
   - Durable decisions → `PROPOSED AUTHORITY ENTRIES`, naming the target document from the
     profile's `authority` list, for the human to paste. Never written by the stage.
8. **Naming and superseding** (item 9) — `<slug>` is the request reduced to lower-case
   kebab-case, at most five words, confirmed with the human at the gate. A design is never
   edited after approval: superseding writes `<slug>.design.v2.md` (v3, …) whose header names
   the design it supersedes, and the old file's Status is changed to `Superseded` — the only
   edit the stage makes to a file, and only to one it created. A file that already exists
   for the slug is never overwritten silently: show the difference and ask.
9. **Gate** — one approval stop. Present decisions, risks and diagrams; do not proceed on
   silence. On approval set Status `Approved` and write the file (product tier).
10. **Stop / pause** — stop when the request is implementation rather than design, critical
    information is missing, or requirements conflict; summarise the state. Pause for each
    decision the human must own. Continue autonomously while exploring.
11. **Hand-off** — recommend `/bp-al:spec` with the design's **path** (one run per sub-spec,
    in order, if decomposed). Never auto-continue outside `go`.
12. **Attribution** — one line: adapted from ALDC under MIT, see `THIRD-PARTY-NOTICES.md`.

### 3.3 `references/decision-areas.md` (item 5)

One section per area: *what must be decided · usual options · what makes it expensive to
reverse · the `al-conventions` theme to read*. Areas:

| Area | Decides | Theme |
|---|---|---|
| Data model | new table vs table extension; keys for the expected filters; FlowField vs stored (watch circular FlowFields); relations; **TransferFields ID parity across document → posted chains** | `extension-model`, `performance` |
| Transactions and locking | where the commit boundary sits; what runs inside the posting transaction and what is deferred; locking and read isolation | `performance`, `correctness` |
| Background execution | Job Queue vs `StartSession` vs `TaskScheduler` vs page background task — retry, error visibility, licensing and session context differ | `integration`, `telemetry` |
| Events and extensibility | which base events to subscribe to (verified, §3.4); **whether an event this app publishes is isolated** (a subscriber cannot break the publisher, but cannot veto it either); interface + enum for one-of-N behaviour, and **`IsHandled` as a last resort** — competing subscribers silently override each other | `events` |
| App placement (product tier) | which app owns each new object; dependency direction stays acyclic | `extension-model` |
| Public vs internal surface | `Access = Internal` by default; what is public and why; `internalsVisibleTo`. Published public surface can only be obsoleted, never removed | `upgrade`, `api` |
| Setup and toggles | setup table vs Feature Management key; per-company vs global | `correctness` |
| Integration — inbound | API v2.0 vs custom API (publisher / group / version); OData; webhooks | `api` |
| Integration — outbound | `HttpClient`, timeouts, retry and idempotency; external business events; Dataverse / virtual tables; Power Automate | `integration` |
| Microsoft ecosystem boundary | what does not belong in AL at all — Azure Functions, Service Bus, Logic Apps — when the BC sandbox forbids it (no file system, no .NET on SaaS) or the load does not fit a session | `integration` |
| Secrets and authentication | `IsolatedStorage` with `SecretText`; OAuth flows; `keyVaultUrls` for app secrets. **Never a secret in a table field.** | `integration` |
| Security | permission-set hierarchy; data classification on every field | `permissions` |
| Upgrade and deployment | upgrade codeunits and upgrade tags; `DataTransfer` for bulk moves; obsoletion with `#if not CLEAN` where AppSource applies; idempotency | `upgrade` |
| Telemetry | which feature-usage and error signals to emit, and their dimensions | `telemetry` |
| Work decomposition | which parts can be specified and built independently (disjoint files, data model first) | — |

The body text is written in the same checklist-with-reason style as `al-conventions`.
Platform facts in it are version-sensitive; each one that depends on a runtime or BC version
names it, and the stage checks it against the `runtime` / `application` read in step 2.

### 3.4 `references/symbols.md` (item 1)

Verification order for a named event, procedure or object:

1. **Source on disk** — the repository, then every `dependencies[].sourcePath`.
2. **Symbol packages** — in order: `.alpackages/` beside each `app.json`; the
   `al.packageCachePath` entries in `.vscode/settings.json`; the `baselinePackageCachePath` in
   `AppSourceCop.json`. These are read, never assumed — AL-Go and container-based repositories
   often have none of them on disk, because symbols are fetched at build time, and that case
   goes straight to step 4 with the reason stated. Pick the package whose version matches the
   app's `application` (Base Application) or the dependency's declared version. An `.app` is
   a NAVX header followed by a zip archive containing `SymbolReference.json`; extract that one
   entry to the scratchpad or a temp directory — **never into the repository** — and search
   it for the publisher name.
3. **Record** for each item: found / not found, where, and the version checked. If found,
   also record its `ObsoleteState` — **Pending or Removed is a finding**, not a pass; designing
   onto an event Microsoft is withdrawing is precisely the expensive mistake this stage
   exists to prevent.
4. **Neither available** → `UNVERIFIED`, listed in the design's `UNVERIFIED` section with the
   decision it undermines; mention `/bp-al:mcp` once as a way to resolve base symbols.

**Implementation assumption to verify first:** the NAVX header length and that
`SymbolReference.json` is a plain zip entry readable by PowerShell's
`System.IO.Compression` or `unzip` after skipping the header. The plan's first task
verifies this against a real `.app` before the reference text is written. If it fails, the
reference falls back to steps 1 and 4 and says so.

### 3.5 `references/design-template.md` (items 7, 10)

Adapted from ALDC's template:

- MIT notice pointer at the top (to `THIRD-PARTY-NOTICES.md`).
- Header: date · complexity · **Status** `Proposed → Approved → Superseded` · `Supersedes:` ·
  **triage signal** · `Themes applied:` (the `al-conventions` themes actually read) ·
  target (`application` / `runtime` / `target` read from `app.json`).
- §1 Summary & success criteria `SC-n` (not `AC-n`, so it cannot be confused with the spec's
  `CRITERIA`) · §2 Solution architecture — up to three mermaid diagrams, only where prose
  cannot do it: **`erDiagram` for table relationships**, `flowchart` for posting and
  integration flows · §3 Integration boundaries · §4 Quality constraints (security,
  performance, locking, upgrade/rollback) · §5 Technical decisions `TD-n` (problem, decision,
  alternatives rejected, rationale) · §6 Risks · §7 Spec decomposition (omit if one spec
  suffices) · `HOTSPOTS HIT` · `SYMBOLS VERIFIED` (item, version, obsolete state) ·
  `UNVERIFIED` · `PROPOSED AUTHORITY ENTRIES`.
- Rules: **no AL code, no object/ID tables, no procedure signatures, no phase or test lists**
  — those belong to the spec. Fewer than three genuine TD entries or three genuine risks means
  re-triage, never padding.

### 3.6 Commands

**`commands/design.md`** (≤40 lines) — `allowed-tools: Skill, Read, Glob, Grep, Bash, Write,
AskUserQuestion`. Loads `bp-al:al-design`; empty request → ask; profile absent → run
`al-profile` first; states that on `product` it writes one file into `specs.dir` after
approval and nothing else, and that symbol extraction goes to a temporary directory outside
the repository.

**`commands/go.md`** — new step before Stage 1: read
`skills/al-design/references/triage.md` (not the skill), state the triage line, let the human
override. HIGH → load `bp-al:al-design`, Stage 0, **gate**, then Stage 1 with the approved
design's path. LOW/MEDIUM → Stage 1 as today. `--quick` skips triage and design. Stays ≤40
lines.

### 3.7 `plugins/bp-al/THIRD-PARTY-NOTICES.md` (item 4)

ALDC's MIT licence in full — copyright line and permission notice — naming the two files
adapted (`claude-plugin/agents/al-architect.md`, `claude-plugin/docs/templates/architecture-template.md`)
and the upstream repository. Placed inside the plugin so it travels with every install.

### 3.8 `skills/al-spec/SKILL.md`

In **In**: if an approved design exists for this request (given by path, or in the
conversation), read it. A `Proposed` or `Superseded` design is not binding. The spec must not
contradict any `TD-n`; OBJECTS and CRITERIA cite the decision they implement (`per TD-02`).
A spec that needs to depart from a decision stops and raises it in `OPEN`; the human either
supersedes the design (§3.2 step 8) or amends the spec.

### 3.9 Docs

- `docs/DESIGN.md` — §2; §4 guarantee 4 wording extended to "spec and design documents", and
  guarantee 1 noting symbol extraction goes to a temporary directory outside the repository;
  §5 command table; §9 **Stage 0 — design** contract (In / Out / Gate); §11 layout; §13 rows
  for the decisions in §2 above.
- `README.md` — command table, contract wording, ALDC credit with a link to the notices file.
- `docs/PROFILE.md` — `specs.dir` also receives design documents.
- `docs/DESIGN.md` §7 and `README.md` — "eleven themes" becomes twelve.

### 3.10 Baseline knowledge the design stage depends on

Several decision areas in §3.3 had nothing behind them in the shipped baseline: `api.md` covers
only inbound API pages, and nothing covered background work or locking. A design stage that
recommends from memory is the failure bp-al exists to prevent, so this work adds:

**`skills/al-conventions/references/integration.md`** — a twelfth theme, in the same
checklist-with-reason style, with a row in the `al-conventions` index (which stays within its
60-line budget). Sections:

- *Outbound HTTP* — `HttpClient`, timeouts, never inside a posting transaction or a
  subscriber, retry through a queue rather than a loop, idempotency keys, and the
  per-extension "allow HTTP requests" setting that silently blocks calls in sandboxes.
- *Secrets* — `SecretText` end to end, `IsolatedStorage` with the right `DataScope`,
  `keyVaultUrls` for app-level secrets, never a table field, never telemetry.
- *Authentication* — OAuth 2.0 through the platform's OAuth2 support; no stored passwords.
- *Background work* — Job Queue (category for serialisation, attempts, error visibility on
  the entry), `TaskScheduler.CreateTask` with a failure codeunit, `StartSession` for bounded
  fire-and-forget only, and which of them survive a failed session.
- *Events out of BC* — external business events, webhooks on API entities, Dataverse and
  virtual tables, Power Automate — and when each fits.
- *What does not belong in AL* — work the SaaS sandbox forbids (file system, .NET) or that
  does not fit a session's limits goes to an Azure component; the extension calls it and owns
  the retry.

**`skills/al-conventions/references/performance.md`** — one new section, *Locking and read
isolation*: `ReadIsolation` per record instance, why `LockTable` early serialises users,
`DataAccessIntent = ReadOnly` so reports, queries and read-only API pages use the read replica,
and that `ModifyAll`/`DeleteAll` fall back to per-row when table-event subscribers or the
change log are active.

Every platform fact in both is verified against Microsoft Learn before it is written, as the
correctness pass (commit `0e353b8`) was, and names the runtime or BC version it depends on
where it has one.

## 4. Error handling and degraded modes

| Situation | Behaviour |
|---|---|
| Profile absent | Run `al-profile` first, as every stage does. |
| `product` tier but `specs.dir` null | Design inline; say once that nothing was written and why. |
| `customisation` tier, HIGH request | Inline design; recommend `--deep` once. |
| Event/object found only in a package of a different version | Report the version mismatch; treat as `UNVERIFIED` for the targeted version. |
| Event/object obsolete (Pending/Removed) | A finding surfaced as a decision; alternatives presented. |
| Symbol package unreadable (header/zip assumption fails) | Fall back to source + `UNVERIFIED`; say why. |
| Request contradicts an authority document | Project wins; surfaced as a decision for the human. |
| Human disagrees with triage | Their call, both directions. |
| Fewer than three genuine decisions | Re-triage to MEDIUM; hand to spec with `OPEN` entries. |
| More than four themes needed | Decompose into sub-specs rather than read them all. |
| Requirements conflict / critical info missing | Stop and summarise; no design written. |
| Design file already exists for the slug | Never overwritten silently; show the difference and ask, or supersede as v2. |
| Spec would contradict an approved TD-n | Spec stops at its gate with the conflict in `OPEN`. |

## 5. Verification

- **`node tests/lint.mjs`** passes: the new command references an existing skill and lists
  `Skill`; `go.md` still lists everything it needs; `SKILL.md` ≤150, commands ≤40; relative
  links resolve (including to `THIRD-PARTY-NOTICES.md`); check 6 holds — no 5–8 digit
  literals and no example names under `plugins/` (the notices file's only number is the
  four-digit year).
- **Symbols spike** (plan task 1): extract `SymbolReference.json` from a real Base
  Application `.app` using only the method `symbols.md` will prescribe; confirm a known
  publisher and its `ObsoleteState` are found. Throwaway; nothing committed but the
  confirmed method.
- **`tests/BEHAVIOURAL.md` Test 6 — design footprint.** On `multi-app-product` (product,
  `specs.dir` set): `/bp-al:design` with a HIGH request, approve; `git status` shows exactly
  one new file, `<specs.dir>/<slug>.design.md`, Status `Approved`, at least three `TD-`
  headings, no object IDs, and nothing extracted into the repository. On `tiny-pte`
  (customisation): same request → inline design, `--deep` recommended once, `git status`
  clean.
- **Test 7 — triage routes.** On `tiny-pte`: a one-field additive change → LOW, no design. A
  hotspot-touching change → at least MEDIUM (the fixture's `hotspots` is empty, so first add
  `"**/src/**"` to the scanned `.claude/bp-al.json` by hand, as Test 5 does for `policy`). A change adding the same field to a document
  and its posted counterpart → HIGH, naming the TransferFields signal.

## 6. Out of scope

Review-stage conformance to TD-n · a design subagent · C4 generation · editing
`ARCHITECTURE.md` / `DECISIONS.md` · profile schema changes · DevOps detection (AL-Go,
BcContainerHelper, rulesets, symbol sources) and the AppSource-readiness additions from the
whole-plugin review — each its own spec.
