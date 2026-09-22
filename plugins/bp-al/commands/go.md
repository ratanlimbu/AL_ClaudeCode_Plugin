---
description: Run spec, implement and review end to end, with a human gate between each stage
argument-hint: "<what you want built or changed> [--quick|--deep]"
allowed-tools: Skill, Read, Glob, Grep, Bash, Write, Edit, Agent, Task, AskUserQuestion
---

Sequence the three stages. All behaviour lives in the stage skills; this command only orders
them and holds the gates, so the chained and standalone paths cannot drift apart.

The request: `$ARGUMENTS`

1. Read `.claude/bp-al.json`. If it is absent, run the `bp-al:al-profile` skill first and
   show the profile before going on.
2. Determine the run tier: the profile's `tier`, unless `--quick` (force `customisation`) or
   `--deep` (force `product`) appears in the arguments. State which tier you are running and
   why in one line.
3. **Stage 1** — load `bp-al:al-spec` and produce the contract. **Gate: stop and get human
   approval.** Do not proceed on silence or on an implied yes.
4. **Stage 2** — load `bp-al:al-implement`. **Gate: stop and get human approval** of the
   diff, the build result and the warning delta.
5. **Stage 3** — load `bp-al:al-review`. Report the verdict.

Every gate is a real stop. If a stage reports `BLOCKED` or `UNVERIFIED`, say which at the gate
rather than carrying it forward silently — the next stage inherits it either way, and only the
human can decide whether it matters. Advisory findings are reported at the gate too; they do
not stop the run, and they are never left out of the report because they did not.
