---
description: Profile this Business Central repository and write or refresh .claude/bp-al.json
argument-hint: "[--dry-run]"
allowed-tools: Skill, Read, Glob, Grep, Bash, Write, Edit, AskUserQuestion
---

Load the `bp-al:al-profile` skill with the Skill tool and follow it exactly.

Arguments: `$ARGUMENTS`

`--dry-run` means report what the profile *would* contain and change nothing on disk.

Two rules from the adopt-in-place contract apply to this command specifically, and neither
is negotiable:

- The only file you may create is `.claude/bp-al.json`. Create the `.claude` directory if it
  does not exist; create nothing else, move nothing, rename nothing.
- If `.claude/bp-al.json` already exists, do not overwrite it. Report each field you would
  change, with the current value and the proposed one, and ask before writing.
