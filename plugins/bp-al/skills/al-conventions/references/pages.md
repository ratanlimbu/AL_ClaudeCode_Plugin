# Pages: the surface where silent invisibility lives

Most page defects do not fail. They render nothing, and nobody notices until a user asks where
the field went.

## `ApplicationArea` is the one that bites first

A field, action or control **without `ApplicationArea` is invisible in the client**. It
compiles, it deploys, it is simply not there. No error, no warning from a default analyzer
configuration, and it looks exactly like a field you forgot to add.

Set it on every field and every action, or set `ApplicationArea` once at page level and let the
controls inherit. `All` is the usual value for an extension; a narrower value hides the control
for customers outside that area, which is occasionally what you want and never what you want by
accident.

`UsageCategory` is the list-page equivalent: a page without one is not findable through Tell Me,
so from the user's point of view the feature was not delivered.

## Anchoring a page extension

```al
pageextension 0 "Item Card Ext" extends "Item Card"
{
    layout
    {
        addlast(Item)
        {
            field(TaxCode; Rec.TaxCode) { ApplicationArea = All; ToolTip = '...'; }
        }
    }
}
```

`addlast` and `addfirst` anchor to a **group**; `addafter` and `addbefore` anchor to a specific
**control**. The second pair is more precise and more fragile: the control you named is one
Microsoft may move, rename or obsolete, and when they do your extension stops compiling against
the new base version.

Prefer anchoring to a group. When you must anchor to a control, pick a long-standing one rather
than the nearest one.

## Actions, and the promoted-action rewrite

Promotion is declared in an `area(Promoted)` with `actionref`, not with `Promoted = true` on
the action itself:

```al
actions
{
    addlast(processing)
    {
        action(Recalculate) { ApplicationArea = All; ToolTip = '...'; }
    }
    addlast(Category_Process)
    {
        actionref(Recalculate_Promoted; Recalculate) { }
    }
}
```

The older properties still compile and are on their way out. Mixing the two styles on one page
produces a ribbon that is correct in neither.

An action without a `ToolTip` fails a UICop check and an AppSource review. Write it as a
sentence describing what happens, not as a restatement of the caption.

## Triggers that fire per row

`OnAfterGetRecord` runs **once for every row rendered**, and a list page renders a great many.
A `CalcFields`, a lookup, or a procedure call there is multiplied by the page size, and the
page is slow in a way that never appears in a unit test.

Everything in the `performance` theme applies here, harder. If a value is expensive and
displayed, the question is whether it belongs in a FactBox the user opens deliberately, or in a
page background task.

## Page background tasks

`CurrPage.EnqueueBackgroundTask` runs a codeunit in a separate, **read-only** session and hands
the result to `OnPageBackgroundTaskCompleted`. It is the right shape for a total, a status
summary, or anything else the user should not wait for.

Two constraints that catch people: the task cannot write, and it cannot show UI. It returns a
dictionary of text, and the page decides what to do with it.

## Do not put business logic in a page trigger

Logic in `OnValidate`, `OnAction` or `OnAfterGetRecord` is reachable **only through that page**.
The API that touches the same record does not run it. The posting routine does not run it. The
upgrade does not run it. The rule you thought you implemented applies to one entry point, and
the others were never told.

Put it in a codeunit and call it from the trigger. The page is where a user reaches the
behaviour, not where the behaviour lives — and this is the same argument the `reachability`
check makes from the other direction.

## Say what may be edited

`Editable`, `InsertAllowed`, `ModifyAllowed` and `DeleteAllowed` default to permissive. A page
intended for viewing that does not say so is an editable page, and the discovery is made by a
user who changed something.

`Editable = false` on a field whose value is derived is worth setting even when nothing else
would let them edit it — it tells the reader the value is computed.

## Filtering

`SourceTableView` fixes a filter and a sort order at design time. A filter applied in
`OnOpenPage` is one the user can clear, which is sometimes the point and is usually a surprise.

Neither is the place for a filter that exists for correctness — if a user must not see a row,
that is a permission or a security filter, not a page property.

## Captions, tooltips and field groups

Every caption and tooltip is a `Label` and reaches the translation files; see `correctness`.

`Brick` and `DropDown` field groups decide what the tile view and the lookup show. A new table
without them gets a lookup showing the primary key and nothing else, which is technically a
lookup.
