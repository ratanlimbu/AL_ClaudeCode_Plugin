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
