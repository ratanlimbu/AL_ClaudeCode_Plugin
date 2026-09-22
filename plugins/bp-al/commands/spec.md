---
description: Stage 1 — turn a request into a checkable contract before any code is written
argument-hint: "<what you want built or changed>"
allowed-tools: Skill, Read, Glob, Grep, Bash, Write, AskUserQuestion
---

Load the `bp-al:al-spec` skill with the Skill tool and follow it exactly.

The request: `$ARGUMENTS`

If the request is empty, ask for it rather than inventing one.

Read `.claude/bp-al.json` first. If it is absent, say so and run the `bp-al:al-profile`
skill first — a contract that names object IDs and authority documents cannot be written
without the profile.
