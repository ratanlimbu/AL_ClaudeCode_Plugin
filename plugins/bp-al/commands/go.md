---
description: Run spec, implement and review end to end, with a human gate between each stage
argument-hint: "<what you want built or changed> [--quick|--deep]"
allowed-tools: Skill, Read, Glob, Grep, Bash, Write, Edit, Agent, Task, AskUserQuestion
---

Sequence the stages. All behaviour lives in the stage skills; this command only orders
them and holds the gates, so the chained and standalone paths cannot drift apart.

The request: `$ARGUMENTS`

1. Read `.claude/bp-al.json`. If it is absent, run the `bp-al:al-profile` skill first and
   show the profile before going on.
2. Determine the run tier: the profile's `tier`, unless `--quick` (force `customisation`) or
   `--deep` (force `product`) appears in the arguments. State which tier you are running and
   why in one line.
3. **Triage** — unless `--quick` was given, load `bp-al:al-design` and run its section 1 only.
   It states the result in one line and **waits for the human to confirm or override it**.
   - **HIGH** → **Stage 0**: continue in the skill from section 2. **Gate: stop and get human
     approval of the design.** Then carry it into Stage 1: its path on the `product` tier, or
     the inline design on `customisation`.
   - **Stage 0 finds fewer than three genuine decisions** → it was MEDIUM: no design to
     approve; carry its decisions into Stage 1 as `OPEN` entries.
   - **LOW / MEDIUM** → straight to Stage 1.
4. **Stage 1** — load `bp-al:al-spec` and produce the contract, bound by the approved design
   or carrying Stage 0's `OPEN` entries, if either exists. **Gate: stop and get human
   approval.** Do not proceed on silence or on an implied yes.
5. **Stage 2** — load `bp-al:al-implement`. **Gate: stop and get human approval** of the
   diff, the build result and the warning delta.
6. **Stage 3** — load `bp-al:al-review`. Report the verdict.

Every gate is a real stop. If a stage reports `BLOCKED` or `UNVERIFIED`, say which at the gate
rather than carrying it forward silently — the next stage inherits it either way, and only the
human can decide whether it matters. Advisory findings are reported at the gate too; they do
not stop the run, and they are never left out of the report because they did not.
