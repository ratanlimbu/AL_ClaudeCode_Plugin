# Behavioural tests

`lint.mjs` is structural and scripted. These are behavioural: they need a Claude Code session
with the plugin installed, because what is under test is what `/bp-al:scan` actually does.

Run them from a session opened **in the fixture directory**, not in this repository.

## Setup

```
/plugin marketplace add <path to this repo>
/plugin install bp-al
```

Copy the fixture somewhere outside this repository first — the tests assert on `git status`,
and a fixture inside a working tree gives a misleading answer:

```bash
cp -r tests/fixtures/tiny-pte /tmp/bp-fixture && cd /tmp/bp-fixture && git init -q && git add -A && git commit -qm base
```

## Test 1 — the profile matches the golden file

Run `/bp-al:scan` in the fixture, then compare what it wrote with the golden file:

```bash
node <path to this repo>/tests/profile-diff.mjs .claude/bp-al.json expected-profile.json
```

It prints `profile: MATCH` and exits 0, or names every differing path as
`path  actual -> expected` and exits 1. Read the paths rather than the verdict — the point of a
golden file is telling you what moved, and a bare MATCH/DIFFERS makes you diff it by eye
anyway.

This used to be a `JSON.stringify` snippet inline in this file. The array form of its replacer
is an allowlist applied at **every** level, so every nested object came out empty and the
comparison silently ignored `build.command`, `policy.*`, `appsource.*`, `tests.*` and
`apps[].prefix` — a profile with a wrong build command compared equal. It is a script now, and
`lint.mjs` self-tests it against deliberately corrupted profiles, because a checker that cannot
fail is indistinguishable from one that passes.

| Fixture | Asserts |
|---|---|
| `tiny-pte` | `tier: customisation` · one app · prefix derived from object names, since there is no `AppSourceCop.json` · `build.command: null`, because nothing is detectable · `authority: []` — a repository with no documentation at all · `specs.mode: inline`, and **no `docs/` directory created** |
| `multi-app-product` | `tier: product`, selected by the second app · the test app detected by `"target": "Test"` **and** by its `Library Assert` dependency · prefix `FFS` from `AppSourceCop.json`, not derived · `build.command` taken from the `tasks.json` AL build task **and confirmed at the prompt** · `authority` in precedence order, `CLAUDE.md` before `CONVENTIONS.md` · `specs.dir: docs/specs`, because it already exists |

Both fixtures also assert:

- `policy` — the defaults written verbatim, with `scope`, `reachability`, `performance`,
  `hotspot` and `style` advisory and `requireTests: false`. `policy` is the one block `scan`
  must **not** detect; a strictness setting inferred from a repository's current state would
  ratchet a project tighter the cleaner it got.
- `appsource.target` — `pte` for `tiny-pte` from `PerTenantExtensionCop`, `appsource` for
  `multi-app-product` from its `AppSourceCop.json`.
- `appsource.previousVersionPath: null` and `tests.runCommand: null` in both. Neither fixture
  has a previous `.app` or a test task, so both must come back `null` — **a detection step that
  finds nothing must write `null`, not omit the field**, or the profile's shape changes with
  the repository and nothing downstream can rely on it.

`multi-app-product` also tests the confirmation gate: `scan` must **ask** before writing
`build.command`. A run that writes it without asking fails this test even if the value is
right.

## Test 2 — the footprint is one file

This is guarantee 2 of the adopt-in-place contract, and the one most likely to regress.

```bash
git status --porcelain
```

Must show `?? .claude/` and **nothing else**. No new directory, no touched `app.json`, no
generated `CLAUDE.md`, no reformatted file.

Then the before-and-after tree diff, which catches a file rewritten in place with identical
content but different line endings:

```bash
# before /bp-al:scan
find . -path ./.git -prune -o -type f -print | sort > /tmp/before.txt
md5sum $(find . -path ./.git -prune -o -type f -print) | sort > /tmp/before.md5
# after
find . -path ./.git -prune -o -type f -print | sort > /tmp/after.txt
md5sum $(find . -path ./.git -prune -o -type f -print) | sort > /tmp/after.md5
diff /tmp/before.txt /tmp/after.txt   # only .claude/bp-al.json may be added
diff /tmp/before.md5 /tmp/after.md5   # no existing file may have changed hash
```

## Test 3 — line endings survive

The fixture `.al` files are stored CRLF on purpose, matching real AL repositories, and
`.gitattributes` marks them `-text` so git does not normalise them away.

After any command that edits AL in a fixture, every untouched file must still be CRLF and an
edited file must not have been silently converted:

```bash
for f in $(find . -name '*.al'); do
  printf '%-60s ' "$f"
  grep -qU $'\r' "$f" && echo CRLF || echo 'LF  <-- line endings were rewritten'
done
```

A scripted edit that rewrites a whole file through a naive read-modify-write converts every
line ending in it. The diff then shows the entire file as changed, and the real change is
invisible inside it.

## Test 4 — rescan is idempotent and does not clobber

Run `/bp-al:scan` a second time with no changes: it must report no differences and write
nothing.

Then hand-edit one field — set `build.warningPolicy` to `zero` — and run it again. It must
**show** the difference and **ask**, not overwrite. Accepting nothing must leave the file
byte-identical.

## Test 5 — a tightened policy survives a rescan

Move `scope` from `policy.advisory` to `policy.blockOn` by hand, then run `/bp-al:scan` again.

`policy` must not appear in the proposed-changes list at all — not as a difference, not as a
suggestion, not as a question. A rescan that re-proposes the defaults over a project's own
settings quietly loosens exactly the projects that had tightened, and it does it at the moment
nobody is reading carefully.

The one thing it may say: if the category vocabulary has grown since the profile was written,
it names the categories that sit in neither list and asks where they go.
