# Decision areas

Work through only the areas the design actually touches. For each, read the `al-conventions`
theme named in its heading line — that theme is where the reasons live — then present the
options, the trade-offs and a recommendation.

**One theme per touched area is this stage's allowance** — an explicit, bounded exception to
the `al-conventions` index's "one or two". A design that needs more than four themes should be
split into sub-specs, not read in full.

Every platform fact below depends on the runtime and BC version. Check it against the
`runtime` and `application` read from `app.json` before recommending it. If a Microsoft Learn
MCP server is configured (see `/bp-al:mcp`), cite the page a version-sensitive recommendation
rests on; if not, mark the recommendation *version not checked* rather than asserting it.

## Data model — `extension-model`, `performance`

Decide: new table or table extension; keys for the filters the feature will actually run;
FlowField or stored value (FlowFields that reference each other circularly do not compile);
relations; `DataPerCompany` on a new table.

- **Document chains.** For a field that must survive posting or archiving, list every table in
  the chain — document, posted shipment, invoice, credit memo, return receipt, archive — and fix
  one field number and a compatible type for all of them here, together. `TransferFields`
  copies by number.
- **High-volume base tables.** A table extension on G/L Entry, Item Ledger Entry or Value Entry
  adds a join to every read of that table that does not limit its fields, Microsoft's own
  included. Prefer a separate table keyed to the entry when the data is not needed on every
  read.

Expensive to reverse because a shipped field's number and type, and a table's
`DataPerCompany`, are permanent.

## Transactions and locking — `performance`, `correctness`

Decide: where the commit boundary sits; what runs inside the posting transaction and what is
deferred until after it; which reads need `ReadIsolation`.

Expensive to reverse because callers come to depend on what one transaction guarantees.

## Background execution — `integration`, `telemetry`

Decide: Job Queue, `TaskScheduler`, `StartSession` or page background task; how a failure
becomes visible; which user and company it runs as.

## Events and extensibility — `events`

Decide: which base events to subscribe to — each verified per `references/symbols.md`, never
assumed; which events this app publishes, and **whether each is isolated** (a subscriber then
cannot break the publisher, but cannot veto it either); interface + enum for one-of-N
behaviour. Treat `IsHandled` as a last resort: two subscribers that both set it silently
override each other.

Expensive to reverse because a published event's signature is frozen.

## App placement (product tier) — `extension-model`

Decide: which app owns each new object — the layer that owns the concept, not the layer that
first needed it — keeping the dependency graph acyclic.

## Public vs internal surface — `upgrade`, `api`

Decide: `Access = Internal` by default; what is public and why; `internalsVisibleTo` for the
test app. Public surface that has shipped can be obsoleted, never removed.

## Setup and toggles — `correctness`

Decide: a setup table or a Feature Management key; per company or global.

## Integration, inbound — `api`

Decide: a standard API or a custom API page (publisher, group, version); what is read-only;
webhooks. Standard API pages cannot be extended, so an extra field means a custom API.

## Integration, outbound — `integration`

Decide: when the call happens relative to the transaction; timeout; retry and idempotency;
external business events; Dataverse; Power Automate.

## Microsoft ecosystem boundary — `integration`

Decide: what does not belong in AL — work the SaaS sandbox forbids or that does not fit a
session — and which Azure component takes it.

## Secrets and authentication — `integration`

Decide: where each credential is stored and in what scope; OAuth flow; whether a publisher
secret belongs in `keyVaultUrls`.

## Security — `permissions`

Decide: the permission-set layering; direct versus indirect grants; data classification of
every new field.

## Upgrade and deployment — `upgrade`

Decide: upgrade codeunits and tags; `DataTransfer` for bulk moves; the two-version obsolete
path; idempotency on retry.

## Telemetry — `telemetry`

Decide: which feature-usage and error signals to emit, their event IDs and dimensions.

## Work decomposition

Decide: which parts can be specified and built independently — the data model first, then
disjoint sets of files — and whether one spec would be too large.
