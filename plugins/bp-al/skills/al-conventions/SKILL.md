---
name: al-conventions
description: The AL quality baseline — platform-level Business Central practice for performance, warning discipline, correctness, extension-model judgement, testing, events, APIs, upgrade, permissions, pages and telemetry. An index of eleven themes, each loaded only when the work touches it.
version: 0.1.0
allowed-tools: Read
---

# The AL quality baseline

Platform-level knowledge — true on every Business Central project, independent of customer,
publisher or domain. **The plugin ships this; your project ships everything specific.**

## Precedence

This baseline **yields** to the project's own authority documents and to the `forbidden`
patterns in `.claude/bp-al.json`. When they contradict it, the project wins and you record
that it overrode the baseline. A plugin that cannot be overruled by the repository it runs in
is a hazard in exactly the projects that need it most.

## Themes — read only what your change touches

| Theme | Read it when | File |
|---|---|---|
| **performance** | the change reads, filters, loops over or aggregates records; touches a page trigger that fires per row; or adds a key | `references/performance.md` |
| **warnings** | you are about to run a build, interpret its output, or are tempted to suppress something | `references/warnings.md` |
| **correctness** | the change adds an object, user-facing text, validation, a subscriber, a batch path, or alters persisted shape | `references/correctness.md` |
| **extension-model** | the change adds a table or table extension, alters something others subscribe to, or spans an app boundary | `references/extension-model.md` |
| **testing** | the change adds or edits a test, or you are deciding what a test would have to assert to be worth writing | `references/testing.md` |
| **events** | the change publishes an event, subscribes to one, or puts logic inside a subscriber | `references/events.md` |
| **api** | the change adds or alters an API page, a bound action, or anything else a caller outside Business Central reaches | `references/api.md` |
| **upgrade** | the change obsoletes anything, alters persisted shape on an app that has already shipped, or touches an install or upgrade codeunit | `references/upgrade.md` |
| **permissions** | the change adds any object, or you are designing or extending a permission set | `references/permissions.md` |
| **pages** | the change adds or extends a page, an action or a control, or puts logic in a page trigger | `references/pages.md` |
| **telemetry** | the change adds an error path worth diagnosing in production, or you are deciding what signal to emit | `references/telemetry.md` |

**Read one. Read two if the change genuinely spans them. Never read the set** — the index
exists so their bodies stay out of context until a branch reaches for one. Eleven themes is a
menu, not a reading list; a change that appears to need most of them is a change that should
have been more than one change.

`correctness` and `extension-model` remain the two most often skipped and most often needed.
If the change adds an object or alters persisted shape, one of them applies whatever else does.

Each file is a checklist with the reason attached. The reason is what makes it usable: a rule
you can only apply by pattern-matching is a rule you will apply in the wrong place.
