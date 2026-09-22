---
description: Stage 2 — write the AL for an approved spec, build it, and iterate to clean
argument-hint: "[path to spec, or omit to use the spec from this conversation]"
allowed-tools: Skill, Read, Glob, Grep, Bash, Write, Edit, Agent, AskUserQuestion
---

Load the `bp-al:al-implement` skill with the Skill tool and follow it exactly.

Spec: `$ARGUMENTS`

If no path is given, use the approved spec from this conversation. If there is no approved
spec in either place, stop and say so — stage 2 implements a contract, it does not infer one.

Do not start until the spec has been approved by a human. An unapproved spec is a draft.
