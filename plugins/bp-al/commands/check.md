---
description: Run the stage 3 checks over the working diff, with no spec and no gate
argument-hint: "[git range, or omit for the working tree]"
allowed-tools: Skill, Read, Glob, Grep, Bash
---

Load the `bp-al:al-review` skill with the Skill tool and run it in **no-spec mode**, described
in that skill.

Diff: `$ARGUMENTS` — a git range if given, otherwise the working tree.

This is the command for a change that did not come through the pipeline, which on a repository
already halfway through its life is most of them. It runs the build, the warning delta, the
`forbidden` patterns, the performance dimension, hotspots, reachability and the tests.

It cannot check acceptance criteria or scope, because both need a spec to check against. It
says so rather than reporting them as passed.

It never writes and it never gates. `/bp-al:review` is the one with a contract behind it; this
one tells you what is true about a diff.
