---
description: Offer to configure optional MCP servers for AL work, and write .mcp.json only if you say yes
argument-hint: "[--show to print what it would write and change nothing]"
allowed-tools: Read, Glob, Grep, Bash, Write, Edit, AskUserQuestion
---

Arguments: `$ARGUMENTS`

This is the **only** command that writes a file other than `.claude/bp-al.json`, it writes it
only on an explicit yes, and the file is `.mcp.json` in the repository root. Say all three
things before asking anything.

Nothing here is bundled. The plugin ships no server, vendors no package and starts no process;
it writes configuration the human approved, pointing at things they chose.

1. **Explain the cost first.** An MCP server is a process or an endpoint that runs for the whole
   session, unlike everything else in this plugin, which costs nothing when idle. That is the
   trade being offered, and it goes before the benefit.

2. **Offer Microsoft Learn** — `https://learn.microsoft.com/api/mcp`, type `http`. First-party,
   no local process, no package to trust. It is what lets a review cite Business Central
   documentation instead of asserting from memory, which is the single biggest gap between a
   confident wrong answer and a checkable one.

3. **Offer an AL symbol server, without naming a package.** The capability is worth having:
   it resolves base-application objects whose source is not on disk, which is the case the
   `al-spec` stage cannot otherwise cover. **Do not propose a specific npm package or version.**
   Describe what the server must do, ask which one the human uses, and write exactly what they
   give you. A plugin that puts `npx some-package@x.y.z` into a repository has made a
   supply-chain decision on someone else's behalf, in a file that then runs on every session.

4. **Merge, never overwrite.** If `.mcp.json` exists, show each key you would add, ask, and add
   only those. Touch no existing entry. If it does not exist, show the whole file first.

5. **Say how to undo it.** Delete the keys, or delete `.mcp.json` if this command created it.
   The plugin keeps working without any of this — the stages degrade to what they could check
   before, and say so.

`--show` prints what it would write and changes nothing.
