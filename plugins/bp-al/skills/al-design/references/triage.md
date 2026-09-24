# Triage — does this request need a design?

State the result in one line, naming the signal that decided it:
`TRIAGE  HIGH — document → posted document transfer (TransferFields field numbers)`.
The human confirms or overrides, in either direction, and their call stands.

## HIGH — any one of these

- **Posting.** Logic inside a posting routine's transaction — a subscriber on a posting
  codeunit — or a new ledger or entry table.
- **Document → posted document transfer.** A field added to a document that must survive into
  its posted or archived forms — posted shipment, invoice, credit memo, return receipt, and the
  **archive** tables. `TransferFields` matches fields by **number**, and the types must be
  compatible, so number and type must agree on every table in the chain; once shipped they
  cannot change. A table missed in the chain drops the value silently — the archive is the one
  usually missed. A value meant to reach the ledger travels by event through the journal line,
  not by `TransferFields`, and is part of the posting signal above.
- **A new document type, number series, or dimension handling.**
- **A property that cannot change after release** — `DataPerCompany` on a new table; an
  enum's `Extensible` (true → false breaks every extension of it).
- **Fields added to a high-volume base table** — G/L Entry, Item Ledger Entry, Value Entry and
  their like. Every read of that table, including the base application's own posting, pays the
  join to your companion table unless it limits its loaded fields.
- **A breaking or migrating change to stored data on an app that has shipped** — a field's type
  or length, a primary key, a removal or obsoletion, data moving between fields or tables,
  anything that needs upgrade code or `DataTransfer`. A purely additive field is **not** HIGH.
- **Public surface that cannot be taken back** — a new event publisher, API page, interface,
  or extensible enum, or a public procedure on a codeunit other apps are known to call — on an
  app whose profile `appsource.target` is `appsource`, or that another app depends on or reaches
  through `internalsVisibleTo`. When `appsource.target` is `null` and the app has dependents,
  treat it as `appsource`. An ordinary new public procedure on a codeunit nothing outside calls
  is **not** HIGH; if it were, every AppSource change would be.
- **Background execution or concurrency** — Job Queue, `TaskScheduler`, `StartSession`, or
  explicit locking. A page background task is read-only and is not a HIGH signal.
- **Integration outside Business Central** — any HTTP call, webhook, external business event,
  Dataverse, Power Automate or Azure component.
- **An app boundary** — a change spanning two apps, or adding a dependency between them.

## MEDIUM

No HIGH signal, but the change spans more than one functional area (sales and warehouse, not
a table extension and its page extension), **or it touches any `hotspots` glob in the
profile** — a hotspot is at least MEDIUM, never LOW.

## LOW

One area, cause known, no hotspot.

## What each result does

| Result | Next |
|---|---|
| HIGH | Stage 0 — design (`bp-al:al-design`) |
| MEDIUM | Stage 1 — spec. The decisions go in the spec's `OPEN` and are settled at its gate. |
| LOW | Stage 1 — spec |

If a HIGH request produces fewer than three genuine decisions once designed, it was MEDIUM:
the design stage says so and hands to the spec. Triage is a first guess, and the minimum is
the check on it.
