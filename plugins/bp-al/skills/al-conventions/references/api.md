# APIs and web services: surface you cannot take back

An API page is a published contract with consumers you will never meet. Everything below
follows from the fact that you cannot see who is calling.

## API pages, not custom web services

```al
page 0 "Example Item API"
{
    PageType = API;
    APIPublisher = 'example';
    APIGroup = 'inventory';
    APIVersion = 'v1.0';
    EntityName = 'item';
    EntitySetName = 'items';
    SourceTable = Item;
    DelayedInsert = true;
    ODataKeyFields = SystemId;
}
```

An API page gets `$filter`, `$select`, `$expand`, paging, ETags and the standard error shape
from the platform. A codeunit exposed as a web service gets none of them and reimplements the
ones it needs, badly. Reach for a codeunit web service only for an operation that is genuinely
not a resource — and then prefer a bound action on the page that owns the resource.

`DelayedInsert = true` is not optional on an API page. Without it the record is inserted on the
first field assignment, so a POST carrying five fields inserts on the first one and validates
the rest against a half-built record.

## `SystemId` is the key

`ODataKeyFields = SystemId`, always. A natural key — `No.`, a code, a document number — is
something the business renumbers, and every consumer holding the old value breaks at once.
`SystemId` is assigned by the platform and never changes.

## A version is frozen the day someone calls it

`APIVersion = 'v1.0'` is a promise. Inside a published version you may **add** an optional
field; you may not remove one, rename one, change its type, or change what a value means.
Anything else is a new `APIVersion` published beside the old one, with the old one kept until
its consumers have moved.

Removing a field from a live API version is the same class of change as deleting a table field,
except the failure happens in software you have no access to.

## Say what may be done, explicitly

`InsertAllowed`, `ModifyAllowed` and `DeleteAllowed` default to `true`. A read-only resource
that does not say so is a writable one, and the consumer who discovers that is not the one you
planned for.

Bound actions carry `[ServiceEnabled]`. A procedure on an API page without it is not callable,
and one with it is callable by anyone who can reach the page — so it is an entry point, and it
validates its input like one.

## Errors become the caller's HTTP response

An `Error()` raised in a validation trigger surfaces as the body of a 400. It is read by
someone debugging an integration at a distance with no access to your code, so it names the
field, the value and what was expected. "Invalid value" costs them an afternoon.

Errors here go through `Label` like all other user-facing text, and an `ErrorInfo` carrying a
code lets a consumer branch on the failure instead of parsing prose.

## The per-row cost is multiplied by the page size

A FlowField on an API page is calculated for every row of every response, and a single response
can run to thousands of rows. One careless `CalcFormula` becomes the slowest thing in the
system.

The platform applies partial records to an API page from its layout, so the shape of the page
*is* the query — expose the fields consumers need, not the table. A field read only in a trigger
is not in that set and is JIT-loaded per row; add it with `AddLoadFields` in `OnFindRecord`. Everything in the `performance` theme applies here with a
multiplier.

## Let the platform filter

`$filter`, `$top` and `$skip` are translated into SQL by the platform. A `SetFilter` in
`OnOpenPage` that reimplements what the consumer asked for defeats that, and usually fights it.

Filter in AL only for what the consumer must not see — a tenant boundary, a permission scope, a
status that is not part of the published resource.

## Naming is part of the contract

Publisher, group, version, entity and entity set names appear in the URL. `EntityName` is
singular, `EntitySetName` plural, both lower case.

Payload field names are derived from the page's field names, so renaming a page field renames
it in every consumer's payload. That is a breaking change made by an edit that looks cosmetic,
and it is the one on this page most likely to ship by accident.
