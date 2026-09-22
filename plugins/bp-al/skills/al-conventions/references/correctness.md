# Correctness and platform idiom

Each of these fails **silently** when you get it wrong — the build stays green and the symptom
appears at a customer. That is the selection criterion for this list.

## Permissions for every new object

A missing permission compiles clean and fails at runtime for anyone who is not SUPER, which
is nobody on the development machine and everybody in production.

`tabledata` omissions are sometimes caught by an analyzer. **Pages, codeunits, reports and
queries are not** — no cop reports those. Add every new object to the project's permission
sets in the same change, and check the object count against the grant count before claiming
the change is done.

## User-facing text is a label, never a literal

Every message, error, confirmation and caption goes through a `Label`, with `Comment` for each
placeholder. A string literal in an `Error()` is untranslatable and invisible to the
translation artefacts.

`Locked = true` for anything that must not be translated — URLs, codes, format strings.

Keep the translation artefacts in step: if the project generates an `.xlf`, the build
regenerates it, so **check its diff before reverting it**. If it carries your new captions,
it is part of the change.

## Validate at the boundary

Validate where data enters — a page field, a web-service payload, an import — not deep inside
the calculation that later trusts it. A guard in the middle of a call chain is one the next
caller will bypass.

Use `Validate()` rather than direct assignment when a field's `OnValidate` logic must run.
Direct assignment is correct only when you deliberately want to bypass it, and that deserves
a note saying so.

## Extend by event, not by modification

Subscribe rather than change base behaviour. Two things make subscribers go wrong quietly:

- **Guard the subscriber on the condition it belongs to.** A subscriber that fires for every
  company, every localisation or every document type when it was written for one is a defect
  that only shows up in someone else's data.
- **Replacing an interface implementation silently drops everything else that implementation
  did.** If you take over a method that hands off a whole operation, whatever the original did
  *besides* the part you care about stops happening — with no error and no missing-
  implementation warning. The test for anything near such a seam: *would this still happen if
  the original implementation were deleted?*

## Obsolete, do not delete

Removing a published field, procedure or object breaks every dependent extension at compile
time and, worse, orphans data. Mark it obsolete with the full metadata — state, reason and the
version it was obsoleted in — and leave it. A retired object ID is **not free for reuse**: the
test is not "was it used before" but "could existing data under this identifier ever be read
as the new thing's".

## Upgrade logic whenever persisted shape changes

A new field with a default, a changed data classification, a value that must be back-filled —
each needs an upgrade codeunit. Without it, existing companies carry the old shape forever and
the new code reads a blank.

## Never abort a batch on one bad row

One bad record must not stop the other 299. Collect failures into an error log or a result
collection and carry on. `Error()` belongs in interactive paths — a setup card, a wizard, a
single document being released — where a human is present to read it and retry.

The corollary: a batch that "succeeded" while skipping rows must report **how many** it
skipped, somewhere a person actually looks.

## Errors that are actionable

An error names what failed, which record, and what to do about it. Prefer the structured
error-info form where the platform supports it, so the message can carry an action that takes
the user to the thing they must fix.

## Detect and refuse rather than approximate

Where a rule is not established, refuse — **loudly**. An error-log entry, a note saying why,
and a visible count where someone is looking. A plausible figure that is wrong is worse than a
failure, because a failure has a symptom and a wrong figure does not.

A silent refusal is just a different silent failure.
