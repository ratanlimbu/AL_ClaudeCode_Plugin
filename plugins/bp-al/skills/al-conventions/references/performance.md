# Performance, by construction

Written for the implementer, not left for the reviewer. Slow AL compiles, passes tests, and
ships — nothing mechanical catches it, which is why it is a design-time concern rather than a
review-time one.

The theme behind every rule below: **the expensive thing is data crossing the boundary
between the service tier and the database**, not the AL statements around it.

## Read only the fields you use

Declare partial records. A record variable with no field declaration drags every column,
including BLOBs, for every row.

```al
var
    Item: Record Item;
begin
    Item.SetLoadFields("No.", Description, "Base Unit of Measure");
```

The rule has one trap: touching a field you did not load does **not** fail. The platform
quietly does a just-in-time `Get` to fetch it — another round trip, per record if it happens in
a loop over a copy passed by value — and a JIT load can fail with *Inconsistent read* if
another session changed the row meanwhile. Load what the whole procedure uses, not what the
next line uses.

Table extensions are where it pays most. Extension fields live in a companion table that is
joined on every read; an extension with no field in the load set is left out of the join
entirely.

Partial records suit reads. A record you will insert, delete, rename, `TransferFields` or copy
to a temporary record needs every field, so loading few of them first only buys a JIT load.

## Never calculate inside a loop

`CalcFields` inside `repeat..until` is one round trip per row. Move it out, or declare the
FlowField with `SetAutoCalcFields` before the loop so the platform folds it into one query.

The same applies to `CalcSums`: call it once over a filtered set, never per record.

## Iterate with FindSet

`FindSet()` fetches in batches; `Find('-')` with `Next()` does not. Use the writable overload
`FindSet(true)` **only when the loop actually modifies** — it takes locks you otherwise do not
need, and a read loop holding write locks is how a batch job blocks a user.

`SetLoadFields` before `FindSet`, not after.

## Existence is its own question

```al
if not Rec.IsEmpty() then          // asks the database "any?"
if Rec.Count() > 0 then            // counts every matching row to answer "any?"
if Rec.FindFirst() then            // fetches a whole row to answer "any?"
```

Use `IsEmpty` when the answer is yes-or-no. Use `Count` only when the number itself is the
answer, and never inside a loop.

## Filter before you read, on a key that supports it

A `SetRange` on a field with no supporting key scans. Check that a key exists whose leading
fields match your filter; add one if the filter is a hot path, and accept that every new key
costs on every write.

`SetCurrentKey` sets the sort order; it does not choose the index, and whether it is called
before or after the filters makes no difference — the query is built when the find runs.
`SetFilter` with `%1` parameters rather than string concatenation — concatenation is both slower to parse and an injection surface when any
part of it is user input.

## Aggregate with the platform, not in AL

FlowFields, SIFT and query objects push aggregation into the database. A `repeat..until` that
accumulates a total in an AL variable moves every row across the wire to compute one number.

## Never nest loops over large tables

A loop inside a loop is a Cartesian read. Stage the inner set into a temporary record once,
then read from it — a temporary table lives in memory and costs no round trip.

## Commit is not a control-flow tool

`Commit` inside a loop, or before a call you expect might fail, splits one transaction into
many and leaves partial state behind on error. **Transaction boundaries belong to the caller.**
The legitimate uses are narrow and deliberate; if you are reaching for it to make something
work, the something is wrong.

## Prefer set-based operations

`ModifyAll` and `DeleteAll` on a filtered set beat a `repeat..until` of per-record calls — but
only where the semantics allow it. They do not fire `OnModify`/`OnDelete` triggers by default,
so check that nothing depends on those before converting a loop.

## Locking and read isolation

A lock taken early is held until the transaction ends, and every user who needs the same rows
waits for all of it.

- **Do not call `LockTable` at the start of a routine** "to be safe". It heightens the isolation
  of every later read of that table in the transaction, serialising everyone behind you, and it
  switches off the optimistic reads described below.
- **Lock only the rows you will change, just before you change them** — `FindSet(true)` for a
  loop, or `ReadIsolation := IsolationLevel::UpdLock` on the record instance before a `Get`. A
  plain read takes no update lock, so a `Get` followed by `Modify` relies on optimistic
  concurrency and can fail with "another user has modified the record" under load.
- **`ReadIsolation` (runtime 11.0 and later) applies to one record variable.** It overrides the
  transaction's isolation for that instance only, which is the point: one read's needs do not
  leak into the rest of the transaction.
- **Reads after a write are optimistic by default.** Tri-state locking — always on in current
  versions, online and on-premises — reads committed data after a write instead of taking
  update locks, which is what keeps posting concurrent. `LockTable` reverts that table to the
  old, locking behaviour, so it costs more than it used to.
- **`DataAccessIntent = ReadOnly`** routes a report's data-item reads, an API page's fetch or an
  API query's fetch to a read-only replica when one is available, off the primary database
  everyone is writing to. On a page it applies only to API pages with `Editable = false`, and on
  a query only when it is called through OData. It is a hint, not a guarantee, and any write
  attempted on the replica throws.

## Keep work out of per-row triggers

`OnAfterGetRecord` runs once per visible row, again on every scroll and every refresh. A
`CalcFields`, a lookup or a computed FlowField there multiplies by the page size. Move it to
the source table as a FlowField, or compute it once on open.

The same for `OnAfterGetCurrRecord` and for repeating `OnValidate` work on a subform line.
