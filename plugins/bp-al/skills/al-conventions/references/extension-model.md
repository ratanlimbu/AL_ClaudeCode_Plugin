# Extension-model judgement

Not rules so much as the questions to ask before committing to a shape. These decisions are
cheap now and very expensive after the first release, because published shape is a contract.

## Table extension or new table?

**Extend** when the data is genuinely an attribute of the existing record, has the same
lifetime, and is meaningless without it. A tax identifier on a customer is an attribute of
that customer.

**New table** when any of these hold:

- the data has its own lifetime, or its own permission story;
- there can be more than one per parent record — a table extension cannot express that, and
  bolting on numbered fields to fake it is the classic mistake;
- it is historical and grows without bound, which makes every read of the parent heavier;
- it belongs to a different module and would drag a dependency the parent should not have.

A table extension is also a lock on the base table's structure for everyone: field numbers in
your range are yours forever, and a field you delete is not free again.

## What may change in something others subscribe to

Once published, treat as frozen: an event's signature, a public procedure's parameters, an
enum's ordinal values, a field's ID and type.

Additive changes are safe — a new event, a new optional parameter on a new overload, a new
enum value at the end. Anything else is a breaking change dressed as an edit.

An enum value whose meaning is retired stays in place with its ordinal, because the ordinal is
what is persisted. Removing it renumbers nothing and corrupts everything.

## Visibility, and what test projects can see

`Access = Internal` is the right default for anything that is not deliberately part of your
surface — but it makes the object invisible to a separate test app.

The fix is the manifest, not the code: declare the test app in `internalsVisibleTo` on the app
under test. **Do not widen an object to public so a test can reach it.** That converts a test
convenience into a permanent contract with every other extension.

Note the asymmetry when apps are layered: an app grants visibility to *its* test app only.
A dependency's internals stay invisible to your test app unless that dependency names it too,
so a test that reaches across two layers may need a different approach rather than a wider
access modifier.

## Which app should own it?

Put the object in the layer that owns the *concept*, not the layer where it was first needed.
Something generic that a specific extension happens to use first belongs in the dependency; if
it stays in the extension in front, the next consumer either duplicates it or takes an
unnatural dependency.

Before adding an object, **search `dependencies[].sourcePath`** from the profile: the thing you
are about to build may already exist one layer down. That search is cheap, and finding out at
review time is not.

## One object per job, not per step

An ID range is finite and a job split across eight codeunits costs eight IDs for one entry
point. Prefer one object with a clear entry point and private helpers. Note that an ID is
unique only *within its own object type* — a codeunit and a page may share a number, and using
that deliberately is how a module keeps its footprint to one.

## Namespaces follow folders

Where a project uses namespaces, keep them matching the directory layout exactly. It is
mechanically checkable, and the alternative is a namespace that says one thing while the path
says another.
