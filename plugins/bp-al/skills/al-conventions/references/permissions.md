# Permissions: the defect that only exists in production

A missing permission compiles clean, passes every test, and fails at runtime for anyone who is
not SUPER — which is nobody on the development machine and everybody at the customer.

The `correctness` theme states the rule. This one is about designing the sets rather than
remembering to add to them.

## What an analyzer will and will not tell you

Some `tabledata` omissions raise a warning. **Pages, codeunits, reports, queries and XMLports
raise nothing at all.** There is no build output that says "this codeunit is unreachable for a
normal user", so the check is arithmetic you do yourself: count the objects the change added,
count the grants, and account for the difference before calling it done.

## The shape of a permission set

```al
permissionset 0 "Feature - Objects"
{
    Assignable = false;
    Permissions =
        tabledata "Work Item" = RIMD,
        table "Work Item" = X,
        page "Work Item List" = X,
        codeunit "Work Item Mgt." = X,
        report "Work Item Summary" = X;
}
```

`tabledata` grants the data; `table` grants the object. Both are needed, and granting only the
first is the most common half-done version of this.

`R`, `I`, `M`, `D` are read, insert, modify, delete. `X` is execute, and is the only meaningful
grant for a codeunit, page, report, query or XMLport.

## Case is significant: direct versus indirect

`tabledata Customer = RIMD` grants direct permission. `tabledata Customer = rimd` — lower case
— grants **indirect** permission: the user may change the table only through an object that
holds the direct grant, never by writing to it themselves.

That is the right grant far more often than it is used. Indirect permission is how you let a
user post a document without letting them edit the ledger entry it produced, and reaching for
upper case everywhere quietly hands out both.

## Layer the sets, and make only the leaves assignable

```
Feature - Objects      Assignable = false   every object the feature owns
Feature - Read         Assignable = true    IncludedPermissionSets = "Feature - Objects"
Feature - Edit         Assignable = true    IncludedPermissionSets = "Feature - Read"
```

`Assignable = true` belongs **only on the sets a customer actually assigns to a user**. An
assignable intermediate layer is one somebody will assign, and then the layering below it is
no longer a design — it is a list of things that happen to be granted together.

`IncludedPermissionSets` composes. Duplicating grants between layers instead means a permission
removed from one place survives in another, and nobody finds out until an audit.

## Least privilege, concretely

- **No `D` on setup and configuration tables** without a stated reason. Deleting a setup record
  is rarely a user action and is usually an accident with no undo.
- **No permissions on system tables.** Use the platform API. A grant on a system table is a
  grant on something whose shape is not yours and whose meaning changes between versions.
- **Start from what the feature reads**, then add writes for the specific operations that write.
  Starting from `RIMD` on everything and trimming is a trim nobody finishes.

## Extending someone else's set

`permissionsetextension` adds to a published set without copying it. Copying a Microsoft
permission set into your app freezes it at the version you copied: every grant Microsoft adds
later is missing from yours, and the symptom is a feature that works for SUPER and not for the
role that should have it.

## `InherentPermissions` is not a substitute

`InherentPermissions` and `InherentEntitlements` on an object let it carry permission for its
own internal work, so a codeunit can touch a table the caller has no direct grant on. It is a
narrowing tool — it does not mean the object is covered by a permission set, and an object with
inherent permissions still needs the `X` grant to be invoked at all.

## Test it, or it is untested

Every test in the suite runs as SUPER by default: `TestPermissions = Disabled` is the default
value, and it is why permission defects survive a green suite.

If the change adds objects, at least one test runs `TestPermissions = Restrictive` against the
permission set that ships with them. See the `testing` theme for what that setting does and
what the other two values mean.

That test is the only thing in the pipeline that exercises the production permission state.
Without it, "the tests pass" is a claim about SUPER.
