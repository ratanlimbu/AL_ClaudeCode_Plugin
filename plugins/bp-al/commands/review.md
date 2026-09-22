---
description: Stage 3 — verify the change against its spec, independently and from a fresh context
argument-hint: "[path to spec, or omit to use the spec from this conversation]"
allowed-tools: Skill, Read, Glob, Grep, Bash, Agent
---

Load the `bp-al:al-review` skill with the Skill tool and follow it exactly.

Spec: `$ARGUMENTS`

The review re-runs the build itself and recomputes the warning delta. It does not accept a
reported result, including one reported earlier in this same conversation.

On the `product` tier the review runs in the `bp-al:al-reviewer` subagent, which receives the
spec and the diff and **must not receive the implementer's transcript**. That independence is
the whole point of the stage: a reviewer who can see why each choice was made reviews the
reasoning instead of the result.
