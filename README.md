# BP_For_AL_DEV

A Claude Code plugin for Microsoft Dynamics 365 Business Central AL development.

`spec → implement → review`, command-driven, with a human gate between each stage — and the
constraint everything else is downstream of: **it is safe to add to a repository that is
already halfway through its life.**

```
/plugin marketplace add ratanlimbu/AL_ClaudeCode_Plugin
/plugin install bp-al
/bp-al:scan
```

## The adopt-in-place contract

These are guarantees, not intentions. They are the reason this is safe to hand to a colleague
mid-project.

1. Its entire configuration footprint is one file: **`.claude/bp-al.json`**. The only other
   things it ever writes are AL source you asked for, the spec documents described in
   guarantee 4 on the `product` tier, and `.mcp.json` — which only `/bp-al:mcp` writes, only
   on an explicit yes, and never by merging over an entry you already had.
2. It **never creates a directory layout**, and never moves or renames anything.
3. It **never edits** `CLAUDE.md`, `README`, `app.json`, or any other file it did not create.
4. Spec documents are written **only where your profile already points**, and only on the
   `product` tier.
5. What cannot be determined is recorded as `null`, and the affected stage degrades **loudly**
   — reporting `UNVERIFIED` — rather than guessing.
6. **Uninstalling is deleting one JSON file** — two if you took the optional MCP setup.

It works on a repository with uncommitted changes, a non-standard layout, several apps, or no
documentation at all.

## Commands

| Command | What it does |
|---|---|
| `/bp-al:scan` | Profile the repository, write or refresh `.claude/bp-al.json`, report findings and gaps. Idempotent. |
| `/bp-al:spec <request>` | Stage 1 — turn a request into a contract with checkable acceptance criteria. |
| `/bp-al:implement [spec]` | Stage 2 — write the AL, run **your** build command, iterate to clean. |
| `/bp-al:review [spec]` | Stage 3 — independent verification in a fresh context. |
| `/bp-al:go <request>` | All three, chained, with a human gate between each. |
| `/bp-al:check [range]` | The stage 3 checks over a diff with no spec behind it. No gate. |
| `/bp-al:appsource [app]` | An AppSource submission readiness report. Never gates, never writes. |
| `/bp-al:mcp` | Offer optional MCP servers, and write `.mcp.json` only if you say yes. |

`--quick` and `--deep` override the tier for a single run.

`/bp-al:check` is the one to reach for on a repository where most changes did not come through
a spec. It runs everything stage 3 runs except the two checks that need a contract — acceptance
criteria and scope — and says so rather than reporting them as passed.

## Describe, don't prescribe

Comparable plugins initialise a project by *imposing* structure — a rules directory, a
generated `CLAUDE.md`, a plans folder. This one inverts that. It reads the repository as it
stands and records what it found in one file.

Where your project already has authority — `CONVENTIONS.md`, `ARCHITECTURE.md`, per-module
notes, an existing `CLAUDE.md` — the profile **records their paths**. It never copies their
content. That is three properties for the price of one:

- **Adoption** — nothing to restructure, so it can be added on any day of a project.
- **Tokens** — authority is read on demand by the stage that needs it, not injected per turn.
- **Correctness** — copied rules drift from their source and are then confidently wrong. A
  pointer cannot drift.

### What ships, and what is yours

| Ships with the plugin | Supplied by your project |
|---|---|
| The pipeline, its stages and gates | Object ID ranges, prefixes and affixes |
| The AL quality baseline — platform-level practice, true on every BC project | Publisher, app names, folder layout |
| The profile *schema* | Dependency names and where their source lives |
| Detection logic for filling the profile in | The build command |
| Review checks that are language- or platform-level | Which areas are sensitive (`hotspots`) |
| | Which APIs are banned here (`forbidden`) |
| | Which documents are authoritative |

**No customer name, no publisher, no ID range, no naming convention and no business rule is
bundled.** Everything in the right-hand column is discovered by `/bp-al:scan` or typed by you,
and lives only in your own `.claude/bp-al.json`. `tests/lint.mjs` enforces this by grepping
the whole repository, so it cannot erode over time.

### Your project wins

When your own authority contradicts the shipped baseline, **the project wins**, and the
reviewer states that it was overridden rather than silently conforming.

Generic Business Central advice is sometimes precisely wrong for a given project — a rounding
helper that is best practice platform-wide can be forbidden where a regulator requires
truncation. A plugin that cannot be overruled by the repository it runs in is a hazard in
exactly the projects that need it most.

## What it costs

**Nothing when idle.** No always-on rules, no per-turn hooks, no injected context. The profile
is read once per run by the stage that needs it; the quality baseline is eleven reference files
behind an index, and a stage loads only the theme its change touches.

Subagent definitions **pin no model**, so a colleague on a smaller model stays on it and
nobody inherits a pinned model's cost. The `customisation` tier spawns no subagents at all.

The one exception is the one you opt into. An MCP server configured by `/bp-al:mcp` *is*
always-on — that is the trade, and it is why the command states the cost before the benefit and
writes nothing without an explicit yes. Everything else here still costs nothing when idle, and
the pipeline works with no MCP at all: the stages check less and say so.

## Three things it insists on

**The warning gate is a delta, not a count.** Demanding zero warnings breaks instantly on a
brownfield repository that already has hundreds; demanding nothing destroys the discipline of
one that has none. Stage 2 captures the warning set before it touches anything and compares
after. No analyzer rule IDs are bundled — which cops run differs per project, so the codes come
from the compiler you actually run.

**Reachability is checked.** Every new object and public procedure must have a call path, a
subscription, or one of a closed list of exemptions. A complete, correct, reviewed and entirely
uncalled object passes every other mechanical check there is. The exemptions matter as much as
the check: event publishers, subscribers, `Install`/`Upgrade` codeunits, permission sets, API
pages and the public surface of an app others depend on are uncalled **by design**, and report
as `PUBLIC SURFACE` rather than as findings.

**Strictness is a setting, not a stance.** The profile's `policy` block splits findings into
blocking and advisory, and the defaults sit at the loose end: only build errors, `forbidden`
hits, unmet criteria and the warning delta stop the pipeline. `scope` and `reachability` are
advisory, because on a repository halfway through its life both are routinely *correct* —
adjacent fixes are normal, and an AppSource app publishes surface nothing in its own tree
calls. Nothing is switched off by this. Every category is still looked for, still found and
still reported in full; `policy` decides only what stops. Tightening it is one line of JSON,
and `/bp-al:scan` never loosens it back.

## Documentation

- [`docs/DESIGN.md`](docs/DESIGN.md) — the full design, and why each decision went the way it did.
- [`docs/PROFILE.md`](docs/PROFILE.md) — every profile field, its shape and its consequences.

## Licence

MIT. See [`LICENSE`](LICENSE).
