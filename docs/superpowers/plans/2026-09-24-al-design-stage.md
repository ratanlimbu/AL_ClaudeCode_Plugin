# Stage 0 `al-design` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional Stage 0 — design — to the bp-al plugin, adapted from ALDC's
`al-architect`, plus the baseline knowledge it depends on.

**Architecture:** A main-context skill `al-design` with four reference files, a thin
`/bp-al:design` command, a triage step in `/bp-al:go`, a binding clause in `al-spec`, a new
`integration` theme and a locking section in `al-conventions`, and a notices file for the MIT
attribution. Everything is Markdown read by Claude Code; the only executable code is the
structural lint in `tests/lint.mjs`, which gains two checks.

**Tech Stack:** Claude Code plugin (Markdown skills/commands with YAML frontmatter), Node.js
(`tests/lint.mjs`, no dependencies), PowerShell (symbol extraction, verified by spike).

**Spec:** `docs/superpowers/specs/2026-09-24-al-design-stage-design.md`

## Global Constraints

- Branch `feat/al-design`; commit after every task; every commit message ends with
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- `node tests/lint.mjs` prints `lint: PASS` at the end of every task.
- Line budgets: `skills/al-conventions/SKILL.md` ≤ 60; any other `SKILL.md` ≤ 150; agents ≤ 110;
  commands ≤ 40. Reference files have no budget.
- **No 5–8 digit number anywhere under `plugins/`** (lint check 6) and none of the fictional
  example names (`Contoso`, `Fabrikam`, …) under `plugins/`.
- No agent file is added; no `model:` is pinned anywhere.
- The adopt-in-place contract holds: the design stage writes at most one file, into an
  existing `specs.dir`, only after approval; symbol extraction goes to a temporary directory
  **outside** the repository; no authority document is ever edited.
- Every platform fact written into a reference file is verified against Microsoft Learn first;
  a fact that cannot be confirmed is left out, not hedged in.
- Existing fixture `.al` files are CRLF and must stay so; do not touch them.
- Prose style matches the existing references: short sections, each rule with its reason.
- Code signing is **out of scope** (user decision, 2026-09-24).
- **Symbol lookups must work on any OS the AL extension runs on.** The primary method is POSIX
  (`od`, `tail`, `unzip`) plus a structured parse in Node or Python, whichever exists;
  PowerShell is the Windows fallback. A text-only search is a last resort and its result is
  reported as *owner unconfirmed*. (Both parse scripts in Task 5 were run against a real Base
  Application package on 2026-09-24: Node 0.7 s, Python 4 s, same result.)
- `SymbolReference.json` begins with a UTF-8 **BOM**; every parse strips it.

## Review Focus

1. **Several Base Application packages of different versions in `.alpackages`** (the norm on a
   real machine) — the stage must check existence against the lowest package that satisfies
   `app.json`'s `application` floor and obsolescence against the highest, and say which it
   used. Pinned by BEHAVIOURAL Test 8 (Task 10).
2. **`specs.mode` is `file` but `specs.dir` was deleted since the scan** — the stage must fall
   back to inline and say so, never create the directory. Pinned in `SKILL.md` Out section
   (Task 6) and Test 6 variant (Task 10).
3. **A design file for the slug already exists** — never overwritten silently. Pinned by
   Test 6 step 4 (Task 10).
4. **An event name that exists on more than one object, or an event published by a
   non-Microsoft dependency** — the lookup must name the owning object, from a structured
   parse, and look in that dependency's package (`<Publisher>_<Name>_<version>.app`) or its
   `sourcePath`. Pinned in `symbols.md` (Task 5) and Test 8 step 2 (Task 10).
5. **A request that turns out to have fewer than three genuine decisions** — re-triaged to
   MEDIUM, never padded. Pinned by Test 7 case 4 (Task 10).

---

## File map

| File | Action | Responsibility |
|---|---|---|
| `tests/lint.mjs` | modify | checks 8 (reference parity) and 9 (third-party notice) |
| `plugins/bp-al/skills/al-conventions/references/integration.md` | create | twelfth theme |
| `plugins/bp-al/skills/al-conventions/SKILL.md` | modify | index row, "twelve" |
| `plugins/bp-al/skills/al-conventions/references/performance.md` | modify | locking section |
| `plugins/bp-al/THIRD-PARTY-NOTICES.md` | create | ALDC MIT notice |
| `plugins/bp-al/skills/al-design/references/triage.md` | create | LOW/MEDIUM/HIGH |
| `plugins/bp-al/skills/al-design/references/decision-areas.md` | create | areas → themes |
| `plugins/bp-al/skills/al-design/references/symbols.md` | create | symbol verification |
| `plugins/bp-al/skills/al-design/references/design-template.md` | create | document shape |
| `plugins/bp-al/skills/al-design/SKILL.md` | create | the stage |
| `plugins/bp-al/commands/design.md` | create | `/bp-al:design` |
| `plugins/bp-al/commands/go.md` | modify | triage step |
| `plugins/bp-al/skills/al-spec/SKILL.md` | modify | binding clause |
| `docs/DESIGN.md`, `README.md`, `docs/PROFILE.md` | modify | docs |
| `tests/BEHAVIOURAL.md` | modify | Tests 6–8 |

---

### Task 1: Lint checks 8 and 9

**Files:**
- Modify: `tests/lint.mjs` (header comment lines 4–11; insert new sections before the
  `// ---- placeholders` section at line 360)

**Interfaces:**
- Produces: check 8 fails when a `skills/<s>/references/<f>.md` exists but is named neither in
  `skills/<s>/SKILL.md` (as `references/<f>.md`) nor in any `commands/*.md` (by its full path
  `skills/<s>/references/<f>.md`, so one skill's file cannot be satisfied by another's), or
  when a `SKILL.md` names
  `references/<f>.md` that does not exist. Check 9 fails when any file under `plugins/`
  mentions `ALDC` and `plugins/bp-al/THIRD-PARTY-NOTICES.md` is missing or lacks the MIT
  permission sentence or the upstream copyright holder.

- [ ] **Step 1: Add the header lines**

In the comment block at the top, after `//   7  the golden-profile comparison actually detects a difference`, add:

```js
//   8  every reference file is reachable from its skill, and every one a skill names exists
//   9  adapted third-party content ships with its licence notice
```

- [ ] **Step 2: Add check 8 and check 9** — insert immediately before
  `// ------------------------------------------------- placeholders (reported, not failed)`:

```js
// ------------------------------------------------- 8. reference files are reachable
//
// A reference body is loaded only when the SKILL.md that indexes it names it. One that nothing
// names is dead weight nobody will ever read; one that is named but absent is a branch that
// fails the moment it is reached. Commands count as namers, because `go` loads a single
// reference (al-design's triage) without the skill.

const commandText = commandFiles.map((f) => readFileSync(f, "utf8")).join("\n");

for (const skill of knownSkills) {
  const skillPath = join(PLUGIN, "skills", skill, "SKILL.md");
  const skillText = readFileSync(skillPath, "utf8");
  const refDir = join(PLUGIN, "skills", skill, "references");
  const present = existsSync(refDir)
    ? readdirSync(refDir).filter((f) => f.endsWith(".md"))
    : [];

  for (const f of present) {
    const named = `references/${f}`;
    // A command names a reference by its full path, so `triage.md` in one skill can never be
    // satisfied by a command that loads another skill's `triage.md`.
    if (!skillText.includes(named) && !commandText.includes(`skills/${skill}/${named}`))
      fail("references", `skills/${skill}/${named} is named by neither its SKILL.md nor any command`);
  }
  for (const m of skillText.matchAll(/references\/([a-z0-9-]+\.md)/g)) {
    if (!present.includes(m[1]))
      fail("references", `skills/${skill}/SKILL.md names references/${m[1]}, which does not exist`);
  }
}

// ------------------------------------------------- 9. adapted content carries its licence
//
// MIT requires the copyright and permission notice in every copy or substantial portion. A
// credit line is not the notice. Anything under plugins/ that says it was adapted from ALDC
// obliges the notices file to exist and to carry both halves.

const NOTICES = join(PLUGIN, "THIRD-PARTY-NOTICES.md");
const mentionsAldc = pluginMarkdown.some(([p, text]) => p !== NOTICES && /\bALDC\b/.test(text));
if (mentionsAldc) {
  if (!existsSync(NOTICES)) {
    fail("notices", "plugins/ adapts ALDC content but plugins/bp-al/THIRD-PARTY-NOTICES.md is missing");
  } else {
    const n = readFileSync(NOTICES, "utf8");
    if (!n.includes("Permission is hereby granted, free of charge"))
      fail("notices", "THIRD-PARTY-NOTICES.md lacks the MIT permission notice");
    if (!n.includes("Javier Armesto González"))
      fail("notices", "THIRD-PARTY-NOTICES.md lacks the upstream copyright holder");
  }
}
```

- [ ] **Step 3: Run the lint on the unchanged tree**

Run: `node tests/lint.mjs`
Expected: `lint: PASS` (all eleven `al-conventions` references are named in its index; nothing
mentions ALDC yet).

- [ ] **Step 4: Prove check 8 can fail**

```bash
printf '# stray\n' > plugins/bp-al/skills/al-conventions/references/stray.md
node tests/lint.mjs; echo "exit $?"
rm plugins/bp-al/skills/al-conventions/references/stray.md
```

Expected: `references: skills/al-conventions/references/stray.md is named by neither its SKILL.md nor any command`, exit 1.

- [ ] **Step 5: Prove check 9 can fail**

```bash
printf '# x\nAdapted from ALDC.\n' > plugins/bp-al/skills/al-spec/aldc-probe.md
node tests/lint.mjs; echo "exit $?"
rm plugins/bp-al/skills/al-spec/aldc-probe.md
```

Expected: `notices: plugins/ adapts ALDC content but plugins/bp-al/THIRD-PARTY-NOTICES.md is missing`, exit 1.

- [ ] **Step 6: Re-run and commit**

```bash
node tests/lint.mjs
git add tests/lint.mjs
git commit -m "test: lint checks 8 (reference reachability) and 9 (third-party notice)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: The `integration` theme

**Files:**
- Create: `plugins/bp-al/skills/al-conventions/references/integration.md`
- Modify: `plugins/bp-al/skills/al-conventions/SKILL.md` (lines 3, 22–34, 36–39)

**Interfaces:**
- Consumes: lint check 8 (Task 1).
- Produces: theme name `integration`, file `references/integration.md` — referenced by
  `decision-areas.md` (Task 5).

- [ ] **Step 1: Add the index row first (red)**

In `al-conventions/SKILL.md`, after the `api` row, insert:

```markdown
| **integration** | the change calls out of Business Central, stores or uses a secret, authenticates to anything, or moves work into the background (Job Queue, task, session) | `references/integration.md` |
```

- [ ] **Step 2: Run lint to verify it fails**

Run: `node tests/lint.mjs`
Expected: FAIL — `skills/al-conventions/SKILL.md names references/integration.md, which does not exist`.

- [ ] **Step 3: Verify the facts before writing them**

Fetch each page and confirm the claim beside it. Drop any claim a page does not support.

| Claim | Page |
|---|---|
| `HttpClient.Timeout`; outbound calls blocked in sandboxes unless *Allow HttpClient Requests* is on for the extension | https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-httpclient |
| `IsolatedStorage` `DataScope` values Module / Company / User / CompanyAndUser; `SecretText` overloads | https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-isolated-storage |
| `SecretText` type, runtime it arrived in, cannot be read back as text in cloud | https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/methods-auto/secrettext/secrettext-data-type |
| App key vaults via `keyVaultUrls`, AppSource apps only | https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/devenv-app-key-vault-overview |
| `TaskScheduler.CreateTask` parameters incl. failure codeunit | https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/methods-auto/taskscheduler/taskscheduler-createtask-method |
| `StartSession` behaviour and limits | https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/methods-auto/session/session-startsession-method |
| Job Queue category serialisation, maximum attempts | https://learn.microsoft.com/en-us/dynamics365/business-central/admin-job-queues-schedule-tasks |
| External business events: `[ExternalBusinessEvent]` arguments, the event **category** enum extension, required permissions | search Learn: "Business Central external business events ExternalBusinessEvent attribute" |
| Business Central online has **no fixed outbound IP**; service tags are the mechanism | search Learn: "Business Central online outbound IP addresses service tag" |
| System Application **Azure Functions** module (codeunit and authentication) | search Learn: "Business Central Azure Functions module system application" |
| Webhook subscriptions on API pages, and which pages support them | search Learn: "Business Central webhooks API subscriptions supported entities" |
| Business Central virtual tables in Dataverse | search Learn: "Business Central virtual tables Dataverse" |

- [ ] **Step 4: Create `references/integration.md`** with this content (amend any sentence
  Step 3 did not confirm):

````markdown
# Integration: calls out, secrets in, and work that runs later

Everything here crosses a boundary the compiler cannot see — another system, a vault, a
session that runs after the user's has ended. It all compiles. It fails in production, at a
distance, often silently. `api` covers the inbound half (API pages). This theme is the rest.

## An HTTP call never runs inside someone else's transaction

A call out of Business Central takes as long as the other side decides. Inside a posting
routine or an event subscriber it holds that transaction's locks for the whole wait, and a
retry loop there multiplies it.

- Make the call **after** the transaction that decided to make it has committed — from a Job
  Queue entry, a task, or a user action — not from inside it.
- Set `HttpClient.Timeout` deliberately. The default is long enough to block a user for well
  over a minute.
- Retry through a queue, not a loop: a failed attempt becomes a record that is retried later
  and visible to someone, never a `repeat..until` with a sleep.
- Send an idempotency key the other side can use to discard a duplicate. A retried request
  that already succeeded once is otherwise a second order, a second payment.

## Sandboxes block outbound calls by default

In a sandbox, an extension's HTTP requests are refused unless *Allow HttpClient Requests* is
switched on for it on the Extension Management page. The failure looks like a network error.
State it in the setup instructions of anything that calls out, and handle the refusal as a
readable error rather than a stack trace.

## A secret is never data

- **Never in a table field.** Table data is exported, copied to sandboxes, read by anyone with
  table permissions, and restored from backups nobody thought of as containing credentials.
- Store it in `IsolatedStorage`, with the narrowest `DataScope` that works — `Module` for an
  app-wide credential, `Company` or `User` when it genuinely varies.
- Carry it as `SecretText` from the moment it is read to the moment it goes into the request.
  A `SecretText` cannot be turned back into readable text in the cloud, so it cannot leak into
  a message, a log or a debugger.
- Credentials that belong to the publisher rather than the customer — an API key for your own
  service — belong in an Azure Key Vault named in `keyVaultUrls`. That is available to
  AppSource apps only.
- Never in telemetry, whatever its classification.

## Authenticate with OAuth, not stored passwords

Use the platform's OAuth 2.0 support and store the refresh token as a secret. A stored
username and password is a credential that outlives the employee who typed it and cannot be
scoped.

## Choosing where background work runs

| Mechanism | Use it for | What happens on failure |
|---|---|---|
| Job Queue entry | recurring or retryable work a person should be able to see and restart | the entry shows the error; retried up to its maximum attempts; entries sharing a **category** never run at the same time |
| `TaskScheduler.CreateTask` | one-off work after the current transaction commits | runs the failure codeunit you name — name one, or the failure is invisible |
| `StartSession` | short, bounded work that must start now | nothing records it; the session just ends |
| Page background task | read-only values for a page | see `pages` |

**Job Queue is the default for anything that talks to another system**: it is the only one of
the four that leaves a record a person can find when it goes wrong. Use a category to serialise
work that must not overlap — two syncs of the same entity running at once is the usual cause of
duplicates.

Background work runs as the user who scheduled it, with that user's permissions and in that
company. A task that works for the developer who scheduled it and fails for the service user
who schedules it in production is a permissions defect — see `permissions`.

## Letting the outside world react

| Need | Mechanism |
|---|---|
| another system is told when an entity changes | webhook subscription on an API page |
| Power Automate or Dataverse reacts to a business moment | external business event |
| Dataverse users read Business Central data in place | virtual tables |
| Business Central reads Dataverse data | Dataverse integration tables and coupling |

An external business event is a published contract, like an API version: its name and payload
are frozen once someone has built a flow on it. It is declared with `[ExternalBusinessEvent]`,
belongs to an event **category** — an enum extension your app adds — and states the permissions
a subscriber needs. Design the category and the payload together; both are part of the
contract.

## There is no IP address to whitelist

Business Central online does not call out from a fixed IP address. A partner or customer who
asks for "Business Central's IP" to open a firewall is asking for something that does not
exist; the answer is Azure service tags or, better, authentication that does not depend on
where the call came from. Settle it at design time — discovering it at go-live stops the
project.

## Calling Azure Functions

The System Application has an Azure Functions module that handles the request and its
authentication. Use it rather than hand-building the `HttpClient` call; it is the supported
path, and it keeps the credential handling in one place.

## What does not belong in AL at all

The SaaS sandbox has no file system and no .NET interop, and a session has limits on time and
memory. Work that needs either — large file transformations, long-running computation,
libraries AL cannot call — belongs in an Azure component (a Function, a Logic App, a Service
Bus queue) that the extension calls and that calls back. The extension still owns the retry
and the visible failure record; moving the work out does not move the responsibility.
````

- [ ] **Step 5: Update the index text**

In `al-conventions/SKILL.md`:
- line 3 description: replace `testing, events, APIs, upgrade, permissions, pages and telemetry. An index of eleven themes` with `testing, events, APIs, integration, upgrade, permissions, pages and telemetry. An index of twelve themes`.
- replace `Eleven themes is a\nmenu, not a reading list` with `Twelve themes is a\nmenu, not a reading list` (keep the existing line break).

- [ ] **Step 6: Run lint to verify it passes**

Run: `node tests/lint.mjs`
Expected: `lint: PASS`. Also `wc -l plugins/bp-al/skills/al-conventions/SKILL.md` ≤ 60.

- [ ] **Step 7: Commit**

```bash
git add plugins/bp-al/skills/al-conventions
git commit -m "feat: add the integration theme — outbound HTTP, secrets, OAuth, background work" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Locking and read isolation in `performance.md`

**Files:**
- Modify: `plugins/bp-al/skills/al-conventions/references/performance.md` (append after the
  `## Prefer set-based operations` section, before `## Keep work out of per-row triggers`)

- [ ] **Step 1: Verify the facts**

| Claim | Page |
|---|---|
| `Record.ReadIsolation` values and per-instance scope | https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/methods-auto/record/record-readisolation-method |
| `DataAccessIntent = ReadOnly` on reports, queries, API pages → read replica | https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/properties/devenv-dataaccessintent-property |
| `ModifyAll`/`DeleteAll` run per row when `RunTrigger` is true or subscribers exist | https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/developer/methods-auto/record/record-modifyall-method |
| `Get` takes no update lock; `IsolationLevel::UpdLock` does | the `ReadIsolation` page above, and search Learn: "Business Central Get method locking" |
| Tri-state locking (online): default isolation of reads after a write in the same transaction | search Learn: "Business Central tri-state locking" |

- [ ] **Step 2: Insert the section** (amend what Step 1 did not confirm):

```markdown
## Locking and read isolation

A lock taken early is held until the transaction ends, and every user who needs the same rows
waits for all of it.

- **Do not call `LockTable` at the start of a routine** "to be safe". It serialises everyone
  behind you for the whole transaction. Take the lock on the rows you will change, just before
  you change them: `FindSet(true)` for a loop, or `ReadIsolation := IsolationLevel::UpdLock` on
  the record before a `Get`. **A plain `Get` takes no lock** — a `Get` followed by `Modify`
  relies on optimistic concurrency and fails with "another user has modified the record" under
  load.
- **Online, reads after a write are stricter by default.** Tri-state locking makes a read that
  follows a write in the same transaction take locks it would not take before the write. Code
  that reads widely after its first modify holds more than it appears to.
- **Set `ReadIsolation` on the record instance** when a read must see committed data only, or
  must lock what it reads for an update that follows. It applies to that variable alone, which
  is the point — one read's needs do not leak into the rest of the transaction.
- **`DataAccessIntent = ReadOnly`** on a report, query or API page that only reads lets it run
  against a read-only replica, off the primary database everyone is writing to. It is a
  property, not a code change, and a read-heavy report without it competes with posting.
- **`ModifyAll` and `DeleteAll` are set-based only when nothing needs to see each row.** With
  `RunTrigger` true, or with subscribers to the table's modify or delete events, the platform
  falls back to one row at a time — the loop you avoided, hidden inside one call.
```

- [ ] **Step 3: Run lint**

Run: `node tests/lint.mjs` — Expected: `lint: PASS`.

- [ ] **Step 4: Commit**

```bash
git add plugins/bp-al/skills/al-conventions/references/performance.md
git commit -m "feat: performance theme — locking, read isolation and read-replica intent" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Third-party notice

**Files:**
- Create: `plugins/bp-al/THIRD-PARTY-NOTICES.md`

**Interfaces:**
- Produces: the file lint check 9 requires once Task 5 mentions ALDC.

- [ ] **Step 1: Copy the upstream licence text exactly**

The upstream licence was cloned to the session scratchpad at
`aldc/LICENSE`. If that clone is gone, fetch
`https://raw.githubusercontent.com/DSC-Group-Srl/ALDC-AL-Development-Collection/main/LICENSE`.
Use its text verbatim in Step 2 — do not retype the licence from memory.

- [ ] **Step 2: Create the file** — the licence block below was copied from the upstream
  `LICENSE` on 2026-09-24; diff it against Step 1's source and use the source if they differ.

````markdown
# Third-party notices

## ALDC — AL Development Collection

Two files in this plugin are adapted from the ALDC AL Development Collection
(https://github.com/DSC-Group-Srl/ALDC-AL-Development-Collection):

| Adapted into | Upstream file |
|---|---|
| `skills/al-design/SKILL.md` and `skills/al-design/references/*` | `claude-plugin/agents/al-architect.md` |
| `skills/al-design/references/design-template.md` | `claude-plugin/docs/templates/architecture-template.md` |

The upstream licence follows in full.

```text
MIT License

Copyright (c) 2025 Javier Armesto González

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
````

- [ ] **Step 3: Run lint**

Run: `node tests/lint.mjs` — Expected: `lint: PASS` (check 9 is dormant until ALDC is mentioned,
and the file contains no 5–8 digit number).

- [ ] **Step 4: Commit**

```bash
git add plugins/bp-al/THIRD-PARTY-NOTICES.md
git commit -m "docs: third-party notice for ALDC (MIT)" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `al-design` reference files

**Files:**
- Create: `plugins/bp-al/skills/al-design/references/triage.md`
- Create: `plugins/bp-al/skills/al-design/references/decision-areas.md`
- Create: `plugins/bp-al/skills/al-design/references/symbols.md`
- Create: `plugins/bp-al/skills/al-design/references/design-template.md`

**Interfaces:**
- Consumes: theme names from `al-conventions` (`performance`, `correctness`,
  `extension-model`, `events`, `api`, `integration`, `upgrade`, `permissions`, `telemetry`).
- Produces: the four files named exactly as above; `SKILL.md` (Task 6) names all four;
  `go.md` (Task 7) names `triage.md`.

Note: until Task 6 creates `SKILL.md`, the skill does not exist and check 8 does not look at
these files. Task 6 is where check 8 goes red if a name is wrong.

- [ ] **Step 1: Create `triage.md`**

```markdown
# Triage — does this request need a design?

State the result in one line, naming the signal that decided it:
`TRIAGE  HIGH — document → posted document transfer (TransferFields field numbers)`.
The human confirms or overrides, in either direction, and their call stands.

## HIGH — any one of these

- **Posting.** Logic inside a posting routine's transaction — a subscriber on a posting
  codeunit — or a new ledger or entry table.
- **Document → posted document transfer.** A field added to a document that must survive into
  its posted or archived forms — posted shipment, invoice, credit memo, return receipt, and the
  **archive** tables. `TransferFields` matches fields by **number**, and the types must be
  compatible, so number and type must agree on every table in the chain; once shipped they
  cannot change. A table missed in the chain drops the value silently — the archive is the one
  usually missed. A value meant to reach the ledger travels by event through the journal line,
  not by `TransferFields`, and is part of the posting signal above.
- **A new document type, number series, or dimension handling.**
- **A property that cannot change after release** — `DataPerCompany` on a new table; an
  enum's `Extensible` (true → false breaks every extension of it).
- **Fields added to a high-volume base table** — G/L Entry, Item Ledger Entry, Value Entry and
  their like. Every read of that table, including the base application's own posting, pays the
  join to your companion table unless it limits its loaded fields.
- **A breaking or migrating change to stored data on an app that has shipped** — a field's type
  or length, a primary key, a removal or obsoletion, data moving between fields or tables,
  anything that needs upgrade code or `DataTransfer`. A purely additive field is **not** HIGH.
- **Public surface that cannot be taken back** — a new event publisher, API page, interface,
  or extensible enum, or a public procedure on a codeunit other apps are known to call — on an
  app whose profile `appsource.target` is `appsource`, or that another app depends on or reaches
  through `internalsVisibleTo`. When `appsource.target` is `null` and the app has dependents,
  treat it as `appsource`. An ordinary new public procedure on a codeunit nothing outside calls
  is **not** HIGH; if it were, every AppSource change would be.
- **Background execution or concurrency** — Job Queue, `TaskScheduler`, `StartSession`, or
  explicit locking. A page background task is read-only and is not a HIGH signal.
- **Integration outside Business Central** — any HTTP call, webhook, external business event,
  Dataverse, Power Automate or Azure component.
- **An app boundary** — a change spanning two apps, or adding a dependency between them.

## MEDIUM

No HIGH signal, but the change spans more than one functional area (sales and warehouse, not
a table extension and its page extension), **or it touches any `hotspots` glob in the
profile** — a hotspot is at least MEDIUM, never LOW.

## LOW

One area, cause known, no hotspot.

## What each result does

| Result | Next |
|---|---|
| HIGH | Stage 0 — design (`bp-al:al-design`) |
| MEDIUM | Stage 1 — spec. The decisions go in the spec's `OPEN` and are settled at its gate. |
| LOW | Stage 1 — spec |

If a HIGH request produces fewer than three genuine decisions once designed, it was MEDIUM:
the design stage says so and hands to the spec. Triage is a first guess, and the minimum is
the check on it.
```

- [ ] **Step 2: Create `decision-areas.md`**

```markdown
# Decision areas

Work through only the areas the design actually touches. For each, read the `al-conventions`
theme named in its heading line — that theme is where the reasons live — then present the
options, the trade-offs and a recommendation.

**One theme per touched area is this stage's allowance** — an explicit, bounded exception to
the `al-conventions` index's "one or two". A design that needs more than four themes should be
split into sub-specs, not read in full.

Every platform fact below depends on the runtime and BC version. Check it against the
`runtime` and `application` read from `app.json` before recommending it. If a Microsoft Learn
MCP server is configured (see `/bp-al:mcp`), cite the page a version-sensitive recommendation
rests on; if not, mark the recommendation *version not checked* rather than asserting it.

## Data model — `extension-model`, `performance`

Decide: new table or table extension; keys for the filters the feature will actually run;
FlowField or stored value (FlowFields that reference each other circularly do not compile);
relations; `DataPerCompany` on a new table.

- **Document chains.** For a field that must survive posting or archiving, list every table in
  the chain — document, posted shipment, invoice, credit memo, return receipt, archive — and fix
  one field number and a compatible type for all of them here, together. `TransferFields`
  copies by number.
- **High-volume base tables.** A table extension on G/L Entry, Item Ledger Entry or Value Entry
  adds a join to every read of that table that does not limit its fields, Microsoft's own
  included. Prefer a separate table keyed to the entry when the data is not needed on every
  read.

Expensive to reverse because a shipped field's number and type, and a table's
`DataPerCompany`, are permanent.

## Transactions and locking — `performance`, `correctness`

Decide: where the commit boundary sits; what runs inside the posting transaction and what is
deferred until after it; which reads need `ReadIsolation`.

Expensive to reverse because callers come to depend on what one transaction guarantees.

## Background execution — `integration`, `telemetry`

Decide: Job Queue, `TaskScheduler`, `StartSession` or page background task; how a failure
becomes visible; which user and company it runs as.

## Events and extensibility — `events`

Decide: which base events to subscribe to — each verified per `references/symbols.md`, never
assumed; which events this app publishes, and **whether each is isolated** (a subscriber then
cannot break the publisher, but cannot veto it either); interface + enum for one-of-N
behaviour. Treat `IsHandled` as a last resort: two subscribers that both set it silently
override each other.

Expensive to reverse because a published event's signature is frozen.

## App placement (product tier) — `extension-model`

Decide: which app owns each new object — the layer that owns the concept, not the layer that
first needed it — keeping the dependency graph acyclic.

## Public vs internal surface — `upgrade`, `api`

Decide: `Access = Internal` by default; what is public and why; `internalsVisibleTo` for the
test app. Public surface that has shipped can be obsoleted, never removed.

## Setup and toggles — `correctness`

Decide: a setup table or a Feature Management key; per company or global.

## Integration, inbound — `api`

Decide: a standard API or a custom API page (publisher, group, version); what is read-only;
webhooks. Standard API pages cannot be extended, so an extra field means a custom API.

## Integration, outbound — `integration`

Decide: when the call happens relative to the transaction; timeout; retry and idempotency;
external business events; Dataverse; Power Automate.

## Microsoft ecosystem boundary — `integration`

Decide: what does not belong in AL — work the SaaS sandbox forbids or that does not fit a
session — and which Azure component takes it.

## Secrets and authentication — `integration`

Decide: where each credential is stored and in what scope; OAuth flow; whether a publisher
secret belongs in `keyVaultUrls`.

## Security — `permissions`

Decide: the permission-set layering; direct versus indirect grants; data classification of
every new field.

## Upgrade and deployment — `upgrade`

Decide: upgrade codeunits and tags; `DataTransfer` for bulk moves; the two-version obsolete
path; idempotency on retry.

## Telemetry — `telemetry`

Decide: which feature-usage and error signals to emit, their event IDs and dimensions.

## Work decomposition

Decide: which parts can be specified and built independently — the data model first, then
disjoint sets of files — and whether one spec would be too large.
```

- [ ] **Step 3: Create `symbols.md`** (the header read, the POSIX extraction, the PowerShell
  extraction and both parse scripts below were each run against a real Base Application
  package on 2026-09-24; the Node and Python scripts both returned
  `Codeunits · Sales-Post · OnAfterPostSalesDoc · IntegrationEvent(False, False)` and found the
  `Obsolete(…, 27.0)` attribute on a withdrawn method):

````markdown
# Verifying a base or dependency symbol

A design built on an event that does not exist, or that Microsoft is withdrawing, is the most
expensive mistake this stage can make — it survives until the spec is implemented and the
build fails, or until the next major version removes it. So every event, procedure or object
the design relies on is looked up, and the lookup is recorded.

## Order

1. **Source on disk** — the repository, then every `dependencies[].sourcePath` in the profile.
2. **Symbol packages** — look, in order, in: `.alpackages/` beside each `app.json`; each
   `al.packageCachePath` entry in `.vscode/settings.json`; the `baselinePackageCachePath` in
   `AppSourceCop.json`. Read these paths; never assume them. AL-Go and container-based
   repositories often have none on disk, because symbols are fetched at build time — then go
   to step 4 and say so.
3. **Record** each item: found or not, where, and which package version.
4. **Neither available** → `UNVERIFIED`, listed in the design with the decision it undermines.
   Mention `/bp-al:mcp` once as a way to resolve base symbols that are not on disk.

## Which package

Packages are named `<Publisher>_<Name>_<version>.app` — the Base Application is
`Microsoft_Base Application_<version>.app`; a dependency uses its own publisher and name.

There are usually several versions side by side. Check **existence** against the lowest
version that satisfies the app's floor — `application` in `app.json` for Microsoft's apps, the
dependency's `version` for others — because that is the version the app promises to run on.
Check **obsolescence** against the highest version present, because that is where a withdrawal
shows first. Say which versions you used.

**A Base Application package is one country version.** `.alpackages` holds W1 or a single
localisation, and the file name does not say which. An event verified there may be absent from
another country's base application. When `appsource.target` is `appsource`, report the result
as *verified for one localisation* — Microsoft validates the app against every country it is
offered in.

## Reading a package

An `.app` is a `NAVX` header followed by a zip archive. The header length is the unsigned
32-bit integer at byte offset 4 (40 in every package seen so far — read it, do not assume it);
the zip starts there. `SymbolReference.json` is a plain entry in that zip.

Extract that one entry to a temporary directory **outside the repository** — the scratchpad,
or the system temp directory — never beside the code.

**Any system with `od`, `tail` and `unzip`** (Git Bash on Windows, macOS, Linux):

```bash
APP='<path to the .app>'
OUT="${TMPDIR:-${TEMP:-/tmp}}/bp-al-symbols"; mkdir -p "$OUT"
HDR=$(od -An -tu4 -j4 -N4 "$APP" | tr -d ' ')
tail -c +$((HDR + 1)) "$APP" > "$OUT/pkg.zip"
unzip -p "$OUT/pkg.zip" SymbolReference.json > "$OUT/SymbolReference.json"
rm "$OUT/pkg.zip"
echo "$OUT/SymbolReference.json"
```

**Windows without those tools** — PowerShell:

```powershell
$app = '<path to the .app>'
$out = Join-Path ([System.IO.Path]::GetTempPath()) 'bp-al-symbols'
New-Item -ItemType Directory -Force $out | Out-Null
Add-Type -AssemblyName System.IO.Compression
$fs = [System.IO.File]::OpenRead($app)
$hdr = New-Object byte[] 8; [void]$fs.Read($hdr, 0, 8)
$fs.Position = [BitConverter]::ToUInt32($hdr, 4)
$zipBytes = New-Object System.IO.MemoryStream; $fs.CopyTo($zipBytes); $fs.Close()
$zipBytes.Position = 0
$zip = New-Object System.IO.Compression.ZipArchive($zipBytes)
$entry = $zip.GetEntry('SymbolReference.json')
$target = Join-Path $out ((Split-Path $app -Leaf) + '.SymbolReference.json')
$s = $entry.Open(); $f = [System.IO.File]::Create($target); $s.CopyTo($f); $f.Close(); $s.Close()
$target
```

## Finding a symbol — parse, do not grep

The file is one line of JSON, tens of megabytes long, and it begins with a byte-order mark.
**Never print it.** And do not confirm an event by reading text around a match: an object's own
name comes *after* its whole method list, so for a large codeunit the owner is hundreds of
thousands of characters from the event — and the same event name can exist on several objects.
Parse it, and walk `Namespaces` → object lists → `Methods`.

Write this to the temporary directory and run it with Node (`node find.js <json> <Name>`):

```js
const [file, name] = process.argv.slice(2);
const d = JSON.parse(require("fs").readFileSync(file, "utf8").replace(/^﻿/, ""));
const kinds = ["Tables", "Codeunits", "Pages", "Reports", "Queries", "XmlPorts"];
const args = (a) => a.Name + "(" + (a.Arguments || []).map((x) => x.Value).join(", ") + ")";
(function walk(n) {
  for (const k of kinds)
    for (const o of n[k] || [])
      for (const m of o.Methods || [])
        if (m.Name === name) {
          const objObsolete = (o.Properties || []).filter((p) => /^Obsolete/.test(p.Name))
            .map((p) => p.Name + "=" + p.Value);
          console.log([k, o.Name, m.Name, (m.Attributes || []).map(args).join(" "),
            objObsolete.join(" ") || "-"].join("\t"));
        }
  for (const c of n.Namespaces || []) walk(c);
})(d);
```

or, without Node, with Python (`python find.py <json> <Name>`):

```python
import json, re, sys
path, name = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8-sig") as f:
    root = json.load(f)
KINDS = ["Tables", "Codeunits", "Pages", "Reports", "Queries", "XmlPorts"]
def args(a):
    return a["Name"] + "(" + ", ".join(str(x.get("Value")) for x in a.get("Arguments", [])) + ")"
def walk(n):
    for k in KINDS:
        for o in n.get(k, []):
            for m in o.get("Methods", []):
                if m.get("Name") == name:
                    obs = [p["Name"] + "=" + str(p["Value"]) for p in o.get("Properties", [])
                           if re.match(r"Obsolete", p["Name"])]
                    print("\t".join([k, o["Name"], m["Name"],
                                     " ".join(args(a) for a in m.get("Attributes", [])),
                                     " ".join(obs) or "-"]))
    for c in n.get("Namespaces", []):
        walk(c)
walk(root)
```

Each output line is: object kind · **owning object** · method · its attributes · the object's
obsolete properties. No output means not found.

Reading the result:

- **An event** has `IntegrationEvent(…)`, `BusinessEvent(…)` or `InternalEvent(…)` among its
  attributes. More than one line means the name exists on several objects — use the one the
  design means, and say which.
- **An obsolete method** has `Obsolete(<reason>, <tag>)` among its attributes.
- **An obsolete object** shows `ObsoleteState=Pending` (with reason and tag) in the last column.
- **Not found in the floor version** means it cannot be used, whatever a later version has.

**An `Obsolete` attribute or `ObsoleteState=Pending` is a finding** — present it as a decision
with alternatives, never as a pass.

**Neither Node nor Python available:** search the text for `"Name":"<Name>"` to establish that
the name exists at all, and record the result as *found, owner unconfirmed*. That is weaker
than verified, and the design says so.

Delete the extracted files when the design is done.
````

- [ ] **Step 4: Create `design-template.md`**

````markdown
<!-- Adapted from ALDC's architecture-template.md (MIT) — see THIRD-PARTY-NOTICES.md at the
     plugin root. Copy this shape; do not edit this file. -->

# Design: {feature}

**Date:** YYYY-MM-DD · **Complexity:** HIGH · **Status:** Proposed | Approved | Superseded
**Supersedes:** {previous design file, or none} · **Triage signal:** {the HIGH signal}
**Target:** application {x} · runtime {y} · target {Cloud | OnPrem} — read from `app.json`
**Themes applied:** {the `al-conventions` themes actually read, or none}

This document holds decisions, risks, diagrams and constraints only. Objects, IDs, fields,
procedure signatures, events to implement, permissions and tests belong to the spec.

## 1. Summary and success criteria

{Two or three sentences: what the feature is, what it solves, the approach.}

| ID | Criterion | Observable |
|---|---|---|
| SC-1 | {outcome the business expects} | {how it will be seen} |

## 2. Solution architecture

{The chosen shape and why. Up to three diagrams, each only where prose cannot do it:
`erDiagram` for table relationships, `flowchart` for posting and integration flows.}

## 3. Integration boundaries

{External systems, direction, timing, failure and retry, authentication. Base-app areas named
at the level of "sales posting", not event signatures — the spec records those.}

## 4. Quality constraints

{Security model, performance and locking, upgrade and rollback.}

## 5. Technical decisions

### TD-1: {title}

- **Problem:** {what had to be decided}
- **Decision:** {the choice}
- **Alternatives rejected:** {each, with why}
- **Rationale:** {why this is right here}

## 6. Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|

## 7. Spec decomposition

{Omit when one spec suffices. Otherwise one row per sub-spec, in build order.}

| Sub-spec | Scope | Depends on |
|---|---|---|

## Hotspots hit

{each `hotspots` glob the change will touch | none}

## Symbols verified

| Symbol | Found in | Floor version | Highest version | Obsolete? |
|---|---|---|---|---|

## UNVERIFIED

{each symbol or fact that could not be confirmed, and the decision it undermines | none}

## Proposed authority entries

{Decisions that outlive this feature, each as one line with the authority document it belongs
in. For the human to paste; this stage never edits those documents. | none}

---

Rules: no AL code; no object or ID tables; no procedure signatures; no phase or test lists.
Fewer than three genuine technical decisions, or three genuine risks, means the request was
not HIGH — re-triage, never pad.
````

- [ ] **Step 5: Run lint**

Run: `node tests/lint.mjs` — Expected: `lint: PASS` (no SKILL.md yet, so check 8 does not see
the directory; check 9 now sees "ALDC" in `design-template.md` and finds the notice from Task 4).
Also confirm purity: `grep -rEn '\b[0-9]{5,8}\b' plugins/bp-al/skills/al-design` prints nothing.

- [ ] **Step 6: Commit**

```bash
git add plugins/bp-al/skills/al-design/references
git commit -m "feat: al-design reference files — triage, decision areas, symbols, template" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `al-design/SKILL.md`

**Files:**
- Create: `plugins/bp-al/skills/al-design/SKILL.md`

**Interfaces:**
- Consumes: the four reference files (Task 5).
- Produces: skill `bp-al:al-design`, loaded by `commands/design.md` and `commands/go.md`
  (Task 7). Output: a design in the template's shape; on product tier the file
  `<specs.dir>/<slug>.design.md`.

- [ ] **Step 1: Create the file**

```markdown
---
name: al-design
description: Stage 0 of the bp-al pipeline — for a HIGH-complexity Business Central request, present each expensive-to-reverse decision with options, trade-offs and a recommendation, verify every base symbol it relies on, and hand an approved design to al-spec. Used by /bp-al:design and, after triage, by /bp-al:go.
version: 0.1.0
allowed-tools: Read, Glob, Grep, Bash, Write, AskUserQuestion
---

# Stage 0 — design

You make the decisions that are expensive to reverse, and record them so the spec is built on
them. **No code, no object IDs, no signatures, no test plan** — those are the spec's.

## 1. Triage

Apply `references/triage.md` and state the result in one line. The human confirms or
overrides. **When `/bp-al:go` has already stated and confirmed triage, do not repeat it** —
start at section 2.

- Invoked on a LOW or MEDIUM request: say so, recommend `/bp-al:spec`, and continue only if
  the human insists.
- **`customisation` tier and HIGH:** say once that an inline design ends with the
  conversation, and recommend re-running with `--deep` so it is written to a file. Their call.

## 2. In

- The request.
- `.claude/bp-al.json`. If absent, run `bp-al:al-profile` first.
- **Only the authority documents covering the area touched** — chosen from the profile's
  `authority` list by what the request names, never read wholesale.
- For every app the request touches, from its `app.json`: `target`, `application`,
  `platform`, `runtime`, `dependencies`, `internalsVisibleTo`. **Read these; never ask for
  them.** Facts are this stage's job; decisions are the human's.

## 3. Locate before you design

Grep the repository and every `dependencies[].sourcePath` for what already exists — built,
half-built, commented out, or present and never called. A design for something that exists is
the most expensive kind to discover late.

Verify every base or dependency **event, procedure and object** the design relies on, per
`references/symbols.md` — by structured parse, naming the owning object and the package
version checked. Record hotspots hit.

## 4. Clarify

Ask only where the answer changes a decision **and** the repository cannot answer it: business
rules, volumes, integration direction and timing, compliance. One question at a time.

## 5. Decide

Work through `references/decision-areas.md`, **only the areas the design touches**. For each,
read the `al-conventions` theme it names, then present options, trade-offs and a
recommendation. One theme per touched area is allowed here; more than four themes means the
work should be decomposed instead.

The project's authority wins over the baseline. When a recommendation follows the project
against the baseline, say that the project overrode it.

**Fewer than three genuine decisions means the request was not HIGH.** Say so, and hand to
`/bp-al:spec` with the decisions made so far as `OPEN` entries. Never pad to three.

## 6. Out

Write the design in the shape of `references/design-template.md`.

| Situation | Where it goes |
|---|---|
| `product` tier, `specs.mode` = `file`, `specs.dir` exists | `<specs.dir>/<slug>.design.md` — **only after approval** |
| `customisation` tier, or `specs.mode` = `inline` | inline in the conversation; no file |
| `specs.dir` set but the directory no longer exists | inline; say so; **never create it** |

Decisions that outlive this feature go under **Proposed authority entries**, naming the
document from the profile's `authority` list. The human pastes them. **This stage never edits
an authority document.**

## 7. Naming and superseding

`<slug>` is the request reduced to lower-case kebab-case, at most five words, confirmed with
the human at the gate.

An approved design is never edited. Superseding writes `<slug>.design.v2.md` (then v3, …),
whose header names the design it supersedes, and changes the old file's Status to
`Superseded` — the one edit this stage makes to an existing file, and only to one it created.
If a file for the slug already exists, show what differs and ask; never overwrite it silently.

## 8. Gate

One approval stop. Present the decisions, risks and diagrams, and wait. Do not proceed on
silence or on approval of something else. On approval, set Status `Approved` and write the
file (product tier).

## 9. Stop and pause

- **Stop** when the request is implementation rather than design, when critical information is
  missing, or when requirements conflict — summarise where things stand. No design is written.
- **Pause** for each decision the human must own.
- **Continue** without asking while exploring, locating and verifying.

## 10. Hand-off

Recommend `/bp-al:spec` with the design's **path** — once per sub-spec, in order, if the
design decomposed the work. Outside `/bp-al:go`, never continue into the spec yourself.

---

Adapted from ALDC's `al-architect` under the MIT licence — see `THIRD-PARTY-NOTICES.md` at the
plugin root.
```

- [ ] **Step 2: Run lint**

Run: `node tests/lint.mjs`
Expected: FAIL — check 2: `"al-design" is referenced by nothing — no command or skill can reach it`.
(Correct: nothing loads the skill until Task 7.) Check 8 must **not** report anything — if it
does, a reference name in `SKILL.md` is misspelled; fix it.

- [ ] **Step 3: Check the budget**

Run: `wc -l plugins/bp-al/skills/al-design/SKILL.md` — Expected: ≤ 150.

- [ ] **Step 4: Do not commit yet** — Task 7 makes the lint green; commit both together there.

---

### Task 7: `/bp-al:design` and the triage step in `/bp-al:go`

**Files:**
- Create: `plugins/bp-al/commands/design.md`
- Modify: `plugins/bp-al/commands/go.md` (frontmatter `argument-hint`; steps 2–3)

**Interfaces:**
- Consumes: `bp-al:al-design` (Task 6), `skills/al-design/references/triage.md` (Task 5).

- [ ] **Step 1: Create `commands/design.md`**

```markdown
---
description: Stage 0 — design a HIGH-complexity change before any spec is written
argument-hint: "<what you want built or changed> [--deep]"
allowed-tools: Skill, Read, Glob, Grep, Bash, Write, AskUserQuestion
---

Load the `bp-al:al-design` skill with the Skill tool and follow it exactly.

The request: `$ARGUMENTS`

If the request is empty, ask for it rather than inventing one.

Read `.claude/bp-al.json` first. If it is absent, run the `bp-al:al-profile` skill first — a
design that names apps, dependencies and hotspots cannot be made without the profile.

What this command may write, and nothing else:

- On the `product` tier (or with `--deep`), **one file**, `<specs.dir>/<slug>.design.md`, into
  a directory that already exists, and only after you approve the design.
- Symbol lookups extract into a temporary directory **outside the repository**, deleted
  afterwards.

It never edits an authority document. Decisions that belong in one are proposed for you to
paste.
```

- [ ] **Step 2: Modify `commands/go.md`**

Replace the `argument-hint` line with:

```
argument-hint: "<what you want built or changed> [--quick|--deep]"
```

(unchanged value — confirm it is still this.) Then replace steps 2–3:

```markdown
2. Determine the run tier: the profile's `tier`, unless `--quick` (force `customisation`) or
   `--deep` (force `product`) appears in the arguments. State which tier you are running and
   why in one line.
3. **Stage 1** — load `bp-al:al-spec` and produce the contract. **Gate: stop and get human
   approval.** Do not proceed on silence or on an implied yes.
```

with:

```markdown
2. Determine the run tier: the profile's `tier`, unless `--quick` (force `customisation`) or
   `--deep` (force `product`) appears in the arguments. State which tier you are running and
   why in one line.
3. **Triage** — unless `--quick` was given, read `skills/al-design/references/triage.md` (that
   file only, not the skill) and state the result in one line. The human may override it.
   - **HIGH** → **Stage 0**: load `bp-al:al-design` and produce the design — triage is
     already confirmed, so the skill does not repeat it. **Gate: stop and get human
     approval.** Then carry the approved design into Stage 1: its path on the `product` tier,
     or the inline design on `customisation`.
   - **LOW / MEDIUM** → straight to Stage 1.
4. **Stage 1** — load `bp-al:al-spec` and produce the contract, bound by the approved design
   if there is one. **Gate: stop and get human approval.** Do not proceed on silence or on an
   implied yes.
```

and renumber the old steps 4 and 5 to 5 and 6. Change the first line of the body from
`Sequence the three stages.` to `Sequence the stages.`

- [ ] **Step 3: Run lint**

Run: `node tests/lint.mjs`
Expected: `lint: PASS`. Check `wc -l plugins/bp-al/commands/go.md plugins/bp-al/commands/design.md` — each ≤ 40.

- [ ] **Step 4: Commit Tasks 6 and 7 together**

```bash
git add plugins/bp-al/skills/al-design/SKILL.md plugins/bp-al/commands/design.md plugins/bp-al/commands/go.md
git commit -m "feat: al-design skill, /bp-al:design, and triage in /bp-al:go" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: `al-spec` is bound by an approved design

**Files:**
- Modify: `plugins/bp-al/skills/al-spec/SKILL.md` (the `## In` section, after
  `If the profile is absent, run \`bp-al:al-profile\` first.`)

- [ ] **Step 1: Insert**

```markdown
### An approved design binds this spec

If an approved design exists for this request — its path given to you, or approved earlier in
this conversation — read it before anything else. A design whose Status is `Proposed` or
`Superseded` is a draft and binds nothing.

- The spec **must not contradict any `TD-n`**. OBJECTS and CRITERIA cite the decision they
  implement: `per TD-2`.
- If the spec needs to depart from a decision, stop and put the conflict in `OPEN`. The human
  either supersedes the design with `/bp-al:design` or changes the spec. You do not choose.
- The design's `UNVERIFIED` entries carry into `OPEN` unless you resolved them here.
```

- [ ] **Step 2: Run lint and budget**

Run: `node tests/lint.mjs` → `lint: PASS`; `wc -l plugins/bp-al/skills/al-spec/SKILL.md` ≤ 150.

- [ ] **Step 3: Commit**

```bash
git add plugins/bp-al/skills/al-spec/SKILL.md
git commit -m "feat: al-spec honours and cites an approved design" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Documentation

**Files:**
- Modify: `docs/DESIGN.md` (§1 line 13, §4 guarantee 4, §5 table, §7 counts, §9, §11, §13)
- Modify: `README.md` (opening line, guarantee 4, commands table, "eleven reference files",
  licence section)
- Modify: `docs/PROFILE.md` (`specs.dir` row; tier table "Files written")

- [ ] **Step 1: `docs/DESIGN.md`**

- §1, line 13: `repeatable \`spec → implement → review\` pipeline` → `repeatable
  \`spec → implement → review\` pipeline, with an optional design stage in front of it for
  changes that carry expensive-to-reverse decisions,`.
- §4 guarantee 4: `Spec documents are written only where the profile already points, and only
  on the \`product\` tier.` → `Spec and design documents are written only where the profile
  already points, and only on the \`product\` tier.`
- §5 table, first row after the header, insert:
  `| \`/bp-al:design <request>\` | Stage 0 — for a HIGH-complexity request, the decisions that are expensive to reverse, with options and a recommendation. Optional; \`go\` runs it only when triage says HIGH. |`
- §5 paragraph `\`go\` only sequences the first three.` → `\`go\` only sequences the stages
  and triages whether Stage 0 runs.`
- §7: `held as eleven reference files` → `held as twelve reference files`; after the line
  listing `testing · events · api · upgrade · permissions · pages · telemetry`, change it to
  `testing · events · api · integration · upgrade · permissions · pages · telemetry`, and change
  `The other seven were added afterwards, and every one covers a class of defect that ships
  green:` → `The other eight were added afterwards, and every one covers a class of defect that
  ships green:`. The sentence then lists one defect per theme; insert, after `an API field
  renamed by a cosmetic edit,`, the clause `an outbound call made inside a posting transaction,`
  so `integration` has its own example and the count matches the list.
- §9: before `### Stage 1 — spec`, insert:

```markdown
### Stage 0 — design (optional)

**When:** triage — `skills/al-design/references/triage.md` — says HIGH, or the human asks.
HIGH means a BC-specific irreversibility signal: posting, document → posted document field
transfer, a breaking or migrating change to shipped data, public surface, background
execution, an external integration, or an app boundary.

**In:** the request, the profile, the authority documents covering the area, and each touched
app's `app.json` target and version fields.

**Must:** verify every base or dependency symbol the design relies on — source, then symbol
packages at the version the app targets — or report it `UNVERIFIED`; present options, trade-offs
and a recommendation for each genuine decision; treat fewer than three genuine decisions as a
mis-triage.

**Out:** a design in the template's shape — decisions, risks, diagrams, constraints, verified
symbols, and proposed authority entries for the human to paste. Never object IDs, signatures or
tests.

**Gate:** human approval. An approved design binds Stage 1.
```

- §11 layout: in the `commands/` line add `design`; in the `skills/` block add
  `│     ├─ al-design/     Stage 0 — triage, decision areas, symbols, template` above
  `al-spec/`; in the references list add `integration.md`; add
  `│  ├─ THIRD-PARTY-NOTICES.md` under `plugins/bp-al/`.
- §13 table, append rows:

```markdown
| Design stage | optional Stage 0, triaged | Expensive decisions get presented as choices; small changes pay one line. |
| Design form | a main-context skill, no agent | Design pauses for the human's trade-offs, which a subagent cannot do mid-run. |
| Design binding | the spec only | Review already checks the spec; no new policy category. |
| Symbol verification | source, then symbol packages at the targeted version | Base Application source is rarely on disk; its symbols usually are. |
| Adapted content | full MIT notice in THIRD-PARTY-NOTICES.md | A credit line is not the notice MIT requires. |
```

- [ ] **Step 2: `README.md`**

- Line 5: `` `spec → implement → review`, command-driven`` → `` `spec → implement → review` — with an optional design stage in front for the changes that need one — command-driven``.
- Guarantee 4: `Spec documents are written` → `Spec and design documents are written`.
- Commands table, insert after the header row:
  `| \`/bp-al:design <request>\` | Stage 0 — design a HIGH-complexity change before any spec. \`go\` runs it only when triage says HIGH. |`
- `the quality baseline is eleven reference files` → `the quality baseline is twelve reference files`.
- Licence section: after the existing `MIT. See …LICENSE…` line, add one sentence saying the
  design stage is adapted from ALDC's `al-architect` (MIT), as a markdown link whose text is
  `THIRD-PARTY-NOTICES.md` and whose target is `plugins/bp-al/THIRD-PARTY-NOTICES.md`
  (relative to the README, which sits at the repository root).

- [ ] **Step 3: `docs/PROFILE.md`**

- `specs.dir` row meaning: append ` Design documents from \`/bp-al:design\` go here too.`
- Tier table, "Files written" row: `the code, plus the spec` → `the code, plus the spec and any design`.

- [ ] **Step 4: Run lint** (check 4 verifies the new README link resolves)

Run: `node tests/lint.mjs` — Expected: `lint: PASS`.

- [ ] **Step 5: Commit**

```bash
git add docs/DESIGN.md README.md docs/PROFILE.md
git commit -m "docs: Stage 0 design, the integration theme, and the ALDC notice" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Behavioural tests 6–8 and final verification

**Files:**
- Modify: `tests/BEHAVIOURAL.md` (append after Test 5)

- [ ] **Step 1: Append the tests**

````markdown
## Test 6 — the design footprint

On `multi-app-product` (`product` tier, `specs.dir: docs/specs`), after `/bp-al:scan`:

1. Run `/bp-al:design add a field to sales orders that flows to posted sales invoices and is
   sent to an external service on posting`.
2. Triage must say **HIGH** and name a signal (document → posted document transfer, or
   external integration). Approve the design and the slug.
3. `git status --porcelain` must show `.claude/` and exactly one new file,
   `docs/specs/<slug>.design.md`, and nothing else. The file has `**Status:** Approved`, at
   least three `### TD-` headings, and no 5–8 digit number. No `SymbolReference.json` anywhere
   in the tree.
4. Run the same command again with the same slug. It must **not** overwrite the file: it shows
   what differs and asks, or offers `<slug>.design.v2.md`.
5. Variant: delete `docs/specs` and repeat. The design must come back **inline**, with a line
   saying the directory no longer exists; `docs/specs` must **not** be recreated.

On `tiny-pte` (`customisation`), the same request: inline design, `--deep` recommended exactly
once, `git status --porcelain` shows only `.claude/`.

## Test 7 — triage routes

On `tiny-pte`, via `/bp-al:go`, stopping at the first gate each time:

1. `add a description field to the bin helper` → **LOW**, no design stage.
2. Add `"**/src/**"` to `hotspots` in `.claude/bp-al.json` by hand, then repeat case 1 →
   **MEDIUM** (hotspot), no design stage.
3. `add the same field to sales orders and posted sales invoices` → **HIGH**, naming the
   `TransferFields` signal; the design gate appears before any spec.
4. Run `/bp-al:design` with a request triaged HIGH on a weak signal, answer so that only one
   decision is genuine → the stage must say it was not HIGH and hand to `/bp-al:spec`, with no
   padded TD entries.

## Test 8 — symbol verification picks the right package

Needs a session on a machine with real symbol packages. In a scratch copy of
`multi-app-product` **outside this repository** (as in Setup), create `app/.alpackages/` and
copy in **two** Base Application packages of different versions whose majors are at or above
the app's `application` floor.

1. Run `/bp-al:design` with a request that subscribes to a sales-posting event that exists in
   both.
2. The design's **Symbols verified** table must name the event, **its owning codeunit** (from a
   structured parse, not a text match), the **lower** package as the floor version checked and
   the **higher** as the obsolescence check. If neither Node nor Python is installed, the entry
   must read *found, owner unconfirmed* instead.
3. Repeat with a request that relies on a method carrying an `Obsolete` attribute in the higher
   package → it must appear as a decision with alternatives, not a pass.
4. Remove `.alpackages/` and repeat step 1 → the event is listed under `UNVERIFIED`, with the
   reason and a single mention of `/bp-al:mcp`.
5. `git status --porcelain` shows no extracted file inside the repository at any point.
````

- [ ] **Step 2: Final structural verification**

```bash
node tests/lint.mjs
wc -l plugins/bp-al/skills/*/SKILL.md plugins/bp-al/commands/*.md
grep -rEn '\b[0-9]{5,8}\b' plugins/ || echo "purity ok"
git status --porcelain
```

Expected: `lint: PASS`; every SKILL.md ≤ 150 (al-conventions ≤ 60); every command ≤ 40;
`purity ok`; clean tree apart from `tests/BEHAVIOURAL.md`.

- [ ] **Step 3: Commit**

```bash
git add tests/BEHAVIOURAL.md
git commit -m "test: behavioural tests for the design stage — footprint, triage, symbols" -m "Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 4: Report** — the behavioural tests need a live session with the plugin installed
  and are **not** run by this plan; say so plainly in the hand-off rather than implying they
  passed.
